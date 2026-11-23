import { Agent, createServer, request, type RequestListener, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';

import { afterEach, describe, expect, it, vi } from 'vite-plus/test';

import { drainServer } from '../../server/shutdown.ts';

// Mirrors the sweep interval of server/shutdown.ts: one tick turns a socket that went idle into a closed one.
const IDLE_SWEEP_MS = 100;

// How the drain can fail: it cuts a request in flight, an idle keep-alive socket holds it open until
// the timeout, or a hung request keeps the process alive past the orchestrator's SIGKILL.
let open: Server[] = [];

afterEach(() => {
	vi.useRealTimers();
	for (const server of open) {
		server.closeAllConnections();
		server.close();
	}
	open = [];
});

function isAddressInfo(address: string | AddressInfo | null): address is AddressInfo {
	return address !== null && typeof address === 'object';
}

function listen(handler: RequestListener): Promise<{ server: Server; port: number }> {
	const server = createServer(handler);
	open.push(server);
	return new Promise((resolve, reject) => {
		server.listen(0, '127.0.0.1', () => {
			const address = server.address();
			if (isAddressInfo(address)) resolve({ server, port: address.port });
			else reject(new Error('server is not listening on TCP'));
		});
	});
}

function get(port: number, agent?: Agent): Promise<{ status: number; body: string }> {
	return new Promise((resolve, reject) => {
		const req = request({ port, host: '127.0.0.1', path: '/', agent: agent ?? false }, (res) => {
			let body = '';
			res.on('data', (chunk: Buffer) => (body += chunk.toString()));
			res.on('end', () => resolve({ status: res.statusCode ?? 0, body }));
		});
		req.on('error', reject);
		req.end();
	});
}

interface Gate {
	opened: Promise<void>;
	open: () => void;
}

function gate(): Gate {
	let open = () => {};
	const opened = new Promise<void>((resolve) => {
		open = resolve;
	});
	return { opened, open };
}

/** A handler that answers only once `release` opens, and tells when a request has reached it. */
function heldHandler(release: Gate, received: Gate): RequestListener {
	return (_req, res) => {
		received.open();
		void release.opened.then(() => res.end('done'));
	};
}

// The drain's own timers (grace period, idle sweep) run on a fake clock; the sockets stay real.
const fakeClock = () =>
	vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval'] });

describe('drainServer', () => {
	it('lets a request in flight finish, then reports drained', async () => {
		const release = gate();
		const received = gate();
		const { server, port } = await listen(heldHandler(release, received));
		const response = get(port);
		await received.opened;

		const drained = drainServer(server, 2000);
		release.open();

		expect(await response).toEqual({ status: 200, body: 'done' });
		expect(await drained).toBe('drained');
	});

	it('does not wait on an idle keep-alive connection', async () => {
		const { server, port } = await listen((_req, res) => res.end('ok'));
		const agent = new Agent({ keepAlive: true });
		await get(port, agent);

		expect(await drainServer(server, 2000)).toBe('drained');
		agent.destroy();
	});

	it('closes a keep-alive socket once its in-flight response ends', async () => {
		fakeClock();
		const release = gate();
		const received = gate();
		const { server, port } = await listen(heldHandler(release, received));
		const agent = new Agent({ keepAlive: true });
		const response = get(port, agent);
		await received.opened;

		const drained = drainServer(server, 2000);
		release.open();
		expect(await response).toEqual({ status: 200, body: 'done' });
		await vi.advanceTimersByTimeAsync(IDLE_SWEEP_MS);

		expect(await drained).toBe('drained');
		agent.destroy();
	});

	it('cuts a hung request at the timeout', async () => {
		fakeClock();
		const received = gate();
		const { server, port } = await listen(heldHandler(gate(), received));
		const response = get(port).catch((error: Error) => error.message);
		await received.opened;

		const drained = drainServer(server, 200);
		await vi.advanceTimersByTimeAsync(200);

		expect(await drained).toBe('forced');
		expect(await response).toMatch(/socket hang up|ECONNRESET/);
	});
});

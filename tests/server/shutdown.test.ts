import { Agent, createServer, request, type RequestListener, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';

import { afterEach, describe, expect, it } from 'vitest';

import { drainServer } from '../../server/shutdown.ts';

// How the drain can fail: it cuts a request in flight, an idle keep-alive socket holds it open until
// the timeout, or a hung request keeps the process alive past the orchestrator's SIGKILL.
let open: Server[] = [];

afterEach(() => {
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

describe('drainServer', () => {
	it('lets a request in flight finish, then reports drained', async () => {
		const { server, port } = await listen((_req, res) => setTimeout(() => res.end('done'), 150));
		const response = get(port);
		await new Promise((resolve) => setTimeout(resolve, 30));
		const started = performance.now();
		const result = await drainServer(server, 2000);
		expect(await response).toEqual({ status: 200, body: 'done' });
		expect(result).toBe('drained');
		expect(performance.now() - started).toBeLessThan(1000);
	});

	it('does not wait on an idle keep-alive connection', async () => {
		const { server, port } = await listen((_req, res) => res.end('ok'));
		const agent = new Agent({ keepAlive: true });
		await get(port, agent);
		const started = performance.now();
		expect(await drainServer(server, 2000)).toBe('drained');
		expect(performance.now() - started).toBeLessThan(1000);
		agent.destroy();
	});

	it('closes a keep-alive socket once its in-flight response ends', async () => {
		const { server, port } = await listen((_req, res) => setTimeout(() => res.end('done'), 100));
		const agent = new Agent({ keepAlive: true });
		const response = get(port, agent);
		await new Promise((resolve) => setTimeout(resolve, 30));
		const started = performance.now();
		expect(await drainServer(server, 2000)).toBe('drained');
		expect(await response).toEqual({ status: 200, body: 'done' });
		expect(performance.now() - started).toBeLessThan(1000);
		agent.destroy();
	});

	it('cuts a hung request at the timeout', async () => {
		const { server, port } = await listen(() => undefined);
		const response = get(port).catch((error: Error) => error.message);
		await new Promise((resolve) => setTimeout(resolve, 30));
		expect(await drainServer(server, 200)).toBe('forced');
		expect(await response).toMatch(/socket hang up|ECONNRESET/);
	});
});

import type { Server } from 'node:http';

/** How a drain ended: every request finished, or the timeout cut the remaining connections. */
export type DrainResult = 'drained' | 'forced';

/** How often idle keep-alive sockets are swept while draining. */
const IDLE_SWEEP_MS = 100;

/**
 * Stop accepting connections, let in-flight requests finish, then resolve. Idle keep-alive sockets are
 * closed at once and again every {@link IDLE_SWEEP_MS} (a socket that was busy turns idle once its
 * response ends, and neither Node nor Bun closes it then); past `timeoutMs` the remaining connections
 * are destroyed.
 * @param server - The listening HTTP server.
 * @param timeoutMs - Grace period, below the orchestrator's kill delay (Coolify and Docker: 10 s).
 * @returns `drained` or `forced`.
 */
export function drainServer(server: Server, timeoutMs: number): Promise<DrainResult> {
	return new Promise((resolve) => {
		const sweep = setInterval(() => server.closeIdleConnections(), IDLE_SWEEP_MS);
		const timer = setTimeout(() => {
			clearInterval(sweep);
			server.closeAllConnections();
			resolve('forced');
		}, timeoutMs);
		sweep.unref();
		timer.unref();
		server.close(() => {
			clearInterval(sweep);
			clearTimeout(timer);
			resolve('drained');
		});
		server.closeIdleConnections();
	});
}

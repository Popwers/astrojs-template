import { createServer } from 'node:http';
import { fileURLToPath } from 'node:url';

import { servePrecompressed, type Listener } from './precompressed.ts';
import { drainServer } from './shutdown.ts';
import { indexStaticFiles } from './staticFiles.ts';

/** What the built `dist/server/entry.mjs` exports in standalone mode with autostart disabled. */
export interface AstroNodeEntry {
	handler: Listener;
	options: { host: string | boolean; port: number };
}

/** Grace period on SIGTERM: under the 10 s Docker / Coolify wait before SIGKILL. */
const DEFAULT_SHUTDOWN_TIMEOUT_MS = 8000;

function listenHost(host: string | boolean): string {
	if (host === true) return '0.0.0.0';
	if (host === false) return 'localhost';
	return host;
}

/**
 * Serve the Astro build: precompressed assets and cache headers in front of the adapter's handler, and
 * a graceful exit on SIGTERM/SIGINT (no new connection, in-flight requests finish, then exit 0).
 * `HOST`, `PORT` and `SHUTDOWN_TIMEOUT_MS` override the defaults.
 * @param entry - The adapter's exports.
 * @param clientDir - URL of `dist/client`.
 */
export function startServer(entry: AstroNodeEntry, clientDir: URL): void {
	const files = indexStaticFiles(fileURLToPath(clientDir), '/_astro/');
	const server = createServer(servePrecompressed(files, entry.handler));
	const port = Number(process.env.PORT ?? entry.options.port);
	const host = process.env.HOST ?? listenHost(entry.options.host);
	const timeoutMs = Number(process.env.SHUTDOWN_TIMEOUT_MS ?? DEFAULT_SHUTDOWN_TIMEOUT_MS);

	server.listen(port, host, () => {
		console.info(`Server listening on http://${host}:${port} (${files.size} static files indexed)`);
	});

	const stop = async (signal: NodeJS.Signals) => {
		console.info(`${signal} received: draining connections (up to ${timeoutMs} ms)`);
		const result = await drainServer(server, timeoutMs);
		console.info(`Server closed (${result})`);
		process.exit(result === 'drained' ? 0 : 1);
	};
	process.once('SIGTERM', stop);
	process.once('SIGINT', stop);
}

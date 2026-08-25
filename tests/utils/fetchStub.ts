type FetchInput = Parameters<typeof globalThis.fetch>[0];
type FetchInit = Parameters<typeof globalThis.fetch>[1];

/** A stand-in for the global `fetch`, minus the runtime-specific extras. */
type FetchHandler = (input: FetchInput, init: FetchInit) => Promise<Response>;

/**
 * Swap `globalThis.fetch` for `handler`, carrying over the runtime-specific members
 * (Bun hangs `preconnect` off `fetch`) so the global keeps its declared shape.
 */
function installFetchStub(handler: FetchHandler): void {
	globalThis.fetch = Object.assign(handler, { preconnect: globalThis.fetch.preconnect });
}

/** The target URL of a fetch call, whichever input form the caller used. */
function fetchUrl(input: FetchInput): string {
	if (input instanceof URL) return input.href;
	if (input instanceof Request) return input.url;

	return input;
}

export { fetchUrl, installFetchStub };
export type { FetchHandler, FetchInit, FetchInput };

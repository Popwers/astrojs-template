/**
 * Filters known-but-noisy Astro/Node errors (bot scans).
 * `@astrojs/node` logs "Could not render <url>" and "Multi-level URL encoding is not allowed"
 * for each double-encoded request — expected behavior, we keep the 400 but suppress the
 * corresponding log lines.
 */
const NOISY_PATTERNS = [
	/Multi-level URL encoding is not allowed/,
	/\[@astrojs\/node\] Could not render \//,
	/Could not render \/[^\s]*%25/,
];

/** @param {string} text */
const isNoisy = (text) => NOISY_PATTERNS.some((rx) => rx.test(text));

const origStderrWrite = process.stderr.write.bind(process.stderr);
/** @type {typeof process.stderr.write} */
process.stderr.write = (chunk, ...rest) => {
	const text = chunk?.toString?.() ?? '';
	if (isNoisy(text)) return true;
	// @ts-expect-error overload variadic forwarding
	return origStderrWrite(chunk, ...rest);
};

const origConsoleError = console.error;
console.error = (...args) => {
	const joined = args.map((a) => String(a?.message ?? a?.stack ?? a ?? '')).join(' ');
	if (isNoisy(joined)) return;
	origConsoleError(...args);
};

await import('./dist/server/entry.mjs');

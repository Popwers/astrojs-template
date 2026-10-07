// Init script (`e2e.config.ts` `initScripts`): records every `console.error`, uncaught page error,
// failed same-origin load (element error, HTTP status >= 400) and CSP violation in sessionStorage,
// so it survives navigations until `fixtures.ts` reads it after the test.
(() => {
	const key = '__e2ePageErrors';
	/** @param {string} message */
	const record = (message) => {
		try {
			const list = JSON.parse(sessionStorage.getItem(key) ?? '[]');
			list.push(`${message} (${location.pathname})`);
			sessionStorage.setItem(key, JSON.stringify(list));
		} catch {
			// Storage is unavailable on opaque origins such as about:blank.
		}
	};
	const original = console.error.bind(console);
	console.error = (...args) => {
		record(args.map(String).join(' '));
		original(...args);
	};
	window.addEventListener('error', (event) => record(event.message));
	window.addEventListener('unhandledrejection', (event) => record(String(event.reason)));

	/** @param {string} url */
	const isSameOrigin = (url) => {
		try {
			return new URL(url, location.href).origin === location.origin;
		} catch {
			return false;
		}
	};
	// Capture phase: element load errors do not bubble. Third-party hosts are left out on purpose.
	window.addEventListener(
		'error',
		(event) => {
			const target = event.target;
			if (target === window || !(target instanceof Element)) return;
			const url = target.getAttribute('src') ?? target.getAttribute('href') ?? '';
			if (isSameOrigin(url)) record(`resource failed: ${url}`);
		},
		true,
	);
	try {
		new PerformanceObserver((list) => {
			for (const entry of list.getEntries()) {
				const { responseStatus } = /** @type {PerformanceResourceTiming} */ (entry);
				if (responseStatus >= 400 && isSameOrigin(entry.name))
					record(`status ${responseStatus}: ${entry.name}`);
			}
		}).observe({ type: 'resource', buffered: true });
	} catch {
		// The resource entry type is not supported.
	}
	document.addEventListener('securitypolicyviolation', (event) =>
		record(`CSP violation: ${event.violatedDirective} ${event.blockedURI}`),
	);
})();

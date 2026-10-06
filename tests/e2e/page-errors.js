// Init script (`e2e.config.ts` `initScripts`): records every `console.error` and uncaught page
// error in sessionStorage, so it survives navigations until `fixtures.ts` reads it after the test.
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
})();

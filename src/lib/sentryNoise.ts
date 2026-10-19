type NoiseCandidate = {
	exception?: {
		values?: {
			type?: string;
			value?: string;
		}[];
	};
};

/**
 * Rejections Astro's ClientRouter (`router.js`) leaves unhandled when a navigation starts before
 * the previous one ends: it calls `controller.abort()` with no reason on the previous fetch and
 * `skipTransition()` on the previous view transition. Anchored on the `${type}: ${value}` form
 * Sentry's `ignoreErrors` tests, so any other AbortError is reported. Wording per engine:
 * - `signal is aborted without reason`: Chromium `abort()` with no reason (`abort_signal.cc`).
 *   The trailing-space variant is not in that source.
 * - `The operation was aborted. ` (Gecko, trailing space, `domerr.msg`) and
 *   `The operation was aborted.` (WebKit, `DOMException.cpp`): default AbortError message, the
 *   reason of `abort()` with no reason.
 * - `Fetch is aborted`: WebKit fetch aborted through its signal (`FetchResponse.cpp`).
 * - `The user aborted a request.`: Chromium default AbortError message, for an AbortError
 *   created without one (`dom_exception.cc`).
 * - `Transition was skipped`: Chromium `skipTransition()` or a newer transition. Chromium trunk
 *   appends the reason: `. skipTransition() called`, `. New ViewTransition started`
 *   (`dom_view_transition.cc`, `view_transition_skip_reason.cc`).
 * - `Skipped ViewTransition due to skipTransition() call`, `Skipped ViewTransition due to
 *   another transition starting`: Gecko (`ViewTransition.cpp`).
 * - `Skipping view transition because skipTransition() was called.`, `Old view transition
 *   aborted by new view transition.`: WebKit (`ViewTransition.cpp`).
 */
export const ABORTED_NAVIGATION_ERROR =
	/^AbortError: (?:signal is aborted without reason ?|The operation was aborted\. ?|Fetch is aborted|Transition was skipped(?:\. (?:skipTransition\(\) called|New ViewTransition started))?|Old view transition aborted by new view transition\.|The user aborted a request\.|Skipped ViewTransition due to (?:skipTransition\(\) call|another transition starting)|Skipping view transition because skipTransition\(\) was called\.)$/;

/**
 * View transitions Chromium cannot run (unsupported layout or style, viewport size changed,
 * snapshot capture failed, DOM update timed out) reject the transition promises with an
 * `InvalidStateError` or a `TimeoutError` worded `Transition was aborted because of ...`, followed
 * on recent builds by the reason (`dom_view_transition.cc`, `view_transition_skip_reason.cc`).
 * Anchored on the exception name and the whole phrase, so an application error that quotes it is
 * reported.
 */
export const ABORTED_VIEW_TRANSITION =
	/^(?:InvalidStateError|TimeoutError): Transition was aborted because of (?:invalid state|timeout in DOM update)(?:\.(?: .+)?)?$/;

/**
 * Client errors that are not application bugs. Sentry tests each entry against the last
 * exception's value and against `${type}: ${value}`: a string matches as a substring, so the
 * targeted entries are RegExps anchored on the `${type}: ${value}` form. The strings left are long,
 * specific phrases of the browser or of a third-party tool, never a generic word.
 *
 * `play()` interruptions (`AbortError: The play() request was interrupted ...`) are not listed:
 * this template plays no media. A project that does adds an anchored pattern for them.
 */
export const IGNORE_SENTRY_ERRORS: readonly (string | RegExp)[] = [
	ABORTED_NAVIGATION_ERROR,
	ABORTED_VIEW_TRANSITION,
	// Older browser wordings of a view transition skipped on a viewport resize or a hidden document.
	'Skipped view transition due to viewport resize',
	'View transition was skipped because document visibility state is hidden',
	// Web components re-registered or re-attached by the ClientRouter on client navigation.
	'already hosts a shadow tree',
	'Unable to re-attach to existing ShadowDOM',
	'has already been used with this registry',
	/^TypeError: Invalid value used as weak map key$/,
	// iOS/Safari Password AutoFill internals (WebKit `FormMetadata.js`) throw on some login forms.
	'_logicalFormForControl',
	// Android/iOS in-app WebView bridges.
	'Java object is gone',
	'Java exception was raised during method invocation',
	'window.webkit.messageHandlers',
	// Outlook/Bing link-preview crawler running the page's scripts.
	'Object Not Found Matching Id',
];

const NETWORK_FAILURE_SUBSTRINGS = ['Load failed', 'NetworkError when attempting to fetch resource'];

const CHROMIUM_ABORTED_FETCH = /^Failed to fetch( \([^)]*\))?$/;

const FAILED_FETCH_HOST = / \(([^()]+)\)$/;

const isAbortedFetchMessage = (value: string | undefined): value is string =>
	value !== undefined &&
	(CHROMIUM_ABORTED_FETCH.test(value) ||
		NETWORK_FAILURE_SUBSTRINGS.some((message) => value.includes(message)));

const hostOf = (url: string): string[] => {
	try {
		return [new URL(url).host];
	} catch {
		return [];
	}
};

const targetsApi = (value: string, apiHosts: ReadonlySet<string>): boolean => {
	const host = FAILED_FETCH_HOST.exec(value)?.[1];
	return host !== undefined && apiHosts.has(host);
};

/**
 * Whether an event is a `fetch()` that died on the visitor's network rather than a failed call
 * to our API.
 *
 * A phone leaving coverage, a tab closed mid-request, a ClientRouter navigation or a prefetch cut
 * short, or a navigation away while an Astro server island is still streaming all reject
 * `fetch()` with a `TypeError` carrying no frame of ours. Nothing to fix: the request never
 * reached the server.
 *
 * The same `TypeError` also hides a CMS outage, a 5xx answered without CORS headers or a CORS
 * misconfiguration on a cross-origin call, so a failure whose target is one of `apiOrigins` is
 * kept. The target comes from the message: `@sentry/core`'s fetch instrumentation appends the
 * request host (`Failed to fetch (api.your-project.fr)`) for absolute URLs. A same-origin call
 * made with a relative URL gets no host; its server answers errors with a response, so its
 * `TypeError` can only be the network. Breadcrumbs are not used: they cannot tie a failed
 * request to this exception, and `request.url` is the page, not the request.
 *
 * @param event - The event Sentry is about to send.
 * @param apiOrigins - Base URLs of our API and CMS, e.g. the `STRAPI_URL` value.
 * @returns `true` when the event is visitor network noise and should be dropped.
 */
export const isVisitorNetworkFailure = (event: NoiseCandidate, apiOrigins: readonly string[]): boolean => {
	// The outermost error comes last; a network failure linked as the `cause` of our own error is kept.
	const values = event.exception?.values ?? [];
	const exception = values[values.length - 1];
	return (
		exception?.type === 'TypeError' &&
		isAbortedFetchMessage(exception.value) &&
		!targetsApi(exception.value, new Set(apiOrigins.flatMap(hostOf)))
	);
};

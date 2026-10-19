import { IGNORE_SENTRY_ERRORS, isVisitorNetworkFailure } from '@lib/sentryNoise';
import { eventFiltersIntegration, type ErrorEvent } from '@sentry/astro';
import { describe, expect, test } from 'vitest';

const sentryFilter = eventFiltersIntegration({
	ignoreErrors: [...IGNORE_SENTRY_ERRORS],
	disableErrorDefaults: true,
});

type FilterClient = Parameters<NonNullable<typeof sentryFilter.processEvent>>[2];

// SAFETY: without setup(), processEvent only reads client.getOptions(), which the stub answers.
const client = { getOptions: () => ({}) } as FilterClient;

/** Runs an event through the SDK's own `ignoreErrors` matching. */
const isIgnored = (event: ErrorEvent): boolean => sentryFilter.processEvent?.(event, {}, client) === null;

/** Error or DOMException with a stack: the browser SDK keeps its name and message apart. */
const thrown = (type: string, value: string): ErrorEvent => ({
	type: undefined,
	exception: { values: [{ type, value }] },
});

/** DOMException without a stack: the browser SDK folds the name into the message. */
const stacklessDomException = (name: string, message: string): ErrorEvent => ({
	type: undefined,
	message: `${name}: ${message}`,
	exception: { values: [{ type: 'Error', value: `${name}: ${message}` }] },
});

describe('IGNORE_SENTRY_ERRORS', () => {
	describe('AbortError: only a cancelled navigation or view transition', () => {
		test.each([
			['Chromium navigation abort', 'signal is aborted without reason'],
			['Chromium navigation abort with a trailing space', 'signal is aborted without reason '],
			['Gecko navigation abort', 'The operation was aborted. '],
			['WebKit navigation abort', 'The operation was aborted.'],
			['WebKit aborted fetch', 'Fetch is aborted'],
			['Chromium aborted fetch', 'The user aborted a request.'],
			// Chromium core/view_transition/dom_view_transition.cc:133
			['Chromium skipped view transition', 'Transition was skipped'],
			// Chromium core/view_transition/dom_view_transition.cc:27 + view_transition_skip_reason.cc:16
			['Chromium trunk skipTransition() skip', 'Transition was skipped. skipTransition() called'],
			// Chromium core/view_transition/dom_view_transition.cc:27 + view_transition_skip_reason.cc:18
			[
				'Chromium trunk superseded view transition',
				'Transition was skipped. New ViewTransition started',
			],
			// Gecko dom/view-transitions/ViewTransition.cpp:1799 (mozilla-central)
			['Gecko skipTransition() skip', 'Skipped ViewTransition due to skipTransition() call'],
			// Gecko dom/view-transitions/ViewTransition.cpp:1803 (mozilla-central)
			['Gecko superseded view transition', 'Skipped ViewTransition due to another transition starting'],
			// WebKit Source/WebCore/dom/ViewTransition.cpp:256
			['WebKit skipTransition() skip', 'Skipping view transition because skipTransition() was called.'],
			// WebKit Source/WebCore/dom/ViewTransition.cpp:159
			['WebKit superseded view transition', 'Old view transition aborted by new view transition.'],
		])('drops the %s', (_label, message) => {
			expect(isIgnored(thrown('AbortError', message))).toBe(true);
			expect(isIgnored(stacklessDomException('AbortError', message))).toBe(true);
		});

		test.each([
			['a failed push subscription', 'Registration failed - push service error'],
			// Chromium core/view_transition/view_transition_skip_reason.cc:20
			['a view transition skipped on a hidden document', 'Transition was skipped. Document hidden'],
			// Chromium core/html/media/html_media_element.cc:5053 + 5015 + 5054
			[
				'an interrupted play(), which this template never starts',
				'The play() request was interrupted by a call to pause(). https://goo.gl/LdLk22',
			],
			[
				'an aborted request with its own message',
				'The operation was aborted due to a checkout timeout',
			],
		])('reports %s', (_label, message) => {
			expect(isIgnored(thrown('AbortError', message))).toBe(false);
			expect(isIgnored(stacklessDomException('AbortError', message))).toBe(false);
		});

		test.each([
			[
				'TypeError',
				"Cannot read properties of undefined (reading 'x') after Skipped ViewTransition due to skipTransition() call",
			],
			['Error', 'Skipped ViewTransition due to another transition starting in checkout'],
			['Error', 'Transition was skipped. skipTransition() called twice'],
			['Error', 'signal is aborted without reason'],
		])('reports a %s quoting an abort wording', (type, message) => {
			expect(isIgnored(thrown(type, message))).toBe(false);
		});
	});

	describe('Transition was aborted: only the browser rejecting a view transition it cannot run', () => {
		test.each([
			// Chromium core/view_transition/dom_view_transition.cc:29 (older builds, no reason)
			['InvalidStateError', 'Transition was aborted because of invalid state'],
			// Chromium dom_view_transition.cc:29 + view_transition_skip_reason.cc (the reason follows)
			['InvalidStateError', 'Transition was aborted because of invalid state.'],
			[
				'InvalidStateError',
				'Transition was aborted because of invalid state. Unsupported layout or style',
			],
			['InvalidStateError', 'Transition was aborted because of invalid state. Viewport size changed'],
			['InvalidStateError', 'Transition was aborted because of invalid state. Snapshot capture failed'],
			// Chromium dom_view_transition.cc:31
			['TimeoutError', 'Transition was aborted because of timeout in DOM update.'],
			['TimeoutError', 'Transition was aborted because of timeout in DOM update. DOM update timed out'],
		])('drops %s: %s', (type, message) => {
			expect(isIgnored(thrown(type, message))).toBe(true);
			expect(isIgnored(stacklessDomException(type, message))).toBe(true);
		});

		test.each([
			['Error', 'Transition was aborted by the checkout flow'],
			['Error', 'Transition was aborted because of invalid state'],
			['InvalidStateError', 'Transition was aborted by the user'],
			['InvalidStateError', 'Transition was aborted because of invalid statement'],
			['TypeError', 'Transition was aborted because of timeout in DOM update'],
			['InvalidStateError', "Failed to execute 'startViewTransition' on 'Document'"],
		])('reports %s: %s', (type, message) => {
			expect(isIgnored(thrown(type, message))).toBe(false);
		});
	});

	describe('older view transition wordings', () => {
		test.each([
			['a viewport resize', 'Skipped view transition due to viewport resize'],
			['a hidden document', 'View transition was skipped because document visibility state is hidden'],
		])('drops a view transition skipped on %s', (_label, message) => {
			expect(isIgnored(thrown('AbortError', message))).toBe(true);
			expect(isIgnored(stacklessDomException('AbortError', message))).toBe(true);
		});

		test('reports an application error about a view transition', () => {
			expect(isIgnored(thrown('Error', 'View transition failed on the checkout page'))).toBe(false);
		});
	});

	describe('weak map key: only the bare V8 TypeError', () => {
		test('drops it', () => {
			expect(isIgnored(thrown('TypeError', 'Invalid value used as weak map key'))).toBe(true);
			expect(isIgnored(stacklessDomException('TypeError', 'Invalid value used as weak map key'))).toBe(
				true,
			);
		});

		test('reports an application error that quotes it', () => {
			expect(
				isIgnored(thrown('Error', 'Profile cache failed: Invalid value used as weak map key')),
			).toBe(false);
		});

		test('reports another WeakMap failure', () => {
			expect(isIgnored(thrown('TypeError', 'Invalid value used as weak set value'))).toBe(false);
		});
	});

	describe('web components re-attached by the ClientRouter', () => {
		test.each([
			// Chromium
			[
				'NotSupportedError',
				"Failed to execute 'attachShadow' on 'Element': Shadow root cannot be created on a host which already hosts a shadow tree.",
			],
			['Error', 'Unable to re-attach to existing ShadowDOM'],
			// Chromium
			[
				'NotSupportedError',
				"Failed to execute 'define' on 'CustomElementRegistry': this constructor has already been used with this registry",
			],
		])('drops %s: %s', (type, message) => {
			expect(isIgnored(thrown(type, message))).toBe(true);
		});

		test.each([
			// Chromium
			[
				'NotSupportedError',
				"Failed to execute 'attachShadow' on 'Element': This element does not support attachShadow",
			],
			// Chromium
			[
				'SyntaxError',
				"Failed to execute 'define' on 'CustomElementRegistry': \"avatar\" is not a valid custom element name",
			],
			['TypeError', "Cannot read properties of null (reading 'shadowRoot')"],
		])('reports %s: %s', (type, message) => {
			expect(isIgnored(thrown(type, message))).toBe(false);
		});
	});

	describe('Safari AutoFill internals', () => {
		test('drops the private WebKit helper failing', () => {
			expect(
				isIgnored(
					thrown('TypeError', "undefined is not an object (evaluating 'e._logicalFormForControl')"),
				),
			).toBe(true);
		});

		test('reports the same Safari wording on our own form code', () => {
			expect(
				isIgnored(thrown('TypeError', "undefined is not an object (evaluating 'this.form.submit')")),
			).toBe(false);
		});
	});

	describe('in-app WebView bridges and link-preview crawlers', () => {
		test.each([
			['Android WebView bridge removed', 'Error', 'Java object is gone'],
			['Android WebView bridge failing', 'Error', 'Java exception was raised during method invocation'],
			[
				'iOS WebView bridge missing',
				'TypeError',
				"undefined is not an object (evaluating 'window.webkit.messageHandlers.observer.postMessage')",
			],
			[
				'Outlook link-preview crawler',
				'Error',
				'Non-Error promise rejection captured with value: Object Not Found Matching Id:3, MethodName:update, ParamCount:4',
			],
		])('drops the %s', (_label, type, message) => {
			expect(isIgnored(thrown(type, message))).toBe(true);
			expect(isIgnored(stacklessDomException(type, message))).toBe(true);
		});

		test.each([
			['TypeError', "undefined is not an object (evaluating 'window.webkit.foo.postMessage')"],
			['Error', 'Java object cache is empty'],
			['Error', 'Object not found: user 42'],
		])('reports a near miss: %s %s', (type, message) => {
			expect(isIgnored(thrown(type, message))).toBe(false);
		});
	});

	test('reports an ordinary bug', () => {
		expect(
			isIgnored(thrown('TypeError', "Cannot read properties of undefined (reading 'documentId')")),
		).toBe(false);
	});
});

const API_ORIGINS = ['https://api.your-project.fr'];

const typeError = (value: string) => ({ exception: { values: [{ type: 'TypeError', value }] } });

describe('isVisitorNetworkFailure', () => {
	describe('drops visitor network noise', () => {
		test.each([
			['WebKit, same-origin server island', 'Load failed'],
			['Chromium, same-origin call', 'Failed to fetch'],
			['Gecko, same-origin call', 'NetworkError when attempting to fetch resource.'],
			['a third-party API', 'Failed to fetch (api.example.com)'],
			['an absolute call to the page origin', 'Load failed (your-project.fr)'],
		])('drops a failure on %s', (_label, message) => {
			expect(isVisitorNetworkFailure(typeError(message), API_ORIGINS)).toBe(true);
		});

		test('drops it whatever the mechanism says', () => {
			const handled = {
				exception: {
					values: [{ type: 'TypeError', value: 'Load failed', mechanism: { handled: true } }],
				},
			};

			expect(isVisitorNetworkFailure(handled, API_ORIGINS)).toBe(true);
		});

		test('drops a network failure that wraps a cause', () => {
			const event = {
				exception: {
					values: [
						{ type: 'Error', value: 'Avatar island hydration failed' },
						{ type: 'TypeError', value: 'Load failed' },
					],
				},
			};

			expect(isVisitorNetworkFailure(event, API_ORIGINS)).toBe(true);
		});

		test('ignores an unparsable origin', () => {
			expect(isVisitorNetworkFailure(typeError('Load failed'), [''])).toBe(true);
		});
	});

	describe('reports a failed call to our API', () => {
		test.each([
			['Chromium', 'Failed to fetch (api.your-project.fr)'],
			['WebKit', 'Load failed (api.your-project.fr)'],
			['Gecko', 'NetworkError when attempting to fetch resource. (api.your-project.fr)'],
		])('reports the %s wording', (_engine, message) => {
			expect(isVisitorNetworkFailure(typeError(message), API_ORIGINS)).toBe(false);
		});

		test('matches the origin port, as the SDK writes the host', () => {
			expect(
				isVisitorNetworkFailure(typeError('Failed to fetch (localhost:1337)'), [
					'http://localhost:1337',
				]),
			).toBe(false);
			expect(
				isVisitorNetworkFailure(typeError('Failed to fetch (localhost:4321)'), [
					'http://localhost:1337',
				]),
			).toBe(true);
		});

		test('accepts an origin with a path', () => {
			expect(
				isVisitorNetworkFailure(typeError('Load failed (api.your-project.fr)'), [
					'https://api.your-project.fr/api',
				]),
			).toBe(false);
		});
	});

	describe('keeps everything else', () => {
		test('keeps a TypeError that is a real bug', () => {
			expect(isVisitorNetworkFailure(typeError('user is undefined'), API_ORIGINS)).toBe(false);
		});

		test('keeps a Chrome chunk-load TypeError, a broken deploy rather than a visitor network failure', () => {
			expect(
				isVisitorNetworkFailure(
					typeError(
						'Failed to fetch dynamically imported module: https://your-project.fr/_astro/vendor-react.abc123.js',
					),
					API_ORIGINS,
				),
			).toBe(false);
		});

		test('keeps our own error whose cause is a network failure', () => {
			const event = {
				exception: {
					values: [
						{ type: 'TypeError', value: 'Load failed' },
						{ type: 'Error', value: 'Avatar island hydration failed' },
					],
				},
			};

			expect(isVisitorNetworkFailure(event, API_ORIGINS)).toBe(false);
		});

		test('keeps a non-TypeError carrying the same wording', () => {
			const event = { exception: { values: [{ type: 'AbortError', value: 'Load failed' }] } };

			expect(isVisitorNetworkFailure(event, API_ORIGINS)).toBe(false);
		});

		test.each([
			['an event with no exception', {}],
			['an event with no values', { exception: {} }],
			['an event with an empty value list', { exception: { values: [] } }],
			['an exception with no message', { exception: { values: [{ type: 'TypeError' }] } }],
		])('keeps %s', (_label, event) => {
			expect(isVisitorNetworkFailure(event, API_ORIGINS)).toBe(false);
		});
	});
});

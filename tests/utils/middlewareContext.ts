import type { APIContext, MiddlewareHandler } from 'astro';

import { signCookiePayload } from '../../src/lib/signedCookie';
import { createTestCookies, type CookieValue, type TestCookieJar } from './cookieJar';

/**
 * The slice of Astro's `APIContext` the middlewares under test actually read:
 * the request URL, the session locals, the cookie jar and `redirect`.
 */
interface TestMiddlewareContext {
	cookies: TestCookieJar;
	locals: App.Locals;
	url: URL;
	redirect: (path: string, status: number) => Response;
}

function isPlainObjectCookie(value: CookieValue | undefined): boolean {
	return Boolean(value) && Object.prototype.toString.call(value) === '[object Object]';
}

/**
 * Sign object-shaped `user_data` the same way production cookies are written.
 */
function prepareCookies(initialCookies: Record<string, CookieValue>) {
	const prepared = { ...initialCookies };
	if (isPlainObjectCookie(prepared.user_data)) {
		prepared.user_data = signCookiePayload(JSON.stringify(prepared.user_data));
	}
	return prepared;
}

/**
 * Build a fake middleware context for `path`, pre-seeded with `initialCookies`.
 */
function createMiddlewareContext(
	path: string,
	initialCookies: Record<string, CookieValue> = {},
): TestMiddlewareContext {
	return {
		cookies: createTestCookies(prepareCookies(initialCookies)),
		locals: {
			user: null,
			userToken: '',
		},
		url: new URL(`https://example.com${path}`),
		redirect(redirectPath, status) {
			return new Response(null, {
				status,
				headers: { Location: redirectPath },
			});
		},
	};
}

/**
 * Hand the fake context to code that declares an Astro `APIContext`.
 *
 * A real `APIContext` can only be produced by Astro's request pipeline, so a unit test
 * has to substitute one.
 */
function asApiContext(context: TestMiddlewareContext): APIContext {
	// SAFETY: the fake implements every member the middlewares touch — `url`, `locals`,
	// `redirect` and the `has`/`get`/`set`/`delete` cookie surface. Any other member is
	// absent at runtime, so a middleware reaching past this slice throws instead of
	// silently reading `undefined`.
	return context as never;
}

/**
 * Run a middleware against the fake context and assert it resolved to a `Response`
 * (the runtime contract under test).
 */
async function runMiddleware(
	middleware: MiddlewareHandler,
	context: TestMiddlewareContext,
	next: () => Promise<Response>,
): Promise<Response> {
	const result = await middleware(asApiContext(context), next);
	if (!(result instanceof Response)) {
		throw new Error('middleware did not return a Response');
	}

	return result;
}

export { asApiContext, createMiddlewareContext, runMiddleware };
export type { TestMiddlewareContext };

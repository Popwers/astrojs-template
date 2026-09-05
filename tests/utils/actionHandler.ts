import type { User } from '@interfaces/user';

import { createTestCookies, type CookieValue, type TestCookieJar } from './cookieJar';

/** The slice of `ActionAPIContext` the actions under test read. */
interface ActionTestContext {
	locals: App.Locals;
	cookies: TestCookieJar;
	request: Request;
}

/**
 * An Astro action seen from a unit test.
 *
 * tsgo resolves `astro:actions` to the real module, whose `defineAction` returns a callable
 * client exposing `orThrow` but no `handler`; Bun resolves it to the pass-through stub, which
 * hands back the definition object and therefore keeps `handler`. Declaring both members
 * optional lets the same call site type-check against the real module while running against
 * the stub.
 */
interface ActionUnderTest<TInput, TOutput> {
	handler?: (input: TInput, context: ActionTestContext) => Promise<TOutput>;
	/** Present only on the real action client; keeps this interface from being a weak type. */
	orThrow?: unknown;
}

/**
 * Invoke an Astro action's `handler` directly, bypassing the action client and its validation.
 *
 * @param action - The action whose handler to invoke.
 * @returns The action's handler.
 */
function handlerOf<TInput = unknown, TOutput = unknown>(
	action: ActionUnderTest<TInput, TOutput>,
): (input: TInput, context: ActionTestContext) => Promise<TOutput> {
	const { handler } = action;
	if (!handler) {
		throw new Error('handlerOf: the astro:actions test stub is not wired — the action has no handler.');
	}

	return handler;
}

/**
 * Build a fake action context: the session locals plus an in-memory cookie jar.
 *
 * @param user - The session user, or `null` for an anonymous request.
 * @param userToken - The session JWT.
 * @param initialCookies - Cookies the jar starts with.
 */
function createActionContext(
	user: Partial<User> | null = null,
	userToken = '',
	initialCookies: Record<string, CookieValue> = {},
): ActionTestContext {
	return {
		locals: { user, userToken },
		cookies: createTestCookies(initialCookies),
		request: new Request('http://localhost/test'),
	};
}

export { createActionContext, handlerOf };
export type { ActionTestContext, ActionUnderTest };

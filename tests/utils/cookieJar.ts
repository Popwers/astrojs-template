import type { JsonValue } from '@interfaces/json';
import type { CookieUser } from '@lib/userCookie';

/**
 * What the in-memory jar can hold: the `CookieUser` payload the session helpers write,
 * or any other JSON a test seeds the jar with.
 */
type CookieValue = CookieUser | JsonValue;

/** A cookie entry as Astro exposes it: the serialized value plus its decoded form. */
interface TestCookie {
	value: string;
	json: () => CookieValue;
}

/**
 * In-memory stand-in for Astro's cookie API, exposing only the `has`/`get`/`set`/`delete`
 * surface the code under test relies on, plus the backing `store` for assertions.
 */
interface TestCookieJar {
	has: (name: string) => boolean;
	get: (name: string) => TestCookie | undefined;
	set: (name: string, value: CookieValue) => void;
	delete: (name: string) => void;
	store: Map<string, CookieValue>;
}

/** Narrow a stored value to the string form, which is served verbatim instead of re-encoded. */
const isStoredString = (value: CookieValue | undefined): value is string => typeof value === 'string';

/**
 * Build a fresh cookie jar, optionally pre-seeded with the cookies a test needs.
 */
function createTestCookies(initialValues: Record<string, CookieValue> = {}): TestCookieJar {
	const store = new Map<string, CookieValue>(Object.entries(initialValues));

	return {
		has(name) {
			return store.has(name);
		},
		get(name) {
			const value = store.get(name);
			if (value === undefined) return undefined;

			return {
				value: isStoredString(value) ? value : JSON.stringify(value),
				json: () => value,
			};
		},
		set(name, value) {
			store.set(name, value);
		},
		delete(name) {
			store.delete(name);
		},
		store,
	};
}

export { createTestCookies };
export type { CookieValue, TestCookie, TestCookieJar };

import { afterEach, describe, expect, it } from 'bun:test';

import { hasStoredConsent, updateConsent } from '../../src/stores/consentStore';

const originalLocalStorage = globalThis.localStorage;
const originalLocation = globalThis.location;

const installStorage = (store: Map<string, string>, throwOnGet = false, throwOnSet = false) => {
	Object.defineProperty(globalThis, 'localStorage', {
		configurable: true,
		value: {
			getItem(key: string) {
				if (throwOnGet) throw new Error('storage blocked');
				return store.get(key) ?? null;
			},
			setItem(key: string, value: string) {
				if (throwOnSet) throw new Error('storage blocked');
				store.set(key, value);
			},
			removeItem(key: string) {
				store.delete(key);
			},
			clear() {
				store.clear();
			},
		},
	});
};

describe('consentStore', () => {
	afterEach(() => {
		if (originalLocalStorage) {
			Object.defineProperty(globalThis, 'localStorage', {
				configurable: true,
				value: originalLocalStorage,
			});
		} else {
			Reflect.deleteProperty(globalThis, 'localStorage');
		}

		if (originalLocation) {
			Object.defineProperty(globalThis, 'location', {
				configurable: true,
				value: originalLocation,
			});
		}
	});

	it('reports no stored consent when the key is absent', () => {
		installStorage(new Map());
		expect(hasStoredConsent()).toBe(false);
	});

	it('reports stored consent as soon as the key exists', () => {
		installStorage(new Map([['cookie-consent', 'not-json']]));
		expect(hasStoredConsent()).toBe(true);
	});

	it('returns false when localStorage is blocked', () => {
		installStorage(new Map(), true);
		expect(hasStoredConsent()).toBe(false);
	});

	it('persists preferences then reloads', () => {
		const store = new Map<string, string>();
		installStorage(store);
		let reloadCount = 0;
		Object.defineProperty(globalThis, 'location', {
			configurable: true,
			value: {
				reload: () => {
					reloadCount += 1;
				},
			},
		});

		updateConsent({ functional: true, analytics: false });

		expect(store.get('cookie-consent')).toBe(
			JSON.stringify({
				hasConsented: true,
				preferences: { functional: true, analytics: false },
			}),
		);
		expect(reloadCount).toBe(1);
	});

	it('still reloads when localStorage write fails', () => {
		installStorage(new Map(), false, true);
		let reloadCount = 0;
		Object.defineProperty(globalThis, 'location', {
			configurable: true,
			value: {
				reload: () => {
					reloadCount += 1;
				},
			},
		});

		updateConsent({ functional: true, analytics: true });
		expect(reloadCount).toBe(1);
	});
});

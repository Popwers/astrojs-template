import { isJsonObject, parseJson } from '@lib/json';

const CONSENT_STORAGE_KEY = 'cookie-consent';

interface ConsentPreferences {
	analytics: boolean;
	functional: boolean;
}

/**
 * Persist cookie-category choices and reload so the rest of the page can read them.
 * @param preferences - Category flags to store
 */
export const updateConsent = (preferences: ConsentPreferences) => {
	try {
		localStorage.setItem(
			CONSENT_STORAGE_KEY,
			JSON.stringify({
				hasConsented: true,
				preferences,
			}),
		);
	} catch (error) {
		console.error('Error saving consent to localStorage', error);
	}

	globalThis.location.reload();
};

/**
 * Whether a consent record is already stored (valid JSON is not required).
 * @returns true when the storage key is present
 */
export const hasStoredConsent = (): boolean => {
	try {
		return localStorage.getItem(CONSENT_STORAGE_KEY) !== null;
	} catch {
		return false;
	}
};

/**
 * Whether the visitor accepted analytics cookies. Unreadable storage, a malformed record or any value
 * other than `analytics: true` counts as a refusal.
 * @returns true only for a stored `preferences.analytics === true`
 */
export const hasAnalyticsConsent = (): boolean => {
	try {
		const raw = localStorage.getItem(CONSENT_STORAGE_KEY);
		if (raw === null) return false;
		const record = parseJson(raw);
		if (!isJsonObject(record)) return false;
		const preferences = record.preferences;
		return isJsonObject(preferences) && preferences.analytics === true;
	} catch {
		return false;
	}
};

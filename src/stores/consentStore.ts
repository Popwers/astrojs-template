import { observable } from '@legendapp/state';

interface ConsentState {
	hasConsented: boolean;
	preferences: {
		analytics: boolean;
		functional: boolean;
	};
}

/** Versioned key so shape changes can ignore stale payloads (WCAG/storage hygiene). */
const CONSENT_STORAGE_KEY = 'cookie-consent:v1';
const CONSENT_STORAGE_KEY_LEGACY = 'cookie-consent';

/**
 * Update the consent state
 * @param preferences - The preferences to update
 */
export const updateConsent = (preferences: { analytics: boolean; functional: boolean }) => {
	consentStore.set({
		hasConsented: true,
		preferences,
	});
	try {
		localStorage.setItem(
			CONSENT_STORAGE_KEY,
			JSON.stringify({
				hasConsented: true,
				preferences,
			}),
		);
		localStorage.removeItem(CONSENT_STORAGE_KEY_LEGACY);
	} catch (error) {
		console.error('Error saving consent to localStorage', error);
	}

	// Reload the page to apply the preferences
	window.location.reload();
};

/**
 * Observable store tracking the user's cookie consent and category preferences.
 */
const initialConsent: ConsentState = {
	hasConsented: false,
	preferences: {
		analytics: false,
		functional: false,
	},
};

const consentStore = observable(initialConsent);

/**
 * Load consent preferences from localStorage
 */
if (!import.meta.env.SSR) {
	const savedConsent =
		localStorage.getItem(CONSENT_STORAGE_KEY) ?? localStorage.getItem(CONSENT_STORAGE_KEY_LEGACY);
	if (savedConsent) {
		const parsed = JSON.parse(savedConsent);
		consentStore.set(parsed);
	}
}

export default consentStore;

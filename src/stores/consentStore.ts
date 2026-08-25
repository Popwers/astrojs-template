import { observable } from '@legendapp/state';

interface ConsentState {
	hasConsented: boolean;
	preferences: {
		analytics: boolean;
		functional: boolean;
	};
}

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
			'cookie-consent',
			JSON.stringify({
				hasConsented: true,
				preferences,
			}),
		);
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
	const savedConsent = localStorage.getItem('cookie-consent');
	if (savedConsent) {
		const parsed = JSON.parse(savedConsent);
		consentStore.set(parsed);
	}
}

export default consentStore;

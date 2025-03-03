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
 * @returns {void}
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
			})
		);
	} catch (error) {
		console.error('Error saving consent to localStorage', error);
	}

	// Reload the page to apply the preferences
	window.location.reload();
};

/**
 * The consent store
 */
const consentStore = observable({
	hasConsented: false,
	preferences: {
		analytics: false,
		functional: false,
	},
} as ConsentState);

/**
 * Load consent preferences from localStorage
 */
if (typeof window !== 'undefined') {
	const savedConsent = localStorage.getItem('cookie-consent');
	if (savedConsent) {
		const parsed = JSON.parse(savedConsent);
		consentStore.set(parsed);
	}
}

export default consentStore;

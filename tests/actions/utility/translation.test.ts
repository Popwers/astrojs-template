import { describe, expect, it } from 'bun:test';

import TRANSLATIONS from '@actions/utility/translation.json';

describe('action error translations', () => {
	it('covers both timeout messages emitted by Node and Bun DOMException variants', () => {
		const timeoutMessage = 'Le serveur est injoignable, veuillez réessayer dans quelques instants';

		expect(TRANSLATIONS['The operation timed out.']).toBe(timeoutMessage);
		expect(TRANSLATIONS['The operation was aborted due to timeout']).toBe(timeoutMessage);
	});
});

import { errorIdOf, fieldErrorAttributes } from '@lib/fieldError';
import { describe, expect, it } from 'vite-plus/test';

describe('fieldErrorAttributes', () => {
	it('marks the input invalid and points it at the error text', () => {
		expect(fieldErrorAttributes('email', ['Adresse invalide'])).toEqual({
			'aria-invalid': 'true',
			'aria-describedby': errorIdOf('email'),
		});
	});

	it('adds nothing when the field has no error', () => {
		expect(fieldErrorAttributes('email', undefined)).toEqual({});
		expect(fieldErrorAttributes('email', [])).toEqual({});
	});
});

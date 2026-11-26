import { register } from '@actions/schema/auth';
import { describe, expect, it } from 'vite-plus/test';

describe('register schema', () => {
	it('drops a field the form never sends, so a forged one never reaches Strapi', () => {
		const result = register.safeParse({
			email: 'new@b.com',
			password: 'Secret-123!',
			passwordConfirmation: 'Secret-123!',
			master: 'forged',
		});

		expect(result.success).toBe(true);
		expect(result.data).not.toHaveProperty('master');
	});
});

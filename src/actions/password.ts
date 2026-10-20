import { forgotPassword, resetPassword } from '@actions/schema/password';
import scopedRequest from '@actions/utility/scopedRequest';
import { assertTurnstile } from '@lib/turnstile';
import { defineAction } from 'astro:actions';

/**
 * Define password reset actions
 */
export const password = {
	forgotPassword: defineAction({
		accept: 'form',
		input: forgotPassword,
		handler: async (input, context) => {
			const { assertRateLimit } = await import('@lib/rateLimit');
			assertRateLimit(context, 'password-forgot', 5, 60 * 60 * 1000);
			await assertTurnstile(context, input['cf-turnstile-response']);

			const { email } = input;
			if (
				await scopedRequest({
					endpoint: 'auth/forgot-password',
					body: {
						email,
					},
				})
			) {
				return {
					message: 'A confirmation email has been sent to your email address.',
					email,
				};
			}
		},
	}),

	resetPassword: defineAction({
		accept: 'form',
		input: resetPassword,
		handler: async (input, context) => {
			await assertTurnstile(context, input['cf-turnstile-response']);

			const { code, password, passwordConfirmation } = input;
			return await scopedRequest({
				endpoint: 'auth/reset-password',
				body: {
					code,
					password,
					passwordConfirmation,
				},
			});
		},
	}),
};

import { confirmMail, login, register } from '@actions/schema/auth';
import scopedRequest from '@actions/utility/scopedRequest';
import { clientIp } from '@lib/clientIp';
import { clearUserSession } from '@lib/session';
import { assertTurnstile } from '@lib/turnstile';
import { defineAction } from 'astro:actions';

/**
 * Define authentication and registration actions
 */
export const auth = {
	login: defineAction({
		accept: 'form',
		input: login,
		handler: async (input, context) => {
			const { assertRateLimit } = await import('@lib/rateLimit');
			assertRateLimit(context, 'auth-login', 10, 15 * 60 * 1000);
			await assertTurnstile(context, input['cf-turnstile-response']);

			const { email, password } = input;
			return await scopedRequest({
				endpoint: 'auth/local',
				clientIp: clientIp(context),
				body: {
					identifier: email,
					password,
				},
			});
		},
	}),

	register: defineAction({
		accept: 'form',
		input: register,
		handler: async (input, context) => {
			const { assertRateLimit } = await import('@lib/rateLimit');
			assertRateLimit(context, 'auth-register', 5, 60 * 60 * 1000);
			await assertTurnstile(context, input['cf-turnstile-response']);

			const { email, password } = input;
			if (
				await scopedRequest({
					endpoint: 'auth/local/register',
					clientIp: clientIp(context),
					body: {
						email,
						password,
					},
				})
			) {
				return {
					email,
				};
			}
		},
	}),

	confirmMail: defineAction({
		accept: 'form',
		input: confirmMail,
		handler: async (input, context) => {
			const { assertRateLimit } = await import('@lib/rateLimit');
			assertRateLimit(context, 'auth-confirm-mail', 5, 60 * 60 * 1000);
			await assertTurnstile(context, input['cf-turnstile-response']);

			const { email } = input;
			if (
				await scopedRequest({
					endpoint: 'auth/send-email-confirmation',
					clientIp: clientIp(context),
					body: {
						email,
					},
				})
			) {
				return {
					message: 'A confirmation email has been sent to your email address.',
				};
			}
		},
	}),

	logout: defineAction({
		accept: 'form',
		handler: async (_, context) => {
			clearUserSession(context);

			return {
				disconnect: true,
				message: 'You are now logged out.',
			};
		},
	}),
};

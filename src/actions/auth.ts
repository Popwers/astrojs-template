import { confirmMail, login, register } from '@actions/schema/auth';
import scopedRequest from '@actions/utility/scopedRequest';
import { clearUserSession } from '@lib/session';
import { defineAction } from 'astro:actions';

/**
 * Define authentication and registration actions
 */
export const auth = {
	login: defineAction({
		accept: 'form',
		input: login,
		handler: async (input) => {
			const { email, password } = input;
			return await scopedRequest({
				endpoint: 'auth/local',
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
		handler: async (input) => {
			const { email, password, master } = input;
			if (
				await scopedRequest({
					endpoint: 'auth/local/register',
					body: {
						email,
						password,
						...(master ? { master } : {}),
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
		handler: async (input) => {
			const { email } = input;
			if (
				await scopedRequest({
					endpoint: 'auth/send-email-confirmation',
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

import { defineAction } from 'astro:actions';
import scopedRequest from '@actions/utility/scopedRequest';

import { confirmMail, login, register } from '@actions/schema/auth';
import { DEFAULT_COOKIE_OPTIONS_DELETE } from '@data/cookieOptions';

/**
 * Define authentication and registration actions
 */
export const auth = {
	login: defineAction({
		accept: 'form',
		input: login,
		handler: async input => {
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
		handler: async input => {
			const { email, password } = input;
			if (
				await scopedRequest({
					endpoint: 'auth/local/register',
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
		handler: async input => {
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
					message: 'Un mail de confirmation a été envoyé à votre adresse email.',
				};
			}
		},
	}),

	logout: defineAction({
		accept: 'form',
		handler: async (_, context) => {
			context.cookies.delete('user_data', DEFAULT_COOKIE_OPTIONS_DELETE);
			context.cookies.delete('user_token', DEFAULT_COOKIE_OPTIONS_DELETE);
			context.locals.user = null;
			context.locals.userToken = '';

			return {
				disconnect: true,
				message: 'Vous êtes déconnecté.',
			};
		},
	}),
};

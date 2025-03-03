import { defineAction } from 'astro:actions';
import scopedRequest from '@actions/utility/scopedRequest';

import { forgotPassword, resetPassword } from '@actions/schema/password';

/**
 * Define password lost actions
 */
export const password = {
	forgotPassword: defineAction({
		accept: 'form',
		input: forgotPassword,
		handler: async input => {
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
					message: 'Un mail de confirmation a été envoyé à votre adresse email.',
					email,
				};
			}
		},
	}),

	resetPassword: defineAction({
		accept: 'form',
		input: resetPassword,
		handler: async input => {
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

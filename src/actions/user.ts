import { ActionError, defineAction } from 'astro:actions';
import scopedRequest from '@actions/utility/scopedRequest';

import { profile, updateAvatar, updateUser } from '@actions/schema/user';

/**
 * Define user actions
 */
export const user = {
	profile: defineAction({
		accept: 'form',
		input: profile,
		handler: async (input, context) => {
			if (!context.locals.user)
				throw new ActionError({
					code: 'UNAUTHORIZED',
					message: 'Vous devez être connecté pour modifier votre profil.',
				});

			const { username } = input;

			return await scopedRequest({
				endpoint: `users/${context.locals.user.id}`,
				body: {
					username,
				},
				token: context.locals.userToken,
				method: 'PUT',
			});
		},
	}),

	update: defineAction({
		accept: 'form',
		input: updateUser,
		handler: async (input, context) => {
			if (!context.locals.user)
				throw new ActionError({
					code: 'UNAUTHORIZED',
					message: 'Vous devez être connecté pour modifier votre profil.',
				});

			const { email, username } = input;

			const response = await scopedRequest({
				endpoint: `users/${context.locals.user.id}`,
				body: {
					email,
					username,
					confirmed: email === context.locals.user.email,
				},
				token: context.locals.userToken,
				method: 'PUT',
			});

			if ('email' in response && response.email !== context.locals.user.email) {
				await scopedRequest({
					endpoint: 'auth/send-email-confirmation',
					body: {
						email: response.email,
					},
				});

				return {
					user: response,
					warningMessage:
						'Veuillez vérifier votre nouvelle adresse email. Vous aller être redirigé vers la page de connexion dans 4 secondes.',
					code: 'user-change-email',
				};
			}

			return {
				user: response,
			};
		},
	}),

	updateAvatar: defineAction({
		accept: 'form',
		input: updateAvatar,
		handler: async (input, context) => {
			if (!context.locals.user)
				throw new ActionError({
					code: 'UNAUTHORIZED',
					message: 'Vous devez être connecté pour modifier votre avatar.',
				});

			const { avatar } = input;

			const response = await scopedRequest({
				endpoint: 'users/avatar',
				body: {
					files: {
						avatar: avatar as File,
					},
				},
				token: context.locals.userToken,
				contentType: 'multipart/form-data',
			});

			return response;
		},
	}),
};

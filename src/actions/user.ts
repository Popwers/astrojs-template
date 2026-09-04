import { deleteAccount, profile, updateAvatar, updateUser } from '@actions/schema/user';
import scopedRequest from '@actions/utility/scopedRequest';
import { requireAuth } from '@lib/authGuard';
import { defineAction } from 'astro:actions';

/**
 * Define user profile actions
 */
export const user = {
	profile: defineAction({
		accept: 'form',
		input: profile,
		handler: async (input, context) => {
			const { user, token } = requireAuth(context, 'You must be logged in to update your profile.');

			const { username } = input;

			return await scopedRequest({
				endpoint: `users/${user.id}`,
				body: {
					username,
				},
				token,
				method: 'PUT',
			});
		},
	}),

	update: defineAction({
		accept: 'form',
		input: updateUser,
		handler: async (input, context) => {
			const { user, token } = requireAuth(context, 'You must be logged in to update your profile.');

			const { email, username } = input;

			const response = await scopedRequest({
				endpoint: `users/${user.id}`,
				body: {
					email,
					username,
					// `user` is requireAuth → locals hydrated from Strapi (HMAC cookie fallback).
					confirmed: email.trim().toLowerCase() === user.email.trim().toLowerCase(),
				},
				token,
				method: 'PUT',
			});

			if ('email' in response && response.email !== user.email) {
				await scopedRequest({
					endpoint: 'auth/send-email-confirmation',
					body: {
						email: response.email,
					},
				});

				return {
					user: response,
					warningMessage:
						'Please verify your new email address. You will be redirected to the login page in 4 seconds.',
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
			const { token } = requireAuth(context, 'You must be logged in to update your avatar.');

			const { avatar } = input;

			return await scopedRequest({
				endpoint: 'users/avatar',
				body: {
					files: {
						avatar,
					},
				},
				token,
				contentType: 'multipart/form-data',
			});
		},
	}),

	deleteAccount: defineAction({
		accept: 'form',
		input: deleteAccount,
		handler: async (_, context) => {
			const { user, token } = requireAuth(context, 'You must be logged in to delete your account.');

			// Self-deletion only: the id comes from the session, never from client
			// input, so a user can never target another account (IDOR).
			await scopedRequest({
				endpoint: `users/${user.id}`,
				token,
				method: 'DELETE',
			});

			return {
				disconnect: true,
				message: 'Your account has been permanently deleted.',
			};
		},
	}),
};

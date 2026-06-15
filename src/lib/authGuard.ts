import type { User } from '@interfaces/user';
import { type ActionAPIContext, ActionError } from 'astro:actions';

/**
 * Ensures the user is authenticated. Throws an ActionError if not.
 * Use this at the start of any action handler that requires authentication.
 *
 * @param context - The Astro action API context.
 * @param message - Optional override for the error message.
 * @returns The authenticated user and token.
 *
 * @example
 * handler: async (input, context) => {
 *     const { user, token } = requireAuth(context);
 *     // user and token are guaranteed to exist here
 * }
 */
export const requireAuth = (
	context: ActionAPIContext,
	message = 'You must be logged in to perform this action.',
): { user: User; token: string } => {
	if (!context.locals.user || !context.locals.userToken) {
		throw new ActionError({
			code: 'UNAUTHORIZED',
			message,
		});
	}

	return {
		user: context.locals.user,
		token: context.locals.userToken,
	};
};

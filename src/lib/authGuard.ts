import type { User } from '@interfaces/user';
import { isPersistableUser } from '@lib/userRefresh';
import { ActionError } from 'astro:actions';

/**
 * The authenticated caller of an action: the hydrated user and the JWT that proves it.
 */
interface AuthenticatedSession {
	user: User;
	token: string;
}

/**
 * The slice of the action context this guard reads. Astro's `ActionAPIContext` satisfies it.
 */
interface SessionContext {
	locals: App.Locals;
}

/**
 * Ensures the user is authenticated. Throws an ActionError if not.
 * Use this at the start of any action handler that requires authentication.
 *
 * @param context - The action context carrying the session locals.
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
	context: SessionContext,
	message = 'You must be logged in to perform this action.',
): AuthenticatedSession => {
	if (!isPersistableUser(context.locals.user) || !context.locals.userToken) {
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

export type { AuthenticatedSession, SessionContext };

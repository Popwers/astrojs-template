import { ActionError } from 'astro:actions';
import { submitApi } from '@lib/strapi';

import type { SubmitProps } from '@interfaces/strapi';
import TRANSLATIONS from './translation.json';

const scopedRequest = async ({
	endpoint,
	body,
	token,
	method = 'POST',
	contentType = 'application/json',
}: SubmitProps) => {
	try {
		const response = await submitApi({
			endpoint,
			body,
			token,
			method,
			contentType,
		});
		if ('error' in response && response.error) {
			throw new ActionError({
				code: response.error.name === 'ForbiddenError' ? 'FORBIDDEN' : 'BAD_REQUEST',
				message: `${response.error.message}${
					response.error.details && Object.keys(response.error.details).length > 0
						? `: ${Object.values(response.error.details)
								.flat()
								.map(detail => (typeof detail === 'string' ? detail : detail.message))
								.join(', ')}`
						: ''
				}`,
			});
		}

		return response;
	} catch (error) {
		throw new ActionError({
			code: error instanceof ActionError ? error.code : 'INTERNAL_SERVER_ERROR',
			message:
				error instanceof Error
					? (TRANSLATIONS[error.message as keyof typeof TRANSLATIONS] ??
						`Une erreur est survenue : ${error.message}`)
					: 'Une erreur est survenue, veuillez réessayer dans quelques instants.',
		});
	}
};

export default scopedRequest;

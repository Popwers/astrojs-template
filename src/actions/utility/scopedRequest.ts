import type { SubmitProps } from '@interfaces/strapi';
import { submitApi } from '@lib/strapi';
import { ActionError } from 'astro:actions';

import TRANSLATIONS from './translation.json';

/** Error messages the API can return, indexed by their English wording. */
const translations: Record<string, string> = TRANSLATIONS;

/** A validation detail is either the message itself or an object carrying it. */
const isDetailText = (detail: string | { message: string }): detail is string => typeof detail === 'string';

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
								.map((detail) => (isDetailText(detail) ? detail : detail.message))
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
					? (translations[error.message] ?? `Une erreur est survenue : ${error.message}`)
					: 'Une erreur est survenue, veuillez réessayer dans quelques instants.',
		});
	}
};

export default scopedRequest;

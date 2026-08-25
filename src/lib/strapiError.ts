import type { JsonValue } from '@interfaces/json';
import type { StrapiError } from '@interfaces/strapi';
import { isJsonObject, isJsonString } from '@lib/json';

type StrapiErrorDetails = StrapiError['error']['details'];

/**
 * What a failing API call can hand to the normalizer: a decoded response body,
 * an error already built by this module, or nothing at all.
 */
type ApiFailurePayload = JsonValue | StrapiError | undefined;

function defaultErrorName(status: number): string {
	if (status === 401) return 'UnauthorizedError';
	if (status >= 500) return 'ServerError';

	return 'APIError';
}

function isStrapiErrorDetails(
	value: JsonValue | StrapiErrorDetails | undefined,
): value is StrapiErrorDetails {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Create a Strapi-compatible error payload for callers that rely on structured API failures.
 */
export function createStrapiError(
	status: number,
	message: string,
	details: StrapiErrorDetails = {},
	name = defaultErrorName(status),
): StrapiError {
	return {
		data: null,
		error: {
			status,
			name,
			message,
			details,
		},
	};
}

/**
 * Detect whether a decoded payload already matches the Strapi error contract.
 */
export function isStrapiError(value: ApiFailurePayload): value is StrapiError {
	if (!value || typeof value !== 'object' || !('error' in value)) return false;

	const error = value.error;

	return (
		typeof error === 'object' &&
		error !== null &&
		'status' in error &&
		typeof error.status === 'number' &&
		'name' in error &&
		typeof error.name === 'string' &&
		'message' in error &&
		typeof error.message === 'string' &&
		'details' in error &&
		isStrapiErrorDetails(error.details)
	);
}

/**
 * Normalize an arbitrary failure payload to a Strapi-compatible error object.
 */
export function normalizeStrapiError(
	payload: ApiFailurePayload,
	status: number,
	fallbackMessage: string,
): StrapiError {
	if (isStrapiError(payload)) return payload;
	if (!isJsonObject(payload)) return createStrapiError(status, fallbackMessage);

	const error = payload.error;
	if (!isJsonObject(error)) return createStrapiError(status, fallbackMessage);

	const message = isJsonString(error.message) ? error.message : fallbackMessage;
	const name = isJsonString(error.name) ? error.name : defaultErrorName(status);
	const details = isStrapiErrorDetails(error.details) ? error.details : {};

	return createStrapiError(status, message, details, name);
}

import type { StrapiError } from '@interfaces/strapi';

type StrapiErrorDetails = StrapiError['error']['details'];

function defaultErrorName(status: number): string {
	if (status === 401) return 'UnauthorizedError';
	if (status >= 500) return 'ServerError';

	return 'APIError';
}

function isStrapiErrorDetails(value: unknown): value is StrapiErrorDetails {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isStrapiErrorShape(value: unknown): value is StrapiError {
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
 * Detect whether an unknown payload already matches the Strapi error contract.
 */
export function isStrapiError(value: unknown): value is StrapiError {
	return isStrapiErrorShape(value);
}

/**
 * Normalize arbitrary payloads to a Strapi-compatible error object.
 */
export function normalizeStrapiError(payload: unknown, status: number, fallbackMessage: string): StrapiError {
	if (isStrapiError(payload)) return payload;

	if (!payload || typeof payload !== 'object' || !('error' in payload)) {
		return createStrapiError(status, fallbackMessage);
	}

	const error = payload.error as { message?: unknown; name?: unknown; details?: unknown } | null;
	if (!error || typeof error !== 'object') {
		return createStrapiError(status, fallbackMessage);
	}

	const message = typeof error.message === 'string' ? error.message : fallbackMessage;
	const name = typeof error.name === 'string' ? error.name : defaultErrorName(status);
	const details = isStrapiErrorDetails(error.details) ? error.details : {};

	return createStrapiError(status, message, details, name);
}

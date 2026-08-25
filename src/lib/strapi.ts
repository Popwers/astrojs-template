import type { JsonValue } from '@interfaces/json';
import type { FetchProps, StrapiData, StrapiError, StrapiUserData, SubmitProps } from '@interfaces/strapi';
import type { User } from '@interfaces/user';
import convertToFormData from '@lib/form';
import { isJsonArray, isJsonObject } from '@lib/json';
import { createFetchFallback, createSubmitFallback, parseApiResponseBody } from '@lib/strapiClient';
import { createStrapiError, isStrapiError, normalizeStrapiError } from '@lib/strapiError';
import { isPersistableUser } from '@lib/userRefresh';
import { STRAPI_TOKEN, STRAPI_URL } from 'astro:env/server';

/**
 * Fetch data from the Strapi API.
 * @param endpoint - The endpoint to fetch from.
 * @param query - The query parameters to append to the URL.
 * @param wrappedByKey - The key used to unwrap the response.
 * @param wrappedByList - If the response is a list, unwrap it.
 * @param token - Optional user token (falls back to the server-side STRAPI_TOKEN).
 * @param returnError - Controls the failure mode. `false` (default) returns a
 * safe empty fallback so content pages render empty instead of 500-ing — an
 * availability trade-off, see `docs/error-handling.md`. `true` returns the
 * structured Strapi error so the caller can handle the `'error' in result` branch.
 * @returns The unwrapped API payload, or (on failure) the fallback or the error.
 */
export default async function fetchApi<T>({
	endpoint,
	query,
	wrappedByKey = 'data',
	wrappedByList,
	token,
	returnError = false,
}: FetchProps): Promise<T> {
	try {
		const normalizedEndpoint = endpoint.startsWith('/') ? endpoint.slice(1) : endpoint;

		const url = new URL(`${STRAPI_URL}/api/${normalizedEndpoint}`);
		if (query) {
			for (const [key, value] of Object.entries(query)) {
				url.searchParams.append(key, value);
			}
		}
		const response = await fetch(url.toString(), {
			headers: {
				Authorization: `Bearer ${token || STRAPI_TOKEN}`,
			},
			signal: AbortSignal.timeout(30000),
		});

		const fallbackMessage = `API error: ${response.status} on ${endpoint}`;
		const parsedResponse = await parseApiResponseBody(response);
		if (!response.ok) {
			const error = normalizeStrapiError(parsedResponse.payload, response.status, fallbackMessage);
			console.error(`API error: ${error.error.status} on ${endpoint}`, error.error.message);
			// SAFETY: `returnError: true` is the caller opting into the failure branch, so it
			// declares `T` as a union including `StrapiError` (see the JSDoc above).
			return returnError ? (error as T) : createFetchFallback<T>({ wrappedByKey, wrappedByList });
		}

		if (parsedResponse.parseError) {
			console.warn(`Successful API response on ${endpoint} returned a non-JSON body.`);
			return createFetchFallback<T>({ wrappedByKey, wrappedByList });
		}

		if (!parsedResponse.hasBody) {
			return createFetchFallback<T>({ wrappedByKey, wrappedByList });
		}

		const payload = parsedResponse.payload;
		if (isStrapiError(payload)) {
			// SAFETY: the API answered 2xx with a Strapi error envelope; callers that can
			// observe it declare `T` as a union including `StrapiError` (see the JSDoc above).
			return payload as T;
		}

		let data: JsonValue | undefined = payload;

		if (wrappedByKey) {
			data = isJsonObject(data) ? (data[wrappedByKey] ?? []) : [];
		}
		if (wrappedByList) {
			data = isJsonArray(data) ? (data[0] ?? {}) : {};
		}

		// SAFETY: `T` is the payload contract the caller declared for this endpoint; the
		// decoded JSON is returned verbatim after unwrapping and is never inspected here.
		return data as T;
	} catch (error) {
		console.error('API call failed:', error);
		// SAFETY: `returnError: true` is the caller opting into the failure branch, so it
		// declares `T` as a union including `StrapiError` (see the JSDoc above).
		return returnError
			? (createStrapiError(500, error instanceof Error ? error.message : 'An error occurred') as T)
			: createFetchFallback<T>({ wrappedByKey, wrappedByList });
	}
}

/**
 * What `submitApi` can hold between decoding a response body and returning it:
 * the decoded JSON, or one of the envelopes the Strapi endpoints answer with.
 */
type SubmitPayload = JsonValue | StrapiData | StrapiUserData | User | undefined;

/**
 * Detect a 2xx body that can be one of the success envelopes `submitApi` returns.
 * The Strapi endpoints this helper targets answer 2xx with an object node — a user,
 * a login envelope or a `data`/`error` envelope — and never with a bare primitive,
 * so a non-object body is a payload no caller of `submitApi` can consume.
 */
function isSubmitSuccessPayload(value: SubmitPayload): value is StrapiData | StrapiUserData | User {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** What a successful submission resolves to, before the caller narrows it. */
type SubmitResult = StrapiData | StrapiError | StrapiUserData | User;

/**
 * Narrow a submission payload to the auth envelope carrying a JWT and its user.
 * Used by the pages that open a session from an action result.
 */
export function isStrapiUserData(value: SubmitResult | undefined): value is StrapiUserData {
	if (!value || !('jwt' in value) || !('user' in value)) return false;

	return typeof value.jwt === 'string' && value.jwt.length > 0 && isPersistableUser(value.user);
}

/**
 * Narrow a submission payload to a user record complete enough to be persisted.
 */
export function isStrapiUser(value: SubmitResult | undefined): value is User {
	if (!value || !('id' in value) || !('username' in value)) return false;

	return isPersistableUser(value);
}

/**
 * Build the body of a `multipart/form-data` submission, leaving an already built
 * FormData untouched.
 * @param submitBody - The declared submission body.
 * @returns The FormData to send, or `undefined` when there is no body.
 */
function toMultipartBody(submitBody: SubmitProps['body']): FormData | undefined {
	if (!submitBody) return undefined;

	return submitBody instanceof FormData ? submitBody : convertToFormData(submitBody);
}

/**
 * Submit a request to the Strapi API.
 * @param endpoint - The endpoint to send the request to.
 * @param body - The request body.
 * @param token - The authentication token.
 * @param method - The HTTP method to use.
 * @param contentType - The content type of the request.
 * @returns The API response, or a structured Strapi error on failure.
 */
export async function submitApi({
	endpoint,
	body,
	token,
	method = 'POST',
	contentType = 'application/json',
}: SubmitProps): Promise<StrapiUserData | StrapiData | StrapiError | User> {
	try {
		const normalizedEndpoint = endpoint.startsWith('/') ? endpoint.slice(1) : endpoint;

		// Handle multipart/form-data body
		const multipartBody = contentType === 'multipart/form-data' ? toMultipartBody(body) : undefined;

		const url = new URL(`${STRAPI_URL}/api/${normalizedEndpoint}`);
		const response = await fetch(url.toString(), {
			method: method,
			headers: {
				...(contentType === 'multipart/form-data' && {
					Accept: 'application/json',
				}),
				...(contentType === 'application/json' && {
					'Content-Type': contentType,
				}),
				...(token && { Authorization: `Bearer ${token}` }),
			},
			body: contentType === 'application/json' ? JSON.stringify(body) : multipartBody,
			signal: AbortSignal.timeout(30000),
		});

		const fallbackMessage = `API error: ${response.status} on ${endpoint}`;
		const parsedResponse = await parseApiResponseBody(response);
		if (!response.ok) {
			const error = normalizeStrapiError(parsedResponse.payload, response.status, fallbackMessage);
			console.error(`API error: ${error.error.status} on ${endpoint}`, error.error.message);
			return error;
		}

		if (parsedResponse.parseError) {
			console.warn(`Successful API response on ${endpoint} returned a non-JSON body.`);
			return createStrapiError(
				502,
				`Non-JSON response received from API on ${endpoint} (status ${response.status})`,
			);
		}

		if (!parsedResponse.hasBody) {
			return createSubmitFallback<StrapiUserData | StrapiData | StrapiError | User>();
		}

		const data = parsedResponse.payload;
		if (isStrapiError(data)) return data;
		if (isSubmitSuccessPayload(data)) return data;

		return createSubmitFallback<StrapiUserData | StrapiData | StrapiError | User>();
	} catch (error) {
		console.error('API call failed:', error);
		return createStrapiError(500, error instanceof Error ? error.message : 'An error occurred');
	}
}

import type { FetchProps, StrapiData, StrapiError, StrapiUserData, SubmitProps } from '@interfaces/strapi';
import type { User } from '@interfaces/user';
import convertToFormData from '@lib/form';
import { createFetchFallback, createSubmitFallback, parseApiResponseBody } from '@lib/strapiClient';
import { createStrapiError, isStrapiError, normalizeStrapiError } from '@lib/strapiError';
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
		if (isStrapiError(payload)) return payload as T;

		let data: unknown = payload;

		if (wrappedByKey) {
			data = (data as Record<string, unknown> | null | undefined)?.[wrappedByKey] ?? [];
		}
		if (wrappedByList) {
			data = (data as unknown[] | null | undefined)?.[0] ?? {};
		}

		return data as T;
	} catch (error) {
		console.error('API call failed:', error);
		return returnError
			? (createStrapiError(500, error instanceof Error ? error.message : 'An error occurred') as T)
			: createFetchFallback<T>({ wrappedByKey, wrappedByList });
	}
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
		const requestBody =
			contentType === 'multipart/form-data' && body && typeof body === 'object'
				? convertToFormData(body as Record<string, unknown>)
				: body;

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
			body:
				contentType === 'application/json' ? JSON.stringify(requestBody) : (requestBody as FormData),
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

		return data as StrapiUserData | StrapiData | StrapiError;
	} catch (error) {
		console.error('API call failed:', error);
		return createStrapiError(500, error instanceof Error ? error.message : 'An error occurred');
	}
}

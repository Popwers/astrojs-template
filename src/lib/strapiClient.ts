import type { JsonValue } from '@interfaces/json';
import { parseJson } from '@lib/json';

interface ParsedApiResponse {
	hasBody: boolean;
	parseError: boolean;
	payload?: JsonValue;
}

interface FetchFallbackProps {
	wrappedByKey?: string;
	wrappedByList?: boolean;
}

const parseApiResponseBody = async (response: Response): Promise<ParsedApiResponse> => {
	const rawBody = await response.text();
	if (rawBody.trim().length === 0) {
		return {
			hasBody: false,
			parseError: false,
		};
	}

	try {
		return {
			hasBody: true,
			parseError: false,
			payload: parseJson(rawBody),
		};
	} catch {
		const preview = rawBody.length > 500 ? `${rawBody.slice(0, 500)}...` : rawBody;
		const contentType = response.headers.get('content-type') ?? 'unknown';
		console.error(
			`Failed to parse API response as JSON. url=${response.url} status=${response.status} content-type=${contentType}. Raw body preview: ${preview}`,
		);
		return {
			hasBody: true,
			parseError: true,
		};
	}
};

const createFetchFallback = <T>({ wrappedByKey }: FetchFallbackProps): T => {
	// SAFETY: `T` is the payload contract the caller declared on `fetchApi<T>`; no
	// payload was decoded here. The value returned is the empty form of that
	// contract — a list when the response is unwrapped by key, an empty object
	// otherwise — which is the documented degraded mode (docs/error-handling.md).
	return (wrappedByKey ? [] : {}) as T;
};

// SAFETY: same contract as `createFetchFallback`: `T` is caller-declared and an
// empty object is the documented empty value returned for a body-less response.
const createSubmitFallback = <T>(): T => ({}) as T;

export { createFetchFallback, createSubmitFallback, parseApiResponseBody };
export type { FetchFallbackProps, ParsedApiResponse };

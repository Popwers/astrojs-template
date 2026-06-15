interface ParsedApiResponse {
	hasBody: boolean;
	parseError: boolean;
	payload?: unknown;
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
			payload: JSON.parse(rawBody),
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

const createFetchFallback = <T>({
	wrappedByKey,
	wrappedByList,
}: {
	wrappedByKey?: string;
	wrappedByList?: boolean;
}): T => {
	if (wrappedByKey) return [] as T;
	if (wrappedByList) return {} as T;
	return {} as T;
};

const createSubmitFallback = <T>(): T => ({}) as T;

export { createFetchFallback, createSubmitFallback, parseApiResponseBody };

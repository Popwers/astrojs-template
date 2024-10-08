interface Props {
	endpoint: string;
	query?: Record<string, string>;
	wrappedByKey?: string;
	wrappedByList?: boolean;
}

/**
 * Récupère les données de l'API Strapi
 * @param endpoint - Le point d'accès à partir duquel la recherche doit être effectuée
 * @param query - Les paramètres de requête à ajouter à l'url
 * @param wrappedByKey - La clé pour décapsuler la réponse
 * @param wrappedByList - Si la réponse est une liste, déroulez-la.
 * @returns
 */
export default async function fetchApi<T>({
	endpoint,
	query,
	wrappedByKey = 'data',
	wrappedByList,
}: Props): Promise<T> {
	if (endpoint.startsWith('/')) endpoint = endpoint.slice(1);

	const url = new URL(`${import.meta.env.STRAPI_URL}/api/${endpoint}`);
	if (query) {
		for (const [key, value] of Object.entries(query)) {
			url.searchParams.append(key, value);
		}
	}
	const res = await fetch(url.toString(), {
		headers: {
			Authorization: `bearer ${import.meta.env.STRAPI_TOKEN}`,
		},
	});
	let data = await res.json();

	if (wrappedByKey) data = data?.[wrappedByKey] || [];
	if (wrappedByList) data = data?.[0] || {};

	return data as T;
}

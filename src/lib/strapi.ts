import { STRAPI_TOKEN, STRAPI_URL } from 'astro:env/server';

import type { FetchProps, StrapiData, StrapiError, StrapiUserData, SubmitProps } from '@interfaces/strapi';
import type { User } from '@interfaces/user';

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
	token,
}: FetchProps): Promise<T> {
	try {
		if (endpoint.startsWith('/')) endpoint = endpoint.slice(1);

		const url = new URL(`${STRAPI_URL}/api/${endpoint}`);
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
		let data = await response.json();

		if (wrappedByKey) data = data?.[wrappedByKey] || [];
		if (wrappedByList) data = data?.[0] || {};

		return data as T;
	} catch (error) {
		console.error('API call failed:', error);
		return wrappedByKey ? ([] as T) : wrappedByList ? ({} as T) : ({} as T);
	}
}

/**
 * Soumet une requête à l'API Strapi
 * @param endpoint - Le point d'accès à partir duquel la requête doit être effectuée
 * @param body - Le corps de la requête
 * @param token - Le token pour l'authentification
 * @param method - La méthode de la requête
 * @returns
 */
export async function submitApi({
	endpoint,
	body,
	token,
	method = 'POST',
	contentType = 'application/json',
}: SubmitProps): Promise<StrapiUserData | StrapiData | StrapiError | User> {
	try {
		if (endpoint.startsWith('/')) endpoint = endpoint.slice(1);

		// Handle multipart/form-data body
		if (contentType === 'multipart/form-data' && body && typeof body === 'object') {
			const formData = new FormData();

			// Handle nested objects and files
			for (const [key, value] of Object.entries(body)) {
				if (value && typeof value === 'object') {
					// Handle files object
					if (key === 'files') {
						for (const [fileKey, fileValue] of Object.entries(value)) {
							if (fileValue instanceof Blob || fileValue instanceof File) {
								formData.append(`files.${fileKey}`, fileValue);
							}
						}
					} else formData.append(key, JSON.stringify(value));
				} else formData.append(key, value);
			}
			body = formData;
		}

		const url = new URL(`${STRAPI_URL}/api/${endpoint}`);
		const response = await fetch(url.toString(), {
			method: method,
			headers: {
				...(contentType === 'multipart/form-data' && { Accept: 'application/json' }),
				...(contentType === 'application/json' && { 'Content-Type': contentType }),
				...(token && { Authorization: `Bearer ${token}` }),
			},
			body: contentType === 'application/json' ? JSON.stringify(body) : (body as FormData),
			signal: AbortSignal.timeout(30000),
		});

		const data = await response.json();

		return data as StrapiUserData | StrapiData | StrapiError;
	} catch (error) {
		console.error('API call failed:', error);
		return {
			error: {
				status: 500,
				name: 'ServerError',
				message: error instanceof Error ? error.message : 'Une erreur est survenue',
				details: {},
			},
		} as StrapiError;
	}
}

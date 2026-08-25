import type { JsonArray, JsonObject, JsonValue } from '@interfaces/json';
import { isJsonArray, isJsonNumber, isJsonObject } from '@lib/json';

/**
 * Narrow a decoded payload to an object node, or `null` when it is not one.
 */
function asObject(value: JsonValue | undefined): JsonObject | null {
	return isJsonObject(value) ? value : null;
}

/**
 * Narrow a decoded payload to an array node, or `[]` when it is not one.
 */
function asArray(value: JsonValue | undefined): JsonArray {
	return isJsonArray(value) ? value : [];
}

/**
 * Read the `results` list of a Strapi pagination envelope.
 */
function asPaginatedResults(value: JsonValue | undefined): JsonArray {
	return asArray(asObject(value)?.results);
}

/**
 * Read the `pageCount` of a Strapi pagination envelope, or `0` when it is absent.
 */
function asPaginatedPageCount(value: JsonValue | undefined): number {
	const pageCount = asObject(value)?.pageCount;

	return isJsonNumber(pageCount) && Number.isFinite(pageCount) ? pageCount : 0;
}

/**
 * Read the `data` list of a Strapi collection response.
 */
function asCollectionData(value: JsonValue | undefined): JsonArray {
	return asArray(asObject(value)?.data);
}

/**
 * Read `meta.pagination.pageCount` of a Strapi collection response, or `0` when absent.
 */
function asCollectionPageCount(value: JsonValue | undefined): number {
	const meta = asObject(value)?.meta;
	const pagination = asObject(meta)?.pagination;
	const pageCount = asObject(pagination)?.pageCount;

	return isJsonNumber(pageCount) && Number.isFinite(pageCount) ? pageCount : 0;
}

export {
	asArray,
	asCollectionData,
	asCollectionPageCount,
	asObject,
	asPaginatedPageCount,
	asPaginatedResults,
};

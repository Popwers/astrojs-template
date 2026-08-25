import type { JsonArray, JsonObject, JsonValue } from '@interfaces/json';

/**
 * Decode a raw JSON document. Throws the native `SyntaxError` on malformed input,
 * so callers decide whether a broken payload is recoverable.
 * @param rawText - The raw JSON text to decode.
 * @returns The decoded JSON tree.
 */
const parseJson = (rawText: string): JsonValue => JSON.parse(rawText);

/**
 * Narrow a decoded JSON value to an object node (arrays and `null` excluded).
 */
const isJsonObject = (value: JsonValue | undefined): value is JsonObject =>
	typeof value === 'object' && value !== null && !Array.isArray(value);

/**
 * Narrow a decoded JSON value to an array node.
 */
const isJsonArray = (value: JsonValue | undefined): value is JsonArray => Array.isArray(value);

/**
 * Narrow a decoded JSON value to a string.
 */
const isJsonString = (value: JsonValue | undefined): value is string => typeof value === 'string';

/**
 * Narrow a decoded JSON value to a number (including non-finite ones).
 */
const isJsonNumber = (value: JsonValue | undefined): value is number => typeof value === 'number';

export { isJsonArray, isJsonNumber, isJsonObject, isJsonString, parseJson };

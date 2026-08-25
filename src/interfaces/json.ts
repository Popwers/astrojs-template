/**
 * Structural contract of a decoded JSON document.
 *
 * Every payload that crosses an I/O boundary (API response, cookie, push event)
 * is a `JsonValue` until it is decoded into a domain type. Using it instead of
 * `unknown` keeps the boundary explicit without hiding what the value can be.
 */
type JsonPrimitive = boolean | null | number | string;

interface JsonObject {
	[key: string]: JsonValue;
}

type JsonArray = JsonValue[];

type JsonValue = JsonArray | JsonObject | JsonPrimitive;

export type { JsonArray, JsonObject, JsonPrimitive, JsonValue };

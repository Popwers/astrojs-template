import { describe, expect, it } from 'bun:test';

import {
	asArray,
	asCollectionData,
	asCollectionPageCount,
	asObject,
	asPaginatedPageCount,
	asPaginatedResults,
} from '@lib/strapiResponse';

describe('strapiResponse helpers', () => {
	it('returns safe array fallbacks for invalid values', () => {
		expect(asArray(['a', 'b'])).toEqual(['a', 'b']);
		expect(asArray({})).toEqual([]);
		expect(asPaginatedResults({ results: ['a'] })).toEqual(['a']);
		expect(asPaginatedResults({ results: null })).toEqual([]);
	});

	it('returns safe object and pagination fallbacks', () => {
		expect(asObject({ id: 1 })).toEqual({ id: 1 });
		expect(asObject([])).toBeNull();
		expect(asPaginatedPageCount({ pageCount: 3 })).toBe(3);
		expect(asPaginatedPageCount({ pageCount: '3' })).toBe(0);
	});

	it('extracts Strapi collection payloads safely', () => {
		const response = {
			data: [{ id: 1 }],
			meta: {
				pagination: {
					pageCount: 5,
				},
			},
		};

		expect(asCollectionData(response)).toEqual([{ id: 1 }]);
		expect(asCollectionPageCount(response)).toBe(5);
		expect(asCollectionPageCount({ meta: null })).toBe(0);
	});
});

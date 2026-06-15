function asObject<T extends object>(value: unknown): T | null {
	if (!value || typeof value !== 'object' || Array.isArray(value)) return null;

	return value as T;
}

function asArray<T>(value: unknown): T[] {
	return Array.isArray(value) ? (value as T[]) : [];
}

function asPaginatedResults<T>(value: unknown): T[] {
	return asArray<T>(asObject<{ results?: unknown }>(value)?.results);
}

function asPaginatedPageCount(value: unknown): number {
	const pageCount = asObject<{ pageCount?: unknown }>(value)?.pageCount;

	return typeof pageCount === 'number' && Number.isFinite(pageCount) ? pageCount : 0;
}

function asCollectionData<T>(value: unknown): T[] {
	return asArray<T>(asObject<{ data?: unknown }>(value)?.data);
}

function asCollectionPageCount(value: unknown): number {
	const meta = asObject<{ meta?: unknown }>(value)?.meta;
	const pagination = asObject<{ pagination?: unknown }>(meta)?.pagination;
	const pageCount = asObject<{ pageCount?: unknown }>(pagination)?.pageCount;

	return typeof pageCount === 'number' && Number.isFinite(pageCount) ? pageCount : 0;
}

export {
	asArray,
	asCollectionData,
	asCollectionPageCount,
	asObject,
	asPaginatedPageCount,
	asPaginatedResults,
};

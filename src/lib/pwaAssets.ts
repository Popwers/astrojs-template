const COMMIT_ENV_KEYS = [
	'PWA_ASSET_VERSION',
	'VERCEL_GIT_COMMIT_SHA',
	'GITHUB_SHA',
	'SOURCE_VERSION',
	'CF_PAGES_COMMIT_SHA',
	'COMMIT_REF',
	'RAILWAY_GIT_COMMIT_SHA',
	'RENDER_GIT_COMMIT',
] as const;

const FALLBACK_VERSION_LENGTH = 14;
const COMMIT_VERSION_LENGTH = 12;

export function resolvePwaAssetVersion(
	env: Record<string, string | undefined> = process.env,
	now: Date = new Date(),
) {
	for (const key of COMMIT_ENV_KEYS) {
		const value = env[key]?.trim();

		if (value) {
			return value.slice(0, COMMIT_VERSION_LENGTH);
		}
	}

	return now
		.toISOString()
		.replaceAll(/[-:.TZ]/g, '')
		.slice(0, FALLBACK_VERSION_LENGTH);
}

export const PWA_ASSET_VERSION = resolvePwaAssetVersion();

export function withPwaAssetVersion(path: string, version: string = PWA_ASSET_VERSION) {
	if (!version) {
		return path;
	}

	const separator = path.includes('?') ? '&' : '?';

	return `${path}${separator}v=${encodeURIComponent(version)}`;
}

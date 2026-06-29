export const MAX_FILE_SIZE = 1024 * 1024 * 5;

export const SUPPORTED_FILE_TYPES = ['image/jpeg', 'image/png', 'image/jpg'];

// Compression settings for avatar uploads. Avatars display small so 512 px and 0.5 MB are enough.
export const AVATAR_MAX_DIMENSION = 512;
export const AVATAR_TARGET_SIZE_MB = 0.5;
export const AVATAR_COMPRESSION_QUALITY = 0.82;

// Accept string for the avatar file picker: standard types plus HEIC/HEIF (iPhone originals),
// which the client decoder converts to JPEG before upload. Extension hints cover HEIC files
// that arrive with no registered MIME type.
export const AVATAR_INPUT_ACCEPT = [
	...SUPPORTED_FILE_TYPES,
	'image/heic',
	'image/heif',
	'.heic',
	'.heif',
].join(',');

// Astro caps Action request bodies at 1 MB by default. A single avatar can be as large as
// MAX_FILE_SIZE (5 MB) when compression falls back to the original file; +10% covers
// multipart/form-data framing overhead. Derived here so there is one place to change the limit.
export const ACTION_BODY_SIZE_LIMIT = Math.ceil(MAX_FILE_SIZE * 1.1);

/**
 * @description Refresh interval for the user data when the user is logged in
 */
export const REFRESH_INTERVAL = 15 * 60 * 1000; // 15 minutes in milliseconds

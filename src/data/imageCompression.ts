/**
 * Client-side avatar preparation: decode iPhone HEIC/HEIF, downscale and re-encode the photo
 * to a small JPEG before it leaves the browser. All knobs come from the single source of truth
 * in `./userOptions`.
 *
 * The heavy decoders (`heic2any` / `browser-image-compression`) are dynamically imported so they
 * only land in the bundle the first time a user actually changes their avatar.
 */

import {
	AVATAR_COMPRESSION_QUALITY,
	AVATAR_MAX_DIMENSION,
	AVATAR_TARGET_SIZE_MB,
	MAX_FILE_SIZE,
	SUPPORTED_FILE_TYPES,
} from './userOptions';

/** Outcome of preparing the avatar file for upload. */
export interface PreparedAvatar {
	file: File | null;
	error?: string;
}

const BYTES_PER_MB = 1024 * 1024;

const toMb = (bytes: number): number => Math.round(bytes / BYTES_PER_MB);

/** iPhone photos arrive as HEIC/HEIF, often with no registered MIME — fall back to the extension. */
const isHeic = (file: File): boolean => {
	const type = file.type.toLowerCase();
	if (type === 'image/heic' || type === 'image/heif') return true;
	const name = file.name.toLowerCase();
	return name.endsWith('.heic') || name.endsWith('.heif');
};

/** Swap any extension for `.jpg` — every prepared avatar is re-encoded to JPEG. */
const withJpegName = (name: string): string => `${name.replace(/\.[^./\\]+$/, '')}.jpg`;

/** Decode a HEIC/HEIF blob to a JPEG File via the lazily-loaded libheif wasm. */
const decodeHeicToJpeg = async (file: File): Promise<File> => {
	const { default: heic2any } = await import('heic2any');
	const converted = await heic2any({
		blob: file,
		toType: 'image/jpeg',
		quality: AVATAR_COMPRESSION_QUALITY,
	});
	const blob = Array.isArray(converted) ? converted[0] : converted;
	return new File([blob], withJpegName(file.name), {
		type: 'image/jpeg',
		lastModified: file.lastModified,
	});
};

/** Downscale + re-encode to a small JPEG using a web worker. */
const compressToJpeg = async (file: File): Promise<File> => {
	const { default: imageCompression } = await import('browser-image-compression');
	const compressed = await imageCompression(file, {
		maxSizeMB: AVATAR_TARGET_SIZE_MB,
		maxWidthOrHeight: AVATAR_MAX_DIMENSION,
		initialQuality: AVATAR_COMPRESSION_QUALITY,
		fileType: 'image/jpeg',
		useWebWorker: true,
	});
	return new File([compressed], withJpegName(file.name), {
		type: 'image/jpeg',
		lastModified: file.lastModified,
	});
};

/**
 * Prepare a freshly-picked avatar file for upload.
 * Decodes HEIC/HEIF, compresses to a small JPEG, and validates the result.
 * Compression is best-effort: if it throws, the decoded original is used instead.
 * @param file - The file the user just selected.
 * @returns `{ file, error }` — the prepared File ready to upload, or null with a user-facing error.
 */
export const prepareAvatar = async (file: File): Promise<PreparedAvatar> => {
	// Reject files over the hard server cap before any decoding.
	if (file.size > MAX_FILE_SIZE) {
		return { file: null, error: `Fichier trop volumineux (max ${toMb(MAX_FILE_SIZE)} Mo).` };
	}

	// Non-HEIC files must already be a supported image type.
	if (!isHeic(file) && !SUPPORTED_FILE_TYPES.includes(file.type)) {
		return { file: null, error: 'Format non supporté. Utilisez JPG, PNG ou HEIC.' };
	}

	// Decode HEIC to JPEG — no fallback possible here since the server rejects HEIC.
	let decoded: File;
	try {
		decoded = isHeic(file) ? await decodeHeicToJpeg(file) : file;
	} catch {
		return { file: null, error: 'Échec de la conversion HEIC.' };
	}

	// Compression is best-effort: if it throws, fall back to the decoded original so the
	// photo still uploads. Only the final hard-cap check can reject it.
	let prepared = decoded;
	try {
		prepared = await compressToJpeg(decoded);
	} catch {
		prepared = decoded;
	}

	// Final check: the processed file must still fit within the server's hard cap.
	if (prepared.size > MAX_FILE_SIZE) {
		return {
			file: null,
			error: `Fichier trop volumineux même après traitement (max ${toMb(MAX_FILE_SIZE)} Mo).`,
		};
	}

	// Ensure the output is a recognized type (compression always yields JPEG, but guard anyway).
	if (!SUPPORTED_FILE_TYPES.includes(prepared.type)) {
		return { file: null, error: 'Format non supporté après traitement.' };
	}

	return { file: prepared };
};

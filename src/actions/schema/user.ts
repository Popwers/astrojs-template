import { MAX_FILE_SIZE, SUPPORTED_FILE_TYPES } from '@data/userOptions';
import type { JsonValue } from '@interfaces/json';
import { z } from 'astro/zod';

const usernameSchema = z
	.string({
		error: 'Le nom prénom ou la dénomination est requise',
	})
	.min(4, 'Le nom prénom ou la dénomination doit contenir au moins 4 caractères');

const rawFormText = z.string();

/**
 * Treat a blank form field as an absent one so `.optional()` sees `undefined`
 * instead of an empty string. Non-text values are handed to the schema untouched.
 */
const emptyToUndefined = (value: JsonValue | File | undefined) => {
	if (value === null || value === undefined) return undefined;

	const text = rawFormText.safeParse(value);
	if (!text.success) return value;

	const trimmedValue = text.data.trim();

	return trimmedValue.length === 0 ? undefined : trimmedValue;
};

const optionalString = () => z.preprocess(emptyToUndefined, z.string().optional());

const optionalUrl = () => z.preprocess(emptyToUndefined, z.url("L'url est invalide").optional());

const profile = z.object({
	username: usernameSchema,
});

const updateUser = z.object({
	email: z.email("L'email est invalide"),
	username: usernameSchema,
	description: z.preprocess(
		emptyToUndefined,
		z
			.string()
			.min(250, 'La présentation doit contenir au moins 250 caractères')
			.max(1000, 'La présentation doit contenir au plus 1000 caractères')
			.optional(),
	),
	quality: optionalString(),
	instagram: optionalUrl(),
	facebook: optionalUrl(),
	linkedin: optionalUrl(),
	tiktok: optionalUrl(),
	youtube: optionalUrl(),
	google: optionalUrl(),
	address: optionalString(),
	phone: optionalString(),
});

/** First bytes of a JPEG and of a PNG: the browser-supplied `file.type` says nothing about the content. */
const IMAGE_SIGNATURES: ReadonlyArray<readonly number[]> = [
	[0xff, 0xd8, 0xff],
	[0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a],
];

const hasImageSignature = async (file: File): Promise<boolean> => {
	const head = new Uint8Array(await file.slice(0, 8).arrayBuffer());
	return IMAGE_SIGNATURES.some((signature) => signature.every((byte, index) => head[index] === byte));
};

const updateAvatar = z.object({
	avatar: z
		.instanceof(File)
		.optional()
		.refine((file) => !file || file?.size < MAX_FILE_SIZE, 'La taille maximale est de 5MB.')
		.refine(
			(file) => !file || SUPPORTED_FILE_TYPES.includes(file.type),
			'Seuls les formats .jpg, .jpeg et .png sont supportés.',
		)
		.refine(
			async (file) => !file || (await hasImageSignature(file)),
			"Le fichier n'est pas une image JPEG ou PNG valide.",
		),
});

const deleteAccount = z.object({
	// Checkbox value submitted only when checked; must explicitly equal 'true'.
	confirmation: z
		.string()
		.refine((value) => value === 'true', 'Vous devez confirmer la suppression de votre compte.'),
});

export { deleteAccount, profile, updateAvatar, updateUser };

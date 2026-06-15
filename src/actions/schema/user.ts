import { MAX_FILE_SIZE, SUPPORTED_FILE_TYPES } from '@data/userOptions';
import { z } from 'astro/zod';

/**
 * -----------------------------------------------------
 * REPEATABLE SCHEMA COMPONENTS
 * -----------------------------------------------------
 */

const usernameSchema = z
	.string({
		error: 'Le nom prénom ou la dénomination est requise',
	})
	.min(4, 'Le nom prénom ou la dénomination doit contenir au moins 4 caractères');

const emptyToUndefined = (value: unknown) => {
	if (value === null || value === undefined) return undefined;
	if (typeof value !== 'string') return value;
	const trimmedValue = value.trim();
	return trimmedValue.length === 0 ? undefined : trimmedValue;
};

const optionalString = () => z.preprocess(emptyToUndefined, z.string().optional());

const optionalUrl = () => z.preprocess(emptyToUndefined, z.url("L'url est invalide").optional());

/**
 * -----------------------------------------------------
 */

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

const updateAvatar = z.object({
	avatar: z
		.instanceof(File)
		.optional()
		.refine((file) => !file || file?.size < MAX_FILE_SIZE, 'La taille maximale est de 5MB.')
		.refine(
			(file) => !file || SUPPORTED_FILE_TYPES.includes(file.type),
			'Seuls les formats .jpg, .jpeg et .png sont supportés.',
		),
});

const deleteAccount = z.object({
	// Checkbox value submitted only when checked; must explicitly equal 'true'.
	confirmation: z
		.string()
		.refine((value) => value === 'true', 'Vous devez confirmer la suppression de votre compte.'),
});

export { deleteAccount, profile, updateAvatar, updateUser };

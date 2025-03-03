import { z } from 'astro:schema';
import { MAX_FILE_SIZE, SUPPORTED_FILE_TYPES } from '@data/userOptions';

/**
 * -----------------------------------------------------
 * REPEATABLE SCHEMA COMPONENTS
 * -----------------------------------------------------
 */

const usernameSchema = z
	.string({
		required_error: 'Le nom prénom ou la dénomination est requise',
	})
	.min(4, 'Le nom prénom ou la dénomination doit contenir au moins 4 caractères');

/**
 * -----------------------------------------------------
 */

const profile = z.object({
	username: usernameSchema,
});

const updateUser = z.object({
	email: z
		.string({
			required_error: "L'email est requis",
		})
		.email("L'email est invalide"),
	username: usernameSchema,
});

const updateAvatar = z.object({
	avatar: z
		.instanceof(File)
		.optional()
		.refine(file => !file || file?.size < MAX_FILE_SIZE, 'La taille maximale est de 5MB.')
		.refine(
			file => !file || SUPPORTED_FILE_TYPES.includes(file.type),
			'Seuls les formats .jpg, .jpeg et .png sont supportés.'
		),
});

export { profile, updateAvatar, updateUser };

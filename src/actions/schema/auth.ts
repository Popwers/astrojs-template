import { z } from 'astro:schema';

/**
 * -----------------------------------------------------
 * REPEATABLE SCHEMA COMPONENTS
 * -----------------------------------------------------
 */

const emailSchema = z
	.string({
		required_error: "L'adresse email est requise",
	})
	.email({
		message: "L'adresse email est invalide.",
	});

const login = z.object({
	email: emailSchema,
	password: z.string({
		required_error: 'Le mot de passe est requis',
	}),
});

/**
 * -----------------------------------------------------
 */

const register = z
	.object({
		email: emailSchema,
		password: z
			.string({
				required_error: 'Le mot de passe est requis',
			})
			.min(8, 'Le mot de passe doit contenir au moins 8 caractères')
			.regex(/[A-Z]/, 'Le mot de passe doit contenir au moins une majuscule')
			.regex(/[a-z]/, 'Le mot de passe doit contenir au moins une minuscule')
			.regex(/[0-9]/, 'Le mot de passe doit contenir au moins un chiffre')
			.regex(
				/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/,
				'Le mot de passe doit contenir au moins un caractère spécial'
			),
		passwordConfirmation: z.string({
			required_error: 'La confirmation du mot de passe est requise',
		}),
	})
	.superRefine(({ passwordConfirmation, password }, ctx) => {
		if (passwordConfirmation !== password) {
			ctx.addIssue({
				code: 'custom',
				message: 'Les mots de passe ne correspondent pas',
				path: ['passwordConfirmation'],
			});
		}
	});

const confirmMail = z.object({
	email: emailSchema,
});

export { confirmMail, login, register };

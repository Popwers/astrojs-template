import { turnstile } from '@actions/schema/turnstile';
import { z } from 'astro/zod';

const emailSchema = z.email({
	error: "L'adresse email est invalide.",
});

const login = z.object({
	email: emailSchema,
	password: z.string({
		error: 'Le mot de passe est requis',
	}),
	...turnstile,
});

const register = z
	.object({
		email: emailSchema,
		master: z.string().optional(),
		password: z
			.string({
				error: 'Le mot de passe est requis',
			})
			.min(8, 'Le mot de passe doit contenir au moins 8 caractères')
			.regex(/[A-Z]/, 'Le mot de passe doit contenir au moins une majuscule')
			.regex(/[a-z]/, 'Le mot de passe doit contenir au moins une minuscule')
			.regex(/[0-9]/, 'Le mot de passe doit contenir au moins un chiffre')
			.regex(
				/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/,
				'Le mot de passe doit contenir au moins un caractère spécial',
			),
		passwordConfirmation: z.string({
			error: 'La confirmation du mot de passe est requise',
		}),
		...turnstile,
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
	...turnstile,
});

export { confirmMail, login, register };

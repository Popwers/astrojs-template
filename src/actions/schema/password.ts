import { z } from 'astro/zod';

const forgotPassword = z.object({
	email: z.email({
		error: "L'adresse email est invalide.",
	}),
});

const resetPassword = z
	.object({
		code: z.string({
			error: 'Le code de réinitialisation est requis',
		}),
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

export { forgotPassword, resetPassword };

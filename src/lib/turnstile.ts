import { clientIp } from '@lib/clientIp';
import type { ClientContext } from '@lib/clientIp';
import { z } from 'astro/zod';
import { ActionError } from 'astro:actions';
import { TURNSTILE_SECRET_KEY } from 'astro:env/server';

const SITEVERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';

const VISITOR_ERROR_CODES = new Set([
	'missing-input-response',
	'invalid-input-response',
	'timeout-or-duplicate',
]);

const siteverifyAnswer = z.object({
	success: z.boolean(),
	'error-codes': z.array(z.string()).default([]),
});

type Verdict = 'verified' | 'rejected' | 'unavailable';

async function verdictOf(context: ClientContext, token: string): Promise<Verdict> {
	const form = new URLSearchParams({ secret: TURNSTILE_SECRET_KEY, response: token });
	const remoteIp = clientIp(context);
	if (remoteIp !== null) {
		form.set('remoteip', remoteIp);
	}

	try {
		const response = await fetch(SITEVERIFY_URL, {
			method: 'POST',
			body: form,
			signal: AbortSignal.timeout(10_000),
		});
		if (!response.ok) {
			console.error(`[turnstile] siteverify answered with HTTP ${response.status}`);
			return 'unavailable';
		}

		const answer = siteverifyAnswer.safeParse(await response.json());
		if (!answer.success) {
			console.error('[turnstile] siteverify answered with an unexpected body');
			return 'unavailable';
		}

		if (answer.data.success) {
			return 'verified';
		}

		const codes = answer.data['error-codes'];
		if (codes.some((code) => VISITOR_ERROR_CODES.has(code))) {
			return 'rejected';
		}

		console.error(`[turnstile] siteverify failed: ${codes.join(', ') || 'no error code'}`);
		return 'unavailable';
	} catch (error) {
		console.error(
			`[turnstile] siteverify unreachable: ${error instanceof Error ? error.message : String(error)}`,
		);
		return 'unavailable';
	}
}

/**
 * Verify a Turnstile token with Cloudflare before an action touches Strapi. Fails closed.
 *
 * @param context - The request context of the action, used to forward the visitor's IP.
 * @param token - The `cf-turnstile-response` value posted with the form.
 * @throws ActionError `FORBIDDEN` when the token is missing, invalid or already used,
 * `SERVICE_UNAVAILABLE` when no verdict is possible: Cloudflare unreachable, an unexpected answer, or a
 * server-side error code such as a bad secret.
 */
export async function assertTurnstile(context: ClientContext, token: string): Promise<void> {
	const verdict: Verdict = token === '' ? 'rejected' : await verdictOf(context, token);

	switch (verdict) {
		case 'verified':
			return;
		case 'rejected':
			throw new ActionError({
				code: 'FORBIDDEN',
				message: 'La vérification anti-robot a échoué. Veuillez réessayer.',
			});
		case 'unavailable':
			throw new ActionError({
				code: 'SERVICE_UNAVAILABLE',
				message:
					'La vérification anti-robot est indisponible pour le moment. Veuillez réessayer dans quelques instants.',
			});
		default: {
			const exhaustive: never = verdict;
			return exhaustive;
		}
	}
}

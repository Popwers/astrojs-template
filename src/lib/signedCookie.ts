import { createHmac, timingSafeEqual } from 'node:crypto';

/**
 * Require a cookie signing secret. There is no public fallback.
 */
export function resolveCookieSigningSecret(secret: string | undefined): string {
	if (secret && secret.trim() !== '') {
		return secret;
	}

	throw new Error('COOKIE_SIGNING_SECRET must be set.');
}

function cookieSigningSecret(): string {
	return resolveCookieSigningSecret(process.env.COOKIE_SIGNING_SECRET);
}

/**
 * Sign a cookie payload so clients cannot forge `user_data` without the secret.
 */
export function signCookiePayload(serialised: string): string {
	const signature = createHmac('sha256', cookieSigningSecret()).update(serialised).digest('base64url');
	return `${serialised}.${signature}`;
}

/**
 * Verify a signed cookie value and return the original serialised payload.
 */
export function verifySignedCookiePayload(signed: string): string | null {
	const separator = signed.lastIndexOf('.');
	if (separator <= 0) {
		return null;
	}

	const serialised = signed.slice(0, separator);
	const provided = signed.slice(separator + 1);
	const expected = createHmac('sha256', cookieSigningSecret()).update(serialised).digest('base64url');

	try {
		const providedBuf = Buffer.from(provided);
		const expectedBuf = Buffer.from(expected);
		if (providedBuf.length !== expectedBuf.length || !timingSafeEqual(providedBuf, expectedBuf)) {
			return null;
		}
	} catch {
		return null;
	}

	return serialised;
}

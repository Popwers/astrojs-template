import {
	hasSessionCookie,
	pageCacheVerdict,
	PRIVATE_CACHE_CONTROL,
	PUBLIC_PAGE_CACHE_CONTROL,
	type PageCacheFacts,
} from '@lib/pageCache';
import { describe, expect, it } from 'vitest';

// How the policy can fail: a member's page reaches a shared cache (session, private route, island,
// cookie set, form POST), an error or redirect is cached (a missing asset stays 404 at the edge), an
// endpoint loses the headers it chose, a route's own opt-out is overridden, or a look-alike cookie
// name counts as a session.
const anonymousPage: PageCacheFacts = {
	method: 'GET',
	pathname: '/',
	isSignedIn: false,
	status: 200,
	contentType: 'text/html',
	cacheControl: null,
	hasSetCookie: false,
};

describe('pageCacheVerdict', () => {
	it('makes an anonymous 200 page public', () => {
		expect(pageCacheVerdict(anonymousPage)).toBe('public');
		expect(pageCacheVerdict({ ...anonymousPage, method: 'HEAD' })).toBe('public');
	});

	it('keeps a page private as soon as the request carries a session', () => {
		expect(pageCacheVerdict({ ...anonymousPage, isSignedIn: true })).toBe('private');
	});

	it('keeps private routes private, nested paths and server islands included', () => {
		for (const pathname of ['/dashboard', '/dashboard/account', '/login', '/lost-password/reset']) {
			expect(pageCacheVerdict({ ...anonymousPage, pathname })).toBe('private');
		}
		expect(pageCacheVerdict({ ...anonymousPage, pathname: '/_server-islands/AvatarIsland' })).toBe(
			'private',
		);
	});

	it('keeps a page that sets a cookie private', () => {
		expect(pageCacheVerdict({ ...anonymousPage, hasSetCookie: true })).toBe('private');
	});

	it('never shares errors, redirects or form results', () => {
		expect(pageCacheVerdict({ ...anonymousPage, status: 404 })).toBe('private');
		expect(pageCacheVerdict({ ...anonymousPage, status: 500 })).toBe('private');
		expect(pageCacheVerdict({ ...anonymousPage, status: 302, contentType: null })).toBe('private');
		expect(pageCacheVerdict({ ...anonymousPage, method: 'POST' })).toBe('private');
	});

	it('leaves endpoints to set their own headers', () => {
		const json = { ...anonymousPage, pathname: '/api/health', contentType: 'application/json' };
		expect(pageCacheVerdict(json)).toBe('keep');
		expect(pageCacheVerdict({ ...json, isSignedIn: true })).toBe('keep');
	});

	it('honours a route that opts out or picks its own public policy', () => {
		expect(pageCacheVerdict({ ...anonymousPage, cacheControl: 'no-store' })).toBe('private');
		expect(pageCacheVerdict({ ...anonymousPage, cacheControl: 'private, max-age=60' })).toBe('private');
		expect(pageCacheVerdict({ ...anonymousPage, cacheControl: 'public, s-maxage=60' })).toBe('keep');
	});

	it('uses the documented header values', () => {
		expect(PUBLIC_PAGE_CACHE_CONTROL).toBe(
			'public, max-age=0, s-maxage=86400, stale-while-revalidate=604800',
		);
		expect(PRIVATE_CACHE_CONTROL).toBe('private, no-store');
	});
});

describe('hasSessionCookie', () => {
	it('finds the session cookie among others', () => {
		expect(hasSessionCookie('consent=1; user_token=abc; user_data=x')).toBe(true);
		expect(hasSessionCookie('user_token=')).toBe(true);
	});

	it('ignores a missing header and look-alike names', () => {
		expect(hasSessionCookie(null)).toBe(false);
		expect(hasSessionCookie('')).toBe(false);
		expect(hasSessionCookie('not_user_token=1; user_token_old=2')).toBe(false);
	});
});

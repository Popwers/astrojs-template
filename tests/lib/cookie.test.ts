import { beforeEach, describe, expect, setSystemTime, test } from 'bun:test';
import { getBrowserCookie, removeBrowserCookie, setBrowserCookie } from '@lib/cookie';

describe('Cookie functions', () => {
	beforeEach(() => {
		global.document = { cookie: '' } as unknown as Document;
		setSystemTime(new Date('2023-01-01T00:00:00Z'));
	});

	describe('setBrowserCookie', () => {
		describe('Setting cookie values', () => {
			test.each([
				['simpleCookie', 'value', 'simpleCookie=value'],
				['cookieWithSpaces', ' spaced value ', 'cookieWithSpaces=%20spaced%20value%20'],
				[
					'cookieWithSpecialChars',
					'!@#$%^&*()_+',
					'cookieWithSpecialChars=!%40%23%24%25%5E%26*()_%2B',
				],
			])('should set %s correctly', (name, value, expected) => {
				setBrowserCookie(name, value, 1);
				expect(global.document.cookie).toContain(expected);
			});
		});

		describe('Expiration handling', () => {
			test('should set expiration correctly for positive days', () => {
				setBrowserCookie('testCookie', 'testValue', 1);
				expect(global.document.cookie).toContain('expires=Mon, 02 Jan 2023 00:00:00 GMT');
			});

			test('should handle negative expiration', () => {
				setBrowserCookie('expiredCookie', 'oldValue', -1);
				expect(global.document.cookie).toContain('expires=Thu, 01 Jan 1970 00:00:00 GMT');
			});
		});

		describe('Error handling', () => {
			test('should throw error for invalid inputs', () => {
				expect(() => setBrowserCookie('', 'value', 1)).toThrow();
				expect(() => setBrowserCookie('name', '', 1)).toThrow();
			});
		});
	});

	describe('getBrowserCookie', () => {
		describe('Retrieving cookie values', () => {
			test.each([
				['simpleCookie=value;', 'simpleCookie', 'value'],
				['spacedCookie=spaced%20value;', 'spacedCookie', 'spaced value'],
				[
					'multiple=cookies; targetBrowserCookie=targetValue; more=cookies',
					'targetBrowserCookie',
					'targetValue',
				],
			])('should retrieve correct value from %s', (cookieString, name, expected) => {
				global.document.cookie = cookieString;
				expect(getBrowserCookie(name)).toBe(expected);
			});

			test('should return empty string for non-existent cookie', () => {
				global.document.cookie = 'existingCookie=someValue';
				expect(getBrowserCookie('nonExistentCookie')).toBe('');
			});

			test('should handle URL-encoded values', () => {
				global.document.cookie = 'encodedCookie=%21%40%23%24%25%5E%26*()_%2B';
				expect(getBrowserCookie('encodedCookie')).toBe('!@#$%^&*()_+');
			});
		});

		describe('Error handling', () => {
			test('should throw error for invalid inputs', () => {
				expect(() => getBrowserCookie('')).toThrow();
			});
		});
	});

	describe('removeBrowserCookie', () => {
		test('should remove a cookie', () => {
			setBrowserCookie('testCookie', 'testValue', 1);
			removeBrowserCookie('testCookie');
			expect(getBrowserCookie('testCookie')).toBe('');
		});
	});
});

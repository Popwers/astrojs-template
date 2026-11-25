import { updateAvatar } from '@actions/schema/user';
import { describe, expect, it } from 'vite-plus/test';

const JPEG_HEAD = [0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10];
const PNG_HEAD = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

function fileOf(bytes: number[], name: string, type: string): File {
	return new File([new Uint8Array(bytes)], name, { type });
}

describe('updateAvatar', () => {
	it('accepts a JPEG and a PNG whose content matches their type', async () => {
		expect(
			(await updateAvatar.safeParseAsync({ avatar: fileOf(JPEG_HEAD, 'a.jpg', 'image/jpeg') })).success,
		).toBe(true);
		expect(
			(await updateAvatar.safeParseAsync({ avatar: fileOf(PNG_HEAD, 'a.png', 'image/png') })).success,
		).toBe(true);
	});

	it('accepts a submission with no file', async () => {
		expect((await updateAvatar.safeParseAsync({})).success).toBe(true);
	});

	it('refuses an HTML payload sent as image/png, which the browser-supplied type cannot tell apart', async () => {
		const html = [...new TextEncoder().encode('<script>alert(1)</script>')];
		const result = await updateAvatar.safeParseAsync({ avatar: fileOf(html, 'a.png', 'image/png') });
		expect(result.success).toBe(false);
	});

	it('still refuses a type outside the allow list', async () => {
		const result = await updateAvatar.safeParseAsync({ avatar: fileOf(PNG_HEAD, 'a.gif', 'image/gif') });
		expect(result.success).toBe(false);
	});
});

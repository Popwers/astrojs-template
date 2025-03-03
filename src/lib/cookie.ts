/**
 * Sets a browser cookie with the given name, value, and optional expiration parameters.
 * @param cname - The name of the cookie.
 * @param cvalue - The value of the cookie.
 * @param exdays - The number of days until the cookie expires. (optional)
 */
const setBrowserCookie = (cname: string, cvalue: string, exdays?: number): void => {
	if (!cname || !cvalue) throw new Error('Cookie name and value must not be empty');

	let cookieString = `${encodeURIComponent(cname)}=${encodeURIComponent(cvalue)}`;

	if (exdays !== undefined) {
		const d = new Date();
		d.setTime(d.getTime() + exdays * 24 * 60 * 60 * 1000);
		cookieString += `; expires=${exdays < 0 ? 'Thu, 01 Jan 1970 00:00:00 GMT' : d.toUTCString()}; max-age=${exdays * 24 * 60 * 60}`;
	}

	cookieString += '; path=/';
	document.cookie = cookieString;
};

/**
 * Retrieves the value of a browser cookie with the given name.
 * @param cname - The name of the cookie.
 * @returns The value of the cookie, or an empty string if not found.
 */
const getBrowserCookie = (cname: string): string => {
	if (!cname) throw new Error('Cookie name must not be empty');

	const name: string = `${encodeURIComponent(cname)}=`;
	const decodedCookie: string = decodeURIComponent(document.cookie);
	const ca: string[] = decodedCookie.split(';');
	for (let c of ca) {
		c = c.trim();
		if (c.startsWith(name)) {
			try {
				return decodeURIComponent(c.substring(name.length));
			} catch (e) {
				return c.substring(name.length);
			}
		}
	}
	return '';
};

/**
 * Remove a browser cookie with the given name.
 * @param cname - The name of the cookie.
 */
const removeBrowserCookie = (cname: string): void => {
	if (getBrowserCookie(cname)) {
		document.cookie = `${encodeURIComponent(cname)}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
	}
};

export { getBrowserCookie, removeBrowserCookie, setBrowserCookie };

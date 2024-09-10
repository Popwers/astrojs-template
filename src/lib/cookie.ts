const setCookie = (cname: string, cvalue: string, exdays: number): void => {
	const d: Date = new Date();
	d.setTime(d.getTime() + exdays * 24 * 60 * 60 * 1000);
	const expires: string = `expires=${d.toUTCString()}`;
	document.cookie = `${cname}=${cvalue}; ${expires};`;
};

const getCookie = (cname: string): string => {
	const name: string = `${cname}=`;
	const decodedCookie: string = decodeURIComponent(document.cookie);
	const ca: string[] = decodedCookie.split(';');
	for (let i = 0; i < ca.length; i++) {
		let c: string = ca[i];
		while (c.charAt(0) === ' ') {
			c = c.substring(1);
		}
		if (c.indexOf(name) === 0) return c.substring(name.length, c.length);
	}
	return '';
};

export { getCookie, setCookie };

/// <reference path="../.astro/types.d.ts" />

// Fontsource variable font packages ship only CSS — no TypeScript declarations.
declare module '@fontsource-variable/montserrat';
declare module '@fontsource-variable/montserrat/files/*.woff2' {
	const src: string;
	export default src;
}
declare module '@fontsource-variable/raleway';
declare module '@fontsource-variable/raleway/files/*.woff2' {
	const src: string;
	export default src;
}

declare namespace App {
	interface Locals {
		user: User;
		userToken: string;
	}
}

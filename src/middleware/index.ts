import { sequence } from 'astro/middleware';

import checkRegistration from './checkRegistration';
import normalizePath from './normalizePath';
import restrictedWhenLogged from './restrictedWhenLogged';
import restrictedWhenNotLogged from './restrictedWhenNotLogged';
import userDataHydratation from './userDataHydratation';

export const onRequest = sequence(
	normalizePath,
	userDataHydratation,
	checkRegistration,
	restrictedWhenNotLogged,
	restrictedWhenLogged,
);

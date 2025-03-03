import { sequence } from 'astro/middleware';

import checkRegistration from './checkRegistration';
import restrictedWhenLogged from './restrictedWhenLogged';
import restrictedWhenNotLogged from './restrictedWhenNotLogged';
import userDataHydratation from './userDataHydratation';

export const onRequest = sequence(
	userDataHydratation,
	checkRegistration,
	restrictedWhenNotLogged,
	restrictedWhenLogged
);

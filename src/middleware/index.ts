import { defineMiddleware, sequence } from 'astro/middleware';

import checkRegistration from './checkRegistration';
import normalizePath from './normalizePath';
import pageCache from './pageCache';
import restrictedWhenLogged from './restrictedWhenLogged';
import restrictedWhenNotLogged from './restrictedWhenNotLogged';
import userDataHydratation from './userDataHydratation';

const perRequest = sequence(
	pageCache,
	normalizePath,
	userDataHydratation,
	checkRegistration,
	restrictedWhenNotLogged,
	restrictedWhenLogged,
);

/**
 * Prerendered routes run the middleware once, at build, with no cookie: the session guards have
 * nothing to read, and `normalizePath` would see the build's `/page/` URL and bake a redirect to
 * `site` into the HTML. They skip the chain.
 */
export const onRequest = defineMiddleware((context, next) =>
	context.isPrerendered ? next() : perRequest(context, next),
);

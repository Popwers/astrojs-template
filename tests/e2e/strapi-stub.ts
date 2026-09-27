/**
 * Minimal Strapi v5 stand-in for the Playwright suite. It answers only the
 * users-permissions endpoints the golden paths reach, with the payload shapes
 * `src/lib/strapi.ts` parses. Everything else is a Strapi 404 envelope, so the
 * pages that fetch CMS content fall back to their empty state.
 */
import type { JsonObject } from '@interfaces/json';
import type { User } from '@interfaces/user';
import { isJsonObject, isJsonString, parseJson } from '@lib/json';

import { EDITOR, READER } from './accounts';
import type { StubAccount } from './accounts';

interface Route {
	method: 'GET' | 'POST' | 'PUT';
	path: RegExp;
	handle: (request: Request, params: string[]) => Promise<Response> | Response;
}

const port = Number(process.env.STRAPI_STUB_PORT ?? 41337);

const accounts = new Map<number, StubAccount>(
	[READER, EDITOR].map((account) => [account.user.id, structuredClone(account)]),
);

const tokenFor = (user: User) => `stub-jwt-${user.documentId}`;

const strapiError = (status: number, name: string, message: string) =>
	Response.json({ data: null, error: { status, name, message, details: {} } }, { status });

const readBody = async (request: Request): Promise<JsonObject> => {
	try {
		const body = parseJson(await request.text());
		return isJsonObject(body) ? body : {};
	} catch {
		return {};
	}
};

const sessionAccount = (request: Request): StubAccount | undefined => {
	const token = request.headers.get('authorization')?.replace(/^Bearer /, '');
	return [...accounts.values()].find((account) => tokenFor(account.user) === token);
};

const unauthorized = () => strapiError(401, 'UnauthorizedError', 'Missing or invalid credentials');

const routes: Route[] = [
	{
		method: 'POST',
		path: /^\/api\/auth\/local$/,
		handle: async (request) => {
			const { identifier, password } = await readBody(request);
			const account = [...accounts.values()].find(
				(candidate) =>
					isJsonString(identifier) &&
					candidate.user.email === identifier.toLowerCase() &&
					candidate.password === password,
			);
			if (!account) return strapiError(400, 'ValidationError', 'Invalid identifier or password');

			return Response.json({ jwt: tokenFor(account.user), user: account.user });
		},
	},
	{
		method: 'GET',
		path: /^\/api\/users\/me$/,
		handle: (request) => {
			const account = sessionAccount(request);
			return account ? Response.json({ ...account.user, avatar: null }) : unauthorized();
		},
	},
	{
		method: 'PUT',
		path: /^\/api\/users\/(\d+)$/,
		handle: async (request, [id]) => {
			const account = sessionAccount(request);
			if (!account) return unauthorized();
			if (String(account.user.id) !== id) {
				return strapiError(403, 'ForbiddenError', 'Forbidden');
			}

			const { username, email } = await readBody(request);
			if (isJsonString(username)) account.user.username = username;
			if (isJsonString(email)) account.user.email = email.toLowerCase();
			account.user.updatedAt = new Date();

			return Response.json(account.user);
		},
	},
];

Bun.serve({
	port,
	fetch: (request) => {
		const { pathname } = new URL(request.url);
		for (const route of routes) {
			const match = route.path.exec(pathname);
			if (match && route.method === request.method) return route.handle(request, match.slice(1));
		}
		return strapiError(404, 'NotFoundError', 'Not Found');
	},
});

console.log(`Strapi stub listening on http://localhost:${port}`);

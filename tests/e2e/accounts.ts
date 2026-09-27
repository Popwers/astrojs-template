import type { User } from '@interfaces/user';

/** A Strapi user the stub knows, with the password the login form must send. */
interface StubAccount {
	password: string;
	user: User;
}

const createdAt = new Date('2026-01-15T09:30:00.000Z');

const strapiUser = (id: number, documentId: string, username: string, email: string): User => ({
	id,
	documentId,
	username,
	email,
	provider: 'local',
	confirmed: true,
	blocked: false,
	createdAt,
	updatedAt: createdAt,
	publishedAt: createdAt.toISOString(),
});

/** Logs in and reads pages. Never mutated, so read-only specs can share it. */
const READER: StubAccount = {
	password: 'Lecteur-2026!',
	user: strapiUser(1, 'r7k2m9q4w1x8z5c3v6b0n2p4', 'Jean Dupont', 'jean.dupont@example.com'),
};

/** Owned by the profile update spec, which renames it. */
const EDITOR: StubAccount = {
	password: 'Editeur-2026!',
	user: strapiUser(2, 'e3h8j1l6s9d2f5g7a4k0t1y3', 'Marie Curie', 'marie.curie@example.com'),
};

export { EDITOR, READER };
export type { StubAccount };

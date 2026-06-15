interface User {
	id: number;
	documentId: string;
	email: string;
	provider: string;
	confirmed: boolean;
	blocked: boolean;
	createdAt: Date;
	updatedAt: Date;
	publishedAt?: string | null;
	username: string;
	avatar?: {
		documentId: string;
		url: string;
		formats?: {
			thumbnail: { url: string };
			medium: { url: string };
			small: { url: string };
			large: { url: string };
		};
	};
	photo_profil?: {
		url: string;
	} | null;
}

export type { User };

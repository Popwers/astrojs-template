interface User {
	id: number;
	documentId: string;
	email: string;
	provider: string;
	confirmed: boolean;
	blocked: boolean;
	createdAt: Date;
	updatedAt: Date;
	username: string;
	avatar?: {
		documentId: string;
		url: string;
	};
}

export type { User };

import type { RootNode } from 'node_modules/@strapi/blocks-react-renderer/dist/BlocksRenderer';

export default interface TextPage {
	documentId: string;
	Contenu: RootNode[];
	createdAt?: string;
	updatedAt?: string;
	publishedAt?: string;
}

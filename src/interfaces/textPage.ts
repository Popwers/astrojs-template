import type { BlocksContent } from '@strapi/blocks-react-renderer';

export default interface TextPage {
	documentId: string;
	Contenu: BlocksContent;
	createdAt?: string;
	updatedAt?: string;
	publishedAt?: string;
}

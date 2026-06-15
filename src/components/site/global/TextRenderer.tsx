import { BlocksRenderer, type BlocksContent } from '@strapi/blocks-react-renderer';
import { memo } from 'react';

/**
 * TextRenderer component render the text renderer
 * @param {BlocksContent} content - The content of the text renderer
 * @returns The text renderer component
 */
export default memo(({ content }: { content: BlocksContent }) => (
	<BlocksRenderer
		content={content}
		blocks={{
			link: ({ children, url }) => (
				<a href={url} target='_blank' rel='noreferrer' className='text-blue'>
					{children}
				</a>
			),
		}}
	/>
));

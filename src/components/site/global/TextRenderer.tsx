import { BlocksRenderer } from '@strapi/blocks-react-renderer';
import type { RootNode } from 'node_modules/@strapi/blocks-react-renderer/dist/BlocksRenderer';
import { memo } from 'react';

/**
 * TextRenderer component render the text renderer
 * @param {RootNode[]} content - The content of the text renderer
 * @returns The text renderer component
 */
export default memo(({ content }: { content: RootNode[] }) => (
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

import { defineRule } from 'vite-plus/lint/plugins';
import { groupUnits, hasRuler, readComments, spanOf, type CommentUnit } from '../shared/comment.ts';
import { isCommentedOutCode } from './no-commented-out-code.ts';

function toBlock(unit: CommentUnit, indent: string): string {
	const body = unit.comments.map((comment) =>
		comment.text === '' ? `${indent} *` : `${indent} * ${comment.text}`,
	);
	return ['/**', ...body, `${indent} */`].join('\n');
}

/** Reject three or more stacked line comments, and fix them into one block comment. */
export const noStackedLineCommentsRule = defineRule({
	meta: {
		type: 'suggestion',
		docs: { description: 'Disallow three or more stacked line comments.' },
		fixable: 'code',
		messages: {
			stackedLineComments:
				'Three or more stacked `//` lines explain one thing. Use one `/** */` block.',
		},
		schema: [],
	},
	createOnce(context) {
		return {
			Program() {
				const comments = readComments(context.sourceCode);
				for (const unit of groupUnits(comments)) {
					if (!unit.isRun || unit.comments.length < 3) continue;
					if (unit.comments.some((comment) => comment.isDirective)) continue;
					if (isCommentedOutCode(unit)) continue;
					if (unit.comments.some((comment) => hasRuler(comment.text))) continue;
					const first = unit.comments[0];
					const last = unit.comments[unit.comments.length - 1];
					if (!first || !last) continue;
					const hasCloser = unit.comments.some((comment) => comment.value.includes('*/'));
					const indent = (context.sourceCode.lines[first.loc.start.line - 1] ?? '').slice(
						0,
						first.loc.start.column,
					);
					context.report({
						loc: spanOf(unit.comments),
						messageId: 'stackedLineComments',
						fix: hasCloser
							? undefined
							: (fixer) =>
									fixer.replaceTextRange([first.start, last.end], toBlock(unit, indent)),
					});
				}
			},
		};
	},
});

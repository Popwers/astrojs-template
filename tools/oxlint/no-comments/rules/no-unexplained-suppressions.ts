import { defineRule } from 'vite-plus/lint/plugins';
import { readComments, type Comment } from '../shared/comment.ts';

const MIN_REASON_LENGTH = 10;
const LINTER_DISABLE = /^(?:eslint|oxlint)-disable(?:-next-line|-line)?(?![\w-])/;

type MessageId = 'bannedTsDirective' | 'missingReason' | 'blanketDisable';

function bodyOf(comment: Comment): string {
	return comment.kind === 'line' ? comment.value.trim() : comment.value.replace(/^\*+/, '').trim();
}

function judgeLinterDisable(rest: string): MessageId | null {
	const separator = rest.search(/(?:^|\s)--(?:\s|$)/);
	const rules = separator < 0 ? rest : rest.slice(0, separator);
	const reason =
		separator < 0
			? ''
			: rest
					.slice(separator)
					.replace(/^\s*--\s*/, '')
					.trim();
	if (rules.trim() === '') return 'blanketDisable';
	return reason.length < MIN_REASON_LENGTH ? 'missingReason' : null;
}

function judge(body: string): MessageId | null {
	if (/^@ts-ignore(?![\w-])/.test(body)) return 'bannedTsDirective';
	const explained = /^@ts-(?:expect-error|nocheck)(?![\w-])/.exec(body);
	if (explained) {
		const reason = body
			.slice(explained[0].length)
			.replace(/^[\s:—–-]+/, '')
			.trim();
		return reason.length < MIN_REASON_LENGTH ? 'missingReason' : null;
	}
	const disable = LINTER_DISABLE.exec(body);
	if (!disable) return null;
	return judgeLinterDisable(body.slice(disable[0].length));
}

/** Require every lint or type suppression to name its rule and carry a written reason. */
export const noUnexplainedSuppressionsRule = defineRule({
	meta: {
		type: 'problem',
		docs: { description: 'Disallow blanket, reasonless or @ts-ignore style suppressions.' },
		messages: {
			bannedTsDirective:
				'Do not use `@ts-ignore`. Fix the type, or use `@ts-expect-error` with a reason.',
			missingReason: 'Explain this suppression: add a reason of at least 10 characters.',
			blanketDisable: 'Name the rule this disables instead of silencing every rule.',
		},
		schema: [],
	},
	createOnce(context) {
		return {
			Program() {
				for (const comment of readComments(context.sourceCode)) {
					const messageId = judge(bodyOf(comment));
					if (messageId) context.report({ loc: comment.loc, messageId });
				}
			},
		};
	},
});

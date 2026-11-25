import { defineRule } from 'vite-plus/lint/plugins';
import {
	groupUnits,
	isGeneratedNotice,
	judgedComments,
	readComments,
	spanOf,
	type CommentUnit,
} from '../shared/comment.ts';

const STRONG_CODE_PATTERNS = [
	/^(const|let|var)\s+[\w${[].*=/,
	/^import\s.+from\s+['"]/,
	/^import\s+['"]/,
	/^export\s+(default|const|let|function|async|class|type|interface|\{|\*)/,
	/^return\b.*;$/,
	/^(await|throw|yield)\s.+;$/,
	/^(if|for|while|switch|catch)\s*\(.*\)\s*\{?$/,
	/^\}?\s*else(\s+if\s*\(.*\))?\s*\{$/,
	/^[\w$.[\]'"]+\s*(=|\+=|-=|\|\|=|&&=|\?\?=)\s*[^=].*;$/,
	/^[\w$.]+\(.*\);$/,
	/^[\w$.]+\(.*(=>|function)\s*.*\{$/,
	/^<\/?[A-Za-z][\w.]*(\s[^>]*)?\/?>$/,
	/^\{\/\*.*\*\/\}$/,
];

const WEAK_CODE_PATTERNS = [/^[{}()[\],;\s]+$/, /^[\w$'"-]+:\s.+,$/];

const PROSE_RUN = /(?:\b[a-z]+\b[ ,]+){3}\b[a-z]+\b/;

function isStrongCode(line: string): boolean {
	return !PROSE_RUN.test(line) && STRONG_CODE_PATTERNS.some((pattern) => pattern.test(line));
}

const EXAMPLE_PREFIX = /^(e\.g\.|eg:|example|usage|i\.e\.|output|input|returns|=>)/i;

/** True when a unit reads as source code that was commented out rather than prose. */
export function isCommentedOutCode(unit: CommentUnit): boolean {
	const lines = unit.lines.map((line) => line.text);
	const first = lines[0];
	if (first === undefined || EXAMPLE_PREFIX.test(first) || isGeneratedNotice(unit.text)) return false;
	if (lines.some((line) => line.endsWith(':'))) return false;
	const strong = lines.filter(isStrongCode).length;
	if (strong === 0) return false;
	const weak = lines.filter(
		(line) => !isStrongCode(line) && WEAK_CODE_PATTERNS.some((pattern) => pattern.test(line)),
	).length;
	return (strong + weak) / lines.length >= 0.5;
}

/** Reject line and block comments whose content is mostly source code. */
export const noCommentedOutCodeRule = defineRule({
	meta: {
		type: 'suggestion',
		docs: { description: 'Disallow commented-out code in line and block comments.' },
		messages: {
			commentedOutCode:
				'This comment is commented-out code. Delete it, version control keeps the history.',
		},
		schema: [],
	},
	createOnce(context) {
		return {
			Program() {
				const comments = judgedComments(readComments(context.sourceCode)).filter(
					(comment) => comment.kind !== 'jsdoc',
				);
				for (const unit of groupUnits(comments)) {
					if (!isCommentedOutCode(unit)) continue;
					context.report({ loc: spanOf(unit.comments), messageId: 'commentedOutCode' });
				}
			},
		};
	},
});

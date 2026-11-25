import { defineRule } from 'vite-plus/lint/plugins';
import { groupUnits, isRulerOnly, judgedComments, readComments, type Comment } from '../shared/comment.ts';

const NUMBERED_STEP = [/^(step|phase|part|stage|étape)\s*#?\d+\s*(?:[:.)—–-]|$)/i, /^\(?\d+[.)]\s+\S/];

const SEQUENCE_NARRATION = [
	/^(first|then|next|now|finally|lastly)\s*,\s/i,
	/^(first|then|next|now|finally|lastly|here)\s+(we|let'?s|i)\b/i,
	/^let'?s\s/i,
];

type NarrationKind = 'numberedStep' | 'sequenceNarration' | 'orphanRuler';

function narrationKind(line: string): NarrationKind | undefined {
	if (NUMBERED_STEP.some((pattern) => pattern.test(line))) return 'numberedStep';
	if (SEQUENCE_NARRATION.some((pattern) => pattern.test(line))) return 'sequenceNarration';
	return isRulerOnly(line) ? 'orphanRuler' : undefined;
}

function linesWithWords(comments: readonly Comment[]): Set<number> {
	const lines = new Set<number>();
	for (const comment of comments) {
		if (!/[A-Za-z]/.test(comment.text)) continue;
		for (let line = comment.loc.start.line; line <= comment.loc.end.line; line += 1) lines.add(line);
	}
	return lines;
}

/** Reject step numbering, "first, then" narration and unlabelled ASCII rulers in line and block comments. */
export const noNarrationRule = defineRule({
	meta: {
		type: 'suggestion',
		docs: { description: 'Disallow step-by-step narration and unlabelled rulers in comments.' },
		messages: {
			numberedStep:
				'Drop the step number. Keep the why if there is one, or split the code into named steps.',
			sequenceNarration: 'This comment narrates what the next lines do. Delete it, or state the why.',
			orphanRuler: 'A ruler with no label says nothing. Delete it, or label the section it opens.',
		},
		schema: [],
	},
	createOnce(context) {
		return {
			Program() {
				const all = readComments(context.sourceCode);
				const worded = linesWithWords(all);
				const comments = judgedComments(all).filter((comment) => comment.kind !== 'jsdoc');
				for (const unit of groupUnits(comments)) {
					const rulers = unit.lines.filter((line) => isRulerOnly(line.text));
					if (rulers.length === 0) {
						const [first] = unit.lines;
						const kind = first ? narrationKind(first.text) : undefined;
						if (first && kind) context.report({ loc: first.comment.loc, messageId: kind });
						continue;
					}
					const orphan = rulers.find(({ comment }) => {
						const framesALabel =
							/[A-Za-z]/.test(comment.text) ||
							worded.has(comment.loc.start.line - 1) ||
							worded.has(comment.loc.end.line + 1);
						return !framesALabel;
					});
					if (orphan) context.report({ loc: orphan.comment.loc, messageId: 'orphanRuler' });
				}
			},
		};
	},
});

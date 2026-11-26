import { defineRule } from 'vite-plus/lint/plugins';
import { groupUnits, isGeneratedNotice, judgedComments, readComments, spanOf } from '../shared/comment.ts';

const UNENCODED_CONSTRAINT = [
	/(?:^|[.:;!?—–]\s+)(do\s+not|don'?t|never)\s+(remove|delete|change|touch|modify|rename|reorder|move|refactor)\b/im,
	/\btalk to \w+ before\b/i,
	/\btoo risky\b/i,
	/(?:^|[.!?]\s+)(IMPORTANT|WARNING|CAREFUL|BEWARE|DANGER|CRITICAL)\b|\b(IMPORTANT|WARNING|CAREFUL|BEWARE|DANGER|CRITICAL)\s*[:!]/m,
];

const DEFERRED_FIX = [
	/\b(TODO|FIXME|HACK)\b|\bXXX\s*:/,
	/\b(for now|good enough|temporary (fix|hack|patch|solution|measure)|temp fix|quick fix|work-?around|hacky|kludge|band-?aid|monkey-?patch(ed)?|should be fine|revisit (this|later))\b/i,
	/\buntil we (can|have|fix|migrate|move|upgrade)\b/i,
];

/** Reject warnings and deferred fixes that carry no link to an issue proving them. */
export const noUnlinkedConstraintsRule = defineRule({
	meta: {
		type: 'suggestion',
		docs: { description: 'Disallow "do not touch" and "fix later" comments that link no proof.' },
		messages: {
			unencodedConstraint:
				'Encode this constraint in a type, a test or a lint rule, or link the issue that proves it.',
			deferredFix: 'Fix the root cause, or link the upstream issue that forces this.',
		},
		schema: [],
	},
	createOnce(context) {
		return {
			Program() {
				for (const unit of groupUnits(judgedComments(readComments(context.sourceCode)))) {
					if (unit.hasLink || isGeneratedNotice(unit.text)) continue;
					const { text } = unit;
					const messageId = UNENCODED_CONSTRAINT.some((pattern) => pattern.test(text))
						? 'unencodedConstraint'
						: DEFERRED_FIX.some((pattern) => pattern.test(text))
							? 'deferredFix'
							: null;
					if (messageId) context.report({ loc: spanOf(unit.comments), messageId });
				}
			},
		};
	},
});

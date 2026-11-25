import { eslintCompatPlugin } from 'vite-plus/lint/plugins';
import { englishOnlyRule } from './rules/english-only.ts';
import { noCallerListsRule } from './rules/no-caller-lists.ts';
import { noCommentedOutCodeRule } from './rules/no-commented-out-code.ts';
import { noNarrationRule } from './rules/no-narration.ts';
import { noRestatedNamesRule } from './rules/no-restated-names.ts';
import { noStackedLineCommentsRule } from './rules/no-stacked-line-comments.ts';
import { noTicketIdsRule } from './rules/no-ticket-ids.ts';
import { noUnexplainedSuppressionsRule } from './rules/no-unexplained-suppressions.ts';
import { noUnlinkedConstraintsRule } from './rules/no-unlinked-constraints.ts';

/** Oxlint rules that reject comments a reader cannot use: restatements, narration, ids, stale warnings. */
const noCommentsPlugin = eslintCompatPlugin({
	meta: { name: 'no-comments' },
	rules: {
		'english-only': englishOnlyRule,
		'no-caller-lists': noCallerListsRule,
		'no-commented-out-code': noCommentedOutCodeRule,
		'no-narration': noNarrationRule,
		'no-restated-names': noRestatedNamesRule,
		'no-stacked-line-comments': noStackedLineCommentsRule,
		'no-ticket-ids': noTicketIdsRule,
		'no-unexplained-suppressions': noUnexplainedSuppressionsRule,
		'no-unlinked-constraints': noUnlinkedConstraintsRule,
	},
});

export default noCommentsPlugin;

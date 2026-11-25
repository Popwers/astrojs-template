import { defineRule } from 'vite-plus/lint/plugins';
import { allowOption, judgedComments, readComments } from '../shared/comment.ts';

const FUNCTION_WORDS = new Set(
	(
		'le la les un une des de du au aux en ce cette ces se ne pas est sont pour avec dans sur par qui que nous ' +
		'vous et ou mais donc ici alors lorsque quand afin leur leurs notre nos votre vos il elle ils elles puis ' +
		'aussi très sous entre vers chez être avoir fait faire doit peut permet chaque tous tout depuis avant après'
	).split(' '),
);

const ENGLISH_WORDS = new Set(
	(
		'the of and to is in for that with when are not by it this be from as its was were has have will can if ' +
		'then which into only each every no so we they their there'
	).split(' '),
);

function distinctIn(words: readonly string[], vocabulary: ReadonlySet<string>): number {
	return new Set(words.filter((word) => vocabulary.has(word))).size;
}

const ACCENT = /[àâäæçéèêëîïôœùûüÿ]/i;
const QUOTED = [
	/https?:\/\/\S+/g,
	/(?<![\p{L}\p{N}])'[^'\n]*'(?![\p{L}\p{N}])/gu,
	/"[^"\n]*"/g,
	/`[^`]*`/g,
	/«[^»]*»/g,
];

function stripQuoted(text: string): string {
	return QUOTED.reduce((rest, pattern) => rest.replace(pattern, ' '), text);
}

/**
 * Reject comments written in French: accented words and French function words must outweigh the English
 * function words, so an English sentence that names a French domain term is left alone.
 */
export const englishOnlyRule = defineRule({
	meta: {
		type: 'suggestion',
		docs: { description: 'Require comments to be written in English.' },
		messages: {
			nonEnglish: 'This comment is not in English. Translate it.',
		},
		schema: [
			{
				type: 'object',
				properties: { allow: { type: 'array', items: { type: 'string' } } },
				additionalProperties: false,
			},
		],
		defaultOptions: [{ allow: [] }],
	},
	createOnce(context) {
		return {
			Program() {
				const allowed = new Set(allowOption(context.options).map((word) => word.toLowerCase()));
				for (const comment of judgedComments(readComments(context.sourceCode))) {
					const words = stripQuoted(comment.text).match(/\p{L}+/gu) ?? [];
					const accents = words.filter(
						(word) => ACCENT.test(word) && !allowed.has(word.toLowerCase()),
					);
					const lowercased = words
						.filter((word) => word !== word.toUpperCase())
						.map((word) => word.toLowerCase());
					const accentCount = new Set(accents.map((word) => word.toLowerCase())).size;
					const frenchCount = distinctIn(lowercased, FUNCTION_WORDS);
					const englishCount = distinctIn(lowercased, ENGLISH_WORDS);
					const hasStrongSignal =
						accentCount > 0 ||
						frenchCount >= 3 ||
						lowercased.some((word) => word.length >= 3 && FUNCTION_WORDS.has(word));
					const isFrench =
						hasStrongSignal &&
						accentCount + frenchCount >= 2 &&
						accentCount + 2 * frenchCount > 2 * englishCount;
					if (isFrench) context.report({ loc: comment.loc, messageId: 'nonEnglish' });
				}
			},
		};
	},
});

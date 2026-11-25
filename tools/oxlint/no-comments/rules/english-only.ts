import { defineRule } from 'vite-plus/lint/plugins';
import { allowOption, judgedComments, readComments } from '../shared/comment.ts';

const FUNCTION_WORDS = new Set(
	(
		'le les des une est pour avec dans sur pas qui que nous vous cette ces aux du et ou sont mais donc ici ' +
		'alors lorsque quand afin leur leurs notre nos votre vos il elle ils elles puis aussi très sous entre ' +
		'vers chez être avoir fait faire doit peut permet'
	).split(' '),
);

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

/** Reject comments written in French, detected by accented words and French function words. */
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
					const functionWords = new Set(
						words
							.filter(
								(word) =>
									word !== word.toUpperCase() && FUNCTION_WORDS.has(word.toLowerCase()),
							)
							.map((word) => word.toLowerCase()),
					);
					const isFrench =
						accents.length >= 2 ||
						(accents.length >= 1 && functionWords.size >= 1) ||
						functionWords.size >= 3;
					if (isFrench) context.report({ loc: comment.loc, messageId: 'nonEnglish' });
				}
			},
		};
	},
});

import { defineRule } from 'vite-plus/lint/plugins';
import {
	groupUnits,
	hasRuler,
	judgedComments,
	readComments,
	spanOf,
	type Comment,
} from '../shared/comment.ts';

const KEYWORDS = new Set(
	(
		'const let var function class type interface enum export import default return async await new if else ' +
		'for while from as extends implements public private protected static readonly typeof void null ' +
		'undefined true false this of in'
	).split(' '),
);

const STOPWORDS = new Set(
	(
		'a an the of to for and or in on at by with from this that these those is are be it its we our all any ' +
		'each new current given here then now just simply function method component hook helper util utility ' +
		'variable const constant value class type handler callback'
	).split(' '),
);

const SYNONYM_GROUPS: Record<string, string> = {
	get: 'get fetch retrieve load',
	create: 'create make build generate',
	remove: 'remove delete',
	check: 'check validate verify',
	init: 'init initialize initialise setup',
	render: 'show display render',
	handle: 'handle handles',
};

const SYNONYMS = new Map(
	Object.entries(SYNONYM_GROUPS).flatMap(([key, words]) =>
		words.split(' ').map((word) => [word, key] as const),
	),
);

const SUFFIXES = ['ing', 'ed', 'es', 's'];

function normalize(word: string): string {
	const direct = SYNONYMS.get(word);
	if (direct) return direct;
	if (word.length <= 4) return word;
	const suffix = SUFFIXES.find((candidate) => word.endsWith(candidate));
	if (!suffix) return word;
	const stem = word.slice(0, -suffix.length);
	return SYNONYMS.get(stem) ?? SYNONYMS.get(`${stem}e`) ?? stem;
}

function splitIdentifier(identifier: string): string[] {
	return identifier
		.replace(/([a-z0-9])([A-Z])/g, '$1 $2')
		.replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2')
		.split(/[^A-Za-z]+/)
		.filter((part) => part.length > 0)
		.map((part) => part.toLowerCase());
}

const STRING_LITERAL = /'(?:[^'\\]|\\.)*'|"(?:[^"\\]|\\.)*"|`(?:[^`\\]|\\.)*`/g;

function lineWords(line: string): Set<string> {
	const identifiers = line.replace(STRING_LITERAL, ' ').match(/[A-Za-z_$][\w$]*/g) ?? [];
	const words = identifiers
		.filter((identifier) => !KEYWORDS.has(identifier))
		.flatMap(splitIdentifier)
		.filter((word) => !KEYWORDS.has(word));
	return new Set(words.map(normalize));
}

function commentWords(text: string): string[] {
	return (text.toLowerCase().match(/[a-z]+/g) ?? []).filter((word) => !STOPWORDS.has(word)).map(normalize);
}

function isSingleLineStandalone(comment: Comment): boolean {
	if (comment.kind === 'line') return comment.isAlone;
	const isOneLine = comment.loc.start.line === comment.loc.end.line;
	return isOneLine && comment.isAlone && comment.endsLine && !/@\w/.test(comment.text);
}

/** Reject a lone comment whose few words only repeat the identifiers of the next line. */
export const noRestatedNamesRule = defineRule({
	meta: {
		type: 'suggestion',
		docs: { description: 'Disallow comments that restate the name of the declaration below them.' },
		messages: {
			restatedName: 'This comment repeats the name below it. Delete it, or say what the name does not.',
		},
		schema: [],
	},
	createOnce(context) {
		return {
			Program() {
				const { lines } = context.sourceCode;
				const comments = judgedComments(readComments(context.sourceCode));
				for (const unit of groupUnits(comments)) {
					const [comment] = unit.comments;
					if (!comment || unit.comments.length !== 1 || !isSingleLineStandalone(comment)) continue;
					if (comment.hasLink || /SAFETY:|`|\d/.test(comment.text) || hasRuler(comment.text))
						continue;
					const next = (lines[comment.loc.end.line] ?? '').trim();
					if (next === '' || /^(\/\/|\/\*|\*)/.test(next)) continue;
					const words = commentWords(comment.text);
					if (words.length < 1 || words.length > 6) continue;
					const known = lineWords(next);
					if (words.every((word) => known.has(word))) {
						context.report({ loc: spanOf(unit.comments), messageId: 'restatedName' });
					}
				}
			},
		};
	},
});

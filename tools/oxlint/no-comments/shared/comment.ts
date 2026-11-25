import type { Comment as RawComment, Options, SourceCode } from 'vite-plus/lint/plugins';

type JsonValue = Options[number];

/** Source position as Oxlint reports it: 1-based line, 0-based column. */
export interface Position {
	line: number;
	column: number;
}

/** Span of source text, usable as the `loc` of a report. */
export interface Span {
	start: Position;
	end: Position;
}

export type CommentKind = 'line' | 'jsdoc' | 'block';

/** One comment with the facts every rule needs, computed once per file. */
export interface Comment {
	kind: CommentKind;
	value: string;
	text: string;
	lines: string[];
	start: number;
	end: number;
	loc: Span;
	isDirective: boolean;
	isLicenseHeader: boolean;
	hasLink: boolean;
	isAlone: boolean;
	endsLine: boolean;
}

/** A group of comments that a rule judges as one piece of prose. */
export interface CommentUnit {
	comments: Comment[];
	lines: UnitLine[];
	text: string;
	hasLink: boolean;
	isRun: boolean;
}

/** One non-empty line of a unit, tied to the comment that holds it. */
export interface UnitLine {
	text: string;
	comment: Comment;
}

const DIRECTIVE_PREFIXES = [
	'eslint-',
	'oxlint-',
	'biome-ignore',
	'prettier-ignore',
	'oxfmt-ignore',
	'deno-lint-ignore',
	'deno-fmt-ignore',
	'v8 ignore',
	'c8 ignore',
	'istanbul ignore',
	'@ts-',
	'@vite-ignore',
	'@vitest-environment',
	'@jest-environment',
	'#__PURE__',
	'@__PURE__',
	'#region',
	'#endregion',
	'region ',
	'endregion',
	'global ',
	'globals ',
	'@jsx',
	'@license',
	'@preserve',
	'cspell:',
	'spell-checker:',
];

const LICENSE_PATTERN = /copyright|licen[sc]e|spdx|©|\(c\)\s*\d{4}/i;
const LEADING_SHEBANG_OR_SPACE = /^(?:#![^\n]*\n)?\s*$/;

function isDirectiveText(kind: CommentKind, value: string): boolean {
	if (kind === 'line' && value.startsWith('/')) return true;
	const probe = (kind === 'line' ? value : value.replace(/^\*+/, '')).trim();
	if (/^webpack[A-Z]/.test(probe)) return true;
	return DIRECTIVE_PREFIXES.some((prefix) => probe.startsWith(prefix));
}

function kindOf(raw: RawComment): CommentKind {
	if (raw.type === 'Line') return 'line';
	return raw.value.startsWith('*') ? 'jsdoc' : 'block';
}

function textLines(kind: CommentKind, value: string): string[] {
	return value
		.split(/\r?\n/)
		.map((line, index) => {
			if (kind === 'line') return line.trim();
			if (index === 0) return (kind === 'jsdoc' ? line.replace(/^\*+/, '') : line).trim();
			return line.replace(/^\s*\*(?!\/)\s?/, '').trim();
		})
		.filter((line) => line.length > 0);
}

function describe(sourceCode: SourceCode, raw: RawComment, isFirst: boolean): Comment {
	const kind = kindOf(raw);
	const lines = textLines(kind, raw.value);
	const text = lines.join('\n');
	const startLine = sourceCode.lines[raw.loc.start.line - 1] ?? '';
	const endLine = sourceCode.lines[raw.loc.end.line - 1] ?? '';
	const isHeaderPosition =
		isFirst && kind !== 'line' && LEADING_SHEBANG_OR_SPACE.test(sourceCode.text.slice(0, raw.start));
	return {
		kind,
		value: raw.value,
		text,
		lines,
		start: raw.start,
		end: raw.end,
		loc: {
			start: { line: raw.loc.start.line, column: raw.loc.start.column },
			end: { line: raw.loc.end.line, column: raw.loc.end.column },
		},
		isDirective: isDirectiveText(kind, raw.value),
		isLicenseHeader: isHeaderPosition && (raw.value.startsWith('!') || LICENSE_PATTERN.test(raw.value)),
		hasLink: /https?:\/\//.test(text),
		isAlone: startLine.slice(0, raw.loc.start.column).trim().length === 0,
		endsLine: endLine.slice(raw.loc.end.column).trim().length === 0,
	};
}

/** Read every comment of the file (shebangs excluded) into the shared comment model. */
export function readComments(sourceCode: SourceCode): Comment[] {
	const raws = sourceCode.getAllComments().filter((raw) => raw.type !== 'Shebang');
	return raws.map((raw, index) => describe(sourceCode, raw, index === 0));
}

/** Keep the comments that content rules may judge: no tool directive, no license header. */
export function judgedComments(comments: readonly Comment[]): Comment[] {
	return comments.filter((comment) => !comment.isDirective && !comment.isLicenseHeader);
}

function toUnit(comments: Comment[], isRun: boolean): CommentUnit {
	const lines = comments.flatMap((comment) => comment.lines.map((text) => ({ text, comment })));
	return {
		comments,
		lines,
		text: lines.map((line) => line.text).join('\n'),
		hasLink: comments.some((comment) => comment.hasLink),
		isRun,
	};
}

function continuesRun(run: readonly Comment[], next: Comment): boolean {
	const last = run[run.length - 1];
	if (!last || !next.isAlone || next.kind !== 'line') return false;
	return next.loc.start.line === last.loc.end.line + 1 && next.loc.start.column === last.loc.start.column;
}

/**
 * Group comments into units: consecutive standalone line comments on adjacent lines with the same
 * column form one run, every other comment is a unit of its own.
 */
export function groupUnits(comments: readonly Comment[]): CommentUnit[] {
	const units: CommentUnit[] = [];
	let run: Comment[] = [];
	const flush = () => {
		if (run.length > 0) units.push(toUnit(run, true));
		run = [];
	};
	for (const comment of comments) {
		if (comment.kind === 'line' && comment.isAlone) {
			if (!continuesRun(run, comment)) flush();
			run.push(comment);
			continue;
		}
		flush();
		units.push(toUnit([comment], false));
	}
	flush();
	return units;
}

/** True when the text marks a generated file, whose header is written by a tool. */
export function isGeneratedNotice(text: string): boolean {
	return /@generated\b|\b(?:auto-?)?generated\b/i.test(text);
}

const RULER_ONLY = /^[-=*#~_+/\\|<>.\s]+$/;

/** True when the line is only ruler characters: an ASCII rule with no label. */
export function isRulerOnly(line: string): boolean {
	return line.length >= 4 && RULER_ONLY.test(line);
}

/** True when the text draws a rule, labelled (`--- HELPERS ---`) or not. */
export function hasRuler(text: string): boolean {
	return /[-=*#~_]{3,}/.test(text);
}

/** Span from the first comment's start to the last comment's end. */
export function spanOf(comments: readonly Comment[]): Span {
	const first = comments[0];
	const last = comments[comments.length - 1];
	if (!first || !last) throw new Error('spanOf needs at least one comment');
	return { start: first.loc.start, end: last.loc.end };
}

function isOptionRecord(value: JsonValue | undefined): value is { allow?: JsonValue } {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** Read the `allow` string list of a rule's first option object. */
export function allowOption(options: readonly JsonValue[]): string[] {
	const option = options[0];
	if (!isOptionRecord(option) || !Array.isArray(option.allow)) return [];
	return option.allow.filter((entry): entry is string => typeof entry === 'string');
}

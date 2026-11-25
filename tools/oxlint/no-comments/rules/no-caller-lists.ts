import { defineRule } from 'vite-plus/lint/plugins';
import { allowOption, judgedComments, readComments } from '../shared/comment.ts';

const CALLER_NAME = String.raw`(the\s+)?(\`|'|")?([A-Za-z_$][\w$./-]*)`;

const CALLER_LIST = new RegExp(
	String.raw`(?:^(?:only\s+|also\s+)?(?:called|invoked|used|consumed|triggered|imported|referenced)\s+(?:only\s+)?(?:by|from|in|inside|within)` +
		String.raw`|\b(?:called|invoked)\s+(?:only\s+)?(?:by|from))\s+${CALLER_NAME}`,
	'gim',
);

const PRODUCT_NAMES = new Set(
	(
		'TypeScript JavaScript ECMAScript WebAssembly GitHub GitLab BitBucket OAuth OpenID iOS iPadOS macOS tvOS watchOS ' +
		'WebKit DevTools PostgreSQL MySQL SQLite MongoDB GraphQL WebSocket WebSockets WebRTC WebGL WebGPU WebAuthn ' +
		'TanStack BetterAuth NextAuth OpenAI OpenPanel PostCSS TailwindCSS WordPress YouTube LinkedIn PayPal ' +
		'CloudFront CloudFlare DynamoDB OrbStack FireFox PowerShell IntelliJ VSCode OpenTelemetry'
	).split(' '),
);

const CODE_EXTENSION = /\.(?:[cm]?[jt]sx?|astro|vue|svelte|py|go|rs|rb|php|sql|sh|css|json)$/;
const LOWER_CAMEL = /^[a-z][a-z0-9]*[A-Z][A-Za-z0-9]*[a-z][A-Za-z0-9]*$/;
const PASCAL_HUMPS = /^(?:[A-Z][a-z0-9]+){2,}$/;
const USED_AS_ADJECTIVE = /^\s+(?!and\b|or\b)[a-z]/;

function looksLikeCode(name: string, isQuoted: boolean, rest: string): boolean {
	if (isQuoted || rest.startsWith('(')) return true;
	if (/[_$]/.test(name) || CODE_EXTENSION.test(name) || LOWER_CAMEL.test(name)) return true;
	return PASCAL_HUMPS.test(name) && !USED_AS_ADJECTIVE.test(rest);
}

/** Reject comments that list the callers of a symbol, which the IDE call graph answers better. */
export const noCallerListsRule = defineRule({
	meta: {
		type: 'suggestion',
		docs: { description: 'Disallow comments that name the callers or consumers of the code.' },
		messages: {
			callerList: 'Do not list callers in a comment, they go stale. Rely on the call graph.',
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
				const products = new Set([...PRODUCT_NAMES, ...allowOption(context.options)]);
				for (const comment of judgedComments(readComments(context.sourceCode))) {
					const isCallerList = [...comment.text.matchAll(CALLER_LIST)].some((match) => {
						const name = (match[3] ?? '').replace(/[./-]+$/, '');
						const rest = comment.text.slice((match.index ?? 0) + match[0].length);
						if (match[2] !== '`' && products.has(name)) return false;
						return looksLikeCode(name, match[2] === '`', rest);
					});
					if (isCallerList) context.report({ loc: comment.loc, messageId: 'callerList' });
				}
			},
		};
	},
});

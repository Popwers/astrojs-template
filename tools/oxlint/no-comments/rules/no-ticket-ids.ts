import { defineRule } from 'vite-plus/lint/plugins';
import { allowOption, judgedComments, readComments } from '../shared/comment.ts';

const DEFAULT_ALLOWED_PREFIXES = new Set(
	(
		'UTF ISO SHA RFC CVE CWE GHSA ES ECMA WCAG HTTP TLS SSL AES RSA MD HMAC PBKDF PKCS BCP IEEE IEC ANSI ' +
		'EN DIN NF CP EUC GB KOI MS ASCII BASE COVID HS RS PS ED SECP MP MPEG AV VP UTC GMT PEP JEP TC CSS ' +
		'HTML IPV IP NIST FIPS PCI SOC ARM RISC ISBN OWASP GPL LGPL AGPL MPL BSD EPL EUPL CDDL CC CRC ADR'
	).split(' '),
);

const TICKET_ID = /(?<![\w.-])([A-Z]{2,10})-(\d{1,6})(?![\w-]|\.\d)/g;

/** Reject issue-tracker identifiers made of letters, a dash and digits in comments. */
export const noTicketIdsRule = defineRule({
	meta: {
		type: 'suggestion',
		docs: { description: 'Disallow ticket identifiers in comments.' },
		messages: {
			ticketId: 'Ticket id `{{id}}` in a comment. Put that context in the commit message.',
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
				const allowed = new Set([...DEFAULT_ALLOWED_PREFIXES, ...allowOption(context.options)]);
				for (const comment of judgedComments(readComments(context.sourceCode))) {
					const text = comment.text.replace(/https?:\/\/\S+/g, ' ');
					const match = [...text.matchAll(TICKET_ID)].find(
						([, prefix]) => !allowed.has(prefix ?? ''),
					);
					if (!match) continue;
					context.report({ loc: comment.loc, messageId: 'ticketId', data: { id: match[0] } });
				}
			},
		};
	},
});

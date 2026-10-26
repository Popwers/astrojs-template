import { z } from 'astro/zod';

/** The token field the Turnstile widget posts, spread into the schema of every public form. */
const turnstile = { 'cf-turnstile-response': z.string().default('') };

export { turnstile };

/**
 * Test stub for the `astro:actions` virtual module.
 * Wired via vite.config.ts `test.alias` (Vitest) and tsconfig `paths` (bun) so that
 * importing the real action files / guards in tests resolves without an Astro build.
 *
 * It intentionally mirrors only the surface the source code touches:
 * `defineAction`, `ActionError`, `isInputError` and the `ActionAPIContext` type.
 * `defineAction` is a pass-through (no Zod validation) so a test can call
 * `someAction.handler(input, context)` directly. Keep this minimal — it must never
 * grow behavior the real module does not have.
 */
import type { AstroCookies } from 'astro';

export class ActionError extends Error {
	code: string;

	constructor({ code, message }: { code: string; message?: string }) {
		super(message);
		this.name = 'ActionError';
		this.code = code;
	}
}

export interface ActionAPIContext {
	locals: App.Locals;
	cookies: AstroCookies;
}

export const defineAction = <T>(definition: T): T => definition;

export const isInputError = (_error: unknown): boolean => false;

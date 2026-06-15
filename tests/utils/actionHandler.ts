/**
 * Invoke an Astro action's `handler` directly for unit testing.
 *
 * `astro check` resolves `astro:actions` to the real action-client type, which
 * exposes no `handler` property, while tsgo / Vitest / Bun resolve it to the
 * test stub (a pass-through that keeps `handler`). Casting through `unknown`
 * lets a test call the handler cleanly under both type-checkers.
 *
 * @param action - The action whose handler to invoke.
 * @returns The action's handler, typed loosely so any input/context is accepted.
 */
export function handlerOf(action: unknown): (input: unknown, context: unknown) => Promise<unknown> {
	return (action as { handler: (input: unknown, context: unknown) => Promise<unknown> }).handler;
}

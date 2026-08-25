import { ActionError } from 'astro:actions';

/**
 * The message carried by a caught value, without assuming it is an `Error`.
 */
function messageOf(cause: unknown): string {
	return cause instanceof Error ? cause.message : String(cause);
}

/**
 * The `ActionError` code carried by a caught value, or `null` for any other failure.
 */
function codeOf(cause: unknown): string | null {
	return cause instanceof ActionError ? cause.code : null;
}

export { codeOf, messageOf };

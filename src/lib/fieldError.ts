/** Attributes that tie an input to the error text rendered for it. */
interface FieldErrorAttributes {
	'aria-invalid'?: 'true';
	'aria-describedby'?: string;
}

/**
 * The id of the element that holds the errors of the field `fieldId`.
 * @param fieldId - The `id` of the input.
 * @returns The id `ErrorInput` gives its text.
 */
export function errorIdOf(fieldId: string): string {
	return `${fieldId}-error`;
}

/**
 * The ARIA attributes of an input whose action result carried errors, so a screen reader announces the
 * error text with the field. Empty when the field has no error.
 * @param fieldId - The `id` of the input.
 * @param errors - The errors the action reported for it.
 * @returns Attributes to spread on the input.
 */
export function fieldErrorAttributes(
	fieldId: string,
	errors: readonly string[] | undefined,
): FieldErrorAttributes {
	if (!errors || errors.length === 0) return {};

	return { 'aria-invalid': 'true', 'aria-describedby': errorIdOf(fieldId) };
}

export type { FieldErrorAttributes };

import type { SubmitBody, SubmitBodyValue, SubmitFiles } from '@interfaces/strapi';

type StructuredValue = File | FileList | SubmitFiles | number[];

/**
 * Fields FormData cannot carry verbatim: file entries and structures that must
 * be serialized to JSON first.
 */
const isStructuredValue = (value: SubmitBodyValue): value is StructuredValue =>
	typeof value === 'object' && value !== null;

/**
 * A `files` field holding one entry per Strapi upload field, as opposed to a
 * single file or a plain array.
 */
const isFileMap = (value: StructuredValue): value is SubmitFiles =>
	!Array.isArray(value) && !(value instanceof Blob);

/**
 * Append a Strapi `files` map, flattening arrays into repeated `files.<field>`
 * entries and ignoring members that are not blobs.
 */
const appendFiles = (formData: FormData, files: SubmitFiles): void => {
	for (const [field, value] of Object.entries(files)) {
		const entries = Array.isArray(value) ? value : [value];
		for (const entry of entries) {
			if (entry instanceof Blob) formData.append(`files.${field}`, entry);
		}
	}
};

/**
 * Convert a submission body to FormData.
 * @param data - The body to convert.
 * @returns The FormData object.
 */
export default function convertToFormData(data: SubmitBody): FormData {
	const formData = new FormData();

	// Handle nested objects and files
	for (const [key, value] of Object.entries(data)) {
		if (!isStructuredValue(value)) {
			formData.append(key, String(value));
			continue;
		}

		// Handle files object
		if (key === 'files') {
			appendFiles(formData, isFileMap(value) ? value : {});
			continue;
		}

		formData.append(key, JSON.stringify(value));
	}

	return formData;
}

/**
 * Convert an object to FormData.
 * @param data - The object to convert.
 * @returns The FormData object.
 */
export default function convertToFormData(data: Record<string, unknown>) {
	const formData = new FormData();

	// Handle nested objects and files
	for (const [key, value] of Object.entries(data)) {
		if (value && typeof value === 'object') {
			// Handle files object
			if (key === 'files') {
				for (const [fileKey, fileValue] of Object.entries(value)) {
					if (Array.isArray(fileValue)) {
						for (const file of fileValue) {
							if (file instanceof Blob || file instanceof File) {
								formData.append(`files.${fileKey}`, file);
							}
						}
					} else if (fileValue instanceof Blob || fileValue instanceof File) {
						formData.append(`files.${fileKey}`, fileValue);
					}
				}
			} else formData.append(key, JSON.stringify(value));
		} else formData.append(key, value as string);
	}

	return formData;
}

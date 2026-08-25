import type { User } from './user';

interface FetchProps {
	endpoint: string;
	query?: Record<string, string>;
	wrappedByKey?: string;
	wrappedByList?: boolean;
	token?: string;
	returnError?: boolean;
}

/**
 * Files attached to a multipart submission, keyed by the Strapi field they fill.
 */
interface SubmitFiles {
	[field: string]: File | File[] | undefined;
}

/**
 * A single field of a JSON or multipart submission body.
 */
type SubmitBodyValue =
	| File
	| FileList
	| SubmitFiles
	| boolean
	| null
	| number
	| number[]
	| string
	| undefined;

interface SubmitBody {
	[field: string]: SubmitBodyValue;
}

interface SubmitProps {
	endpoint: string;
	body?: FormData | SubmitBody;
	token?: string;
	method?: 'POST' | 'PUT' | 'DELETE';
	contentType?: 'application/json' | 'multipart/form-data';
}

interface StrapiError {
	data: null;
	error: {
		status: number;
		name: string;
		message: string;
		details: Record<string, string[] | { message: string }[]>;
	};
}

interface StrapiUserData {
	jwt: string;
	user: User;
}

interface StrapiData {
	data: object;
	error:
		| undefined
		| {
				status: number;
				name: string;
				message: string;
				details: Record<string, string[]>;
		  };
}

export type {
	FetchProps,
	StrapiData,
	StrapiError,
	StrapiUserData,
	SubmitBody,
	SubmitBodyValue,
	SubmitFiles,
	SubmitProps,
};

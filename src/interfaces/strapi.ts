import type { User } from './user';

interface FetchProps {
	endpoint: string;
	query?: Record<string, string>;
	wrappedByKey?: string;
	wrappedByList?: boolean;
	token?: string;
}

interface SubmitProps {
	endpoint: string;
	body?:
		| Record<string, string | number | boolean | File | FileList | undefined | number[] | object>
		| FormData;
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

export type { FetchProps, StrapiData, StrapiError, StrapiUserData, SubmitProps };

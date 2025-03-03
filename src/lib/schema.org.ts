import { COMPANY_INFO, CONTACT_EMAIL, ORGANIZATION_DESCRIPTION, ORGANIZATION_NAME } from '@data/schema.org';
import type { Organization, WebSite, WithContext } from 'schema-dts';

type SchemaResult = {
	website: WithContext<WebSite>;
	organization: WithContext<Organization>;
};

export const getSchemas = (url: URL): SchemaResult => {
	const baseUrl = url.origin;

	const websiteSchema: WithContext<WebSite> = {
		'@context': 'https://schema.org',
		'@type': 'WebSite',
		name: ORGANIZATION_NAME,
		url: baseUrl,
		description: ORGANIZATION_DESCRIPTION,
		inLanguage: 'fr-FR',
		datePublished: new Date().toISOString(),
		publisher: {
			'@type': 'Organization',
			name: COMPANY_INFO.legalName,
		},
	};

	const organizationSchema: WithContext<Organization> = {
		'@context': 'https://schema.org',
		'@type': 'Organization',
		name: ORGANIZATION_NAME,
		legalName: COMPANY_INFO.legalName,
		url: baseUrl,
		logo: `${baseUrl}/icon.png`,
		description: ORGANIZATION_DESCRIPTION,
		email: CONTACT_EMAIL,
		address: {
			'@type': 'PostalAddress',
			streetAddress: COMPANY_INFO.address.street,
			postalCode: COMPANY_INFO.address.postalCode,
			addressLocality: COMPANY_INFO.address.city,
			addressCountry: COMPANY_INFO.address.country,
		},
		founder: {
			'@type': 'Person',
			name: '',
			email: CONTACT_EMAIL,
		},
		contactPoint: {
			'@type': 'ContactPoint',
			email: CONTACT_EMAIL,
			contactType: 'customer service',
		},
		// Informations légales
		vatID: COMPANY_INFO.registrationNumber,
		foundingLocation: {
			'@type': 'Place',
			address: {
				'@type': 'PostalAddress',
				addressLocality: '',
				addressRegion: 'Réunion',
				addressCountry: 'FR',
			},
		},
	};

	return {
		website: websiteSchema,
		organization: organizationSchema,
	};
};

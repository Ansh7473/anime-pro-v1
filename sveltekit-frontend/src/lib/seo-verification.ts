export type SearchEngineMetaVerification = {
	name: string;
	content: string;
};

// Add ownership verification meta tags here as each search console provides them.
// Examples:
// { name: 'google-site-verification', content: '...' }
// { name: 'msvalidate.01', content: '...' }
export const SEARCH_ENGINE_META_VERIFICATIONS: SearchEngineMetaVerification[] = [
	{ name: 'yandex-verification', content: '0fe992db5585878e' }
];

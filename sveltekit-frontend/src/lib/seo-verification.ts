export type SearchEngineMetaVerification = {
	name: string;
	content: string;
};

// Add ownership verification meta tags here as each search console provides them.
// Examples:
// { name: 'google-site-verification', content: '...' }
// { name: 'msvalidate.01', content: '...' }
// Add your verification codes from each search console:
// Google: https://search.google.com/search-console → Settings → Ownership verification → HTML tag
// Bing:   https://www.bing.com/webmasters → Add site → HTML Meta Tag
export const SEARCH_ENGINE_META_VERIFICATIONS: SearchEngineMetaVerification[] = [
	{ name: 'yandex-verification', content: '0fe992db5585878e' },
	// TODO: Add your Google Search Console verification code below:
	// { name: 'google-site-verification', content: 'YOUR_CODE_HERE' },
	// TODO: Add your Bing Webmaster verification code below:
	// { name: 'msvalidate.01', content: 'YOUR_CODE_HERE' },
];

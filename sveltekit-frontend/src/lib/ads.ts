// Monetag popunder gating.
//
// Ads load ONLY on the routes listed below; everywhere else is ad-free.
// Edit this one list to change where the popunder loads — the rest of the
// wiring stays put.

/** Route prefixes where ads are allowed. Everything else is ad-free. */
const AD_ALLOWED_PREFIXES = [
	"/watch", // player pages only
] as const;

/** True when the popunder is allowed on the given pathname. */
export function adsAllowedOn(pathname: string): boolean {
	const p = pathname.toLowerCase();
	return AD_ALLOWED_PREFIXES.some((pre) => p === pre || p.startsWith(pre + "/"));
}

const MONETAG_ZONE = "11242007";
const MONETAG_SRC = "https://al5sm.com/tag.min.js";
let loaded = false;

/** Inject the Monetag popunder once per session. No-op if already loaded. */
export function loadPopunder(): void {
	if (loaded || typeof document === "undefined") return;
	loaded = true;
	const s = document.createElement("script");
	s.dataset.zone = MONETAG_ZONE;
	s.src = MONETAG_SRC;
	document.body.appendChild(s);
}

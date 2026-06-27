# Frontend Polish Plan — WatchAnimez (SvelteKit)

Goal: make every page feel instant like miruro.bz — via (1) **streaming SSR + skeletons** (no spinners), (2) **code-splitting heavy files** by extracting sub-components and lazy-loading below-the-fold/heavy parts, and (3) general smoothness (no double-fetch, lazy images, reduced critical JS).

Patterns to apply everywhere:
- Server loads return a **streamed promise** (no top-level `await`) when SSR data is needed.
- Loading states use **skeletons** (`SkeletonGrid`/`SkeletonRow`/`SkeletonDetail`/page-specific), never spinners.
- Heavy or below-the-fold components are **dynamically imported** (`{#await import(...)}` or mount-on-visible) so they leave the critical chunk.
- Images: `loading="lazy" decoding="async"`.
- Remove redundant `onMount` fetches that duplicate SSR/streamed data.

Legend: ✅ done · �doing · ⬜ todo · ➖ no change needed

---

## Tier 0 — DONE (verified)
- ✅ `routes/+page.svelte` (home) — streaming + skeletons, split out `HomeMarketing`.
- ✅ `routes/+page.server.ts` — streamed.
- ✅ `routes/tv-series`, `routes/movies`, `routes/latest`, `routes/explore/[category]` — streamed + `SkeletonGrid`, removed onMount fallbacks.
- ✅ `routes/anime/[id]` — instant info + `SkeletonDetail` + secondary skeletons (server kept awaited for SEO head).
- ✅ `routes/search`, `routes/schedule` — spinner → `SkeletonGrid`, removed duplicate fetch.
- ✅ Components: `SkeletonCard`, `SkeletonRow`, `SkeletonHero`, `SkeletonGrid`, `SkeletonDetail`, `HomeMarketing`.

## Tier 1 — CRITICAL (heavy / core)
- 🟡 `routes/watch/[animeId]/[ep]/+page.svelte` (**87 KB**) — DONE: lazy-loaded `CommentsSection` + `LiveChat` (verified separate chunks) + comments skeleton.
- 🟡 `routes/profile/+page.svelte` (29 KB) — DONE: profile + favorites skeletons, lazy images.
- ✅ `lib/components/Navbar.svelte` — lazy suggestion images; search already debounced+lazy. Extraction intentionally skipped (global/always-loaded, negligible perf gain, site-wide risk).
- ✅ `routes/intel/+page.svelte` — dashboard skeleton, label a11y fixed, lazy below-fold posters.
- ⬜ `lib/components/Navbar.svelte` (22 KB, 761 lines) — loaded on EVERY page. Extract `NavSearch` (search dropdown) and `NavMobileMenu`; lazy-load search results.
- ⬜ `routes/intel/+page.svelte` (19 KB, 670 lines) — settings/prefs; split panels; fix `<label>` a11y.

## Tier 2 — MEDIUM components/pages
- ✅ `HeroBanner` + `TVHeroBanner` — only active+adjacent slides load images (was all 8) — LCP/bandwidth win.
- ✅ `CommentsSection` / `LiveChat` — now lazy-loaded from watch page (own chunks).
- ✅ `download` — inline button states are legitimate (kept); no page spinner.
- ✅ `Footer` / `PullToRefresh` / `TVShell` — reviewed, no `<img>` / no perf footguns.
- ✅ `ContinueCard` / `AnimeCard` / `TVAnimeCard` — lazy + async images.

## Tier 3 — Client-fetch / form pages
- ✅ `favorites` / `watchlist` — spinner → SkeletonGrid; unused CSS removed.
- ✅ `tv/search` / `tv/favorites` / `tv/watchlist` — tv-spinner → SkeletonGrid.
- ✅ `auth/login` / `auth/register` / `contact` — no page spinners (already inline/static); no change needed.
- ✅ `tv/profile` / `tv/settings` / `tv/genres` — static/instant; no page spinners.

## Tier 4 — Static info/legal pages (low priority; already SSR & fast)
- ➖ `routes/faq` (13 KB), `routes/dmca` (11.2 KB), `routes/privacy` (9 KB), `routes/terms` (8.9 KB), `routes/about` (7 KB), `routes/donate` (9.2 KB) — pure static text. Optional: tidy unused CSS selectors. No streaming needed.
- ➖ `routes/+layout.svelte`, `routes/+error.svelte`, `routes/explore/+page.svelte` (static cards), `JsonLd`, `Skeleton*` — fine.

## Cross-cutting cleanup
- ⬜ Resolve pre-existing svelte-check warnings (unused CSS, a11y labels/dialog roles) as files are touched.
- ⬜ Confirm `vite build` chunk graph: heavy comps (hls.js, Comments, LiveChat) in separate lazy chunks.

## Verification (run after each tier)
- `npm run check` → 0 errors.
- `npx vite build` → success; inspect chunk split.
- Live check on dev `:5174` via browser → render + no console errors.

> Note: Backend Go refactor is deferred per user request.

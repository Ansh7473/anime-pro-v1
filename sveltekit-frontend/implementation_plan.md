# Multi‑Theme Support & Theme Selector Implementation Plan

## Goal
Replace the current static "Netflix‑Red" theme with a premium, professional multi‑theme system. Users can select their preferred theme from the Profile page. Themes should be visually distinct, modern, and include at least 50 variations as requested.

## User Review Required
> [!IMPORTANT]
> Please confirm the list of theme names and any brand color specifications you want to include (e.g., *Minimalist (Apex)*, *Tactical*, *Dark*, *Neon*, etc.). If you have a design system file, share it now.

> [!WARNING]
> Adding many themes may increase CSS size. We will generate CSS variables for each theme and lazy‑load them via a root class to avoid impacting existing pages.

## Proposed Changes

### 1. Theme Definitions
- **File:** `src/lib/styles/themes.css`
- Add CSS custom properties for a default theme and 49 additional themes (total 50). Each theme gets a root class `.theme-{name}` with its own palette.
- Use a naming convention `theme-{slug}` (e.g., `theme-minimalist`, `theme-tactical`).

### 2. Theme Store
- **File:** `src/lib/stores/theme.ts`
- Svelte writable store `theme` persisting the selected theme in `localStorage`.
- Export helper `applyTheme` that adds the appropriate class to `<html>` element.

### 3. Layout Integration
- **File:** `src/routes/+layout.svelte`
- Import the theme store, subscribe to changes, and call `applyTheme` on init and when the store updates.
- Ensure the layout imports `themes.css`.

### 4. Theme Selector UI
- **File:** `src/routes/profile/+page.svelte`
- Add a dropdown or button group displaying all available themes.
- On selection, update the `theme` store.
- Provide a preview of the theme colors (small swatches).

### 5. Download Page Navigation Fix
- **File:** `src/routes/download/+page.svelte`
- Replace hardcoded worker URLs with dynamic `download_url` from the `releases` state.
- Ensure Windows and Android buttons link directly to the fetched GitHub assets.

### 6. Global Styles Adjustments
- Update `src/app.css` (or equivalent) to use CSS variables (e.g., `background-color: var(--net-bg);`). Replace any hard‑coded colors.
- Ensure components (Navbar, cards, etc.) reference variables.

### 7. 404 Error Investigation
- Verify that navigation links use SvelteKit `$app/navigation` helpers.
- Ensure routes exist for Home, Latest, Schedule, TV Series, Movies, Intel Center, Profile.
- Add missing route files if necessary.

### 7. Testing & Verification
- Manual UI test: switch themes, reload page, confirm persistence.
- Verify no 404s when navigating via the sidebar.
- Run `npm run dev` and check console for CSS errors.

## Open Questions
- Which exact 50 theme palettes do you want? (Provide hex values or a design system asset.)
- Do you prefer a dropdown or a grid of swatches for the selector?
- Should we include a "Reset to default" option?

## Verification Plan
### Automated Tests
- None yet; will add unit tests for the theme store after approval.

### Manual Verification
- Open the app in dev mode, navigate to Profile, change themes, reload, and confirm the selected theme persists.
- Click each navigation link to ensure no 404 pages appear.

---
*Implementation will proceed after your confirmation.*

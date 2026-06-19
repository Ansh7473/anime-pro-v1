# Search Indexing Operations

Use this checklist after deploying the latest WatchAnimez SEO changes.

## 1. Deploy and Configure

```sh
npm run check --workspace=sveltekit-frontend
npm run build --workspace=sveltekit-frontend
cd sveltekit-frontend
npx wrangler secret put INDEXNOW_KEY
npx wrangler deploy
```

`INDEXNOW_KEY` must be the same value served by:

```txt
https://watchanimez.me/indexnow-key.txt
```

The WordPress IndexNow plugin in `indexnow/` is not used by this SvelteKit/Cloudflare deployment.

## 2. Verify Public SEO Endpoints

```sh
npm run seo:verify
```

This checks:

- `robots.txt`
- `sitemap.xml`
- `indexnow-key.txt`
- canonical tags
- Yandex verification meta
- JSON-LD on priority pages

## 3. Submit IndexNow URLs

Dry run:

```sh
npm run seo:indexnow:dry
```

Submit through the deployed app endpoint:

```sh
npm run seo:indexnow
```

Submit directly to IndexNow from your terminal:

```sh
set INDEXNOW_KEY=your-key-here
set INDEXNOW_MODE=direct
npm run seo:indexnow
```

Optional:

```sh
set INDEXNOW_LIMIT=100
```

## 4. Webmaster Console Tasks

Google Search Console:

- Add and verify `https://watchanimez.me`.
- Submit `https://watchanimez.me/sitemap.xml`.
- Use URL Inspection > Request indexing for `/`, `/latest/`, `/movies/`, `/tv-series/`, `/explore/trending/`, `/explore/popular/`, and 10-20 top anime detail URLs.

Bing Webmaster Tools:

- Add and verify `https://watchanimez.me`.
- Submit `https://watchanimez.me/sitemap.xml`.
- Use URL Submission for the same priority URLs.
- Confirm IndexNow submissions are visible after running `npm run seo:indexnow`.

Yandex Webmaster:

- Add and verify `https://watchanimez.me`.
- Use the existing meta tag: `yandex-verification=0fe992db5585878e`.
- Submit `https://watchanimez.me/sitemap.xml`.
- Request reindexing for the same priority URLs.

## 5. Monitoring

- Check Google indexing after 48-72 hours.
- Check Bing submission and IndexNow status daily for the first week.
- Check Yandex sitemap processing and excluded pages.
- If crawled pages are not indexed, improve page uniqueness and internal links before resubmitting.

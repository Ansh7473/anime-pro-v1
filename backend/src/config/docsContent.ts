export const apiDocs = `
# 🎌 Tatakai API Documentation

Welcome to the **Tatakai API** - A unified, high-performance anime and entertainment API hub. 
This documentation is designed to be both human-readable and LLM-friendly.

## 🚀 Base URL
\`http://tatakaiapi.gabhasti.tech/api/v1\`

---

## 📂 1. HiAnime Scraper (AniWatch)
*Primary advanced scraper featuring high-quality metadata and streaming.*

| Method | Endpoint | Description |
|:-------|:---------|:------------|
| \`GET\` | \`/hianime/home\` | Dashboard data: Trending, Spotlight, Latest, Upcoming. |
| \`GET\` | \`/hianime/info/:id\` | Full metadata for a specific anime. |
| \`GET\` | \`/hianime/episodes/:id\` | List all episodes for an anime. |
| \`GET\` | \`/hianime/episode/sources\` | **Params**: \`animeEpisodeId\`, \`server\`, \`category\`. Get video links. |
| \`GET\` | \`/hianime/search\` | **Params**: \`q\`, \`page\`. Comprehensive filters available. |
| \`GET\` | \`/hianime/search/suggestion\` | **Params**: \`q\`. Quick search suggestions. |
| \`GET\` | \`/hianime/genre/:name\` | Get animes by genre (e.g., \`action\`, \`shounen\`). |
| \`GET\` | \`/hianime/category/:name\` | Get by category (e.g., \`most-popular\`, \`tv\`). |
| \`GET\` | \`/hianime/producer/:name\` | Get animes by producer. |
| \`GET\` | \`/hianime/azlist/:sort\` | **Params**: \`page\`. Browse A-Z list (\`all\`, \`0-9\`, \`a\`). |
| \`GET\` | \`/hianime/schedule\` | **Params**: \`date\`, \`tzOffset\`. Anime airing schedule. |
| \`GET\` | \`/hianime/qtip/:id\` | Quick tooltip info for an anime. |

---

## 📂 2. Animeya Scraper (New)
*High-performance scraper for ad-free anime streaming with Next.js parsing.*

| Method | Endpoint | Description |
|:-------|:---------|:------------|
| \`GET\` | \`/animeya/home\` | Featured and trending anime. |
| \`GET\` | \`/animeya/search\` | **Params**: \`q\`. |
| \`GET\` | \`/animeya/info/:slug\` | Full details and episode list. |
| \`GET\` | \`/animeya/watch/:episodeId\` | Direct video sources (Embeds). |

---

## 📂 3. Regional Scrapers (Hindi, Tamil, Telugu)
*Specialized content for Indian regional languages.*

### 🟠 Animelok
| Method | Endpoint | Description |
|:-------|:---------|:------------|
| \`GET\` | \`/animelok/home\` | Regional home page. |
| \`GET\` | \`/animelok/watch/:id\` | **Params**: \`ep\`. Regional streaming sources. |

### 🟢 WatchAnimeWorld
| Method | Endpoint | Description |
|:-------|:---------|:------------|
| \`GET\` | \`/watchaw/episode\` | **Params**: \`id\`. High-reliability proxy for regional dubs. |

### 🔵 HindiDubbed
| Method | Endpoint | Description |
|:-------|:---------|:------------|
| \`GET\` | \`/hindidubbed/home\` | Latest dubbed releases. |
| \`GET\` | \`/hindidubbed/search\` | **Params**: \`title\`. |
| \`GET\` | \`/hindidubbed/category/:name\` | Browse categories (\`hindi-anime-movies\`, etc). |
| \`GET\` | \`/hindidubbed/anime/:slug\` | Get streaming links. |

---

## 📂 4. Utility & Meta
*Useful tools and fun endpoints.*

| Method | Endpoint | Description |
|:-------|:---------|:------------|
| \`GET\` | \`/anime-api/quotes/random\` | **Query**: \`anime\`. Random quotes. |
| \`GET\` | \`/anime-api/facts/:anime\` | Interesting facts. |
| \`GET\` | \`/anime-api/images/:type\` | **Path**: \`waifu\`, \`neko\`, etc. |
| \`GET\` | \`/anime-api/waifu\` | **Query**: \`tags\`. Advanced search. |
| \`POST\` | \`/anime-api/trace\` | **Body**: \`{ "imageUrl": "..." }\`. Reverse image search. |

---

## 📂 5. External Classic Scrapers
*Legacy ports for broader coverage.*

- \`/anime/gogoanime/:query\`
- \`/anime/chia-anime/:query\`
- \`/anime/anime-freak/:query\`
- \`/anime/animeland/:query\`

---

## 🛠 Project Infrastructure
- **System Health**: \`GET /health\`
- **Version Info**: \`GET /version\`
- **Middleware**: Pino Logging, Redis Caching, Rate Limiting.

*Everything you need to build the next generation of anime apps.*
`;

# HiAnime Scraper (AniWatch)

The primary, high-performance scraper for AniWatch (formerly Zoro.to), offering extensive metadata and reliable streaming.

## Base URL

`/api/v1/hianime`

---

## 1. Homepage

Get dashboard data including Spotlight, Trending, Latest Episodes, and New Added.

- **URL**: `/home`
- **Method**: `GET`

### 🧪 Test Module

```bash
curl -X GET "http://localhost:4000/api/v1/hianime/home"
```

## 2. Information & Details

### Anime Details

Get full metadata for an anime.

- **URL**: `/info/:id`
- **Method**: `GET`

### QTip (Quick Tooltip)

Get hover-card style summary.

- **URL**: `/qtip/:id`
- **Method**: `GET`

### Anime Episodes

Get the full list of episodes for an anime.

- **URL**: `/episodes/:id`
- **Method**: `GET`

## 3. Streaming Sources

Get video sources for a specific episode.

- **URL**: `/episode/sources`
- **Method**: `GET`
- **Query Params**:
  - `animeEpisodeId` (required, e.g., `one-piece-100?ep=107149`)
  - `server` (optional, default: `vidstreaming`)
  - `category` (optional, `sub` or `dub`)

### 🧪 Test Module

```bash
curl -X GET "http://localhost:4000/api/v1/hianime/episode/sources?animeEpisodeId=one-piece-100?ep=107149"
```

## 4. Discovery

### Search

- **URL**: `/search`
- **Query Params**: `q` (query), `page`
- **Optional Params**: `type`, `status`, `rated`, `score`, `season`, `language`, `year`, `genres`

### Search Suggestions

- **URL**: `/search/suggestion`
- **Query Params**: `q`

### Browse By Category

- **URL**: `/category/:name` (e.g. `most-popular`, `subbed-anime`)
- **Query Params**: `page`

### Browse By Genre

- **URL**: `/genre/:name` (e.g. `shounen`, `action`)
- **Query Params**: `page`

### Browse By Producer

- **URL**: `/producer/:name`
- **Query Params**: `page`

### A-Z List

- **URL**: `/azlist/:sort` (e.g. `all`, `0-9`, `a`)
- **Query Params**: `page`

### Schedule

- **URL**: `/schedule`
- **Query Params**: `date` (YYYY-MM-DD), `tzOffset` (e.g. -300 for EST)

## 5. Streaming Servers

- **URL**: `/episode/servers`
- **Query Params**: `animeEpisodeId`
List available servers for an episode.

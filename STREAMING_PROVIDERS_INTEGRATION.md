# Streaming Providers Integration Guide

This document provides detailed information about streaming providers integrated into the Jikan Anime Streaming Platform backend. Use this guide to understand existing integrations and add new streaming services.

---

## Table of Contents
1. [Current Providers](#current-providers)
2. [DesiDubAnime Integration](#desidubanime-integration)
3. [Animelok Integration](#animelok-integration)
4. [AnimeHindiDubbed.in Integration](#animehindidubbedin-integration)
5. [Adding New Providers](#adding-new-providers)
6. [API Endpoints](#api-endpoints)

---

## Current Providers

| Provider | Type | Source Type | Status |
|----------|------|-------------|--------|
| **Animelok.xyz** | API-based | M3U8 Streams | ✅ Working |
| **DesiDubAnime.me** | Web Scraping | Embed Iframes | ✅ Working |
| **AnimeHindiDubbed.in** | WordPress API | Direct Streams | ✅ Working |

---

## DesiDubAnime Integration

### Overview
DesiDubAnime provides Hindi-dubbed anime content through embed-based video players. The provider uses base64-encoded data embedded in HTML elements.

### Base URL
```
https://www.desidubanime.me
```

### API Pattern

#### 1. Search Anime
```
GET https://www.desidubanime.me/?s={query}
```

**Response Format (HTML):**
```html
<div class="result-item">
  <div class="title">
    <a href="/anime/{slug}/">Anime Title</a>
  </div>
  <img src="poster_url.jpg" />
</div>
```

#### 2. Get Anime Info
```
GET https://www.desidubanime.me/anime/{slug}/
```

**Response Format (HTML):**
```html
<div class="data">
  <h1>Anime Title</h1>
  <div class="poster">
    <img src="poster_url.jpg" />
  </div>
  <div class="wp-content">
    <p>Synopsis text...</p>
  </div>
</div>
<div class="episodios">
  <li>
    <a href="/watch/{episode-slug}/">
      <span class="episodionum">Episode 1</span>
      <span class="episodiodate">Date</span>
    </a>
  </li>
</div>
```

#### 3. Get Streaming Sources
```
GET https://www.desidubanime.me/watch/{episode-slug}/
```

**Response Format (HTML):**
```html
<span data-embed-id="{base64_name}:{base64_url}">
  <!-- Embed data is base64 encoded -->
</span>
```

**Decoded Format:**
- `base64_name`: Server name (e.g., "Mirrordub", "Streamp2pdub")
- `base64_url`: Embed URL or iframe HTML

### Available Servers

| Server Name | URL Pattern | Type | Language |
|--------------|-------------|------|----------|
| Mirror | `gdmirrorbot.nl/embed/{id}` | Embed | Hindi |
| Streamp2p | `desidubanime.playerp2p.live/#{id}` | Embed | Hindi |
| Abyss | `short.icu/{id}` | Embed | Hindi |
| VMoly | `vidmoly.net/embed-{id}.html` | Embed | Hindi |

### Backend Implementation

**File:** `jikan-backend/src/lib/providers/desidub.ts`

```typescript
// Search anime
export async function searchDesiDub(query: string)

// Get anime info and episodes
export async function getDesiDubInfo(slug: string)

// Get streaming sources for episode
export async function getDesiDubSources(id: string)
```

**Route:** `jikan-backend/src/routes/desidubanime.ts`

```typescript
GET /api/v1/desidubanime/search?q={query}
GET /api/v1/desidubanime/info/{slug}
GET /api/v1/desidubanime/watch/{episodeSlug}
```

### Response Format

```json
{
  "provider": "DesiDubAnime",
  "status": 200,
  "data": {
    "sources": [
      {
        "name": "Mirror",
        "url": "https://gdmirrorbot.nl/embed/nzs9rmt",
        "category": "hindi",
        "language": "Hindi",
        "isM3U8": false,
        "isEmbed": true
      }
    ]
  }
}
```

### Important Notes

⚠️ **All sources are embed-based, not direct M3U8 streams**
- Frontend must use `<iframe>` elements to play videos
- HLS.js cannot be used directly with these sources
- Each embed may have different player interfaces

---

## Animelok Integration

### Overview
Animelok provides both subbed and dubbed anime content through a RESTful API with direct M3U8 streaming URLs.

### Base URL
```
https://animelok.xyz
```

### API Pattern

#### 1. Search Anime
```
GET https://animelok.xyz/api/anime/search?q={query}
```

**Response Format (JSON):**
```json
{
  "results": [
    {
      "id": "anime-slug",
      "title": "Anime Title",
      "image": "poster_url.jpg",
      "episodes": 12
    }
  ]
}
```

#### 2. Get Episodes
```
GET https://animelok.xyz/api/anime/{slug}/episodes-range?page={page}&pageSize={size}
```

**Response Format (JSON):**
```json
{
  "episodes": [
    {
      "number": 1,
      "name": "Episode Title",
      "img": "thumbnail.jpg",
      "description": "Episode description",
      "isFiller": false
    }
  ]
}
```

#### 3. Get Streaming Sources
```
GET https://animelok.xyz/api/anime/{slug}/episodes/{episode_number}
```

**Response Format (JSON):**
```json
{
  "episode": {
    "servers": [
      {
        "name": "Server Name",
        "tip": "sub|hindi|dub",
        "languages": ["Japanese", "Hindi"],
        "url": "https://stream-url.m3u8"
      }
    ]
  }
}
```

### Backend Implementation

**File:** `jikan-backend/src/lib/providers/animelok.ts`

```typescript
// Get Anilist ID for cross-referencing
export async function getAnilistId(malId: string)

// Search anime
export async function searchAnimelok(query: string)

// Get episode metadata
export async function getAnimelokMetadata(slug: string)

// Get streaming sources
export async function getAnimelokSources(slug: string, ep: number)
```

**Route:** `jikan-backend/src/routes/animelok.ts`

```typescript
GET /api/v1/animelok/search?q={query}
GET /api/v1/animelok/anime/{id}/seasons
GET /api/v1/animelok/watch/{id}?ep={number}
```

### Response Format

```json
{
  "provider": "Animelok",
  "status": 200,
  "data": {
    "sources": [
      {
        "name": "Server Name",
        "url": "https://stream-url.m3u8",
        "category": "sub|hindi|dub",
        "language": "Japanese|Hindi",
        "isM3U8": true,
        "isEmbed": false
      }
    ],
    "subtitles": [
      {
        "label": "English",
        "url": "https://subtitle-url.vtt"
      }
    ]
  }
}
```

### Important Notes

✅ **Provides direct M3U8 streaming URLs**
- Can be played with HLS.js
- Supports multiple quality options
- Includes subtitle support

---

---

## AnimeHindiDubbed.in Integration

### Overview
AnimeHindiDubbed.in is a WordPress-based anime streaming site that provides Hindi dubbed anime episodes. The site uses multiple third-party video hosting services to stream content.

### Base URL
```
https://animehindidubbed.in
```

### API Pattern

#### 1. Search Anime
```
GET https://animehindidubbed.in/wp-json/wp/v2/posts?search={query}
```

**Example:**
```
GET https://animehindidubbed.in/wp-json/wp/v2/posts?search=attack%20on%20titan
```

**Response Format (JSON):**
```json
[
  {
    "id": 10441,
    "title": {
      "rendered": "Attack on Titan Season 1 Hindi Dubbed"
    },
    "content": {
      "rendered": "<html>...</html>"
    },
    "link": "https://animehindidubbed.in/anime-slug/"
  }
]
```

#### 2. Get Anime Details
```
GET https://animehindidubbed.in/wp-json/wp/v2/posts/{id}
```

**Example:**
```
GET https://animehindidubbed.in/wp-json/wp/v2/posts/10441
```

**Response Format (JSON):**
```json
{
  "id": 10441,
  "title": {
    "rendered": "Attack on Titan Season 1 Hindi Dubbed"
  },
  "content": {
    "rendered": "<html>...</html>"
  },
  "categories": [1, 2, 3]
}
```

### Video Streaming Servers

The site uses multiple video hosting providers:

| Server Name | URL Pattern | Type | Status |
|--------------|-------------|------|--------|
| Bysewihe | `bysewihe.com/e/{id}` | Direct Stream | ✅ Working |
| Short.icu → Abysscdn | `short.icu/{code}` | Redirect | ✅ Working |
| Listeamed | `listeamed.net/e/{id}` | Direct Stream | ❌ SSL Issues |

### Server Details

#### 1. Bysewihe (Primary Server)
- **Base URL:** `https://bysewihe.com/e/{video_id}`
- **Download URL:** `https://bysewihe.com/d/{video_id}` (replace `/e/` with `/d/`)
- **Format:** Direct video streaming
- **Status:** ✅ Working (HTTP 200)
- **Example:** `https://bysewihe.com/e/k0gelihycosu/toonworld4all-attack-on-titan-s01e01-1080p-hevc-10bit`

#### 2. Short.icu → Abysscdn.com (Secondary Server)
- **Base URL:** `https://short.icu/{short_code}`
- **Redirect:** Redirects to `https://abysscdn.com/?v={video_id}`
- **Format:** Video player page
- **Status:** ✅ Working (HTTP 302 → 200)
- **Example:**
  - Short URL: `https://short.icu/zEsqLGWpxV`
  - Redirects to: `https://abysscdn.com/?v=zEsqLGWpxV`

#### 3. Listeamed.net (Tertiary Server)
- **Base URL:** `https://listeamed.net/e/{video_id}`
- **Download URL:** `https://listeamed.net/d/{video_id}` (replace `/e/` with `/d/`)
- **Format:** Direct video streaming
- **Status:** ❌ Connection issues (SSL/TLS errors)
- **Example:** `https://listeamed.net/e/04rQxWLq2epEb2N/[Toonworld4all].Attack.on.Titan.S01E01...`

### Data Extraction Method

#### Step 1: Search for Anime
```bash
curl "https://animehindidubbed.in/wp-json/wp/v2/posts?search={anime_title}"
```

#### Step 2: Parse Response
Extract the `content.rendered` field which contains HTML with embedded JavaScript.

#### Step 3: Extract Video URLs
The HTML contains a JavaScript object `serverVideos` with three arrays:
- `bysewihe`: Array of video objects with `name` and `url` properties
- `servabyss`: Array of video objects with short.icu URLs
- `vidgroud`: Array of video objects with listeamed.net URLs

#### Step 4: Access Video Streams
Use the extracted URLs to stream or download videos.

### Video URL Structure

#### Bysewihe Server
```javascript
{
  "name": "S1E1",
  "url": "https://bysewihe.com/e/k0gelihycosu/toonworld4all-attack-on-titan-s01e01-1080p-hevc-10bit"
}
```

#### Servabyss Server (via Short.icu)
```javascript
{
  "name": "S1E1",
  "url": "https://short.icu/zEsqLGWpxV"
}
```

#### Vidgroud Server
```javascript
{
  "name": "S1E1",
  "url": "https://listeamed.net/e/04rQxWLq2epEb2N/[Toonworld4all].Attack.on.Titan.S01E01..."
}
```

### Episode Naming Convention
- **Season 1:** S1E1, S1E2, ..., S1E25
- **Season 2:** S2E26, S2E27, ..., S2E37
- **Season 3:** S3E38, S3E39, ..., S3E59
- **Season 4:** S4E1, S4E2, ..., S4E30
- **OAD Episodes:** OAD S1E1, OAD S1E2, ..., OAD S1E8

### Supported Languages
The videos support multiple audio tracks:
- Hindi (اردو)
- Tamil
- Telugu
- English
- Japanese

**Note:** Users need to select the language in the video player settings (especially for bysewihe server).

### Backend Implementation

**File:** `jikan-backend/src/lib/providers/animehindidubbed.ts`

```typescript
// Search anime
export async function searchAnimeHindiDubbed(query: string)

// Get anime details and extract video data
export async function getAnimeHindiDubbedInfo(id: string)

// Get streaming sources for episode
export async function getAnimeHindiDubbedSources(id: string, episodeName: string)
```

**Route:** `jikan-backend/src/routes/animehindidubbed.ts`

```typescript
GET /api/v1/animehindidubbed/search?title={query}
GET /api/v1/animehindidubbed/info/{id}
GET /api/v1/animehindidubbed/watch/{episodeId}
```

### Response Format

```json
{
  "provider": "AnimeHindiDubbed",
  "status": 200,
  "data": {
    "sources": [
      {
        "name": "Bysewihe",
        "url": "https://bysewihe.com/e/k0gelihycosu/toonworld4all-attack-on-titan-s01e01-1080p-hevc-10bit",
        "category": "hindi",
        "language": "Hindi",
        "isM3U8": false,
        "isEmbed": false
      },
      {
        "name": "Abysscdn",
        "url": "https://short.icu/zEsqLGWpxV",
        "category": "hindi",
        "language": "Hindi",
        "isM3U8": false,
        "isEmbed": true
      }
    ]
  }
}
```

### Important Notes

✅ **Provides direct video streaming URLs**
- Primary server (bysewihe) offers direct streaming
- Secondary server (short.icu) redirects to abysscdn player
- Supports multiple audio tracks (Hindi, Tamil, Telugu, English, Japanese)
- Users can select language in video player settings

⚠️ **Server Recommendations**
1. **Primary:** Use `bysewihe.com` for direct streaming
2. **Secondary:** Use `short.icu` → `abysscdn.com` as backup
3. **Avoid:** `listeamed.net` due to SSL/TLS connection issues

### Headers Required
```http
User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36
Accept: text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8
Accept-Encoding: gzip, deflate, br, zstd
```

### Download Links
For bysewihe and listeamed servers, convert streaming URLs to download URLs:
- Streaming: `https://bysewihe.com/e/{id}`
- Download: `https://bysewihe.com/d/{id}`

### Example Workflow

```javascript
// 1. Search for anime
const searchResponse = await fetch('https://animehindidubbed.in/wp-json/wp/v2/posts?search=attack%20on%20titan');
const searchData = await searchResponse.json();

// 2. Get anime details
const animeId = searchData[0].id;
const animeResponse = await fetch(`https://animehindidubbed.in/wp-json/wp/v2/posts/${animeId}`);
const animeData = await animeResponse.json();

// 3. Extract video URLs from HTML content
const htmlContent = animeData.content.rendered;
const scriptMatch = htmlContent.match(/const serverVideos = ({[\s\S]*?});/);
const videoData = JSON.parse(scriptMatch[1]);

// 4. Access video streams
const episode1Url = videoData.bysewihe[0].url; // First episode from bysewihe server
```

### Limitations
1. No official REST API for video streams
2. Video URLs are embedded in HTML/JavaScript
3. Requires parsing HTML content to extract video data
4. Some servers may have geo-restrictions or rate limiting
5. listeamed.net server has SSL/TLS connection issues

---

## Adding New Providers

### Step 1: Create Provider Module

Create a new file in `jikan-backend/src/lib/providers/`:

```typescript
// jikan-backend/src/lib/providers/newprovider.ts

const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36';

// Search anime
export async function searchNewProvider(query: string) {
  try {
    const url = `https://provider.com/search?q=${encodeURIComponent(query)}`;
    const res = await fetch(url, { headers: { "User-Agent": USER_AGENT } });
    if (!res.ok) return [];
    
    // Parse response (HTML or JSON)
    const data = await res.json(); // or use cheerio for HTML
    
    // Return standardized format
    return data.results.map(item => ({
      title: item.title,
      slug: item.slug,
      image: item.image
    }));
  } catch (e) {
    console.error('[NewProvider Search Error]', e);
    return [];
  }
}

// Get streaming sources
export async function getNewProviderSources(episodeId: string) {
  try {
    const url = `https://provider.com/watch/${episodeId}`;
    const res = await fetch(url, { headers: { "User-Agent": USER_AGENT } });
    if (!res.ok) return [];
    
    // Parse and extract sources
    const data = await res.json();
    
    // Return standardized format
    return data.sources.map(source => ({
      name: source.name,
      url: source.url,
      category: source.isDub ? "hindi" : "sub",
      language: source.isDub ? "Hindi" : "Japanese",
      isM3U8: source.url.includes(".m3u8"),
      isEmbed: !source.url.includes(".m3u8")
    }));
  } catch (e) {
    console.error('[NewProvider Sources Error]', e);
    return [];
  }
}
```

### Step 2: Create Route Handler

Create a new file in `jikan-backend/src/routes/`:

```typescript
// jikan-backend/src/routes/newprovider.ts

import { Hono } from 'hono';
import { searchNewProvider, getNewProviderSources } from '../lib/providers/newprovider.js';

const newProviderRouter = new Hono();

// GET /search?q={query}
newProviderRouter.get('/search', async (c) => {
  const q = c.req.query('q') || '';
  const results = await searchNewProvider(q);
  return c.json({ provider: 'NewProvider', status: 200, results });
});

// GET /watch/{episodeId}
newProviderRouter.get('/watch/:id', async (c) => {
  const id = c.req.param('id');
  const sources = await getNewProviderSources(id);
  return c.json({ provider: 'NewProvider', status: 200, data: { sources } });
});

export default newProviderRouter;
```

### Step 3: Register Route in Server

Add to `jikan-backend/src/server.ts`:

```typescript
import newProviderRouter from './routes/newprovider.js';

// Mount the new route
app.route('/api/v1/newprovider', newProviderRouter);
```

### Step 4: Add to Unified Streaming Endpoint

Add to `jikan-backend/src/routes/streaming/index.ts`:

```typescript
import { getNewProviderSources, searchNewProvider } from '../../lib/providers/newprovider.js';

// In the /sources endpoint
const newProviderResults = await searchNewProvider(mainTitle);
if (newProviderResults.length > 0) {
  const match = newProviderResults[0];
  const sources = await getNewProviderSources(match.slug);
  if (sources.length > 0) {
    aggregatedSources.push(...sources);
    providersUsed.push('NewProvider');
  }
}
```

---

## API Endpoints

### Unified Streaming Endpoint

```
GET /api/v1/streaming/sources?animeId={malId}&ep={episodeNumber}
```

**Response:**
```json
{
  "animeId": "12345",
  "episode": 1,
  "providersUsed": ["Animelok", "DesiDubAnime"],
  "sources": [
    {
      "name": "Server Name",
      "url": "https://stream-url",
      "category": "sub|hindi|dub",
      "language": "Japanese|Hindi",
      "isM3U8": true|false,
      "isEmbed": true|false
    }
  ],
  "subtitles": [
    {
      "label": "English",
      "url": "https://subtitle-url.vtt"
    }
  ]
}
```

### Individual Provider Endpoints

#### Animelok
```
GET /api/v1/animelok/search?q={query}
GET /api/v1/animelok/anime/{id}/seasons
GET /api/v1/animelok/watch/{id}?ep={number}
```

#### DesiDubAnime
```
GET /api/v1/desidubanime/search?q={query}
GET /api/v1/desidubanime/info/{slug}
GET /api/v1/desidubanime/watch/{episodeSlug}
```

#### AnimeHindiDubbed.in
```
GET /api/v1/animehindidubbed/search?title={query}
GET /api/v1/animehindidubbed/info/{id}
GET /api/v1/animehindidubbed/watch/{episodeId}
```

---

## Frontend Integration

### Playing M3U8 Streams (Animelok)

```tsx
import Hls from 'hls.js';

function VideoPlayer({ url }) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (Hls.isSupported() && url.includes('.m3u8')) {
      const hls = new Hls();
      hls.loadSource(url);
      hls.attachMedia(videoRef.current);
      return () => hls.destroy();
    }
  }, [url]);

  return <video ref={videoRef} controls />;
}
```

### Playing Embed Sources (DesiDubAnime)

```tsx
function EmbedPlayer({ url }) {
  return (
    <iframe
      src={url}
      allowFullScreen
      className="w-full h-full"
    />
  );
}
```

---

## Testing Providers

### Test DesiDubAnime
```bash
cd jikan-backend
npm run dev
# Then test:
curl http://localhost:3001/api/v1/desidubanime/search?q=naruto
```

### Test Animelok
```bash
curl http://localhost:3001/api/v1/animelok/search?q=naruto
```

### Test Unified Endpoint
```bash
curl "http://localhost:3001/api/v1/streaming/sources?animeId=1735&ep=1"
```

---

## Troubleshooting

### Common Issues

1. **CORS Errors**: Ensure backend has proper CORS headers configured
2. **Rate Limiting**: Implement caching and rate limiting for external APIs
3. **Embed Blocking**: Some embeds may be blocked by browsers or ad-blockers
4. **URL Changes**: Providers may change their URL structure - monitor for 404s

### Debugging

Enable logging in provider functions:
```typescript
console.log(`[Provider] Fetching: ${url}`);
console.log(`[Provider] Response status: ${res.status}`);
```

---

## Future Enhancements

- [ ] Add more streaming providers
- [ ] Implement source quality selection
- [ ] Add subtitle support for all providers
- [ ] Implement caching for faster responses
- [ ] Add provider health monitoring
- [ ] Support for multiple audio tracks
- [ ] Add download functionality

---

## Credits

- **Animelok.xyz** - API-based streaming provider
- **DesiDubAnime.me** - Hindi-dubbed anime provider
- **AnimeHindiDubbed.in** - WordPress-based Hindi dubbed anime provider
- **Jikan API** - MyAnimeList API proxy

---

## License

This integration guide is part of the Jikan Anime Streaming Platform project.

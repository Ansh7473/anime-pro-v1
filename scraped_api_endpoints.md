# Scraped API Endpoints and URL Patterns from Toonstream

## Base URL
```
https://toonstream.dad
```

---

## 📺 **Anime Series List Endpoints**

### Main Category
```
https://toonstream.dad/category/anime/anime-series/
```

### Pagination
```
https://toonstream.dad/category/anime/anime-series/page/2/
https://toonstream.dad/category/anime/anime-series/page/3/
...
https://toonstream.dad/category/anime/anime-series/page/33/
```

### Filter by Type
```
https://toonstream.dad/category/anime/anime-series/?type=movies
https://toonstream.dad/category/anime/anime-series/?type=series
https://toonstream.dad/category/anime/anime-series/?type=post
```

---

## 🎬 **Anime Series Detail Pages**

### URL Pattern
```
https://toonstream.dad/series/{slug}/
```

### Example Slugs Found
```
/series/tokyo-ghoul-all/
/series/attack-on-titan-muse-dub/
/series/nippon-sangoku-the-three-nations-of-the-crimson-sun/
/series/there-was-a-cute-girl-in-the-heros-party-so-i-tried-confessing-to-her/
/series/fairy-tail/
/series/scum-of-the-brave/
/series/you-and-i-are-polar-opposites/
/series/bofuri-i-dont-want-to-get-hurt-so-ill-max-out-my-defense/
/series/daemons-of-the-shadow-realm/
/series/tojima-wants-to-be-a-kamen-rider/
/series/dan-da-dan/
/series/moon-knight/
/series/the-foolish-angel-dances-with-the-devil/
/series/masamune-kuns-revenge/
/series/vtuber-legend-how-i-went-viral-after-forgetting-to-turn-off-my-stream/
/series/attack-on-titan/
```

---

## 🎥 **Episode Pages**

### URL Pattern
```
https://toonstream.dad/episode/{slug}-{season}x{episode}/
```

### Example Episode URLs Found
```
/episode/attack-on-titan-muse-india-dub-1x1/
/episode/attack-on-titan-muse-india-dub-1x2/
/episode/attack-on-titan-muse-india-dub-1x3/
...
/episode/attack-on-titan-muse-india-dub-1x24/
```

---

## 🔴 **Stream Embed URLs**

### Video Player Embed Pattern
```
https://toonstream.dad/?trembed={embed_id}&trid={term_id}&trtype={type_id}
```

### Parameters
- `trembed`: Server/embed ID (0-8, possibly more)
- `trid`: Term/Taxonomy ID (e.g., 43869)
- `trtype`: Content type (1=series, 2=episode, etc.)

### Example Stream URLs Found
```
https://toonstream.dad/?trembed=0&trid=43869&trtype=2
https://toonstream.dad/?trembed=1&trid=43869&trtype=2
https://toonstream.dad/?trembed=2&trid=43869&trtype=2
https://toonstream.dad/?trembed=3&trid=43869&trtype=2
https://toonstream.dad/?trembed=4&trid=43869&trtype=2
https://toonstream.dad/?trembed=5&trid=43869&trtype=2
https://toonstream.dad/?trembed=6&trid=43869&trtype=2
https://toonstream.dad/?trembed=7&trid=43869&trtype=2
https://toonstream.dad/?trembed=8&trid=43869&trtype=2
```

---

## 🎞️ **Server Names**

Found in episode pages:
- Play - Multi Audio
- Short - Multi Audio
- Ruby - Multi Audio
- Cloudy - Multi Audio
- SD - Multi Audio
- HD - Multi Audio
- FHD - Multi Audio
- Turbo - Multi Audio
- Moly - Multi Audio

---

## 🖼️ **Image URLs**

### TMDB Image Pattern
```
//image.tmdb.org/t/p/{size}/{image_path}
```

### Sizes Available
- `w185` - Small thumbnail
- `w500` - Medium
- `w780` - Large
- `w1280` - Extra large

### Example Image URLs
```
//image.tmdb.org/t/p/w500/wCn96kKQBRQhImMorf3napmCjfM.jpg (Tokyo Ghoul)
//image.tmdb.org/t/p/w500/3Npd9yTdy76kHzoFpL0SOIxE6Uv.jpg (Attack on Titan)
//image.tmdb.org/t/p/w500/sM7zYE6xOmaNwC28LR7cEneAtuN.jpg (NIPPON SANGOKU)
//image.tmdb.org/t/p/w500/lUIuuvxthqaK4euFHTNIsRmdf3s.jpg (Hero's Party)
//image.tmdb.org/t/p/w500/dorzFzD65utfD39pEu7PbcXmEFH.jpg (Fairy Tail)
```

---

## 🎭 **Category Taxonomy URLs**

### Genre Categories
```
/category/action/
/category/adventure/
/category/animation/
/category/comedy/
/category/crime/
/category/drama/
/category/family/
/category/fantasy/
/category/horror/
/category/kids/
/category/martial-art/
/category/mystery/
/category/romance/
/category/sci-fi/
/category/sci-fi-fantasy/
/category/superhero/
/category/thriller/
/category/war/
```

### Network Categories
```
/category/crunchyroll/
/category/etv-bal-bharti/
/category/hungama/
/category/netflix/
/category/nickelodean/
/category/cartoon-network/
/category/kinds-zone-pluse/
/category/disney/
/category/sony-yay/
```

### Language Categories
```
/category/language/hindi-language/
/category/language/tamil-language/
/category/language/telugu/
/category/language/fan-hindi/
/category/language/malyalam/
/category/language/kannada/
/category/language/bengali/
/category/language/marathi/
/category/language/english/
/category/language/japaneses/
/category/language/korean/
/category/language/chinese/
```

---

## 🔍 **Search Endpoint**

### Search Form
```html
<form id="search" method="get" action="https://toonstream.dad">
  <input type="text" name="s" placeholder="Search">
</form>
```

### Search URL Pattern
```
https://toonstream.dad/?s={search_query}
```

---

## 📊 **Post Metadata Structure**

Each anime post contains:
- **Post ID**: e.g., `post-6662`, `post-6849`
- **Type**: `series` or `movies`
- **Status**: `publish`
- **Categories**: Multiple category classes
- **Tags**: Multiple tag classes
- **Cast**: Voice actor classes like `cast_tv-natsuki-hanae`
- **Year**: Release year class like `annee-4155` (2013)

---

## 🔧 **JavaScript Configuration**

### Search Suggest
```javascript
typesenseSuggestUrl: "/tr-search-suggest.php"
```

### AJAX URL
```javascript
ajax_url: "https://toonstream.dad/wp-admin/admin-ajax.php"
```

---

## 📝 **Data Extraction Patterns**

### 1. Series List
```javascript
// Target: .post-lst li article.post
{
  id: "post-{id}",
  title: ".entry-title",
  slug: from <a href="/series/{slug}/">,
  image: ".post-thumbnail img src",
  rating: ".vote .num",
  link: ".lnk-blk href"
}
```

### 2. Series Detail
```javascript
// Target: article.post.single
{
  title: ".entry-title",
  image: ".post-thumbnail img src",
  description: ".description p",
  genres: ".genres a",
  tags: ".tag a",
  year: ".year",
  seasons: ".seasons span",
  episodes: ".episodes span",
  rating: ".vote .num",
  cast: ".cast-lst a"
}
```

### 3. Episode List
```javascript
// Target: #episode_by_temp li article
{
  episodeNumber: ".num-epi", // Format: "1x1"
  title: ".entry-title",
  image: ".post-thumbnail img src",
  link: ".lnk-blk href"
}
```

### 4. Stream URLs
```javascript
// Target: .video-player .video iframe
{
  embedId: from URL param trembed,
  termId: from URL param trid,
  type: from URL param trtype,
  src: iframe src or data-src
}
```

---

## 🌐 **API Endpoints to Implement**

### 1. Get All Series
```
GET /api/series?page={page_number}
```
Scrape: `https://toonstream.dad/category/anime/anime-series/page/{page}/`

### 2. Get Series Detail
```
GET /api/series/{slug}
```
Scrape: `https://toonstream.dad/series/{slug}/`

### 3. Get Series Episodes
```
GET /api/series/{slug}/episodes?season={season_number}
```
Scrape: Same as series detail, parse episode list

### 4. Get Episode Detail
```
GET /api/episode/{slug}
```
Scrape: `https://toonstream.dad/episode/{slug}/`

### 5. Get Stream URLs
```
GET /api/stream/{episode_slug}?server={server_id}
```
Scrape: Episode page, extract iframe URLs

### 6. Search
```
GET /api/search?q={query}
```
Scrape: `https://toonstream.dad/?s={query}`

### 7. Get by Category
```
GET /api/category/{category_slug}?page={page}
```
Scrape: `https://toonstream.dad/category/{category}/page/{page}/`

---

## 🛠️ **Technical Notes**

### Headers Required
```
User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36
Accept: text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8
Accept-Language: en-US,en;q=0.5
Referer: https://toonstream.dad/
```

### Rate Limiting
- Add delays between requests (1-2 seconds)
- Use connection pooling
- Implement retry logic with exponential backoff

### Data Cleaning
- Remove TMDB image domain prefix if storing locally
- Normalize server names (remove "- Multi Audio" suffix)
- Extract season/episode numbers from format "1x2" (Season 1, Episode 2)

---

## 📦 **Sample Scraped Data**

### Series Example
```json
{
  "id": 6849,
  "slug": "attack-on-titan-muse-dub",
  "title": "Attack on Titan (Muse India Dub)",
  "image": "https://image.tmdb.org/t/p/w500/3Npd9yTdy76kHzoFpL0SOIxE6Uv.jpg",
  "rating": 8.675,
  "year": 2013,
  "seasons": 1,
  "episodes": 24,
  "genres": ["Action & Adventure", "Animation", "Anime Series", "Sci-Fi & Fantasy"],
  "languages": ["Hindi", "Tamil", "Telugu", "English", "Japanese"]
}
```

### Episode Example
```json
{
  "slug": "attack-on-titan-muse-india-dub-1x1",
  "seriesSlug": "attack-on-titan-muse-dub",
  "season": 1,
  "episode": 1,
  "title": "Attack on Titan (Muse India Dub) 1x1",
  "image": "https://image.tmdb.org/t/p/w185/e363TDn4uP8jP7kHAXQfHAs6HTR.jpg",
  "streamUrls": [
    {
      "server": "play",
      "url": "https://toonstream.dad/?trembed=0&trid=43869&trtype=2"
    },
    {
      "server": "short",
      "url": "https://toonstream.dad/?trembed=1&trid=43869&trtype=2"
    }
  ]
}
```

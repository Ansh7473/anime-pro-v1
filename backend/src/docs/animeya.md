# Animeya.cc Scraper

Seamlessly scrape animeya.cc for anime data, episodes, and streaming sources. Optimized for Next.js RSC data extraction.

## Base URL

`/api/v1/animeya`

---

## 1. Homepage Data

Retrieves featured and trending anime from the homepage.

- **Endpoint**: `/home`
- **Method**: `GET`

### Response Schema

```json
{
  "provider": "Animeya",
  "status": 200,
  "data": {
    "featured": [
      {
        "slug": "one-piece-21",
        "title": "ONE PIECE",
        "cover": "https://s4.anilist.co/file/anilistcdn/media/anime/cover/large/bx21-ELSYx3yMPcKM.jpg",
        "type": "TV"
      }
    ],
    "trending": []
  }
}
```

### 🧪 Test Command

```bash
curl -s "http://localhost:4000/api/v1/animeya/home"
```

---

## 2. Search

Search for anime by keyword.

- **Endpoint**: `/search`
- **Method**: `GET`
- **Query Parameters**:
  - `q` (required): Search query string.

### Response Schema

```json
{
  "provider": "Animeya",
  "status": 200,
  "data": [
    {
      "slug": "one-piece-21",
      "title": "ONE PIECE",
      "cover": "https://s4.anilist.co/file/anilistcdn/media/anime/cover/large/bx21-ELSYx3yMPcKM.jpg",
      "type": "TV"
    }
  ]
}
```

### 🧪 Test Command

```bash
curl -s "http://localhost:4000/api/v1/animeya/search?q=one+piece"
```

---

## 3. Anime Information

Get detailed information and episode list for a specific anime.

- **Endpoint**: `/info/:slug`
- **Method**: `GET`
- **Parameters**:
  - `slug` (required): The anime identifier (e.g., `one-piece-21`).

### Response Schema

```json
{
  "provider": "Animeya",
  "status": 200,
  "data": {
    "id": "one-piece-21",
    "title": "ONE PIECE",
    "cover": "https://s4.anilist.co/file/anilistcdn/media/anime/cover/large/bx21-ELSYx3yMPcKM.jpg",
    "description": "Gold Roger was known as the 'Pirate King', the strongest and most infamous being to have sailed the Grand Line...",
    "episodes": [
      {
        "id": 16428,
        "number": 401,
        "title": "No Escape!? Admiral Kizaru's Light Speed Kick!!",
        "isFiller": false
      }
    ]
  }
}
```

### 🧪 Test Command

```bash
curl -s "http://localhost:4000/api/v1/animeya/info/one-piece-21"
```

---

## 4. Streaming Sources

Get direct video sources for a specific episode.

- **Endpoint**: `/watch/:episodeId`
- **Method**: `GET`
- **Parameters**:
  - `episodeId` (required): The numeric episode ID from the info endpoint (e.g., `16428`).

### Response Schema

```json
{
  "provider": "Animeya",
  "status": 200,
  "data": {
    "episode": {
      "id": 16428,
      "title": "No Escape!? Admiral Kizaru's Light Speed Kick!!",
      "number": 401
    },
    "sources": [
      {
        "id": 2542,
        "code": "https://megaplay.buzz/embed/...,
        "type": "EMBED",
        "subType": "NONE",
        "langue": "ENG",
        "url": "https://megaplay.buzz/stream/..."
      }
    ]
  }
}
```

### 🧪 Test Command

```bash
curl -s "http://localhost:4000/api/v1/animeya/watch/16428"
```

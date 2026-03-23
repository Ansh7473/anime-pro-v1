# Anikai.to Scraper

High-performance scraper for the Anikai platform, offering ad-free streaming and clean metadata.

## 1. Homepage Data

Get trending and latest anime.

- **URL**: `/anikai/home`
- **Method**: `GET`

### 🧪 Test Module

```bash
curl -X GET "http://localhost:4000/api/v1/anikai/home"
```

---

## 2. Search

Search for anime by keywords.

- **URL**: `/anikai/search`
- **Method**: `GET`
- **Query Params**:
  - `q`: Search keyword

### 🧪 Test Module

```bash
curl -X GET "http://localhost:4000/api/v1/anikai/search?q=one+piece"
```

---

## 3. Anime Information

- **URL**: `/anikai/info/:id`
- **Method**: `GET`
- **Params**:
  - `id` (path): Anime slug

---

## 4. Streaming Sources

- **URL**: `/anikai/watch/:id`
- **Method**: `GET`
- **Query Params**:
  - `ep`: Episode number (default: 1)

### 🧪 Test Module

```bash
curl -X GET "http://localhost:4000/api/v1/anikai/watch/one-piece-37?ep=1"
```

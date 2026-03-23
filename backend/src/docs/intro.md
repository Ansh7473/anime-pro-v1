# Introduction

Welcome to the **Tatakai API** documentation. This API provides a unified interface for accessing anime, manga, light novels, and comics from various sources.

## 🚀 Base URL

```bash
http://localhost:4000/api/v1
```

## 📡 Response Format

All responses follow a standard JSON structure:

```json
{
  "status": 200,
  "message": "Optional message",
  "data": { ... }
}
```

## 🎬 Getting Started

The quickest way to start using Tatakai API is via `fetch` or `curl`.

### JavaScript Example

```javascript
const res = await fetch('http://localhost:4000/api/v1/hianime/home');
const data = await res.json();
console.log(data);
```

---

## ⚠️ Error Codes

| Status | Code | Description |
| :--- | :--- | :--- |
| `200` | `OK` | Request was successful. |
| `400` | `BAD_REQUEST` | Missing required parameters (e.g., `?id=`). |
| `404` | `NOT_FOUND` | Resource or endpoint does not exist. |
| `429` | `TOO_MANY_REQUESTS` | You have hit the rate limit. |
| `500` | `INTERNAL_SERVER_ERROR` | Something went wrong on our end. |

---

## 🛡️ Rate Limiting

To ensure fair usage, the API enforces the following limits:

- **Window**: 1 Minute
- **Limit**: 60 Requests
- **Headers**:
  - `X-RateLimit-Limit`: Total requests allowed per window.
  - `X-RateLimit-Remaining`: Requests left in the current window.
  - `X-RateLimit-Reset`: Time (in ms) until the window resets.

## 💻 Code Examples

### JavaScript (Fetch)

```javascript
async function getAnimeInfo(id) {
  const response = await fetch(`http://localhost:4000/api/v1/hianime/info/${id}`);
  const data = await response.json();
  return data;
}
```

### Python (Requests)

```python
import requests

def get_trending():
    url = "http://localhost:4000/api/v1/hianime/home"
    response = requests.get(url)
    return response.json()
```

### PHP (cURL)

```php
$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, "http://localhost:4000/api/v1/hianime/home");
curl_setopt($ch, CURLOPT_RETURNTRANSFER, 1);
$output = curl_exec($ch);
curl_close($ch);
$data = json_decode($output, true);
```

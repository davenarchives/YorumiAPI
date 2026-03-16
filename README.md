# Yorumi API

Standalone REST API service for Yorumi. Provides:
- **AniList** metadata for anime and manga
- **HiAnime** spotlight / trending data
- **AnimeKai Scraper** — episode lists + HLS stream links (powered by `@consumet/extensions`)
- **MangaKatana Scraper** — chapter lists + page images
- **ID Mapping** between AniList IDs and scraper IDs

---

## Quick Start

```bash
npm install
npm run dev
```

Base URL: `http://localhost:3001`

---

## Environment Variables

Copy `.env.example` → `.env`:

```env
PORT=3001
UPSTASH_REDIS_REST_URL=     # Optional: Redis for caching
UPSTASH_REDIS_REST_TOKEN=   # Optional: Redis for caching
```

---

## Local Test Pages

| File | Purpose |
|---|---|
| `play-test.html` | Browse and stream anime episodes in the browser |
| `manga-test.html` | Browse and read manga chapters in the browser |

Open them directly as `file://` in your browser while the API server is running.

---

## API Reference

All responses are JSON. Errors return `{ "error": "..." }` with an appropriate HTTP status code.

---

### Health

#### `GET /`
Returns API status.

```json
{ "message": "Yorumi API is running!" }
```

---

### Anime — AniList Metadata

Base path: `/api/anime`

#### `GET /api/anime/top`
Top-rated anime from AniList.
| Query | Type | Description |
|---|---|---|
| `page` | number | Page number (default: 1) |
| `limit` | number | Items per page (default: 20) |

#### `GET /api/anime/trending`
Trending anime.
| Query | Type | Description |
|---|---|---|
| `page` | number | Page number |
| `limit` | number | Items per page |

#### `GET /api/anime/popular-this-season`
Popular anime from the current season.

#### `GET /api/anime/popular-this-month`
Popular anime this month.

#### `GET /api/anime/spotlight/anilist`
Returns AniList spotlight (top 5 trending).

#### `GET /api/anime/search`
Search anime via AniList.
| Query | Type | Description |
|---|---|---|
| `q` | string | **Required.** Search query |
| `page` | number | Page number |
| `limit` | number | Items per page |

#### `POST /api/anime/search`
Search anime via AniList (POST body variant).
```json
{ "query": "one piece" }
```

#### `GET /api/anime/anime/:id`
Fetch full anime details by AniList ID.

#### `POST /api/anime/batch-covers`
Fetch cover images for multiple anime by MAL ID.
```json
{ "malIds": [21, 20, 199] }
```

#### `GET /api/anime/schedule`
Airing schedule within a time window (unix seconds).
| Query | Type | Description |
|---|---|---|
| `start` | number | Start timestamp |
| `end` | number | End timestamp |

#### `GET /api/anime/genres`
Returns a list of all anime genres.

#### `GET /api/anime/genre/:name`
Anime by genre name.
| Query | Type | Description |
|---|---|---|
| `page` | number | Page number |
| `limit` | number | Items per page |

#### `GET /api/anime/az-list/:letter`
Anime alphabetically by starting letter (AniList).
| Query | Type | Description |
|---|---|---|
| `page` | number | Page |
| `limit` | number | Items per page |

#### `GET /api/anime/random`
Returns a random anime.

---

### Anime — HiAnime

#### `GET /api/anime/spotlight`
HiAnime spotlight carousel items.

#### `GET /api/anime/az-list/:letter`
HiAnime alphabetical list.
| Query | Type | Description |
|---|---|---|
| `page` | number | Page |

#### `GET /api/anime/top10`
Top 10 anime by range.
| Query | Type | Values |
|---|---|---|
| `range` | string | `day`, `week`, `month` |

---

### Anime — Scraper (AnimeKai via Consumet)

These endpoints use `@consumet/extensions` → AnimeKai provider to scrape real HLS stream links.

#### `GET /api/anime/search/scraper`
Search anime by title.
| Query | Type | Description |
|---|---|---|
| `q` | string | **Required.** Search query |

**Response:**
```json
{
  "data": [
    {
      "id": "naruto-shippuden-mv9v",
      "session": "naruto-shippuden-mv9v",
      "title": "Naruto: Shippuden",
      "poster": "https://...",
      "type": "TV",
      "episodes": 500,
      "sub": 500,
      "dub": 500
    }
  ]
}
```

#### `GET /api/anime/episodes/:session`
Get episode list for an anime.
| Query | Type | Description |
|---|---|---|
| `page` | number | Page (default: 1) |
| `debug` | boolean | Include raw HTML in response |

**Response:**
```json
{
  "episodes": [
    {
      "id": "naruto-shippuden-mv9v#ep=1",
      "session": "naruto-shippuden-mv9v#ep=1",
      "episodeNumber": 1,
      "title": "Homecoming",
      "isSubbed": true,
      "isDubbed": true,
      "isFiller": false
    }
  ],
  "lastPage": 1,
  "page": 1
}
```

#### `GET /api/anime/episodes/:session/all`
Get all episodes across all pages in one call.

#### `GET /api/anime/links/:session/:episode`
Get HLS stream links for an episode. Both `:session` and `:episode` must be URL-encoded.

> ⚠️ The episode ID comes from the `session` field in the episodes response (e.g. `naruto-shippuden-mv9v#ep=1`). URL-encode it before use.

**Example:**
```
GET /api/anime/links/naruto-shippuden-mv9v/naruto-shippuden-mv9v%23ep%3D1
```

**Response:**
```json
{
  "data": [
    {
      "quality": "auto",
      "audio": "sub",
      "url": "https://cdn.example.com/stream.m3u8",
      "isHls": true
    }
  ],
  "headers": {
    "Referer": "https://animekai.to/"
  },
  "subtitles": [
    { "url": "https://cdn.example.com/subs/en.vtt", "lang": "English" },
    { "url": "https://cdn.example.com/subs/pt.vtt", "lang": "Portuguese" }
  ]
}
```

#### `GET /api/anime/proxy`
Proxies a stream or subtitle URL through the server, injecting required headers to bypass CDN hotlink protection. Used internally by `play-test.html`.

| Query | Type | Description |
|---|---|---|
| `url` | string | **Required.** Target URL to proxy |
| `referer` | string | Referer header to inject |

> The proxy also rewrites `.m3u8` playlists to route nested segment and key URLs back through itself, so HLS streams play correctly in the browser.

---

### Manga — AniList Metadata

#### `GET /api/manga/top`
Top manga from AniList.

#### `GET /api/manga/popular`
Popular manga.

#### `GET /api/manga/top/manhwa`
Top manhwa.

#### `GET /api/manga/trending`
Trending manga.

#### `GET /api/manga/search`
Search manga via AniList.
| Query | Type | Description |
|---|---|---|
| `q` | string | **Required.** Search query |
| `page` | number | Page |
| `limit` | number | Items per page |

#### `GET /api/manga/:id`
Full manga details by AniList ID.

#### `GET /api/manga/genre/:name`
Manga by genre.

#### `GET /api/manga/az-list/:letter`
Manga alphabetically.

#### `GET /api/manga/random`
Random manga.

---

### Manga — Scraper (MangaKatana)

#### `GET /api/manga/scraper/search`
Search manga by title.
| Query | Type | Description |
|---|---|---|
| `q` | string | **Required.** Search query |

**Response:**
```json
{
  "data": [
    {
      "id": "mk:one-piece.1",
      "title": "One Piece",
      "thumbnail": "https://...",
      "latestChapter": "1134",
      "status": "Ongoing"
    }
  ]
}
```

#### `GET /api/manga/scraper/details/:mangaId`
Full manga details including chapter list. Supports both AniList numeric IDs and scraper `mk:` prefixed IDs.

#### `GET /api/manga/scraper/chapters/:mangaId`
Chapter list for a manga.

**Response:**
```json
{
  "chapters": [
    {
      "id": "mk:one-piece.1/chapter-1134",
      "title": "Chapter 1134",
      "number": 1134,
      "url": "https://mangakatana.com/manga/one-piece.1/c1134",
      "date": "2024-01-01"
    }
  ]
}
```

#### `GET /api/manga/scraper/pages`
Page image URLs for a chapter.
| Query | Type | Description |
|---|---|---|
| `url` | string | **Required.** Chapter URL from the chapters response |

**Response:**
```json
{
  "pages": [
    "https://cdn.mangakatana.com/page1.jpg",
    "https://cdn.mangakatana.com/page2.jpg"
  ]
}
```

#### `POST /api/manga/scraper/prefetch`
Pre-warm the chapter pages cache for multiple chapters.
```json
{ "urls": ["https://...", "https://..."] }
```

#### `GET /api/manga/scraper/hot-updates`
Recently updated manga from MangaKatana.

#### `GET /api/manga/scraper/spotlight`
Enriched spotlight — AniList trending manga with latest chapter data from MangaKatana.

---

### Mapping

Maps AniList IDs to scraper session IDs (stored in the database).

#### `GET /api/mapping/:id`
Get mapping by AniList ID.

#### `POST /api/mapping`
Create a new mapping.
```json
{
  "anilistId": "20",
  "scraperId": "naruto-shippuden-mv9v",
  "title": "Naruto: Shippuden"
}
```

#### `DELETE /api/mapping/:id`
Delete a mapping.

#### `POST /api/mapping/identify`
Auto-identify a scraper ID from a slug and title.
```json
{ "slug": "naruto-shippuden", "title": "Naruto: Shippuden" }
```

---

### User

#### `GET /api/user/avatar`
Get the current user avatar URL.

#### `POST /api/user/avatar`
Set the user avatar URL.
```json
{ "avatarUrl": "https://example.com/avatar.png" }
```

---

## Typical Anime Streaming Flow

```
1. Search:   GET /api/anime/search/scraper?q=one+piece
             → Get anime `session` ID (e.g. "one-piece-av9v")

2. Episodes: GET /api/anime/episodes/one-piece-av9v
             → Get list of episodes with `session` IDs

3. Stream:   GET /api/anime/links/one-piece-av9v/<url-encoded-episode-session>
             → Returns HLS .m3u8 URL + subtitles

4. Play:     Use hls.js to load the m3u8 URL through the /proxy endpoint
             with the returned Referer header
```

## Typical Manga Reading Flow

```
1. Search:   GET /api/manga/scraper/search?q=berserk
             → Get manga `id` (e.g. "mk:berserk.1")

2. Chapters: GET /api/manga/scraper/chapters/mk:berserk.1
             → Get list of chapters with `url` fields

3. Pages:    GET /api/manga/scraper/pages?url=<chapter-url>
             → Returns page image URLs to render in order
```

---

## Troubleshooting

| Issue | Fix |
|---|---|
| AniList endpoints return empty | Check Redis settings or AniList rate limits |
| Scraper returns empty results | Upstream site may have changed; check console logs |
| Stream returns 403 | Always play through `/api/anime/proxy` with the `Referer` from the links response |
| Chapters return empty | MangaKatana may have updated their HTML structure |

---

## Project Structure

```
src/
├── index.ts                    # Server entry point
├── api/
│   ├── anime/
│   │   ├── anime.anilist.routes.ts    # AniList anime endpoints
│   │   ├── anime.hianime.routes.ts    # HiAnime endpoints
│   │   └── anime.scraper.routes.ts    # AnimeKai scraper + proxy
│   ├── manga/
│   │   └── manga.anilist.routes.ts    # AniList manga endpoints
│   ├── scraper/
│   │   ├── mangascraper.routes.ts     # MangaKatana scraper endpoints
│   │   └── manga.service.ts           # Manga service layer with caching
│   ├── mapping/
│   └── user/
└── scraper/
    ├── aniwatch.ts             # AnimeKai scraper (consumet.ts)
    └── mangakatana.ts          # MangaKatana scraper
```
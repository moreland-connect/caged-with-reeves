# Caged with Reeves v2.0

Find actors who have appeared in films with **both** Nicolas Cage and Keanu Reeves — not necessarily the same film, but at least once with each. Search any two actors to find their shared connections, sorted by popularity.

## Prerequisites

The following must be installed on your machine before you begin:

- **Node.js** v18 or higher — required for native `fetch` support ([nodejs.org](https://nodejs.org))
- **npm** — included with Node.js
- **TMDB API key** — a free Read Access Token from [themoviedb.org/settings/api](https://www.themoviedb.org/settings/api). Use the long **API Read Access Token** (Bearer token), not the short API key.

## Setup

1. Copy the example env file and add your token:

```bash
cp .env.example .env
```

`.env`:
```
TMDB_API_KEY=your_bearer_token_here
PORT=3001
```

2. Install dependencies:

```bash
npm install
```

## Running the App

Start both servers in separate terminals:

```bash
# Terminal 1 — Express API server
npm run dev:server

# Terminal 2 — Vite dev server
npm run dev
```

Then open [http://localhost:5173](http://localhost:5173).

### Production build

```bash
npm run build
npm start
```

`npm start` runs the Express server which serves both the API and the compiled React app from `dist/`.

---

## API Endpoints

All endpoints are served by the Express server on port `3001` (proxied through Vite in development).

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/search-person?query={name}` | Searches TMDB for actors whose name starts with the query. Returns up to 5 results sorted by popularity. |
| `GET` | `/api/person/:id` | Returns a single person's name and profile image by their TMDB person ID. |
| `GET` | `/api/shared-actors?star1Id={id}&star2Id={id}` | **SSE.** Streams progress updates while computing shared co-stars, then emits the final result. |

### SSE event types (`/api/shared-actors`)

| Event type | Payload |
|------------|---------|
| `progress` | `{ message: string }` — status update while scanning filmographies |
| `result` | `{ star1, star2, actors[] }` — final payload when complete |
| `error` | `{ message: string }` — unrecoverable failure |

---

## How It Works

The server runs a four-step pipeline per request:

1. **Resolve IDs** — fetches both stars' TMDB profiles in parallel.
2. **Fetch movie credits** — retrieves every film each star appears in as a cast member.
3. **Fetch cast lists** — for each of those films, fetches the full cast. Requests run in chunks of 6 with a 550ms pause between batches to stay within TMDB rate limits. Both stars are processed in parallel.
4. **Intersect** — builds a co-star map for each star, then finds actors present in both. Results are sorted by TMDB popularity score.

---

## Dev Notes

### Rate limit handling

- **Chunked batching** — cast requests are batched in groups of 6 with a 550ms delay between chunks.
- **Exponential backoff** — `429` responses trigger automatic retries with increasing delays (1s → 2s → 4s → 8s), up to 6 attempts.

### Request volume

Each star's filmography typically spans several hundred movies combined, meaning the initial load sends a large number of TMDB requests. Expect **30–60 seconds** for the first result.

### Other notes

- Only movie credits are scanned — TV appearances are excluded.
- The TMDB API key lives only on the server and is never bundled into the client.
- No results are cached — each search triggers a fresh pipeline run.

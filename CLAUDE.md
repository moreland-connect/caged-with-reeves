# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

A React app that finds actors who have appeared in films with **any two chosen actors** (not necessarily the same film). Defaults to Nicolas Cage and Keanu Reeves on load. Processing runs server-side via an Express backend that proxies the TMDB API and streams progress to the client.

## Project Rules

- Components go in /src/components, each in its own file
- All routes must be defined in separate files, organized under a `/routes` folder
- When creating a new route, create a new file in `/routes` rather than adding to an existing one unless it clearly belongs there

## Setup

Copy `.env.example` to `.env` and add your TMDB Bearer token as `TMDB_API_KEY` and optionally a `PORT` (default 3001).

## Commands

```bash
npm run dev:server  # Start Express API server (port 3001, --watch)
npm run dev         # Start Vite dev server (port 5173, proxies /api to :3001)
npm run build       # Production build (Vite → dist/)
npm start           # Production: Express serves dist/ + API on one port
npm run preview     # Preview production build locally
```

Run `dev:server` and `dev` in separate terminals for local development. No test suite or linter is configured.

## Architecture

### Server (`server/`)

- `server/index.js` — Express app with three routes, CORS enabled for dev, serves `dist/` in production
- `server/tmdb.js` — all TMDB API logic; `TMDB_API_KEY` never leaves the server

**API endpoints:**

| Endpoint | Purpose |
|---|---|
| `GET /api/search-person?query=` | Actor autocomplete; returns top 5 by popularity |
| `GET /api/person/:id` | Fetch a single actor's name + profile image |
| `GET /api/shared-actors?star1Id=&star2Id=` | SSE stream; computes and emits shared co-stars |

**`/api/shared-actors` data flow:**
1. Resolve both actors in parallel via `getPersonById()`
2. Fetch each star's movie credits via `getMovieCredits()` (movies only, not TV)
3. `buildCoStarSet()` — for each star, fetches full cast for every movie in chunks of 6 with 550ms inter-chunk delays; builds `Map<actorId, {id, name, profile_path, popularity, movies[]}>`; emits `progress` SSE events throughout
4. Intersect both maps, sort by popularity, emit `result` SSE event

**Rate limiting** (`tmdbFetch()`): retries up to 6 times with exponential backoff (1s→2s→4s→8s) on 429 responses. Expect 30–60s for actors with large filmographies.

### Client (`src/`)

- `src/service/tmdb.js` — two functions: `searchPersons(query)` and `findSharedActors(star1Id, star2Id, onProgress)`. The latter returns `{ promise, cancel }` and consumes the SSE stream.
- `App.jsx` — all state; pre-populates Cage (ID 2963) + Reeves (ID 6384) on mount; triggers computation automatically when both stars are set and distinct

**App state:**
```
star1, star2       — selected actor objects
phase              — 'selecting' | 'loading' | 'results' | 'error'
actors             — shared co-star array
loadingMsg         — latest progress string from SSE
error              — error message string
selected           — actorId of the open side panel (null = closed)
```

**Component tree:**
- `ActorSearch.jsx` — autocomplete input with 300ms debounce, keyboard nav, clear button; `disabledId` prop prevents picking the same actor twice
- `StarHeader.jsx` — displays both selected actors' profile images and names
- `ResultsList.jsx` + `ActorCard.jsx` — CSS Grid of co-star cards; cards show tooltip with film counts per star
- `MoviePanel.jsx` — sticky side panel; two columns (films with star1 vs. star2) for the selected co-star; each film links to TMDB

**Styling**: Plain CSS in `src/index.css`. Dark theme, gold accent (`--accent: #e8b400`), CSS Grid for cards. No component library.

### Vite config

`/api` requests are proxied to `http://localhost:3001` during development (`vite.config.js`).

## Key Facts

- The two stars are **not hardcoded** — users can search and select any two actors via `ActorSearch`
- Cage + Reeves are only defaults fetched on mount; changing either triggers a new computation automatically
- TMDB API key is **server-side only** — not exposed to the browser
- No state management library; all state lives in `App.jsx` via React hooks

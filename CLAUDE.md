# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

A React app that finds actors who have appeared in films with **any two chosen actors** (not necessarily the same film). Defaults to Nicolas Cage and Keanu Reeves via the home page CTA. Processing runs server-side via an Express backend that proxies the TMDB API and streams progress to the client.

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
- `src/service/resultsCache.js` — in-memory `Map` keyed by `star1Id-star2Id`; `getCached` / `setCached`. Resets on page reload.
- `App.jsx` — just a `<Routes>` switcher; all state lives in the route components

**Routes (`src/routes/`):**
- `Home.jsx` — two CTAs: "Try it: Cage & Reeves" (navigates to `/results?star1=2963&star2=6384`) and "Search actors"
- `Search.jsx` — two `ActorSearch` inputs; navigates to `/results` automatically when both are selected and distinct; shows a back button to either home or the previous results page (passed via router state)
- `Results.jsx` — reads `star1Id`/`star2Id` from query params; fetches actor display data and runs the SSE pipeline; checks the cache before starting a new computation; all phase state (`loading` / `results` / `error`) lives here

**Component tree:**
- `ActorSearch.jsx` — autocomplete input with 300ms debounce, keyboard nav, clear button; `disabledId` prop prevents picking the same actor twice
- `StarHeader.jsx` — displays both selected actors' profile images and names
- `ResultsList.jsx` + `ActorCard.jsx` — CSS Grid of co-star cards; cards show tooltip with film counts per star
- `MoviePanel.jsx` — sticky side panel; two columns (films with star1 vs. star2) for the selected co-star; each film links to TMDB

**Styling**: Plain CSS in `src/index.css`. Dark theme, gold accent (`--accent: #e8b400`), CSS Grid for cards. No component library.

### Vite config

`/api` requests are proxied to `http://localhost:3001` during development (`vite.config.js`).

## Key Facts

- The two stars are **not hardcoded** — users can search any two actors via `ActorSearch`
- Cage + Reeves are the default example but any pair works; results URLs are shareable (`/results?star1=ID&star2=ID`)
- TMDB API key is **server-side only** — not exposed to the browser
- No state management library; all state lives in the route components via React hooks
- Client-side result cache: revisiting the same pair within a session skips the SSE pipeline entirely

## Roadmap / Future Ideas

Ideas discussed but intentionally deferred — pick these up in future versions:

### Coming Soon
- **Unit tests** (Vitest already installed): Priority targets are `nameMatchesQuery` in `server/tmdb.js` (pure function), the SSE client in `src/service/tmdb.js` (mock EventSource), and `ActorSearch.jsx` debounce/keyboard behavior.

### Future Versions
- **Early fetching**: Start fetching star1's full filmography the moment the user selects actor 1. By the time actor 2 is chosen, the server has a head start — could cut total wait time nearly in half. Requires a server-side in-memory cache keyed by actor ID.
- **Drag to replace**: Let users drag an actor card from the results list into the `StarHeader` to swap out one of the two stars and kick off a new search. Actor IDs and names are already present on each card.

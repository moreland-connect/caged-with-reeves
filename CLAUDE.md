# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

A single-page React app that finds actors who have appeared in films with **both** Nicolas Cage and Keanu Reeves (not necessarily the same film). All processing is client-side via the TMDB API.

## Setup

Copy `.env.example` to `.env` and add a TMDB Bearer token as `VITE_TMDB_API_KEY`.

## Commands

```bash
npm run dev       # Start dev server (Vite HMR)
npm run build     # Production build
npm run preview   # Preview production build
```

No test suite or linter is configured.

## Architecture

**Data flow** (`src/api/tmdb.js`):
1. `findSharedActors()` — top-level orchestrator called once on mount
2. Resolves Cage + Reeves to TMDB IDs in parallel via `getPerson()`
3. Fetches each star's movie credits via `getMovieCredits()`
4. `buildCoStarSet()` — fetches full cast for every movie in chunks of 6 with 550ms inter-chunk delays to avoid rate limits; builds a `Map<actorId, {name, popularity, profilePath, movies[]}>` per star
5. Computes the intersection of both maps client-side, sorts by popularity

**Rate limiting**: `tmdbFetch()` retries up to 6 times with exponential backoff (1s→2s→4s→8s) on 429 responses. Expect 30–60s initial load.

**Component tree**:
- `App.jsx` — holds all state (`stars`, `actors`, `loading`, `loadingMsg`, `error`, `selected`)
- `StarHeader.jsx` — displays Cage/Reeves photos
- `ResultsList.jsx` + `ActorCard.jsx` — grid of co-stars sorted by popularity
- `MoviePanel.jsx` — sticky side panel; shows two columns (movies with Cage vs. Reeves) for a selected actor

**Styling**: Plain CSS in `src/index.css`. Dark theme, gold accent (`--accent: #e8b400`), CSS Grid for cards. No component library.

## Key Constraints

- The two stars (Cage + Reeves) are **hardcoded** in `src/api/tmdb.js` — `findSharedActors()` always queries specifically for them.
- No backend — the TMDB API key is exposed client-side via `VITE_` prefix (standard for public read-only keys).
- No state management library; all state lives in `App.jsx` via React hooks.

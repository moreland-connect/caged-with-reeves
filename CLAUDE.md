# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

A React app that finds actors who have appeared in films with **any two chosen actors** (not necessarily the same film). Defaults to Nicolas Cage and Keanu Reeves via the home page CTA. Processing runs server-side via an Express backend that proxies the TMDB API and streams progress to the client.

## Project Rules

- Components go in /src/components, each in its own file
- All routes must be defined in separate files, organized under a `/routes` folder
- When creating a new route, create a new file in `/routes` rather than adding to an existing one unless it clearly belongs there


## Architecture

### Server (`server/`)

- `server/index.js` — Express app with three TMDB routes plus auth routes, CORS enabled for dev, serves `dist/` in production
- `server/tmdb.js` — all TMDB API logic; `TMDB_API_KEY` never leaves the server
- `server/auth.js` — local username/password verification (`verifyCredentials`, bcrypt-checked against the Postgres `users` table), account creation (`createUser`), per-account favorites storage (`getFavorites`/`addFavorite`/`removeFavorite`, order-independent dedupe via normalized `star1Id <= star2Id` storage + a DB unique constraint), and the `requireAuth` session-gate middleware. All exported functions are async.
- `server/db/schema.js` — Drizzle schema: `users` (`id`, `username` unique, `passwordHash`) and `favorites` (`id`, `userId` FK → `users.id` cascade delete, `star1Id`, `star2Id`, unique on `(userId, star1Id, star2Id)`)
- `server/db/client.js` — creates the `pg` `Pool` and exports the Drizzle `db` instance, driven by `DATABASE_URL`
- `server/db/migrations/` — generated SQL migrations (via `npm run db:generate`), applied with `npm run db:migrate`
- `docker-compose.yml` — local Postgres service for development (`npm run db:up`)
- `server/scripts/migrate-users-json.js` — one-off script (`npm run db:import-users-json`) that imports a legacy `server/users.json` into Postgres, skipping usernames that already exist

**API endpoints:**

| Endpoint | Purpose |
|---|---|
| `POST /api/login` | Verifies credentials against the `users` table, starts a session |
| `POST /api/signup` | Creates a new account (409 if the username is taken), starts a session |
| `POST /api/logout` | Destroys the session |
| `GET /api/session` | Returns `{ authenticated, username }` for the current session |
| `GET /api/search-person?query=` | Actor autocomplete; returns top 5 by popularity (session required) |
| `GET /api/person/:id` | Fetch a single actor's name + profile image (session required) |
| `GET /api/shared-actors?star1Id=&star2Id=` | SSE stream; computes and emits shared co-stars (session required) |
| `GET /api/favorites` | Returns `{ favorites }` — the logged-in user's saved pairs (session required) |
| `POST /api/favorites` | Body `{ star1Id, star2Id }`; adds a pair, returns the updated `{ favorites }` (session required) |
| `DELETE /api/favorites?star1Id=&star2Id=` | Removes a pair (order-independent), returns the updated `{ favorites }` (session required) |

**Auth**: sessions are held in-memory via `express-session` (`SESSION_SECRET` env var) — restarting the server logs everyone out. `requireAuth` guards every TMDB-backed route; `/api/login`, `/api/logout`, and `/api/session` stay public so the client can authenticate.

**`/api/shared-actors` data flow:**
1. Resolve both actors in parallel via `getPersonById()`
2. Fetch each star's movie credits via `getMovieCredits()` (movies only, not TV)
3. `buildCoStarSet()` — for each star, fetches full cast for every movie in chunks of 6 with 550ms inter-chunk delays; builds `Map<actorId, {id, name, profile_path, popularity, movies[]}>`; emits `progress` SSE events throughout
4. Intersect both maps, sort by popularity, emit `result` SSE event

**Rate limiting** (`tmdbFetch()`): retries up to 6 times with exponential backoff (1s→2s→4s→8s) on 429 responses. Expect 30–60s for actors with large filmographies.

### Client (`src/`)

- `src/service/tmdb.js` — two functions: `searchPersons(query)` and `findSharedActors(star1Id, star2Id, onProgress)`. The latter returns `{ promise, cancel }` and consumes the SSE stream.
- `src/service/resultsCache.js` — in-memory `Map` keyed by `star1Id-star2Id`; `getCached` / `setCached`. Resets on page reload.
- `src/service/auth.js` — `login(username, password)`, `signup(username, password)`, `logout()`, `getSession()`; thin `fetch` wrappers around the auth endpoints.
- `src/service/favorites.js` — `getFavorites()`, `addFavorite(star1Id, star2Id)`, `removeFavorite(star1Id, star2Id)`; thin `fetch` wrappers around `/api/favorites`.
- `src/context/AuthContext.jsx` — `AuthProvider`/`useAuth()`; checks `/api/session` on mount so a page refresh doesn't force a re-login while the session cookie is still valid.
- `App.jsx` — wraps everything in `AuthProvider`; a `<Routes>` switcher with `/login` and `/signup` public and the rest nested under `RequireAuth`. All other state lives in the route components.

**Routes (`src/routes/`):**
- `Login.jsx` — username/password form; on success navigates back to wherever the user was headed (`location.state.from`, same pattern `Search.jsx` uses for its back button); links to `/signup`
- `Signup.jsx` — username/password/confirm-password form; creates the account and logs in immediately; links to `/login`
- `Home.jsx` — two static CTAs ("Try it: Cage & Reeves" navigating to `/results?star1=2963&star2=6384`, and "Search actors"); if the logged-in user has any saved favorites, fetches display names for each and renders them below via `FavoritesList`
- `Search.jsx` — two `ActorSearch` inputs; navigates to `/results` automatically when both are selected and distinct; shows a back button to either home or the previous results page (passed via router state)
- `Results.jsx` — reads `star1Id`/`star2Id` from query params; fetches actor display data and runs the SSE pipeline; checks the cache before starting a new computation; all phase state (`loading` / `results` / `error`) lives here; nav includes a save/remove favorite toggle checked order-independently against the user's favorites list

**Component tree:**
- `RequireAuth.jsx` — router layout-route guard; redirects to `/login` when `useAuth()` reports no user, otherwise renders `<Outlet/>`
- `LogoutButton.jsx` — renders nothing when logged out; a small "Log out" link when logged in. Mounted once in `App.jsx` so it's present on every page.
- `FavoritesList.jsx` — renders each saved favorite as a chip (actor names + a `★`); click navigates to that pair's results, an `×` removes it. Used by `Home.jsx`.
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
- Auth is a local username/password gate only — no remote identity provider, sessions are in-memory (server restart logs everyone out), and Postgres (`users`/`favorites` tables via Drizzle) is the entire account store
- No state management library; all state lives in the route components via React hooks (except auth state, which lives in `AuthContext`)
- Client-side result cache: revisiting the same pair within a session skips the SSE pipeline entirely

## Roadmap / Future Ideas

Ideas discussed but intentionally deferred — pick these up in future versions:

### Coming Soon
- **Unit tests** (Vitest already installed): Priority targets are `nameMatchesQuery` in `server/tmdb.js` (pure function), the SSE client in `src/service/tmdb.js` (mock EventSource), and `ActorSearch.jsx` debounce/keyboard behavior.

### Future Versions
- **Early fetching**: Start fetching star1's full filmography the moment the user selects actor 1. By the time actor 2 is chosen, the server has a head start — could cut total wait time nearly in half. Requires a server-side in-memory cache keyed by actor ID.
- **Drag to replace**: Let users drag an actor card from the results list into the `StarHeader` to swap out one of the two stars and kick off a new search. Actor IDs and names are already present on each card.

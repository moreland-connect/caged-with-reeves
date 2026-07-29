# Caged with Reeves presents: The Co-Star Connection v2.5

Find actors who have appeared in films with **both** Nicolas Cage and Keanu Reeves — not necessarily the same film, but at least once with each. Search any two actors to find their shared connections, sorted by popularity.

Results pages have shareable URLs (`/results?star1=ID&star2=ID`) and revisiting the same pair returns instantly from a client-side cache.

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
SESSION_SECRET=replace_with_a_random_string
PORT=3001
```

2. Install dependencies:

```bash
npm install
```

3. Set up local login accounts. Copy the example accounts file:

```bash
cp server/users.example.json server/users.json
```

`server/users.json` is gitignored and is the entire user store — there's no signup approval flow beyond what `/signup` creates. Generate a bcrypt hash for a password with:

```bash
node server/scripts/hash-password.js <password>
```

Paste the result into `server/users.json` as `{ "username": "...", "passwordHash": "..." }`. Accounts can also be created directly through the app's sign-up page.

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

All endpoints are served by the Express server on port `3001` (proxied through Vite in development). Endpoints marked **session required** return `401` without a logged-in session.

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/login` | Verifies a username/password against `server/users.json` and starts a session. |
| `POST` | `/api/signup` | Creates a new account (`409` if the username is taken) and starts a session. |
| `POST` | `/api/logout` | Destroys the current session. |
| `GET` | `/api/session` | Returns `{ authenticated, username }` for the current session. |
| `GET` | `/api/search-person?query={name}` | **Session required.** Searches TMDB for actors whose name starts with the query. Returns up to 5 results sorted by popularity. |
| `GET` | `/api/person/:id` | **Session required.** Returns a single person's name and profile image by their TMDB person ID. |
| `GET` | `/api/shared-actors?star1Id={id}&star2Id={id}` | **Session required, SSE.** Streams progress updates while computing shared co-stars, then emits the final result. |
| `GET` | `/api/favorites` | **Session required.** Returns `{ favorites }` — the logged-in user's saved actor pairs. |
| `POST` | `/api/favorites` | **Session required.** Body `{ star1Id, star2Id }`; saves a pair and returns the updated `{ favorites }`. |
| `DELETE` | `/api/favorites?star1Id={id}&star2Id={id}` | **Session required.** Removes a saved pair (order-independent) and returns the updated `{ favorites }`. |

### SSE event types (`/api/shared-actors`)

| Event type | Payload |
|------------|---------|
| `progress` | `{ message: string }` — status update while scanning filmographies |
| `result` | `{ star1, star2, actors[] }` — final payload when complete |
| `error` | `{ message: string }` — unrecoverable failure |

---

## Pages

| Route | Description |
|-------|-------------|
| `/login` | Username/password login; public |
| `/signup` | Create an account (creates and logs in immediately); public |
| `/` | Home page — two CTAs (jump straight to Cage & Reeves, or open the search page) plus your saved favorites, if any |
| `/search` | Actor search — pick any two actors; navigates to results automatically when both are selected |
| `/results?star1=ID&star2=ID` | Results — shareable URL; includes a save/remove favorite toggle |

All routes except `/login` and `/signup` require a logged-in session and redirect to `/login` otherwise.

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

### Auth

- Sessions are held in-memory via `express-session` — restarting the server logs everyone out.
- `server/users.json` is the entire user store; there's no external identity provider.

### Other notes

- Only movie credits are scanned — TV appearances are excluded.
- The TMDB API key lives only on the server and is never bundled into the client.
- Results are cached client-side (in-memory) keyed by actor ID pair — revisiting the same pair within a session returns instantly without re-running the pipeline. The cache resets on page reload.

## Testing

```bash
npm test
```

Runs the Vitest suite (server route/unit tests plus client component/service tests with jsdom).

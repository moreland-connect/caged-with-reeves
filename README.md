# Caged with Reeves

Find actors who have shared the screen with both Nicolas Cage and Keanu Reeves — not necessarily in the same film, but at least once with each.

## How it works

The app performs a three-step data pipeline against the TMDB API, then computes the intersection client-side:

1. **Resolve names to IDs** — searches for Nicolas Cage and Keanu Reeves by name to retrieve their TMDB person IDs. Both lookups run in parallel.

2. **Fetch movie credits** — for each star, retrieves every film they appear in as a cast member. This gives a list of movie IDs to query.

3. **Fetch cast lists** — for each of those movies, fetches the full cast. Because each star has appeared in a large number of films, these requests are batched in chunks of 8 and sent with a 400ms pause between batches to stay within TMDB's rate limits. Both stars' filmographies are processed in parallel.

4. **Compute the intersection** — once all cast data is in memory, the app builds a co-star map for each star (actor ID → movies they appeared in together). It then walks Cage's co-star map and checks each entry against Reeves's co-star map. Actors present in both are collected into the final results list, sorted by TMDB popularity score.

All data fetching and processing happens in the browser — there is no backend.

## Data fetching

### Rate limit handling

TMDB enforces a request rate limit. The app handles this in two ways:

- **Chunked batching**: rather than firing all cast requests simultaneously, the app processes movies in groups of 8, waiting 400ms between each group.
- **Exponential backoff**: if a request returns a `429 Too Many Requests` response, it retries automatically with increasing delays (1s, 2s, 4s, 8s) before giving up after five attempts.

### Endpoints

| Endpoint | Purpose |
|---|---|
| `GET /search/person?query={name}` | Resolves an actor's name to their TMDB person ID and profile image path. The app takes the first result. |
| `GET /person/{id}/movie_credits` | Returns every film a person has a cast credit on. Used to build the list of movies to scan for each star. |
| `GET /movie/{id}/credits` | Returns the full cast and crew for a specific film. The app uses only the cast array, extracting each actor's ID, name, profile image, and popularity score. |

### Volume

Nicolas Cage and Keanu Reeves each have a large number of film credits, which means the app sends a significant number of requests on load — typically several hundred across both filmographies. The chunked batching strategy keeps this from saturating the API, but the initial load takes around 30–60 seconds depending on connection speed and TMDB response times.

## UI

- Nicolas Cage and Keanu Reeves are shown at the top with their TMDB profile photos
- Matching actors are displayed in a grid below, ordered by popularity
- Clicking an actor opens a side panel listing which films connect them to each star
- Clicking a film title opens that film's page on themoviedb.org

## Tech stack

- React (via Vite)
- TMDB API

## Setup

1. Create a `.env` file at the project root. A `.env.example` is included as a template:

```
VITE_TMDB_API_KEY=your_bearer_token_here
```

You'll need a free TMDB account to generate a Read Access Token at [themoviedb.org/settings/api](https://www.themoviedb.org/settings/api). Use the **API Read Access Token** (the long Bearer token), not the short API key.

2. Install dependencies:

```bash
npm install
```

3. Start the dev server:

```bash
npm run dev
```

## Notes

- Only movie credits are considered — TV appearances are excluded
- The intersection is computed entirely client-side; no results are cached between sessions
- Actors who appear in both a Cage film and a Reeves film via separate movies are included, even if those films share no other connection

# Caged with Reeves

Search for any two actors and find everyone who has appeared in a film with both — not necessarily in the same movie, but at least once with each. Pre-loaded with Nicolas Cage and Keanu Reeves.

## How it works

1. Search for any two actors using the autocomplete inputs
2. Fetches all movie credits for both actors from the TMDB API
3. Collects every actor who appeared alongside each of them
4. Returns the intersection — actors who appear in both sets, sorted by popularity

## UI

- Search bar at the top with autocomplete for each actor — suggestions are sorted by popularity and include the actor's TMDB profile photo
- Pre-populated with Nicolas Cage and Keanu Reeves on load
- The same actor cannot be selected in both fields
- Matched actors are shown in a grid below, ordered by TMDB popularity
- Clicking an actor reveals which movies connect them to each star, with movies sorted alphabetically
- Clicking a movie title opens that movie's page on themoviedb.org
- If no overlap exists between the two actors, a message is shown

## Tech stack

- React (via Vite)
- TMDB API

## Setup

1. Clone the repo:

```bash
git clone https://github.com/ob-1000/caged-with-reeves.git
cd caged-with-reeves
```

2. Install dependencies:

```bash
npm install
```

3. Create a `.env` file at the project root. A `.env.example` is included as a template:

```
VITE_TMDB_API_KEY=your_bearer_token_here
```

You'll need a free TMDB account to generate a Read Access Token at [themoviedb.org/settings/api](https://www.themoviedb.org/settings/api). Use the **API Read Access Token** (the long Bearer token), not the short API key.

4. Start the dev server:

```bash
npm run dev
```

## TMDB endpoints used

| Endpoint | Purpose |
|---|---|
| `GET /search/person?query={name}` | Autocomplete actor search |
| `GET /person/{id}/movie_credits` | Get all movies an actor appeared in |
| `GET /movie/{id}/credits` | Get full cast of a specific film |

The intersection is computed client-side after fetching credits for both actors.

## Notes

- Only movies (not TV) are considered
- Requests are chunked and rate-limited to stay within TMDB's limits, with automatic retry on failure
- Results include the actor's profile photo, name, and the films connecting them to each star

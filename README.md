# Caged with Reeves

Find actors who have shared the screen with both Nicolas Cage and Keanu Reeves — not necessarily in the same film, but at least once with each.

## How it works

1. Fetches all movie credits for Nicolas Cage and Keanu Reeves from the TMDB API
2. Collects every actor who appeared alongside each of them
3. Returns the intersection — actors who appear in both sets, sorted by popularity

## UI

- Nicolas Cage and Keanu Reeves are displayed at the top of the page
- Matching actors are shown in a grid below, ordered by TMDB popularity
- Hovering or clicking an actor reveals which movies connect them to each star, and which star they connect through
- Clicking a movie title opens that movie's page on themoviedb.org

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
| `GET /search/person?query=Nicolas+Cage` | Resolve actor name → person ID |
| `GET /person/{id}/movie_credits` | Get all movies an actor appeared in |
| `GET /movie/{id}/credits` | Get full cast of a specific film |

The intersection is computed client-side after fetching credits for both actors.

## Notes

- Only movies (not TV) are considered
- TMDB rate limits unauthenticated requests; the app uses an API key to stay within limits
- Results include the actor's profile photo, name, and a sample of the films connecting them to each star

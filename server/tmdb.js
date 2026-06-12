// Server-side TMDB API client
// Why: Identical logic to the old src/api/tmdb.js, but runs in Node so the API key
//      is read from process.env.TMDB_API_KEY instead of the browser's import.meta.env.
//      Keeping the key here means it is never bundled into the client JS.
// Note: Requires Node 18+ for native fetch support.

const BASE_URL = 'https://api.themoviedb.org/3'

const headers = {
  Authorization: `Bearer ${process.env.TMDB_API_KEY}`,
}

/**
 * Low-level HTTP wrapper with exponential backoff for TMDB rate-limit responses.
 * Why: TMDB returns 429 when too many requests hit too quickly. All higher-level
 *      functions go through here so rate-limit handling is in one place.
 *
 * @param {string} path    - TMDB API path, e.g. '/search/person?query=Nicolas+Cage'
 * @param {number} [attempt=0] - retry counter, passed recursively — callers omit this
 * @returns {Promise<object>} parsed JSON response body
 * @throws after 6 failed retries, or on any non-2xx status that isn't 429
 */
async function tmdbFetch(path, attempt = 0) {
  const res = await fetch(`${BASE_URL}${path}`, { headers })
  if (res.status === 429) {
    if (attempt >= 6) throw new Error(`TMDB rate limit exceeded after retries: ${path}`)
    const retryAfter = res.headers.get('Retry-After')
    const delay = retryAfter ? parseInt(retryAfter) * 1000 : Math.pow(2, attempt) * 1000
    await new Promise(r => setTimeout(r, delay))
    return tmdbFetch(path, attempt + 1)
  }
  if (!res.ok) throw new Error(`TMDB ${res.status}: ${path}`)
  return res.json()
}

/**
 * Resolves an actor's display name to their TMDB person record.
 * Why: every other function works with numeric IDs — this turns a name into the
 *      ID and profile image path we need downstream.
 *
 * @param {string} name - actor name to search, e.g. 'Nicolas Cage'
 * @returns {Promise<{ id: number, name: string, profile_path: string|null }>}
 * @throws if TMDB returns no results for the name
 */
async function getPerson(name) {
  const data = await tmdbFetch(`/search/person?query=${encodeURIComponent(name)}`)
  const p = data.results?.[0]
  if (!p) throw new Error(`No TMDB results for "${name}"`)
  return { id: p.id, name: p.name, profile_path: p.profile_path }
}

/**
 * Fetches every movie a person has a cast credit for.
 * Why: first step in building the co-star map — we need the full filmography
 *      before we can look up individual cast lists.
 *
 * @param {number} personId - TMDB person ID
 * @returns {Promise<Array<{ id: number, title: string, poster_path: string|null }>>}
 */
async function getMovieCredits(personId) {
  const data = await tmdbFetch(`/person/${personId}/movie_credits`)
  return data.cast.map(m => ({ id: m.id, title: m.title, poster_path: m.poster_path }))
}

/**
 * Fetches the full cast list for a single movie.
 * Why: called in parallel for each movie in a chunk; results are merged into
 *      the co-star Map by buildCoStarSet.
 *
 * @param {number} movieId - TMDB movie ID
 * @returns {Promise<Array<object>>} raw TMDB cast entries (id, name, profile_path, popularity, …)
 */
async function getMovieCast(movieId) {
  const data = await tmdbFetch(`/movie/${movieId}/credits`)
  return data.cast ?? []
}

/**
 * Builds a Map of every co-star for a given person, batching movie-cast requests
 * to stay within TMDB rate limits.
 * Why: a single star may have 100+ movies — fetching all casts at once would trigger
 *      rate limiting. Chunking with delays keeps us under the threshold. The onProgress
 *      callback lets the SSE endpoint relay status to the browser in real time.
 *
 * @param {number} personId   - TMDB person ID for the star being processed
 * @param {string} personName - display name used in progress messages
 * @param {(message: string) => void} [onProgress]
 *   called after each chunk with a status string like
 *   "Searching Nicolas Cage's films... (3 of 18)"
 * @returns {Promise<Map<number, {
 *   id: number,
 *   name: string,
 *   profile_path: string|null,
 *   popularity: number,
 *   movies: Array<{ id: number, title: string, poster_path: string|null }>
 * }>>}
 *   Map keyed by TMDB actor ID; movies[] lists films that actor shared with personId
 */
async function buildCoStarSet(personId, personName, onProgress) {
  const movies = await getMovieCredits(personId)
  const CHUNK_SIZE = 6
  const CHUNK_DELAY = 550
  const totalChunks = Math.ceil(movies.length / CHUNK_SIZE)
  const allCasts = []

  for (let i = 0; i < movies.length; i += CHUNK_SIZE) {
    const chunk = movies.slice(i, i + CHUNK_SIZE)
    const chunkNum = Math.floor(i / CHUNK_SIZE) + 1
    const results = await Promise.all(
      chunk.map(movie => getMovieCast(movie.id).then(cast => ({ movie, cast })))
    )
    allCasts.push(...results)
    if (onProgress) onProgress(`Searching ${personName}'s films... (${chunkNum} of ${totalChunks})`)
    if (i + CHUNK_SIZE < movies.length) await new Promise(r => setTimeout(r, CHUNK_DELAY))
  }

  const coStars = new Map()
  for (const { movie, cast } of allCasts) {
    for (const actor of cast) {
      if (actor.id === personId) continue
      if (coStars.has(actor.id)) {
        coStars.get(actor.id).movies.push({ id: movie.id, title: movie.title, poster_path: movie.poster_path })
      } else {
        coStars.set(actor.id, {
          id: actor.id,
          name: actor.name,
          profile_path: actor.profile_path,
          popularity: actor.popularity,
          movies: [{ id: movie.id, title: movie.title, poster_path: movie.poster_path }],
        })
      }
    }
  }
  return coStars
}

/**
 * Top-level orchestrator — finds every actor who has co-starred with both
 * Nicolas Cage and Keanu Reeves (not necessarily in the same film).
 * Why: this is the only function the server route calls; it wires together all
 *      the helpers and returns the data shape the client expects.
 *
 * @param {(message: string) => void} [onProgress]
 *   forwarded to both buildCoStarSet calls so progress from both stars surfaces
 * @returns {Promise<{
 *   cage:   { id: number, name: string, profile_path: string|null },
 *   reeves: { id: number, name: string, profile_path: string|null },
 *   actors: Array<{
 *     id: number,
 *     name: string,
 *     profile_path: string|null,
 *     popularity: number,
 *     cageMovies:   Array<{ id: number, title: string, poster_path: string|null }>,
 *     reevesMovies: Array<{ id: number, title: string, poster_path: string|null }>
 *   }>
 * }>}
 */
export async function findSharedActors(onProgress) {
  const [cage, reeves] = await Promise.all([
    getPerson('Nicolas Cage'),
    getPerson('Keanu Reeves'),
  ])

  const [cageCoStars, reevesCoStars] = await Promise.all([
    buildCoStarSet(cage.id, cage.name, onProgress),
    buildCoStarSet(reeves.id, reeves.name, onProgress),
  ])

  const shared = []
  for (const [id, actor] of cageCoStars) {
    if (id === reeves.id) continue
    if (!reevesCoStars.has(id)) continue
    shared.push({
      id: actor.id,
      name: actor.name,
      profile_path: actor.profile_path,
      popularity: actor.popularity,
      cageMovies: actor.movies,
      reevesMovies: reevesCoStars.get(id).movies,
    })
  }

  return {
    cage,
    reeves,
    actors: shared.sort((a, b) => b.popularity - a.popularity),
  }
}

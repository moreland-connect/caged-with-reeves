// Requires Node 18+ for native fetch
const BASE_URL = 'https://api.themoviedb.org/3'

const headers = {
  Authorization: `Bearer ${process.env.TMDB_API_KEY}`,
}

// attempt is passed recursively — callers omit it
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

export async function getPersonById(id) {
  const p = await tmdbFetch(`/person/${id}`)
  return { id: p.id, name: p.name, profile_path: p.profile_path }
}

function nameMatchesQuery(name, query) {
  const nameLower = name.toLowerCase()
  const q = query.trim().toLowerCase()
  // Full name starts with the query (handles "Brad Pitt" → "Brad Pitt")
  if (nameLower.startsWith(q)) return true
  // Every word in the query matches the start of some word in the name
  const queryWords = q.split(/\s+/)
  const nameWords = nameLower.split(/\s+/)
  return queryWords.every(qw => nameWords.some(nw => nw.startsWith(qw)))
}

export async function searchPersons(query) {
  const data = await tmdbFetch(`/search/person?query=${encodeURIComponent(query)}`)
  return data.results
    .filter(p => nameMatchesQuery(p.name, query))
    .sort((a, b) => b.popularity - a.popularity)
    .slice(0, 5)
    .map(p => ({ id: p.id, name: p.name, profile_path: p.profile_path }))
}

async function getMovieCredits(personId) {
  const data = await tmdbFetch(`/person/${personId}/movie_credits`)
  return data.cast.map(m => ({ id: m.id, title: m.title, poster_path: m.poster_path }))
}

async function getMovieCast(movieId) {
  const data = await tmdbFetch(`/movie/${movieId}/credits`)
  return data.cast ?? []
}

// Fetches cast for every movie in chunks to avoid hitting TMDB rate limits
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

export async function findSharedActors(star1Id, star2Id, onProgress) {
  const [star1, star2] = await Promise.all([
    getPersonById(star1Id),
    getPersonById(star2Id),
  ])

  const [star1CoStars, star2CoStars] = await Promise.all([
    buildCoStarSet(star1.id, star1.name, onProgress),
    buildCoStarSet(star2.id, star2.name, onProgress),
  ])

  const shared = []
  for (const [id, actor] of star1CoStars) {
    if (id === star2.id) continue
    if (!star2CoStars.has(id)) continue
    shared.push({
      id: actor.id,
      name: actor.name,
      profile_path: actor.profile_path,
      popularity: actor.popularity,
      star1Movies: actor.movies,
      star2Movies: star2CoStars.get(id).movies,
    })
  }

  return {
    star1,
    star2,
    actors: shared.sort((a, b) => b.popularity - a.popularity),
  }
}

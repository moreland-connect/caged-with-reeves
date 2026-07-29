import { describe, it, expect, vi, afterEach } from 'vitest'
import { nameMatchesQuery, buildCoStarSet, findSharedActors } from './tmdb.js'

const BASE_URL = 'https://api.themoviedb.org/3'

// Maps exact TMDB paths (e.g. "/person/100/movie_credits") to the JSON body to return
function mockFetchRoutes(routes) {
  vi.stubGlobal('fetch', vi.fn(async (url) => {
    const path = url.replace(BASE_URL, '')
    if (!(path in routes)) throw new Error(`Unhandled fetch in test: ${path}`)
    return { ok: true, json: async () => routes[path] }
  }))
}

afterEach(() => {
  vi.unstubAllGlobals()
  vi.useRealTimers()
})

describe('nameMatchesQuery', () => {
  it('matches when the full name starts with the query', () => {
    expect(nameMatchesQuery('Brad Pitt', 'brad p')).toBe(true)
  })

  it('is case-insensitive', () => {
    expect(nameMatchesQuery('Nicolas Cage', 'NICOLAS')).toBe(true)
  })

  it('matches query words against name words out of order', () => {
    expect(nameMatchesQuery('Keanu Reeves', 'reeves ke')).toBe(true)
  })

  it('does not match a substring that is not a word prefix', () => {
    expect(nameMatchesQuery('Brad Pitt', 'itt')).toBe(false)
  })

  it('treats an empty or whitespace-only query as matching anything', () => {
    expect(nameMatchesQuery('Tom Hanks', '   ')).toBe(true)
  })

  it('requires every query word to match some name word', () => {
    expect(nameMatchesQuery('Tom Hanks', 'tom xyz')).toBe(false)
  })

  it('does not match a query word longer than any name word', () => {
    expect(nameMatchesQuery('Al Pacino', 'alexander')).toBe(false)
  })
})

describe('buildCoStarSet', () => {
  const STAR1 = { id: 100, name: 'Star One' }
  const COSTAR_X = { id: 300, name: 'Costar X', profile_path: null, popularity: 5 }
  const COSTAR_Y = { id: 400, name: 'Costar Y', profile_path: null, popularity: 8 }

  it('excludes the person from their own co-star set', async () => {
    mockFetchRoutes({
      '/person/100/movie_credits': { cast: [{ id: 1, title: 'Movie One', poster_path: null }] },
      '/movie/1/credits': { cast: [STAR1, COSTAR_X] },
    })

    const coStars = await buildCoStarSet(100, 'Star One', vi.fn())

    expect(coStars.has(100)).toBe(false)
    expect(coStars.get(300)).toMatchObject({ id: 300, name: 'Costar X' })
  })

  it('accumulates every shared movie for the same co-star', async () => {
    mockFetchRoutes({
      '/person/100/movie_credits': { cast: [
        { id: 1, title: 'Movie One', poster_path: null },
        { id: 2, title: 'Movie Two', poster_path: null },
      ] },
      '/movie/1/credits': { cast: [STAR1, COSTAR_Y] },
      '/movie/2/credits': { cast: [STAR1, COSTAR_Y] },
    })

    const coStars = await buildCoStarSet(100, 'Star One', vi.fn())

    expect(coStars.get(400).movies).toEqual([
      { id: 1, title: 'Movie One', poster_path: null },
      { id: 2, title: 'Movie Two', poster_path: null },
    ])
  })

  it('processes movies in chunks of 6 and reports progress once per chunk', async () => {
    vi.useFakeTimers()
    const movies = Array.from({ length: 7 }, (_, i) => ({ id: i + 1, title: `Movie ${i + 1}`, poster_path: null }))
    const routes = { '/person/100/movie_credits': { cast: movies } }
    movies.forEach(m => { routes[`/movie/${m.id}/credits`] = { cast: [STAR1] } })
    mockFetchRoutes(routes)

    const onProgress = vi.fn()
    const resultPromise = buildCoStarSet(100, 'Star One', onProgress)
    await vi.runAllTimersAsync()
    await resultPromise

    expect(onProgress).toHaveBeenNthCalledWith(1, "Searching Star One's films... (1 of 2)")
    expect(onProgress).toHaveBeenNthCalledWith(2, "Searching Star One's films... (2 of 2)")
  })
})

describe('findSharedActors', () => {
  const STAR1 = { id: 100, name: 'Star One', profile_path: null }
  const STAR2 = { id: 200, name: 'Star Two', profile_path: null }
  const COSTAR_X = { id: 300, name: 'Costar X', profile_path: null, popularity: 5 }
  const COSTAR_Y = { id: 400, name: 'Costar Y', profile_path: null, popularity: 8 }
  const COSTAR_Z = { id: 500, name: 'Costar Z', profile_path: null, popularity: 3 }

  it('returns only actors shared between both stars, excluding the stars themselves', async () => {
    mockFetchRoutes({
      '/person/100': STAR1,
      '/person/200': STAR2,
      '/person/100/movie_credits': { cast: [
        { id: 1, title: 'Movie One', poster_path: null },
        { id: 2, title: 'Movie Two', poster_path: null },
      ] },
      '/person/200/movie_credits': { cast: [
        { id: 2, title: 'Movie Two', poster_path: null },
        { id: 3, title: 'Movie Three', poster_path: null },
      ] },
      '/movie/1/credits': { cast: [STAR1, COSTAR_X] },
      '/movie/2/credits': { cast: [STAR1, STAR2, COSTAR_Y] },
      '/movie/3/credits': { cast: [STAR2, COSTAR_Z] },
    })

    const result = await findSharedActors(100, 200, vi.fn())

    expect(result.actors).toHaveLength(1)
    expect(result.actors[0]).toMatchObject({
      id: 400,
      star1Movies: [{ id: 2, title: 'Movie Two', poster_path: null }],
      star2Movies: [{ id: 2, title: 'Movie Two', poster_path: null }],
    })
  })

  it('excludes each star from counting as the other star\'s shared co-star', async () => {
    // Star2 physically co-starred with Star1 in Movie Two, which would otherwise
    // land Star2 in Star1's raw co-star map — findSharedActors must filter that out.
    mockFetchRoutes({
      '/person/100': STAR1,
      '/person/200': STAR2,
      '/person/100/movie_credits': { cast: [{ id: 2, title: 'Movie Two', poster_path: null }] },
      '/person/200/movie_credits': { cast: [{ id: 2, title: 'Movie Two', poster_path: null }] },
      '/movie/2/credits': { cast: [STAR1, STAR2] },
    })

    const result = await findSharedActors(100, 200, vi.fn())

    expect(result.actors).toEqual([])
  })

  it('sorts shared actors by popularity, descending', async () => {
    const LOW = { id: 600, name: 'Low Pop', profile_path: null, popularity: 1 }
    const HIGH = { id: 700, name: 'High Pop', profile_path: null, popularity: 50 }
    mockFetchRoutes({
      '/person/100': STAR1,
      '/person/200': STAR2,
      '/person/100/movie_credits': { cast: [{ id: 4, title: 'Movie Four', poster_path: null }] },
      '/person/200/movie_credits': { cast: [{ id: 4, title: 'Movie Four', poster_path: null }] },
      '/movie/4/credits': { cast: [STAR1, STAR2, LOW, HIGH] },
    })

    const result = await findSharedActors(100, 200, vi.fn())

    expect(result.actors.map(a => a.id)).toEqual([700, 600])
  })

  it('returns no actors when the two stars have no co-stars in common', async () => {
    mockFetchRoutes({
      '/person/100': STAR1,
      '/person/200': STAR2,
      '/person/100/movie_credits': { cast: [{ id: 1, title: 'Movie One', poster_path: null }] },
      '/person/200/movie_credits': { cast: [{ id: 3, title: 'Movie Three', poster_path: null }] },
      '/movie/1/credits': { cast: [STAR1, COSTAR_X] },
      '/movie/3/credits': { cast: [STAR2, COSTAR_Z] },
    })

    const result = await findSharedActors(100, 200, vi.fn())

    expect(result.actors).toEqual([])
  })
})

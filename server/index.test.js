import { describe, it, expect, vi, beforeEach } from 'vitest'
import request from 'supertest'

vi.hoisted(() => {
  process.env.SESSION_SECRET = 'test-secret'
})

vi.mock('./tmdb.js', () => ({
  searchPersons: vi.fn(),
  getPersonById: vi.fn(),
  findSharedActors: vi.fn(),
}))

vi.mock('./auth.js', async () => {
  const actual = await vi.importActual('./auth.js')
  return {
    ...actual,
    verifyCredentials: vi.fn(),
    createUser: vi.fn(),
    getFavorites: vi.fn(),
    addFavorite: vi.fn(),
    removeFavorite: vi.fn(),
  }
})

import app from './index.js'
import { searchPersons, getPersonById, findSharedActors } from './tmdb.js'
import { verifyCredentials, createUser, getFavorites, addFavorite, removeFavorite } from './auth.js'

beforeEach(() => {
  vi.clearAllMocks()
})

// Returns a supertest agent that persists the session cookie across requests
async function loginAgent() {
  verifyCredentials.mockReturnValue(true)
  const agent = request.agent(app)
  await agent.post('/api/login').send({ username: 'liam', password: 'correct-password' })
  return agent
}

describe('POST /api/login', () => {
  it('sets a session and returns the username on valid credentials', async () => {
    verifyCredentials.mockReturnValue(true)
    const res = await request(app).post('/api/login').send({ username: 'liam', password: 'correct-password' })
    expect(res.status).toBe(200)
    expect(res.body).toEqual({ username: 'liam' })
    expect(verifyCredentials).toHaveBeenCalledWith('liam', 'correct-password')
  })

  it('returns 401 on invalid credentials', async () => {
    verifyCredentials.mockReturnValue(false)
    const res = await request(app).post('/api/login').send({ username: 'liam', password: 'wrong' })
    expect(res.status).toBe(401)
    expect(res.body).toEqual({ error: 'Invalid username or password' })
  })
})

describe('POST /api/signup', () => {
  it('returns 400 when username or password is missing', async () => {
    const res = await request(app).post('/api/signup').send({ username: '', password: 'secret' })
    expect(res.status).toBe(400)
    expect(createUser).not.toHaveBeenCalled()
  })

  it('returns 400 when the password has no special character', async () => {
    const res = await request(app).post('/api/signup').send({ username: 'newuser', password: 'secretpw' })
    expect(res.status).toBe(400)
    expect(createUser).not.toHaveBeenCalled()
  })

  it('creates the user, starts a session, and returns the username', async () => {
    createUser.mockImplementation(() => {})
    const res = await request(app).post('/api/signup').send({ username: 'newuser', password: 'secret!' })
    expect(res.status).toBe(200)
    expect(res.body).toEqual({ username: 'newuser' })
    expect(createUser).toHaveBeenCalledWith('newuser', 'secret!')
  })

  it('logs the new user in immediately', async () => {
    createUser.mockImplementation(() => {})
    const agent = request.agent(app)
    await agent.post('/api/signup').send({ username: 'newuser', password: 'secret!' })
    const res = await agent.get('/api/session')
    expect(res.body).toEqual({ authenticated: true, username: 'newuser' })
  })

  it('returns 409 when the username already exists', async () => {
    createUser.mockImplementation(() => { throw new Error('Username already exists') })
    const res = await request(app).post('/api/signup').send({ username: 'liam', password: 'secret!' })
    expect(res.status).toBe(409)
    expect(res.body).toEqual({ error: 'Username already exists' })
  })
})

describe('POST /api/logout', () => {
  it('clears the session', async () => {
    const agent = await loginAgent()
    const logoutRes = await agent.post('/api/logout')
    expect(logoutRes.status).toBe(200)

    const sessionRes = await agent.get('/api/session')
    expect(sessionRes.body).toEqual({ authenticated: false, username: null })
  })
})

describe('GET /api/session', () => {
  it('reports unauthenticated with no session', async () => {
    const res = await request(app).get('/api/session')
    expect(res.body).toEqual({ authenticated: false, username: null })
  })

  it('reports the logged-in username after login', async () => {
    const agent = await loginAgent()
    const res = await agent.get('/api/session')
    expect(res.body).toEqual({ authenticated: true, username: 'liam' })
  })
})

describe('GET /api/search-person', () => {
  it('returns 401 without a session', async () => {
    const res = await request(app).get('/api/search-person').query({ query: 'cage' })
    expect(res.status).toBe(401)
    expect(searchPersons).not.toHaveBeenCalled()
  })

  it('returns an empty array without calling TMDB for a blank query', async () => {
    const agent = await loginAgent()
    const res = await agent.get('/api/search-person').query({ query: '   ' })
    expect(res.status).toBe(200)
    expect(res.body).toEqual([])
    expect(searchPersons).not.toHaveBeenCalled()
  })

  it('returns search results for a valid query', async () => {
    const agent = await loginAgent()
    searchPersons.mockResolvedValue([{ id: 2963, name: 'Nicolas Cage', profile_path: null }])
    const res = await agent.get('/api/search-person').query({ query: 'cage' })
    expect(res.status).toBe(200)
    expect(res.body).toEqual([{ id: 2963, name: 'Nicolas Cage', profile_path: null }])
    expect(searchPersons).toHaveBeenCalledWith('cage')
  })

  it('returns 500 with the error message when the lookup fails', async () => {
    const agent = await loginAgent()
    searchPersons.mockRejectedValue(new Error('TMDB 500: /search/person'))
    const res = await agent.get('/api/search-person').query({ query: 'cage' })
    expect(res.status).toBe(500)
    expect(res.body).toEqual({ error: 'TMDB 500: /search/person' })
  })
})

describe('GET /api/person/:id', () => {
  it('returns 401 without a session', async () => {
    const res = await request(app).get('/api/person/2963')
    expect(res.status).toBe(401)
    expect(getPersonById).not.toHaveBeenCalled()
  })

  it('returns the person on success', async () => {
    const agent = await loginAgent()
    getPersonById.mockResolvedValue({ id: 2963, name: 'Nicolas Cage', profile_path: null })
    const res = await agent.get('/api/person/2963')
    expect(res.status).toBe(200)
    expect(res.body).toEqual({ id: 2963, name: 'Nicolas Cage', profile_path: null })
    expect(getPersonById).toHaveBeenCalledWith(2963)
  })

  it('returns 404 with the error message when the lookup fails', async () => {
    const agent = await loginAgent()
    getPersonById.mockRejectedValue(new Error('TMDB 404: /person/999999'))
    const res = await agent.get('/api/person/999999')
    expect(res.status).toBe(404)
    expect(res.body).toEqual({ error: 'TMDB 404: /person/999999' })
  })
})

describe('GET /api/shared-actors', () => {
  it('returns 401 without a session', async () => {
    const res = await request(app).get('/api/shared-actors').query({ star1Id: '2963', star2Id: '6384' })
    expect(res.status).toBe(401)
    expect(findSharedActors).not.toHaveBeenCalled()
  })

  it('returns 400 when a star id is missing', async () => {
    const agent = await loginAgent()
    const res = await agent.get('/api/shared-actors').query({ star1Id: '1' })
    expect(res.status).toBe(400)
    expect(res.body).toEqual({ error: 'star1Id and star2Id are required' })
    expect(findSharedActors).not.toHaveBeenCalled()
  })

  it('streams progress events followed by a result event over SSE', async () => {
    const agent = await loginAgent()
    findSharedActors.mockImplementation(async (star1Id, star2Id, onProgress) => {
      onProgress("Searching Nicolas Cage's films... (1 of 1)")
      return { star1: { id: star1Id }, star2: { id: star2Id }, actors: [] }
    })

    const res = await agent.get('/api/shared-actors').query({ star1Id: '2963', star2Id: '6384' })

    expect(res.status).toBe(200)
    expect(res.headers['content-type']).toContain('text/event-stream')
    expect(findSharedActors).toHaveBeenCalledWith(2963, 6384, expect.any(Function))
    expect(res.text).toContain('"type":"progress"')
    expect(res.text).toContain('"type":"result"')
  })

  it('streams an error event when the computation fails', async () => {
    const agent = await loginAgent()
    findSharedActors.mockRejectedValue(new Error('TMDB rate limit exceeded after retries'))

    const res = await agent.get('/api/shared-actors').query({ star1Id: '2963', star2Id: '6384' })

    expect(res.status).toBe(200)
    expect(res.text).toContain('"type":"error"')
    expect(res.text).toContain('TMDB rate limit exceeded after retries')
  })
})

describe('GET /api/favorites', () => {
  it('returns 401 without a session', async () => {
    const res = await request(app).get('/api/favorites')
    expect(res.status).toBe(401)
    expect(getFavorites).not.toHaveBeenCalled()
  })

  it("returns the logged-in user's favorites", async () => {
    const agent = await loginAgent()
    getFavorites.mockReturnValue([{ star1Id: 2963, star2Id: 6384 }])
    const res = await agent.get('/api/favorites')
    expect(res.status).toBe(200)
    expect(res.body).toEqual({ favorites: [{ star1Id: 2963, star2Id: 6384 }] })
    expect(getFavorites).toHaveBeenCalledWith('liam')
  })
})

describe('POST /api/favorites', () => {
  it('returns 401 without a session', async () => {
    const res = await request(app).post('/api/favorites').send({ star1Id: 2963, star2Id: 6384 })
    expect(res.status).toBe(401)
    expect(addFavorite).not.toHaveBeenCalled()
  })

  it('returns 400 when the two ids are the same', async () => {
    const agent = await loginAgent()
    const res = await agent.post('/api/favorites').send({ star1Id: 2963, star2Id: 2963 })
    expect(res.status).toBe(400)
    expect(addFavorite).not.toHaveBeenCalled()
  })

  it('adds and returns the updated favorites list', async () => {
    const agent = await loginAgent()
    addFavorite.mockReturnValue([{ star1Id: 2963, star2Id: 6384 }])
    const res = await agent.post('/api/favorites').send({ star1Id: 2963, star2Id: 6384 })
    expect(res.status).toBe(200)
    expect(res.body).toEqual({ favorites: [{ star1Id: 2963, star2Id: 6384 }] })
    expect(addFavorite).toHaveBeenCalledWith('liam', 2963, 6384)
  })
})

describe('DELETE /api/favorites', () => {
  it('returns 401 without a session', async () => {
    const res = await request(app).delete('/api/favorites').query({ star1Id: '2963', star2Id: '6384' })
    expect(res.status).toBe(401)
    expect(removeFavorite).not.toHaveBeenCalled()
  })

  it('returns 400 when a star id is missing', async () => {
    const agent = await loginAgent()
    const res = await agent.delete('/api/favorites').query({ star1Id: '2963' })
    expect(res.status).toBe(400)
    expect(removeFavorite).not.toHaveBeenCalled()
  })

  it('removes and returns the updated favorites list', async () => {
    const agent = await loginAgent()
    removeFavorite.mockReturnValue([])
    const res = await agent.delete('/api/favorites').query({ star1Id: '2963', star2Id: '6384' })
    expect(res.status).toBe(200)
    expect(res.body).toEqual({ favorites: [] })
    expect(removeFavorite).toHaveBeenCalledWith('liam', 2963, 6384)
  })
})

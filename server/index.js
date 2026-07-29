import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import session from 'express-session'
import path from 'path'
import { fileURLToPath } from 'url'
import { findSharedActors, searchPersons, getPersonById } from './tmdb.js'
import { verifyCredentials, createUser, getFavorites, addFavorite, removeFavorite, requireAuth } from './auth.js'

// ESM has no __dirname
const __dirname = path.dirname(fileURLToPath(import.meta.url))

const app = express()

app.use(cors())
app.use(express.json())
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: { httpOnly: true, sameSite: 'lax' },
}))

app.post('/api/login', (req, res) => {
  const { username, password } = req.body
  if (!verifyCredentials(username, password)) {
    return res.status(401).json({ error: 'Invalid username or password' })
  }
  req.session.regenerate((err) => {
    if (err) return res.status(500).json({ error: 'Login failed' })
    req.session.user = username
    res.json({ username })
  })
})

app.post('/api/signup', (req, res) => {
  const { username, password } = req.body
  if (!username?.trim() || !password) {
    return res.status(400).json({ error: 'Username and password are required' })
  }
  try {
    createUser(username, password)
  } catch (err) {
    return res.status(409).json({ error: err.message })
  }
  req.session.regenerate((err) => {
    if (err) return res.status(500).json({ error: 'Signup failed' })
    req.session.user = username
    res.json({ username })
  })
})

app.post('/api/logout', (req, res) => {
  req.session.destroy(() => res.json({ ok: true }))
})

app.get('/api/session', (req, res) => {
  res.json({ authenticated: !!req.session?.user, username: req.session?.user ?? null })
})

app.get('/api/search-person', requireAuth, async (req, res) => {
  const { query } = req.query
  if (!query?.trim()) return res.json([])
  try {
    res.json(await searchPersons(query))
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

app.get('/api/person/:id', requireAuth, async (req, res) => {
  try {
    res.json(await getPersonById(Number(req.params.id)))
  } catch (err) {
    res.status(404).json({ error: err.message })
  }
})

// SSE so the client receives progress messages during the 30–60s computation
app.get('/api/shared-actors', requireAuth, async (req, res) => {
  const { star1Id, star2Id } = req.query
  if (!star1Id || !star2Id) return res.status(400).json({ error: 'star1Id and star2Id are required' })

  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('Connection', 'keep-alive')
  res.flushHeaders()

  const send = (obj) => res.write(`data: ${JSON.stringify(obj)}\n\n`)

  try {
    const data = await findSharedActors(Number(star1Id), Number(star2Id), (message) => send({ type: 'progress', message }))
    send({ type: 'result', data })
  } catch (err) {
    send({ type: 'error', message: err.message })
  } finally {
    res.end()
  }
})

app.get('/api/favorites', requireAuth, (req, res) => {
  res.json({ favorites: getFavorites(req.session.user) })
})

app.post('/api/favorites', requireAuth, (req, res) => {
  const star1Id = Number(req.body.star1Id)
  const star2Id = Number(req.body.star2Id)
  if (!star1Id || !star2Id || star1Id === star2Id) {
    return res.status(400).json({ error: 'star1Id and star2Id are required and must be different' })
  }
  res.json({ favorites: addFavorite(req.session.user, star1Id, star2Id) })
})

app.delete('/api/favorites', requireAuth, (req, res) => {
  const star1Id = Number(req.query.star1Id)
  const star2Id = Number(req.query.star2Id)
  if (!star1Id || !star2Id) {
    return res.status(400).json({ error: 'star1Id and star2Id are required' })
  }
  res.json({ favorites: removeFavorite(req.session.user, star1Id, star2Id) })
})

if (process.env.NODE_ENV === 'production') {
  const dist = path.join(__dirname, '..', 'dist')
  app.use(express.static(dist))
  // Catch-all so client-side routes work on hard refresh
  app.get('*', (req, res) => res.sendFile(path.join(dist, 'index.html')))
}

const PORT = process.env.PORT || 3001

// Vitest sets NODE_ENV=test automatically; skip binding a real port when imported for tests
if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => console.log(`Server running at http://localhost:${PORT}`))
}

export default app

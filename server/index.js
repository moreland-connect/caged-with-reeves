import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import path from 'path'
import { fileURLToPath } from 'url'
import { findSharedActors, searchPersons, getPersonById } from './tmdb.js'

// ESM has no __dirname
const __dirname = path.dirname(fileURLToPath(import.meta.url))

const app = express()

app.use(cors())
app.use(express.json())

app.get('/api/search-person', async (req, res) => {
  const { query } = req.query
  if (!query?.trim()) return res.json([])
  try {
    res.json(await searchPersons(query))
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

app.get('/api/person/:id', async (req, res) => {
  try {
    res.json(await getPersonById(Number(req.params.id)))
  } catch (err) {
    res.status(404).json({ error: err.message })
  }
})

// SSE so the client receives progress messages during the 30–60s computation
app.get('/api/shared-actors', async (req, res) => {
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

if (process.env.NODE_ENV === 'production') {
  const dist = path.join(__dirname, '..', 'dist')
  app.use(express.static(dist))
  // Catch-all so client-side routes work on hard refresh
  app.get('*', (req, res) => res.sendFile(path.join(dist, 'index.html')))
}

const PORT = process.env.PORT || 3001

app.listen(PORT, () => console.log(`Server running at http://localhost:${PORT}`))

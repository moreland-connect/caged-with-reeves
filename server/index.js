// Server entry point
// Why: Moves the TMDB API key off the browser by proxying all TMDB calls through
//      this Express server. Also serves the built React app in production so a
//      single process handles everything.

import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import path from 'path'
import { fileURLToPath } from 'url'
import { findSharedActors } from './tmdb.js'

// ESM equivalent of __dirname
const __dirname = path.dirname(fileURLToPath(import.meta.url))

const app = express()

app.use(cors())
app.use(express.json())

/**
 * SSE endpoint — streams progress updates then the final actor list.
 *
 * Why SSE instead of a plain REST endpoint: the computation takes 30–60 seconds.
 * SSE lets us send the existing progress messages ("Searching Nicolas Cage's
 * films... (3 of 12)") to the client in real time so the loading UX is preserved.
 * The TMDB API key never leaves this server.
 *
 * Inputs:  none
 * Outputs: a stream of newline-delimited JSON events:
 *   { type: 'progress', message: string }  — after each chunk of movie-cast requests
 *   { type: 'result',   data: { cage, reeves, actors[] } }  — once processing is complete
 *   { type: 'error',    message: string }  — if findSharedActors throws
 */
app.get('/api/shared-actors', async (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('Connection', 'keep-alive')
  res.flushHeaders()

  const send = (obj) => res.write(`data: ${JSON.stringify(obj)}\n\n`)

  try {
    const data = await findSharedActors((message) => send({ type: 'progress', message }))
    send({ type: 'result', data })
  } catch (err) {
    send({ type: 'error', message: err.message })
  } finally {
    res.end()
  }
})

// Production: serve the compiled React app from dist/
// Why: in production there is only one process — Express handles the API routes
//      above and falls through to static files for everything else. The catch-all
//      route sends index.html so client-side routes work on a hard refresh.
// Inputs:  dist/ directory created by `npm run build`
// Outputs: static files for asset requests; index.html for all other GET routes
if (process.env.NODE_ENV === 'production') {
  const dist = path.join(__dirname, '..', 'dist')
  app.use(express.static(dist))
  app.get('*', (req, res) => res.sendFile(path.join(dist, 'index.html')))
}

const PORT = process.env.PORT || 3001

app.listen(PORT, () => console.log(`Server running at http://localhost:${PORT}`))

// Client-side API module
// Why: replaces the old direct TMDB calls with a thin SSE consumer. All the heavy
//      lifting now happens in server/tmdb.js so the API key never reaches the browser.
//      The exported function signature is identical to the old version — App.jsx is unchanged.

/**
 * Opens a Server-Sent Events connection to /api/shared-actors and streams
 * progress updates until the final result arrives.
 *
 * @param {(message: string) => void} [onProgress]
 *   called with each progress message the server sends during processing
 * @returns {Promise<{
 *   cage:   { id: number, name: string, profile_path: string|null },
 *   reeves: { id: number, name: string, profile_path: string|null },
 *   actors: Array<object>
 * }>}
 * @throws if the server sends an error event or the connection drops unexpectedly
 */
export function findSharedActors(onProgress) {
  return new Promise((resolve, reject) => {
    const es = new EventSource('/api/shared-actors')

    es.onmessage = (event) => {
      const msg = JSON.parse(event.data)
      if (msg.type === 'progress') {
        onProgress?.(msg.message)
      } else if (msg.type === 'result') {
        es.close()
        resolve(msg.data)
      } else if (msg.type === 'error') {
        es.close()
        reject(new Error(msg.message))
      }
    }

    es.onerror = () => {
      es.close()
      reject(new Error('Connection to server lost'))
    }
  })
}

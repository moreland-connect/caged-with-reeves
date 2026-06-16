export async function searchPersons(query) {
  if (!query?.trim()) return []
  const res = await fetch(`/api/search-person?query=${encodeURIComponent(query)}`)
  if (!res.ok) throw new Error('Search failed')
  return res.json()
}

export function findSharedActors(star1Id, star2Id, onProgress) {
  let es = null
  const promise = new Promise((resolve, reject) => {
    es = new EventSource(`/api/shared-actors?star1Id=${star1Id}&star2Id=${star2Id}`)

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

  return { promise, cancel: () => es?.close() }
}

import { describe, it, expect, vi, afterEach } from 'vitest'
import { searchPersons, findSharedActors } from './tmdb.js'

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('searchPersons', () => {
  it('returns [] for a blank query without calling fetch', async () => {
    vi.stubGlobal('fetch', vi.fn())
    const result = await searchPersons('   ')
    expect(result).toEqual([])
    expect(fetch).not.toHaveBeenCalled()
  })

  it('fetches and returns the parsed results on success', async () => {
    const data = [{ id: 2963, name: 'Nicolas Cage', profile_path: null }]
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => data }))
    const result = await searchPersons('cage')
    expect(result).toEqual(data)
    expect(fetch).toHaveBeenCalledWith('/api/search-person?query=cage')
  })

  it('URL-encodes the query', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => [] }))
    await searchPersons('a b')
    expect(fetch).toHaveBeenCalledWith('/api/search-person?query=a%20b')
  })

  it('throws when the response is not ok', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false }))
    await expect(searchPersons('cage')).rejects.toThrow('Search failed')
  })
})

describe('findSharedActors', () => {
  function stubEventSource() {
    const instances = []
    vi.stubGlobal('EventSource', class {
      constructor(url) {
        this.url = url
        this.onmessage = null
        this.onerror = null
        this.closed = false
        instances.push(this)
      }
      close() {
        this.closed = true
      }
    })
    return instances
  }

  function emit(es, data) {
    es.onmessage({ data: JSON.stringify(data) })
  }

  it('opens an EventSource pointed at the two star ids', () => {
    const instances = stubEventSource()
    findSharedActors(2963, 6384, vi.fn())
    expect(instances[0].url).toBe('/api/shared-actors?star1Id=2963&star2Id=6384')
  })

  it('forwards progress messages to onProgress without resolving or closing', () => {
    const instances = stubEventSource()
    const onProgress = vi.fn()
    findSharedActors(2963, 6384, onProgress)
    const es = instances[0]

    emit(es, { type: 'progress', message: "Searching Nicolas Cage's films... (1 of 3)" })

    expect(onProgress).toHaveBeenCalledWith("Searching Nicolas Cage's films... (1 of 3)")
    expect(es.closed).toBe(false)
  })

  it('resolves with the result data and closes the connection', async () => {
    const instances = stubEventSource()
    const { promise } = findSharedActors(2963, 6384, vi.fn())
    const es = instances[0]
    const data = { star1: { id: 2963 }, star2: { id: 6384 }, actors: [] }

    emit(es, { type: 'result', data })

    await expect(promise).resolves.toEqual(data)
    expect(es.closed).toBe(true)
  })

  it('rejects and closes the connection on a server-sent error', async () => {
    const instances = stubEventSource()
    const { promise } = findSharedActors(2963, 6384, vi.fn())
    const es = instances[0]

    emit(es, { type: 'error', message: 'TMDB rate limit exceeded after retries' })

    await expect(promise).rejects.toThrow('TMDB rate limit exceeded after retries')
    expect(es.closed).toBe(true)
  })

  it('rejects and closes the connection when the connection itself errors', async () => {
    const instances = stubEventSource()
    const { promise } = findSharedActors(2963, 6384, vi.fn())
    const es = instances[0]

    es.onerror()

    await expect(promise).rejects.toThrow('Connection to server lost')
    expect(es.closed).toBe(true)
  })

  it('cancel() closes the EventSource', () => {
    const instances = stubEventSource()
    const { cancel } = findSharedActors(2963, 6384, vi.fn())
    const es = instances[0]

    expect(es.closed).toBe(false)
    cancel()
    expect(es.closed).toBe(true)
  })
})

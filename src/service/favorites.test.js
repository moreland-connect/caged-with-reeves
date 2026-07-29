import { describe, it, expect, vi, afterEach } from 'vitest'
import { getFavorites, addFavorite, removeFavorite } from './favorites.js'

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('getFavorites', () => {
  it('returns the parsed favorites list on success', async () => {
    const data = { favorites: [{ star1Id: 2963, star2Id: 6384 }] }
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => data }))
    const result = await getFavorites()
    expect(result).toEqual(data)
    expect(fetch).toHaveBeenCalledWith('/api/favorites')
  })

  it('throws when the response is not ok', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false }))
    await expect(getFavorites()).rejects.toThrow('Failed to load favorites')
  })
})

describe('addFavorite', () => {
  it('POSTs the pair and returns the updated favorites list', async () => {
    const data = { favorites: [{ star1Id: 2963, star2Id: 6384 }] }
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => data }))
    const result = await addFavorite(2963, 6384)
    expect(result).toEqual(data)
    expect(fetch).toHaveBeenCalledWith('/api/favorites', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ star1Id: 2963, star2Id: 6384 }),
    })
  })

  it('throws when the response is not ok', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false }))
    await expect(addFavorite(2963, 6384)).rejects.toThrow('Failed to save favorite')
  })
})

describe('removeFavorite', () => {
  it('sends a DELETE request with the pair in the query string', async () => {
    const data = { favorites: [] }
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => data }))
    const result = await removeFavorite(2963, 6384)
    expect(result).toEqual(data)
    expect(fetch).toHaveBeenCalledWith('/api/favorites?star1Id=2963&star2Id=6384', { method: 'DELETE' })
  })

  it('throws when the response is not ok', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false }))
    await expect(removeFavorite(2963, 6384)).rejects.toThrow('Failed to remove favorite')
  })
})

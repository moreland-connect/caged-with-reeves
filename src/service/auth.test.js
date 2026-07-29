import { describe, it, expect, vi, afterEach } from 'vitest'
import { login, signup, logout, getSession } from './auth.js'

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('login', () => {
  it('posts credentials and returns the username on success', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => ({ username: 'liam' }) }))
    const result = await login('liam', 'secret')
    expect(result).toEqual({ username: 'liam' })
    expect(fetch).toHaveBeenCalledWith('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'liam', password: 'secret' }),
    })
  })

  it('throws the server error message on failure', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false,
      json: async () => ({ error: 'Invalid username or password' }),
    }))
    await expect(login('liam', 'wrong')).rejects.toThrow('Invalid username or password')
  })

  it('throws a generic message when the error body cannot be parsed', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false,
      json: async () => { throw new Error('bad json') },
    }))
    await expect(login('liam', 'wrong')).rejects.toThrow('Login failed')
  })
})

describe('signup', () => {
  it('posts credentials and returns the username on success', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => ({ username: 'newuser' }) }))
    const result = await signup('newuser', 'secret')
    expect(result).toEqual({ username: 'newuser' })
    expect(fetch).toHaveBeenCalledWith('/api/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'newuser', password: 'secret' }),
    })
  })

  it('throws the server error message on failure', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false,
      json: async () => ({ error: 'Username already exists' }),
    }))
    await expect(signup('liam', 'secret')).rejects.toThrow('Username already exists')
  })

  it('throws a generic message when the error body cannot be parsed', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false,
      json: async () => { throw new Error('bad json') },
    }))
    await expect(signup('liam', 'secret')).rejects.toThrow('Signup failed')
  })
})

describe('logout', () => {
  it('posts to the logout endpoint', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true }))
    await logout()
    expect(fetch).toHaveBeenCalledWith('/api/logout', { method: 'POST' })
  })
})

describe('getSession', () => {
  it('returns the parsed session on success', async () => {
    const data = { authenticated: true, username: 'liam' }
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => data }))
    const result = await getSession()
    expect(result).toEqual(data)
    expect(fetch).toHaveBeenCalledWith('/api/session')
  })

  it('throws when the response is not ok', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false }))
    await expect(getSession()).rejects.toThrow('Session check failed')
  })
})

import { describe, it, expect, vi, afterEach } from 'vitest'
import bcrypt from 'bcryptjs'

vi.mock('fs', () => ({
  readFileSync: vi.fn(),
  writeFileSync: vi.fn(),
}))

import { readFileSync, writeFileSync } from 'fs'
import { verifyCredentials, createUser, getFavorites, addFavorite, removeFavorite, requireAuth } from './auth.js'

const passwordHash = bcrypt.hashSync('correct-password', 10)

afterEach(() => {
  vi.clearAllMocks()
})

describe('verifyCredentials', () => {
  it('returns true for a known user with the correct password', () => {
    readFileSync.mockReturnValue(JSON.stringify([{ username: 'liam', passwordHash }]))
    expect(verifyCredentials('liam', 'correct-password')).toBe(true)
  })

  it('returns false for a known user with the wrong password', () => {
    readFileSync.mockReturnValue(JSON.stringify([{ username: 'liam', passwordHash }]))
    expect(verifyCredentials('liam', 'wrong-password')).toBe(false)
  })

  it('returns false for an unknown username', () => {
    readFileSync.mockReturnValue(JSON.stringify([{ username: 'liam', passwordHash }]))
    expect(verifyCredentials('someone-else', 'correct-password')).toBe(false)
  })
})

describe('createUser', () => {
  it('adds a new user with a bcrypt-hashed password', () => {
    readFileSync.mockReturnValue(JSON.stringify([{ username: 'liam', passwordHash }]))
    createUser('newuser', 'new-password')

    expect(writeFileSync).toHaveBeenCalledTimes(1)
    const savedUsers = JSON.parse(writeFileSync.mock.calls[0][1])
    expect(savedUsers).toHaveLength(2)
    const newUser = savedUsers.find(u => u.username === 'newuser')
    expect(bcrypt.compareSync('new-password', newUser.passwordHash)).toBe(true)
  })

  it('throws and does not write when the username already exists', () => {
    readFileSync.mockReturnValue(JSON.stringify([{ username: 'liam', passwordHash }]))
    expect(() => createUser('liam', 'whatever')).toThrow('Username already exists')
    expect(writeFileSync).not.toHaveBeenCalled()
  })
})

describe('getFavorites', () => {
  it('returns an empty array when the user has no favorites', () => {
    readFileSync.mockReturnValue(JSON.stringify([{ username: 'liam', passwordHash }]))
    expect(getFavorites('liam')).toEqual([])
  })

  it('returns the stored favorites', () => {
    readFileSync.mockReturnValue(JSON.stringify([
      { username: 'liam', passwordHash, favorites: [{ star1Id: 2963, star2Id: 6384 }] },
    ]))
    expect(getFavorites('liam')).toEqual([{ star1Id: 2963, star2Id: 6384 }])
  })
})

describe('addFavorite', () => {
  it('adds a favorite and returns the updated list', () => {
    readFileSync.mockReturnValue(JSON.stringify([{ username: 'liam', passwordHash }]))
    const result = addFavorite('liam', 2963, 6384)

    expect(result).toEqual([{ star1Id: 2963, star2Id: 6384 }])
    const savedUsers = JSON.parse(writeFileSync.mock.calls[0][1])
    expect(savedUsers.find(u => u.username === 'liam').favorites).toEqual([{ star1Id: 2963, star2Id: 6384 }])
  })

  it('appends to an existing list rather than replacing it', () => {
    readFileSync.mockReturnValue(JSON.stringify([
      { username: 'liam', passwordHash, favorites: [{ star1Id: 2963, star2Id: 6384 }] },
    ]))
    const result = addFavorite('liam', 31, 4724)

    expect(result).toEqual([
      { star1Id: 2963, star2Id: 6384 },
      { star1Id: 31, star2Id: 4724 },
    ])
  })

  it('does not add a duplicate regardless of id order', () => {
    readFileSync.mockReturnValue(JSON.stringify([
      { username: 'liam', passwordHash, favorites: [{ star1Id: 2963, star2Id: 6384 }] },
    ]))
    const result = addFavorite('liam', 6384, 2963)

    expect(result).toEqual([{ star1Id: 2963, star2Id: 6384 }])
  })

  it('throws when the user does not exist', () => {
    readFileSync.mockReturnValue(JSON.stringify([{ username: 'liam', passwordHash }]))
    expect(() => addFavorite('someone-else', 2963, 6384)).toThrow('User not found')
    expect(writeFileSync).not.toHaveBeenCalled()
  })
})

describe('removeFavorite', () => {
  it('removes a matching favorite regardless of id order', () => {
    readFileSync.mockReturnValue(JSON.stringify([
      { username: 'liam', passwordHash, favorites: [{ star1Id: 2963, star2Id: 6384 }, { star1Id: 31, star2Id: 4724 }] },
    ]))
    const result = removeFavorite('liam', 6384, 2963)

    expect(result).toEqual([{ star1Id: 31, star2Id: 4724 }])
  })

  it('leaves the list unchanged when there is no match', () => {
    readFileSync.mockReturnValue(JSON.stringify([
      { username: 'liam', passwordHash, favorites: [{ star1Id: 2963, star2Id: 6384 }] },
    ]))
    const result = removeFavorite('liam', 31, 4724)

    expect(result).toEqual([{ star1Id: 2963, star2Id: 6384 }])
  })

  it('throws when the user does not exist', () => {
    readFileSync.mockReturnValue(JSON.stringify([{ username: 'liam', passwordHash }]))
    expect(() => removeFavorite('someone-else', 2963, 6384)).toThrow('User not found')
    expect(writeFileSync).not.toHaveBeenCalled()
  })
})

describe('requireAuth', () => {
  it('calls next when the session has a user', () => {
    const req = { session: { user: 'liam' } }
    const next = vi.fn()
    requireAuth(req, {}, next)
    expect(next).toHaveBeenCalled()
  })

  it('responds 401 when the session has no user', () => {
    const req = { session: {} }
    const json = vi.fn()
    const res = { status: vi.fn(() => ({ json })) }
    requireAuth(req, res, vi.fn())
    expect(res.status).toHaveBeenCalledWith(401)
    expect(json).toHaveBeenCalledWith({ error: 'Not authenticated' })
  })
})

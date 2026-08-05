import { describe, it, expect, vi, afterEach } from 'vitest'
import bcrypt from 'bcryptjs'

// Fakes the small slice of the Drizzle query-builder chain auth.js relies on
// (.from/.where/.values/.onConflictDoNothing all return the same thenable node,
// which resolves to whatever result was queued for that call).
const { db, queueResult, resetDb } = vi.hoisted(() => {
  let queue = []
  let history = []

  function chain(result) {
    const node = { valuesArgs: undefined }
    node.from = vi.fn(() => node)
    node.where = vi.fn(() => node)
    node.values = vi.fn((v) => { node.valuesArgs = v; return node })
    node.onConflictDoNothing = vi.fn(() => node)
    node.then = (resolve, reject) => Promise.resolve(result).then(resolve, reject)
    return node
  }

  function next() {
    const node = chain(queue.shift())
    history.push(node)
    return node
  }

  const db = {
    select: vi.fn(next),
    insert: vi.fn(next),
    delete: vi.fn(next),
  }

  return {
    db,
    queueResult: (result) => queue.push(result),
    resetDb: () => { queue = []; history = [] },
  }
})

vi.mock('./db/client.js', () => ({ db }))

import { verifyCredentials, createUser, getFavorites, addFavorite, removeFavorite, requireAuth } from './auth.js'

const passwordHash = bcrypt.hashSync('correct-password', 10)

afterEach(() => {
  vi.clearAllMocks()
  resetDb()
})

describe('verifyCredentials', () => {
  it('returns true for a known user with the correct password', async () => {
    queueResult([{ id: 1, username: 'liam', passwordHash }])
    expect(await verifyCredentials('liam', 'correct-password')).toBe(true)
  })

  it('returns false for a known user with the wrong password', async () => {
    queueResult([{ id: 1, username: 'liam', passwordHash }])
    expect(await verifyCredentials('liam', 'wrong-password')).toBe(false)
  })

  it('returns false for an unknown username', async () => {
    queueResult([])
    expect(await verifyCredentials('someone-else', 'correct-password')).toBe(false)
  })
})

describe('createUser', () => {
  it('adds a new user with a bcrypt-hashed password', async () => {
    queueResult([]) // no existing user
    queueResult(undefined) // insert
    await createUser('newuser', 'new-password')

    expect(db.insert).toHaveBeenCalledTimes(1)
    const inserted = db.insert.mock.results[0].value.valuesArgs
    expect(inserted.username).toBe('newuser')
    expect(bcrypt.compareSync('new-password', inserted.passwordHash)).toBe(true)
  })

  it('throws and does not insert when the username already exists', async () => {
    queueResult([{ id: 1, username: 'liam', passwordHash }])
    await expect(createUser('liam', 'whatever')).rejects.toThrow('Username already exists')
    expect(db.insert).not.toHaveBeenCalled()
  })
})

describe('getFavorites', () => {
  it('returns an empty array when the user has no favorites', async () => {
    queueResult([{ id: 1, username: 'liam' }])
    queueResult([])
    expect(await getFavorites('liam')).toEqual([])
  })

  it('returns the stored favorites', async () => {
    queueResult([{ id: 1, username: 'liam' }])
    queueResult([{ id: 1, userId: 1, star1Id: 2963, star2Id: 6384 }])
    expect(await getFavorites('liam')).toEqual([{ star1Id: 2963, star2Id: 6384 }])
  })

  it('returns an empty array when the user does not exist', async () => {
    queueResult([])
    expect(await getFavorites('someone-else')).toEqual([])
  })
})

describe('addFavorite', () => {
  it('adds a favorite and returns the updated list', async () => {
    queueResult([{ id: 1, username: 'liam' }])
    queueResult(undefined) // insert
    queueResult([{ id: 1, userId: 1, star1Id: 2963, star2Id: 6384 }])

    const result = await addFavorite('liam', 2963, 6384)

    expect(result).toEqual([{ star1Id: 2963, star2Id: 6384 }])
    const inserted = db.insert.mock.results[0].value.valuesArgs
    expect(inserted).toEqual({ userId: 1, star1Id: 2963, star2Id: 6384 })
  })

  it('normalizes star ids to a consistent order regardless of input order', async () => {
    queueResult([{ id: 1, username: 'liam' }])
    queueResult(undefined) // insert
    queueResult([{ id: 1, userId: 1, star1Id: 2963, star2Id: 6384 }])

    await addFavorite('liam', 6384, 2963)

    const inserted = db.insert.mock.results[0].value.valuesArgs
    expect(inserted).toEqual({ userId: 1, star1Id: 2963, star2Id: 6384 })
  })

  it('relies on onConflictDoNothing to avoid duplicates', async () => {
    queueResult([{ id: 1, username: 'liam' }])
    queueResult(undefined) // insert (no-op on conflict)
    queueResult([{ id: 1, userId: 1, star1Id: 2963, star2Id: 6384 }])

    await addFavorite('liam', 2963, 6384)

    const insertNode = db.insert.mock.results[0].value
    expect(insertNode.onConflictDoNothing).toHaveBeenCalled()
  })

  it('throws when the user does not exist', async () => {
    queueResult([])
    await expect(addFavorite('someone-else', 2963, 6384)).rejects.toThrow('User not found')
    expect(db.insert).not.toHaveBeenCalled()
  })
})

describe('removeFavorite', () => {
  it('removes a matching favorite regardless of id order', async () => {
    queueResult([{ id: 1, username: 'liam' }])
    queueResult(undefined) // delete
    queueResult([{ id: 2, userId: 1, star1Id: 31, star2Id: 4724 }])

    const result = await removeFavorite('liam', 6384, 2963)
    expect(result).toEqual([{ star1Id: 31, star2Id: 4724 }])
  })

  it('leaves the list unchanged when there is no match', async () => {
    queueResult([{ id: 1, username: 'liam' }])
    queueResult(undefined) // delete
    queueResult([{ id: 1, userId: 1, star1Id: 2963, star2Id: 6384 }])

    const result = await removeFavorite('liam', 31, 4724)
    expect(result).toEqual([{ star1Id: 2963, star2Id: 6384 }])
  })

  it('throws when the user does not exist', async () => {
    queueResult([])
    await expect(removeFavorite('someone-else', 2963, 6384)).rejects.toThrow('User not found')
    expect(db.delete).not.toHaveBeenCalled()
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

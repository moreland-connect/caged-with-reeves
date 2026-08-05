import bcrypt from 'bcryptjs'
import { eq, and } from 'drizzle-orm'
import { db } from './db/client.js'
import { users, favorites } from './db/schema.js'

function normalizePair(star1Id, star2Id) {
  return star1Id <= star2Id ? [star1Id, star2Id] : [star2Id, star1Id]
}

export async function verifyCredentials(username, password) {
  const [user] = await db.select().from(users).where(eq(users.username, username))
  if (!user) return false
  return bcrypt.compareSync(password, user.passwordHash)
}

export async function createUser(username, password) {
  const [existing] = await db.select().from(users).where(eq(users.username, username))
  if (existing) {
    throw new Error('Username already exists')
  }
  await db.insert(users).values({ username, passwordHash: bcrypt.hashSync(password, 10) })
}

async function getUserByUsername(username) {
  const [user] = await db.select().from(users).where(eq(users.username, username))
  return user
}

async function favoritesForUserId(userId) {
  const rows = await db.select().from(favorites).where(eq(favorites.userId, userId))
  return rows.map(({ star1Id, star2Id }) => ({ star1Id, star2Id }))
}

export async function getFavorites(username) {
  const user = await getUserByUsername(username)
  if (!user) return []
  return favoritesForUserId(user.id)
}

export async function addFavorite(username, star1Id, star2Id) {
  const user = await getUserByUsername(username)
  if (!user) throw new Error('User not found')
  const [a, b] = normalizePair(star1Id, star2Id)
  await db.insert(favorites)
    .values({ userId: user.id, star1Id: a, star2Id: b })
    .onConflictDoNothing()
  return favoritesForUserId(user.id)
}

export async function removeFavorite(username, star1Id, star2Id) {
  const user = await getUserByUsername(username)
  if (!user) throw new Error('User not found')
  const [a, b] = normalizePair(star1Id, star2Id)
  await db.delete(favorites).where(and(
    eq(favorites.userId, user.id),
    eq(favorites.star1Id, a),
    eq(favorites.star2Id, b),
  ))
  return favoritesForUserId(user.id)
}

export function requireAuth(req, res, next) {
  if (req.session?.user) return next()
  res.status(401).json({ error: 'Not authenticated' })
}

import bcrypt from 'bcryptjs'
import { readFileSync, writeFileSync } from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const usersPath = path.join(__dirname, 'users.json')

function loadUsers() {
  return JSON.parse(readFileSync(usersPath, 'utf-8'))
}

function saveUsers(users) {
  writeFileSync(usersPath, JSON.stringify(users, null, 2))
}

export function verifyCredentials(username, password) {
  const user = loadUsers().find(u => u.username === username)
  if (!user) return false
  return bcrypt.compareSync(password, user.passwordHash)
}

export function createUser(username, password) {
  const users = loadUsers()
  if (users.some(u => u.username === username)) {
    throw new Error('Username already exists')
  }
  users.push({ username, passwordHash: bcrypt.hashSync(password, 10) })
  saveUsers(users)
}

function sameFavorite(a, b) {
  return (a.star1Id === b.star1Id && a.star2Id === b.star2Id) ||
         (a.star1Id === b.star2Id && a.star2Id === b.star1Id)
}

export function getFavorites(username) {
  const user = loadUsers().find(u => u.username === username)
  return user?.favorites ?? []
}

export function addFavorite(username, star1Id, star2Id) {
  const users = loadUsers()
  const user = users.find(u => u.username === username)
  if (!user) throw new Error('User not found')
  if (!user.favorites) user.favorites = []
  const pair = { star1Id, star2Id }
  if (!user.favorites.some(f => sameFavorite(f, pair))) {
    user.favorites.push(pair)
  }
  saveUsers(users)
  return user.favorites
}

export function removeFavorite(username, star1Id, star2Id) {
  const users = loadUsers()
  const user = users.find(u => u.username === username)
  if (!user) throw new Error('User not found')
  const pair = { star1Id, star2Id }
  user.favorites = (user.favorites ?? []).filter(f => !sameFavorite(f, pair))
  saveUsers(users)
  return user.favorites
}

export function requireAuth(req, res, next) {
  if (req.session?.user) return next()
  res.status(401).json({ error: 'Not authenticated' })
}

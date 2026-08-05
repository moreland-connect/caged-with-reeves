import 'dotenv/config'
import { readFileSync } from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { db } from '../db/client.js'
import { users, favorites } from '../db/schema.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const usersPath = path.join(__dirname, '..', 'users.json')

const oldUsers = JSON.parse(readFileSync(usersPath, 'utf-8'))

for (const { username, passwordHash, favorites: favs } of oldUsers) {
  const [user] = await db.insert(users)
    .values({ username, passwordHash })
    .onConflictDoNothing()
    .returning()
  if (!user) {
    console.log(`Skipped ${username}: already exists in the database`)
    continue
  }
  for (const { star1Id, star2Id } of favs ?? []) {
    const [a, b] = star1Id <= star2Id ? [star1Id, star2Id] : [star2Id, star1Id]
    await db.insert(favorites).values({ userId: user.id, star1Id: a, star2Id: b })
  }
  console.log(`Imported ${username} with ${favs?.length ?? 0} favorite(s)`)
}

process.exit(0)

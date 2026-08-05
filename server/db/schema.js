import { pgTable, serial, text, integer, unique } from 'drizzle-orm/pg-core'

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  username: text('username').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
})

export const favorites = pgTable('favorites', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  star1Id: integer('star1_id').notNull(),
  star2Id: integer('star2_id').notNull(),
}, (table) => [
  unique().on(table.userId, table.star1Id, table.star2Id),
])

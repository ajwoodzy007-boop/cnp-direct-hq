import { pgTable, varchar, text, timestamp, boolean } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const members = pgTable("members", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`)
    .notNull(),
  email: text("email").unique().notNull(),
  passwordHash: text("password_hash").notNull(),
  membershipTier: text("membership_tier").default("free").notNull(),
  isPremium: boolean("is_premium").default(false).notNull(),
  isAdmin: boolean("is_admin").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const historicalPrices = pgTable("historical_prices", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  ticker: varchar("ticker", { length: 10 }).notNull(),
  close_price: text("close_price").notNull(),
  date: timestamp("date").defaultNow().notNull(),
});

export type User = typeof members.$inferSelect;
export type InsertUser = typeof members.$inferInsert;
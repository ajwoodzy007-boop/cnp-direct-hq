import { pgTable, text, varchar, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default("gen_random_uuid()"),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  tier: text("tier").notNull().default("FREE"),
  // Note: We use is_premium in code and map it to ispremium from your DB
  is_premium: boolean("is_premium").default(false),
});

export const insertUserSchema = createInsertSchema(users);
export type User = typeof users.$inferSelect;

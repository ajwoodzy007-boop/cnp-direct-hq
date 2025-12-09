import { sql } from "drizzle-orm";
import { pgTable, text, varchar, real, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export const predictions = pgTable("predictions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  ticker: text("ticker").notNull(),
  signalType: text("signal_type").notNull(),
  entryPrice: real("entry_price").notNull(),
  predictionDate: timestamp("prediction_date").notNull().defaultNow(),
  outcome: text("outcome"),
  outcomePrice: real("outcome_price"),
  outcomeDate: timestamp("outcome_date"),
});

export const insertPredictionSchema = createInsertSchema(predictions).omit({
  id: true,
  predictionDate: true,
  outcome: true,
  outcomePrice: true,
  outcomeDate: true,
});

export type InsertPrediction = z.infer<typeof insertPredictionSchema>;
export type Prediction = typeof predictions.$inferSelect;

export const watchlist = pgTable("watchlist", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  ticker: text("ticker").notNull().unique(),
  addedAt: timestamp("added_at").notNull().defaultNow(),
});

export const insertWatchlistSchema = createInsertSchema(watchlist).omit({
  id: true,
  addedAt: true,
});

export type InsertWatchlist = z.infer<typeof insertWatchlistSchema>;
export type WatchlistItem = typeof watchlist.$inferSelect;

export const affiliateClicks = pgTable("affiliate_clicks", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  ticker: text("ticker").notNull(),
  destination: text("destination").notNull(),
  referrer: text("referrer"),
  userAgent: text("user_agent"),
  clickedAt: timestamp("clicked_at").notNull().defaultNow(),
});

export const insertAffiliateClickSchema = createInsertSchema(affiliateClicks).omit({
  id: true,
  clickedAt: true,
});

export type InsertAffiliateClick = z.infer<typeof insertAffiliateClickSchema>;
export type AffiliateClick = typeof affiliateClicks.$inferSelect;

export const weeklyRecommendations = pgTable("weekly_recommendations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  ticker: text("ticker").notNull(),
  weekStart: timestamp("week_start").notNull(),
  signalType: text("signal_type").notNull(),
  entryPrice: real("entry_price").notNull(),
  currentPrice: real("current_price"),
  gainPercent: real("gain_percent"),
  reasoning: text("reasoning"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertWeeklyRecommendationSchema = createInsertSchema(weeklyRecommendations).omit({
  id: true,
  createdAt: true,
});

export type InsertWeeklyRecommendation = z.infer<typeof insertWeeklyRecommendationSchema>;
export type WeeklyRecommendation = typeof weeklyRecommendations.$inferSelect;

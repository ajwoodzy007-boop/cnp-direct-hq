import { relations } from "drizzle-orm/relations";
import { users, loginEvents, betaPasses, signalEngagementEvents, userTestimonials, dailyPredictionRuns, dailyPredictionEntries } from "./schema";

export const loginEventsRelations = relations(loginEvents, ({one}) => ({
	user: one(users, {
		fields: [loginEvents.userId],
		references: [users.id]
	}),
}));

export const usersRelations = relations(users, ({many}) => ({
	loginEvents: many(loginEvents),
	betaPasses: many(betaPasses),
	signalEngagementEvents: many(signalEngagementEvents),
	userTestimonials: many(userTestimonials),
}));

export const betaPassesRelations = relations(betaPasses, ({one}) => ({
	user: one(users, {
		fields: [betaPasses.redeemedBy],
		references: [users.id]
	}),
}));

export const signalEngagementEventsRelations = relations(signalEngagementEvents, ({one}) => ({
	user: one(users, {
		fields: [signalEngagementEvents.userId],
		references: [users.id]
	}),
}));

export const userTestimonialsRelations = relations(userTestimonials, ({one}) => ({
	user: one(users, {
		fields: [userTestimonials.userId],
		references: [users.id]
	}),
}));

export const dailyPredictionEntriesRelations = relations(dailyPredictionEntries, ({one}) => ({
	dailyPredictionRun: one(dailyPredictionRuns, {
		fields: [dailyPredictionEntries.runId],
		references: [dailyPredictionRuns.id]
	}),
}));

export const dailyPredictionRunsRelations = relations(dailyPredictionRuns, ({many}) => ({
	dailyPredictionEntries: many(dailyPredictionEntries),
}));
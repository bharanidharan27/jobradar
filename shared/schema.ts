import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Saved (bookmarked) jobs
export const savedJobs = sqliteTable("saved_jobs", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  adzunaId: text("adzuna_id").notNull().unique(),
  title: text("title").notNull(),
  company: text("company").notNull(),
  location: text("location").notNull(),
  description: text("description").notNull(),
  salary: text("salary"),
  jobType: text("job_type"),
  category: text("category"),
  redirectUrl: text("redirect_url").notNull(),
  created: text("created").notNull(), // ISO date string from Adzuna
  savedAt: text("saved_at").notNull(),
});

// Poll configurations (saved searches that auto-refresh)
export const pollConfigs = sqliteTable("poll_configs", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  keywords: text("keywords").notNull(),
  location: text("location").notNull(),
  country: text("country").notNull().default("us"),
  jobType: text("job_type"), // full_time | part_time | contract | permanent
  maxDaysOld: integer("max_days_old").default(7),
  salaryMin: integer("salary_min"),
  intervalMinutes: integer("interval_minutes").notNull().default(60),
  lastPolledAt: text("last_polled_at"),
  isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
});

// Insert schemas
export const insertSavedJobSchema = createInsertSchema(savedJobs).omit({
  id: true,
  savedAt: true,
});
export const insertPollConfigSchema = createInsertSchema(pollConfigs).omit({
  id: true,
  lastPolledAt: true,
});

export type InsertSavedJob = z.infer<typeof insertSavedJobSchema>;
export type InsertPollConfig = z.infer<typeof insertPollConfigSchema>;
export type SavedJob = typeof savedJobs.$inferSelect;
export type PollConfig = typeof pollConfigs.$inferSelect;

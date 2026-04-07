import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { eq, desc } from "drizzle-orm";
import * as schema from "@shared/schema";

const sqlite = new Database("jobradar.db");
const db = drizzle(sqlite, { schema });

// Init tables
sqlite.exec(`
  CREATE TABLE IF NOT EXISTS saved_jobs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    adzuna_id TEXT NOT NULL UNIQUE,
    title TEXT NOT NULL,
    company TEXT NOT NULL,
    location TEXT NOT NULL,
    description TEXT NOT NULL,
    salary TEXT,
    job_type TEXT,
    category TEXT,
    redirect_url TEXT NOT NULL,
    created TEXT NOT NULL,
    saved_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS poll_configs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    keywords TEXT NOT NULL,
    location TEXT NOT NULL,
    country TEXT NOT NULL DEFAULT 'us',
    job_type TEXT,
    max_days_old INTEGER DEFAULT 7,
    salary_min INTEGER,
    interval_minutes INTEGER NOT NULL DEFAULT 60,
    last_polled_at TEXT,
    is_active INTEGER NOT NULL DEFAULT 1
  );
`);

export interface IStorage {
  // Saved jobs
  getSavedJobs(): schema.SavedJob[];
  getSavedJob(adzunaId: string): schema.SavedJob | undefined;
  saveJob(job: schema.InsertSavedJob): schema.SavedJob;
  unsaveJob(id: number): void;
  isJobSaved(adzunaId: string): boolean;

  // Poll configs
  getPollConfigs(): schema.PollConfig[];
  getPollConfig(id: number): schema.PollConfig | undefined;
  createPollConfig(config: schema.InsertPollConfig): schema.PollConfig;
  updatePollConfig(id: number, updates: Partial<schema.PollConfig>): schema.PollConfig | undefined;
  deletePollConfig(id: number): void;
  updateLastPolled(id: number, timestamp: string): void;
}

export class SQLiteStorage implements IStorage {
  getSavedJobs(): schema.SavedJob[] {
    return db.select().from(schema.savedJobs).orderBy(desc(schema.savedJobs.savedAt)).all();
  }

  getSavedJob(adzunaId: string): schema.SavedJob | undefined {
    return db.select().from(schema.savedJobs).where(eq(schema.savedJobs.adzunaId, adzunaId)).get();
  }

  saveJob(job: schema.InsertSavedJob): schema.SavedJob {
    const now = new Date().toISOString();
    return db.insert(schema.savedJobs).values({ ...job, savedAt: now }).returning().get();
  }

  unsaveJob(id: number): void {
    db.delete(schema.savedJobs).where(eq(schema.savedJobs.id, id)).run();
  }

  isJobSaved(adzunaId: string): boolean {
    const row = db.select({ id: schema.savedJobs.id }).from(schema.savedJobs).where(eq(schema.savedJobs.adzunaId, adzunaId)).get();
    return !!row;
  }

  getPollConfigs(): schema.PollConfig[] {
    return db.select().from(schema.pollConfigs).orderBy(desc(schema.pollConfigs.id)).all();
  }

  getPollConfig(id: number): schema.PollConfig | undefined {
    return db.select().from(schema.pollConfigs).where(eq(schema.pollConfigs.id, id)).get();
  }

  createPollConfig(config: schema.InsertPollConfig): schema.PollConfig {
    return db.insert(schema.pollConfigs).values(config).returning().get();
  }

  updatePollConfig(id: number, updates: Partial<schema.PollConfig>): schema.PollConfig | undefined {
    db.update(schema.pollConfigs).set(updates).where(eq(schema.pollConfigs.id, id)).run();
    return this.getPollConfig(id);
  }

  deletePollConfig(id: number): void {
    db.delete(schema.pollConfigs).where(eq(schema.pollConfigs.id, id)).run();
  }

  updateLastPolled(id: number, timestamp: string): void {
    db.update(schema.pollConfigs).set({ lastPolledAt: timestamp }).where(eq(schema.pollConfigs.id, id)).run();
  }
}

export const storage = new SQLiteStorage();

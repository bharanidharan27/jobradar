import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { eq, desc } from "drizzle-orm";
import * as schema from "@shared/schema";
import type { AdzunaSearchParams, AdzunaSearchResult } from "./adzuna";

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
  CREATE TABLE IF NOT EXISTS search_cache (
    cache_key TEXT PRIMARY KEY,
    results   TEXT NOT NULL,
    cached_at TEXT NOT NULL
  );
`);

const CACHE_TTL_MS = 15 * 60 * 1000; // 15 minutes

/** Deterministic cache key from search params (sorted, no credentials) */
function makeCacheKey(params: AdzunaSearchParams): string {
  const p = params as unknown as Record<string, unknown>;
  const sorted = Object.keys(p).sort().map(k => `${k}=${p[k]}`).join("&");
  // Simple djb2-style hash — no crypto needed
  let h = 5381;
  for (let i = 0; i < sorted.length; i++) h = ((h << 5) + h) ^ sorted.charCodeAt(i);
  return (h >>> 0).toString(16);
}

export interface IStorage {
  // Search cache
  getCached(params: AdzunaSearchParams): AdzunaSearchResult | null;
  setCached(params: AdzunaSearchParams, result: AdzunaSearchResult): void;
  pruneCache(): void;

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
  // ── Cache ──────────────────────────────────────────────────────────────────

  getCached(params: AdzunaSearchParams): AdzunaSearchResult | null {
    const key = makeCacheKey(params);
    const row = db.select().from(schema.searchCache)
      .where(eq(schema.searchCache.cacheKey, key)).get();
    if (!row) return null;
    const age = Date.now() - new Date(row.cachedAt).getTime();
    if (age > CACHE_TTL_MS) {
      // Stale — delete and return null
      db.delete(schema.searchCache).where(eq(schema.searchCache.cacheKey, key)).run();
      return null;
    }
    return JSON.parse(row.results) as AdzunaSearchResult;
  }

  setCached(params: AdzunaSearchParams, result: AdzunaSearchResult): void {
    const key = makeCacheKey(params);
    const now = new Date().toISOString();
    db.insert(schema.searchCache)
      .values({ cacheKey: key, results: JSON.stringify(result), cachedAt: now })
      .onConflictDoUpdate({ target: schema.searchCache.cacheKey, set: { results: JSON.stringify(result), cachedAt: now } })
      .run();
  }

  pruneCache(): void {
    // Remove all entries older than TTL
    const cutoff = new Date(Date.now() - CACHE_TTL_MS).toISOString();
    sqlite.prepare(`DELETE FROM search_cache WHERE cached_at < ?`).run(cutoff);
  }

  // ── Saved jobs ─────────────────────────────────────────────────────────────

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

import type { Express } from "express";
import type { Server } from "http";
import { storage } from "./storage";
import { searchAdzuna, formatSalary, getJobType, type AdzunaJob } from "./adzuna";
import { startPoller, registerSSEClient } from "./poller";
import { insertSavedJobSchema, insertPollConfigSchema } from "@shared/schema";
import { z } from "zod";

function getCredentials() {
  return {
    appId: process.env.ADZUNA_APP_ID || "",
    appKey: process.env.ADZUNA_APP_KEY || "",
  };
}

function mapJobToSave(job: AdzunaJob) {
  return {
    adzunaId: job.id,
    title: job.title,
    company: job.company.display_name,
    location: job.location.display_name,
    description: job.description,
    salary: formatSalary(job),
    jobType: getJobType(job),
    category: job.category?.label || null,
    redirectUrl: job.redirect_url,
    created: job.created,
  };
}

export function registerRoutes(httpServer: Server, app: Express) {
  // Health check / credentials status
  app.get("/api/status", (req, res) => {
    const { appId, appKey } = getCredentials();
    res.json({ configured: !!(appId && appKey) });
  });

  // Search jobs via Adzuna
  app.get("/api/jobs/search", async (req, res) => {
    const { appId, appKey } = getCredentials();
    if (!appId || !appKey) {
      return res.status(400).json({ error: "Adzuna API credentials not configured" });
    }

    const {
      what = "",
      where = "",
      country = "us",
      full_time,
      part_time,
      permanent,
      contract,
      max_days_old,
      salary_min,
      sort_by = "relevance",
      page = "1",
    } = req.query as Record<string, string>;

    try {
      const searchParams = {
        what,
        where,
        country,
        full_time: full_time === "1",
        part_time: part_time === "1",
        permanent: permanent === "1",
        contract: contract === "1",
        max_days_old: max_days_old ? parseInt(max_days_old) : undefined,
        salary_min: salary_min ? parseInt(salary_min) : undefined,
        sort_by: sort_by as any,
        results_per_page: 20,
        page: parseInt(page),
      };

      // Check cache first — avoids burning an Adzuna request for repeat searches
      let result = storage.getCached(searchParams);
      let fromCache = true;
      if (!result) {
        fromCache = false;
        result = await searchAdzuna(searchParams, appId, appKey);
        storage.setCached(searchParams, result);
      }

      // Enrich each job with saved status
      const savedIds = new Set(storage.getSavedJobs().map((j) => j.adzunaId));
      const enriched = result.results.map((job) => ({
        ...job,
        salaryFormatted: formatSalary(job),
        jobTypeFormatted: getJobType(job),
        isSaved: savedIds.has(job.id),
      }));

      res.json({ count: result.count, results: enriched, fromCache });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Save credentials
  app.post("/api/credentials", (req, res) => {
    const { appId, appKey } = req.body;
    if (!appId || !appKey) return res.status(400).json({ error: "Missing credentials" });
    // Store in environment for this process session
    process.env.ADZUNA_APP_ID = appId;
    process.env.ADZUNA_APP_KEY = appKey;
    // Start or restart the poller
    startPoller(appId, appKey);
    res.json({ ok: true });
  });

  // --- Saved Jobs ---
  app.get("/api/saved-jobs", (req, res) => {
    res.json(storage.getSavedJobs());
  });

  app.post("/api/saved-jobs", (req, res) => {
    try {
      const data = insertSavedJobSchema.parse(req.body);
      if (storage.isJobSaved(data.adzunaId)) {
        return res.status(409).json({ error: "Job already saved" });
      }
      const saved = storage.saveJob(data);
      res.status(201).json(saved);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  app.delete("/api/saved-jobs/:id", (req, res) => {
    const id = parseInt(req.params.id);
    storage.unsaveJob(id);
    res.json({ ok: true });
  });

  // --- Poll Configs ---
  app.get("/api/poll-configs", (req, res) => {
    res.json(storage.getPollConfigs());
  });

  app.post("/api/poll-configs", (req, res) => {
    try {
      const data = insertPollConfigSchema.parse(req.body);
      const config = storage.createPollConfig(data);
      const { appId, appKey } = getCredentials();
      if (appId && appKey) startPoller(appId, appKey);
      res.status(201).json(config);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  app.patch("/api/poll-configs/:id", (req, res) => {
    const id = parseInt(req.params.id);
    const updated = storage.updatePollConfig(id, req.body);
    if (!updated) return res.status(404).json({ error: "Not found" });
    res.json(updated);
  });

  app.delete("/api/poll-configs/:id", (req, res) => {
    const id = parseInt(req.params.id);
    storage.deletePollConfig(id);
    res.json({ ok: true });
  });

  // SSE endpoint for real-time poll updates
  app.get("/api/poll-events", (req, res) => {
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders();

    const unregister = registerSSEClient((data) => {
      res.write(`data: ${data}\n\n`);
    });

    req.on("close", unregister);
  });

  // Start poller on boot if credentials already set
  const { appId, appKey } = getCredentials();
  if (appId && appKey) {
    startPoller(appId, appKey);
  }
}

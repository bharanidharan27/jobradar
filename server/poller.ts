// Background job poller — runs every minute and checks which poll configs are due
import { storage } from "./storage";
import { searchAdzuna, formatSalary, getJobType } from "./adzuna";

let pollTimer: NodeJS.Timeout | null = null;

// Store pending poll results in memory so SSE clients can get updates
type PollEvent = {
  configId: number;
  configName: string;
  newCount: number;
  timestamp: string;
};

const recentEvents: PollEvent[] = [];
const MAX_EVENTS = 50;
const sseClients = new Set<(data: string) => void>();

export function registerSSEClient(send: (data: string) => void) {
  sseClients.add(send);
  // Send recent events immediately on connect
  recentEvents.slice(-10).forEach((evt) => {
    send(JSON.stringify(evt));
  });
  return () => sseClients.delete(send);
}

function broadcastEvent(evt: PollEvent) {
  recentEvents.push(evt);
  if (recentEvents.length > MAX_EVENTS) recentEvents.shift();
  for (const send of sseClients) {
    try {
      send(JSON.stringify(evt));
    } catch {
      sseClients.delete(send);
    }
  }
}

async function runDuePolls(appId: string, appKey: string) {
  const configs = storage.getPollConfigs().filter((c) => c.isActive);
  const now = new Date();

  for (const config of configs) {
    const lastPolled = config.lastPolledAt ? new Date(config.lastPolledAt) : null;
    const intervalMs = config.intervalMinutes * 60 * 1000;
    const isDue = !lastPolled || now.getTime() - lastPolled.getTime() >= intervalMs;

    if (!isDue) continue;

    try {
      const params: any = {
        what: config.keywords,
        where: config.location,
        country: config.country,
        max_days_old: config.maxDaysOld || 7,
        sort_by: "date",
        results_per_page: 20,
      };

      if (config.jobType) {
        if (config.jobType === "full_time") params.full_time = true;
        else if (config.jobType === "part_time") params.part_time = true;
        else if (config.jobType === "permanent") params.permanent = true;
        else if (config.jobType === "contract") params.contract = true;
      }
      if (config.salaryMin) params.salary_min = config.salaryMin;

      const result = await searchAdzuna(params, appId, appKey);
      storage.updateLastPolled(config.id, now.toISOString());

      const event: PollEvent = {
        configId: config.id,
        configName: config.name,
        newCount: result.count,
        timestamp: now.toISOString(),
      };
      broadcastEvent(event);
    } catch (err) {
      console.error(`Poll failed for config ${config.id}:`, err);
    }
  }
}

export function startPoller(appId: string, appKey: string) {
  if (pollTimer) clearInterval(pollTimer);
  // Check every 60 seconds
  pollTimer = setInterval(() => runDuePolls(appId, appKey), 60_000);
  // Also run immediately on start
  runDuePolls(appId, appKey).catch(console.error);
  console.log("[JobRadar] Background poller started");
}

export function stopPoller() {
  if (pollTimer) {
    clearInterval(pollTimer);
    pollTimer = null;
  }
}

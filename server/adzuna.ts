// Adzuna API client
// Docs: https://developer.adzuna.com/docs/search

const ADZUNA_BASE = "https://api.adzuna.com/v1/api/jobs";

export interface AdzunaJob {
  id: string;
  title: string;
  company: { display_name: string };
  location: { display_name: string };
  description: string;
  salary_min?: number;
  salary_max?: number;
  contract_time?: string; // full_time | part_time
  contract_type?: string; // permanent | contract
  category: { label: string };
  redirect_url: string;
  created: string;
}

export interface AdzunaSearchParams {
  what: string;         // primary job title / short keyword phrase
  what_or?: string;     // space-separated skills — match any (Adzuna OR logic)
  where?: string;       // location
  country?: string;     // us, gb, au, etc.
  results_per_page?: number;
  full_time?: boolean;
  part_time?: boolean;
  permanent?: boolean;
  contract?: boolean;
  max_days_old?: number;
  salary_min?: number;
  sort_by?: "relevance" | "date" | "salary";
  page?: number;
}

export interface AdzunaSearchResult {
  count: number;
  results: AdzunaJob[];
}

export async function searchAdzuna(
  params: AdzunaSearchParams,
  appId: string,
  appKey: string
): Promise<AdzunaSearchResult> {
  const country = params.country || "us";
  const page = params.page || 1;
  const url = new URL(`${ADZUNA_BASE}/${country}/search/${page}`);

  url.searchParams.set("app_id", appId);
  url.searchParams.set("app_key", appKey);
  url.searchParams.set("results_per_page", String(params.results_per_page || 20));
  url.searchParams.set("content-type", "application/json");

  if (params.what) url.searchParams.set("what", params.what);
  if (params.what_or) url.searchParams.set("what_or", params.what_or);
  if (params.where) url.searchParams.set("where", params.where);
  if (params.full_time) url.searchParams.set("full_time", "1");
  if (params.part_time) url.searchParams.set("part_time", "1");
  if (params.permanent) url.searchParams.set("permanent", "1");
  if (params.contract) url.searchParams.set("contract", "1");
  if (params.max_days_old) url.searchParams.set("max_days_old", String(params.max_days_old));
  if (params.salary_min) url.searchParams.set("salary_min", String(params.salary_min));
  if (params.sort_by) url.searchParams.set("sort_by", params.sort_by);

  const res = await fetch(url.toString());
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Adzuna API error ${res.status}: ${text}`);
  }
  const data = await res.json();
  return {
    count: data.count || 0,
    results: (data.results || []) as AdzunaJob[],
  };
}

export function formatSalary(job: AdzunaJob): string | null {
  if (!job.salary_min && !job.salary_max) return null;
  const fmt = (n: number) => `$${Math.round(n / 1000)}k`;
  if (job.salary_min && job.salary_max) {
    if (Math.abs(job.salary_min - job.salary_max) < 5000) return fmt(job.salary_min);
    return `${fmt(job.salary_min)} – ${fmt(job.salary_max)}`;
  }
  return job.salary_min ? fmt(job.salary_min) : fmt(job.salary_max!);
}

export function getJobType(job: AdzunaJob): string | null {
  const parts: string[] = [];
  if (job.contract_time === "full_time") parts.push("Full-time");
  else if (job.contract_time === "part_time") parts.push("Part-time");
  if (job.contract_type === "permanent") parts.push("Permanent");
  else if (job.contract_type === "contract") parts.push("Contract");
  return parts.length ? parts.join(", ") : null;
}

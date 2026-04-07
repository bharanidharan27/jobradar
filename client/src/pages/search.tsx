import { useState, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import JobCard from "@/components/job-card";
import JobCardSkeleton from "@/components/job-card-skeleton";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Search, SlidersHorizontal, AlertCircle, Briefcase } from "lucide-react";
import { cn } from "@/lib/utils";

const COUNTRIES = [
  { value: "us", label: "United States" },
  { value: "gb", label: "United Kingdom" },
  { value: "au", label: "Australia" },
  { value: "ca", label: "Canada" },
  { value: "de", label: "Germany" },
  { value: "fr", label: "France" },
];

const SORT_OPTIONS = [
  { value: "relevance", label: "Most relevant" },
  { value: "date", label: "Most recent" },
  { value: "salary", label: "Highest salary" },
];

const DAYS_OPTIONS = [
  { value: "1", label: "Last 24h" },
  { value: "3", label: "Last 3 days" },
  { value: "7", label: "Last 7 days" },
  { value: "14", label: "Last 14 days" },
  { value: "30", label: "Last 30 days" },
];

interface Filters {
  country: string;
  jobType: string;
  maxDaysOld: string;
  sortBy: string;
  salaryMin: string;
}

export default function SearchPage() {
  const [what, setWhat] = useState("");
  const [where, setWhere] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState<Filters>({
    country: "us",
    jobType: "",
    maxDaysOld: "7",
    sortBy: "relevance",
    salaryMin: "",
  });

  const buildParams = () => {
    const p: Record<string, string> = {
      what,
      where,
      country: filters.country,
      sort_by: filters.sortBy,
      max_days_old: filters.maxDaysOld,
      page: String(page),
    };
    if (filters.salaryMin) p.salary_min = filters.salaryMin;
    if (filters.jobType === "full_time") p.full_time = "1";
    if (filters.jobType === "part_time") p.part_time = "1";
    if (filters.jobType === "permanent") p.permanent = "1";
    if (filters.jobType === "contract") p.contract = "1";
    return new URLSearchParams(p).toString();
  };

  const { data, isLoading, isFetching, error, refetch } = useQuery({
    queryKey: ["/api/jobs/search", what, where, filters, page],
    queryFn: () =>
      apiRequest("GET", `/api/jobs/search?${buildParams()}`).then((r) => r.json()),
    enabled: submitted && what.length > 0,
  });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!what.trim()) return;
    setPage(1);
    setSubmitted(true);
    refetch();
  };

  const setFilter = (key: keyof Filters) => (val: string) =>
    setFilters((f) => ({ ...f, [key]: val }));

  return (
    <div className="space-y-6">
      {/* Hero search bar */}
      <div className="space-y-3">
        <h1 className="text-xl font-bold tracking-tight">Find your next role</h1>
        <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              data-testid="input-keywords"
              placeholder="Job title, skills, or company"
              value={what}
              onChange={(e) => setWhat(e.target.value)}
              className="pl-9"
            />
          </div>
          <Input
            data-testid="input-location"
            placeholder="Location (city, state)"
            value={where}
            onChange={(e) => setWhere(e.target.value)}
            className="sm:max-w-[200px]"
          />
          <Button type="submit" data-testid="button-search" disabled={!what.trim() || isFetching}>
            Search
          </Button>
          <Button
            type="button"
            variant="outline"
            data-testid="button-filters"
            onClick={() => setShowFilters((v) => !v)}
            className={cn(showFilters && "bg-accent text-accent-foreground")}
          >
            <SlidersHorizontal className="w-4 h-4" />
          </Button>
        </form>

        {/* Filters panel */}
        {showFilters && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 bg-muted/50 rounded-xl border border-border">
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Country</label>
              <Select value={filters.country} onValueChange={setFilter("country")}>
                <SelectTrigger data-testid="select-country" className="h-8 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {COUNTRIES.map((c) => (
                    <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Job type</label>
              <Select value={filters.jobType || "any"} onValueChange={(v) => setFilter("jobType")(v === "any" ? "" : v)}>
                <SelectTrigger data-testid="select-jobtype" className="h-8 text-sm">
                  <SelectValue placeholder="Any" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="any">Any type</SelectItem>
                  <SelectItem value="full_time">Full-time</SelectItem>
                  <SelectItem value="part_time">Part-time</SelectItem>
                  <SelectItem value="permanent">Permanent</SelectItem>
                  <SelectItem value="contract">Contract</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Posted within</label>
              <Select value={filters.maxDaysOld} onValueChange={setFilter("maxDaysOld")}>
                <SelectTrigger data-testid="select-days" className="h-8 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DAYS_OPTIONS.map((d) => (
                    <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Sort by</label>
              <Select value={filters.sortBy} onValueChange={setFilter("sortBy")}>
                <SelectTrigger data-testid="select-sort" className="h-8 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SORT_OPTIONS.map((s) => (
                    <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        )}
      </div>

      {/* Results */}
      {isLoading || isFetching ? (
        <div className="grid sm:grid-cols-2 gap-4">
          {Array.from({ length: 6 }).map((_, i) => <JobCardSkeleton key={i} />)}
        </div>
      ) : error ? (
        <div className="flex flex-col items-center gap-3 py-16 text-muted-foreground">
          <AlertCircle className="w-10 h-10 text-destructive" />
          <p className="text-sm font-medium">Search failed. Check your API setup.</p>
          <Button variant="outline" size="sm" onClick={() => refetch()}>Retry</Button>
        </div>
      ) : data && submitted ? (
        <>
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              <span className="font-semibold text-foreground font-mono">
                {data.count?.toLocaleString() || 0}
              </span>{" "}
              jobs found
            </p>
            {data.count > 20 && (
              <div className="flex items-center gap-2 text-sm">
                <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>Previous</Button>
                <span className="text-muted-foreground">Page {page}</span>
                <Button variant="outline" size="sm" onClick={() => setPage((p) => p + 1)} disabled={!data.results?.length}>Next</Button>
              </div>
            )}
          </div>

          {data.results?.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-16 text-muted-foreground">
              <Briefcase className="w-10 h-10" />
              <p className="text-sm font-medium">No jobs found for this search.</p>
              <p className="text-xs">Try broader keywords or a different location.</p>
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 gap-4">
              {data.results?.map((job: any) => (
                <JobCard key={job.id} job={job} />
              ))}
            </div>
          )}
        </>
      ) : (
        <div className="flex flex-col items-center gap-4 py-24 text-muted-foreground">
          <div className="p-5 rounded-2xl bg-accent/50">
            <Search className="w-10 h-10 text-primary/60" />
          </div>
          <div className="text-center space-y-1">
            <p className="font-semibold text-foreground">Ready to search</p>
            <p className="text-sm">Enter a job title or skill above to get started.</p>
          </div>
        </div>
      )}
    </div>
  );
}

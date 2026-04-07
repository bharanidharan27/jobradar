import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import JobCard from "@/components/job-card";
import { Bookmark, Trash2 } from "lucide-react";
import type { SavedJob } from "@shared/schema";

export default function SavedPage() {
  const qc = useQueryClient();
  const { data: jobs = [], isLoading } = useQuery<SavedJob[]>({
    queryKey: ["/api/saved-jobs"],
    queryFn: () => apiRequest("GET", "/api/saved-jobs").then((r) => r.json()),
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        <h1 className="text-xl font-bold">Saved Jobs</h1>
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="bg-card border border-border rounded-xl p-5 h-40 skeleton-shimmer" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">Saved Jobs</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {jobs.length} bookmarked {jobs.length === 1 ? "role" : "roles"}
          </p>
        </div>
      </div>

      {jobs.length === 0 ? (
        <div className="flex flex-col items-center gap-4 py-24 text-muted-foreground">
          <div className="p-5 rounded-2xl bg-accent/50">
            <Bookmark className="w-10 h-10 text-primary/60" />
          </div>
          <div className="text-center space-y-1">
            <p className="font-semibold text-foreground">No saved jobs yet</p>
            <p className="text-sm">Bookmark roles from the Search tab to track them here.</p>
          </div>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 gap-4">
          {jobs.map((job) => (
            <JobCard
              key={job.id}
              job={{
                id: job.adzunaId,
                adzunaId: job.adzunaId,
                title: job.title,
                company: { display_name: job.company },
                location: { display_name: job.location },
                description: job.description,
                redirect_url: job.redirectUrl,
                created: job.created,
                category: job.category ? { label: job.category } : undefined,
                salary: job.salary,
                jobType: job.jobType,
                isSaved: true,
                savedJobId: job.id,
              }}
              onUnsave={() => qc.invalidateQueries({ queryKey: ["/api/saved-jobs"] })}
            />
          ))}
        </div>
      )}
    </div>
  );
}

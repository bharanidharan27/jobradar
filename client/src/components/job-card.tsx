import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Bookmark, BookmarkCheck, ExternalLink, MapPin, Building2, Clock, DollarSign, Briefcase } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";

export interface JobData {
  id: string;
  title: string;
  company: { display_name: string };
  location: { display_name: string };
  description: string;
  redirect_url: string;
  created: string;
  category?: { label: string };
  salaryFormatted?: string | null;
  jobTypeFormatted?: string | null;
  isSaved?: boolean;
  // For saved jobs from DB
  adzunaId?: string;
  salary?: string | null;
  jobType?: string | null;
  savedAt?: string;
  savedJobId?: number;
}

interface JobCardProps {
  job: JobData;
  onUnsave?: () => void;
}

export default function JobCard({ job, onUnsave }: JobCardProps) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [saved, setSaved] = useState(job.isSaved ?? false);

  // Get normalized values
  const adzunaId = job.adzunaId || job.id;
  const company = job.company?.display_name || (job as any).company;
  const location = job.location?.display_name || (job as any).location;
  const salary = job.salaryFormatted ?? job.salary;
  const jobType = job.jobTypeFormatted ?? job.jobType;
  const category = job.category?.label ?? (job as any).category;
  const description = (job.description || "").replace(/<[^>]+>/g, "").slice(0, 220) + "…";

  const saveJobMutation = useMutation({
    mutationFn: () =>
      apiRequest("POST", "/api/saved-jobs", {
        adzunaId,
        title: job.title,
        company,
        location,
        description: job.description,
        salary,
        jobType,
        category,
        redirectUrl: job.redirect_url,
        created: job.created,
      }).then((r) => r.json()),
    onSuccess: () => {
      setSaved(true);
      qc.invalidateQueries({ queryKey: ["/api/saved-jobs"] });
      toast({ title: "Saved", description: `${job.title} added to bookmarks` });
    },
    onError: (err: any) => {
      if (err.message?.includes("409")) {
        setSaved(true);
      } else {
        toast({ title: "Error", description: "Could not save job", variant: "destructive" });
      }
    },
  });

  const unsaveJobMutation = useMutation({
    mutationFn: () =>
      apiRequest("DELETE", `/api/saved-jobs/${job.savedJobId}`).then((r) => r.json()),
    onSuccess: () => {
      setSaved(false);
      qc.invalidateQueries({ queryKey: ["/api/saved-jobs"] });
      toast({ title: "Removed", description: "Removed from saved jobs" });
      onUnsave?.();
    },
  });

  const timeAgo = (() => {
    try {
      return formatDistanceToNow(new Date(job.created), { addSuffix: true });
    } catch {
      return "";
    }
  })();

  return (
    <article
      data-testid={`job-card-${adzunaId}`}
      className="job-card group bg-card border border-border rounded-xl p-5 flex flex-col gap-3"
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3
            data-testid={`job-title-${adzunaId}`}
            className="font-semibold text-foreground text-[0.95rem] leading-snug mb-1 line-clamp-2"
          >
            {job.title}
          </h3>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
            <span className="flex items-center gap-1">
              <Building2 className="w-3.5 h-3.5 shrink-0" />
              <span className="font-medium text-foreground/80">{company}</span>
            </span>
            <span className="flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5 shrink-0" />
              {location}
            </span>
          </div>
        </div>

        {/* Bookmark */}
        <button
          data-testid={`bookmark-${adzunaId}`}
          onClick={() => {
            if (saved && job.savedJobId) unsaveJobMutation.mutate();
            else if (!saved) saveJobMutation.mutate();
          }}
          disabled={saveJobMutation.isPending || unsaveJobMutation.isPending}
          className={cn(
            "shrink-0 p-2 rounded-lg transition-colors",
            saved
              ? "text-primary bg-accent"
              : "text-muted-foreground hover:text-primary hover:bg-accent"
          )}
          aria-label={saved ? "Unsave job" : "Save job"}
        >
          {saved ? <BookmarkCheck className="w-4 h-4" /> : <Bookmark className="w-4 h-4" />}
        </button>
      </div>

      {/* Badges */}
      <div className="flex flex-wrap gap-2">
        {salary && (
          <Badge variant="outline" className="text-xs gap-1 text-success border-success/40 bg-success/5">
            <DollarSign className="w-3 h-3" />
            {salary}
          </Badge>
        )}
        {jobType && (
          <Badge variant="outline" className="text-xs gap-1">
            <Briefcase className="w-3 h-3" />
            {jobType}
          </Badge>
        )}
        {category && (
          <Badge variant="secondary" className="text-xs">
            {category}
          </Badge>
        )}
      </div>

      {/* Description */}
      <p className="text-sm text-muted-foreground leading-relaxed line-clamp-3">{description}</p>

      {/* Footer */}
      <div className="flex items-center justify-between pt-1">
        <span
          data-testid={`job-time-${adzunaId}`}
          className="flex items-center gap-1 text-xs text-muted-foreground"
        >
          <Clock className="w-3 h-3" />
          {timeAgo}
        </span>
        <a
          href={job.redirect_url}
          target="_blank"
          rel="noopener noreferrer"
          data-testid={`apply-${adzunaId}`}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline"
        >
          Apply <ExternalLink className="w-3 h-3" />
        </a>
      </div>
    </article>
  );
}

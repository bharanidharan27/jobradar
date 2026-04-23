import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Radio, Plus, Trash2, Clock, RefreshCw, Bell } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import type { PollConfig } from "@shared/schema";
import { cn } from "@/lib/utils";

interface PollEvent {
  configId: number;
  configName: string;
  newCount: number;
  timestamp: string;
  error?: string;
}

export default function PollersPage() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [events, setEvents] = useState<PollEvent[]>([]);

  // SSE for live poll events
  useEffect(() => {
    const url = `${location.origin.replace(window.location.port ? `:${window.location.port}` : "", ":5000")}/api/poll-events`.replace("http:", "http:").replace("5000", window.location.port || "5000");
    // Use relative URL for SSE (it goes through the same Vite proxy)
    const es = new EventSource("/api/poll-events");
    es.onmessage = (evt) => {
      try {
        const data = JSON.parse(evt.data) as PollEvent;
        setEvents((prev) => [data, ...prev].slice(0, 20));
        toast({
          title: `Poll complete: ${data.configName}`,
          description: `Found ${data.newCount.toLocaleString()} jobs`,
        });
      } catch {}
    };
    return () => es.close();
  }, []);

  const { data: configs = [] } = useQuery<PollConfig[]>({
    queryKey: ["/api/poll-configs"],
    queryFn: () => apiRequest("GET", "/api/poll-configs").then((r) => r.json()),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/poll-configs/${id}`).then((r) => r.json()),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/poll-configs"] }),
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: number; isActive: boolean }) =>
      apiRequest("PATCH", `/api/poll-configs/${id}`, { isActive }).then((r) => r.json()),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/poll-configs"] }),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">Auto-Poll Monitors</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Background watchers that poll for new jobs on a schedule
          </p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-new-poll" size="sm">
              <Plus className="w-4 h-4 mr-1" />
              New monitor
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create poll monitor</DialogTitle>
            </DialogHeader>
            <NewPollForm onSuccess={() => { setOpen(false); qc.invalidateQueries({ queryKey: ["/api/poll-configs"] }); }} />
          </DialogContent>
        </Dialog>
      </div>

      {configs.length === 0 ? (
        <div className="flex flex-col items-center gap-4 py-20 text-muted-foreground">
          <div className="p-5 rounded-2xl bg-accent/50">
            <Radio className="w-10 h-10 text-primary/60" />
          </div>
          <div className="text-center space-y-1">
            <p className="font-semibold text-foreground">No monitors yet</p>
            <p className="text-sm">Create a monitor to automatically poll for new job listings.</p>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {configs.map((cfg) => (
            <div
              key={cfg.id}
              data-testid={`poll-config-${cfg.id}`}
              className="bg-card border border-border rounded-xl p-4 flex items-start justify-between gap-4"
            >
              <div className="flex items-start gap-3 min-w-0">
                <div className={cn("relative w-2.5 h-2.5 rounded-full mt-1.5 shrink-0", cfg.isActive ? "text-green-500" : "text-muted-foreground")}>
                  <span className={cn("block w-full h-full rounded-full", cfg.isActive ? "bg-green-500" : "bg-muted-foreground")} />
                  {cfg.isActive && <span className="pulse-dot absolute inset-0 text-green-500" />}
                </div>
                <div className="min-w-0">
                  <p className="font-semibold text-sm">{cfg.name}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    <span className="font-medium">{cfg.keywords}</span> in{" "}
                    <span className="font-medium">{cfg.location || "Everywhere"}</span>
                    {" · "}
                    <span className="uppercase text-xs">{cfg.country}</span>
                  </p>
                  <div className="flex flex-wrap gap-2 mt-2">
                    <Badge variant="outline" className="text-xs gap-1">
                      <Clock className="w-3 h-3" />
                      Every {cfg.intervalMinutes < 60 ? `${cfg.intervalMinutes}m` : `${cfg.intervalMinutes / 60}h`}
                    </Badge>
                    {cfg.maxDaysOld && (
                      <Badge variant="secondary" className="text-xs">Last {cfg.maxDaysOld}d</Badge>
                    )}
                    {cfg.lastPolledAt && (
                      <span className="flex items-center gap-1 text-xs text-muted-foreground">
                        <RefreshCw className="w-3 h-3" />
                        {formatDistanceToNow(new Date(cfg.lastPolledAt), { addSuffix: true })}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Switch
                  data-testid={`toggle-${cfg.id}`}
                  checked={!!cfg.isActive}
                  onCheckedChange={(checked) => toggleMutation.mutate({ id: cfg.id, isActive: checked })}
                />
                <button
                  data-testid={`delete-poll-${cfg.id}`}
                  onClick={() => deleteMutation.mutate(cfg.id)}
                  className="p-1.5 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                  aria-label="Delete monitor"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Recent poll events */}
      {events.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Bell className="w-4 h-4 text-muted-foreground" />
            <h2 className="text-sm font-semibold text-muted-foreground">Recent poll events</h2>
          </div>
          <div className="space-y-2">
            {events.map((evt, i) => (
              <div key={i} className={`flex items-center justify-between text-sm px-4 py-2.5 rounded-lg border ${
                evt.error ? "bg-destructive/10 border-destructive/30" : "bg-muted/40 border-border"
              }`}>
                <div className="flex items-center gap-2 min-w-0">
                  <span className="font-medium truncate">{evt.configName}</span>
                  <span className="text-muted-foreground">→</span>
                  {evt.error ? (
                    <span className="font-mono font-medium text-destructive truncate max-w-xs" title={evt.error}>Error: {evt.error.slice(0, 60)}{evt.error.length > 60 ? "…" : ""}</span>
                  ) : (
                    <span className="font-mono font-medium text-primary">{evt.newCount.toLocaleString()} jobs</span>
                  )}
                </div>
                <span className="text-xs text-muted-foreground shrink-0 ml-2">{formatDistanceToNow(new Date(evt.timestamp), { addSuffix: true })}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function NewPollForm({ onSuccess }: { onSuccess: () => void }) {
  const { toast } = useToast();
  const [form, setForm] = useState({
    name: "",
    keywords: "",
    location: "",
    country: "us",
    jobType: "",
    maxDaysOld: "7",
    intervalMinutes: "60",
  });

  const mutation = useMutation({
    mutationFn: () =>
      apiRequest("POST", "/api/poll-configs", {
        name: form.name,
        keywords: form.keywords,
        location: form.location,
        country: form.country,
        jobType: form.jobType || null,
        maxDaysOld: parseInt(form.maxDaysOld),
        intervalMinutes: parseInt(form.intervalMinutes),
        isActive: true,
      }).then((r) => r.json()),
    onSuccess: () => { toast({ title: "Monitor created" }); onSuccess(); },
    onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  return (
    <form
      onSubmit={(e) => { e.preventDefault(); mutation.mutate(); }}
      className="space-y-4"
    >
      <div className="space-y-1">
        <label className="text-sm font-medium">Monitor name</label>
        <Input data-testid="input-poll-name" placeholder="e.g. Senior React Engineer" value={form.name} onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))} required />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <label className="text-sm font-medium">Keywords</label>
          <Input data-testid="input-poll-keywords" placeholder="react developer" value={form.keywords} onChange={(e) => setForm(f => ({ ...f, keywords: e.target.value }))} required />
        </div>
        <div className="space-y-1">
          <label className="text-sm font-medium">Location</label>
          <Input data-testid="input-poll-location" placeholder="San Francisco" value={form.location} onChange={(e) => setForm(f => ({ ...f, location: e.target.value }))} />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <label className="text-sm font-medium">Country</label>
          <Select value={form.country} onValueChange={(v) => setForm(f => ({ ...f, country: v }))}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {[["us","US"],["gb","UK"],["au","AU"],["ca","CA"],["de","DE"],["fr","FR"]].map(([v,l]) => (
                <SelectItem key={v} value={v}>{l}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <label className="text-sm font-medium">Poll every</label>
          <Select value={form.intervalMinutes} onValueChange={(v) => setForm(f => ({ ...f, intervalMinutes: v }))}>
            <SelectTrigger data-testid="select-interval"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="15">15 minutes</SelectItem>
              <SelectItem value="30">30 minutes</SelectItem>
              <SelectItem value="60">1 hour</SelectItem>
              <SelectItem value="120">2 hours</SelectItem>
              <SelectItem value="360">6 hours</SelectItem>
              <SelectItem value="720">12 hours</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <label className="text-sm font-medium">Job type</label>
          <Select value={form.jobType || "any"} onValueChange={(v) => setForm(f => ({ ...f, jobType: v === "any" ? "" : v }))}>
            <SelectTrigger><SelectValue placeholder="Any" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="any">Any</SelectItem>
              <SelectItem value="full_time">Full-time</SelectItem>
              <SelectItem value="part_time">Part-time</SelectItem>
              <SelectItem value="permanent">Permanent</SelectItem>
              <SelectItem value="contract">Contract</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <label className="text-sm font-medium">Max age</label>
          <Select value={form.maxDaysOld} onValueChange={(v) => setForm(f => ({ ...f, maxDaysOld: v }))}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="1">1 day</SelectItem>
              <SelectItem value="3">3 days</SelectItem>
              <SelectItem value="7">7 days</SelectItem>
              <SelectItem value="14">14 days</SelectItem>
              <SelectItem value="30">30 days</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <Button type="submit" className="w-full" disabled={mutation.isPending}>
        {mutation.isPending ? "Creating…" : "Create monitor"}
      </Button>
    </form>
  );
}

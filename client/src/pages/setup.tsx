import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { CheckCircle2, KeyRound, ExternalLink, AlertTriangle } from "lucide-react";

export default function SetupPage() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [appId, setAppId] = useState("");
  const [appKey, setAppKey] = useState("");

  const { data: status, isLoading } = useQuery({
    queryKey: ["/api/status"],
    queryFn: () => apiRequest("GET", "/api/status").then((r) => r.json()),
  });

  const mutation = useMutation({
    mutationFn: () =>
      apiRequest("POST", "/api/credentials", { appId, appKey }).then((r) => r.json()),
    onSuccess: () => {
      toast({ title: "API connected", description: "JobRadar is ready to search" });
      qc.invalidateQueries({ queryKey: ["/api/status"] });
      setAppId("");
      setAppKey("");
    },
    onError: () =>
      toast({ title: "Error", description: "Could not save credentials", variant: "destructive" }),
  });

  return (
    <div className="max-w-lg mx-auto space-y-8">
      <div>
        <h1 className="text-xl font-bold">API Setup</h1>
        <p className="text-sm text-muted-foreground mt-1">
          JobRadar uses the Adzuna API to search millions of real job listings.
        </p>
      </div>

      {/* Status card */}
      <div className={`flex items-start gap-3 p-4 rounded-xl border ${status?.configured ? "border-green-500/30 bg-green-500/5" : "border-amber-500/30 bg-amber-500/5"}`}>
        {status?.configured ? (
          <CheckCircle2 className="w-5 h-5 text-green-500 mt-0.5 shrink-0" />
        ) : (
          <AlertTriangle className="w-5 h-5 text-amber-500 mt-0.5 shrink-0" />
        )}
        <div>
          <p className="font-semibold text-sm">
            {status?.configured ? "API credentials configured" : "No credentials set"}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {status?.configured
              ? "Search and auto-polling are active."
              : "Enter your Adzuna App ID and Key below to activate."}
          </p>
        </div>
      </div>

      {/* Instructions */}
      <div className="space-y-3">
        <h2 className="text-sm font-semibold">How to get free API credentials</h2>
        <ol className="space-y-2 text-sm text-muted-foreground list-decimal list-inside">
          <li>
            Visit the{" "}
            <a
              href="https://developer.adzuna.com/signup"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline inline-flex items-center gap-1"
            >
              Adzuna Developer Portal <ExternalLink className="w-3 h-3" />
            </a>
          </li>
          <li>Create a free account and a new application</li>
          <li>Copy your <strong>App ID</strong> and <strong>App Key</strong></li>
          <li>Paste them below — free tier allows 250 hits/day</li>
        </ol>
      </div>

      {/* Form */}
      <form
        onSubmit={(e) => { e.preventDefault(); mutation.mutate(); }}
        className="space-y-4"
      >
        <div className="space-y-1.5">
          <label className="text-sm font-medium" htmlFor="app-id">App ID</label>
          <div className="relative">
            <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              id="app-id"
              data-testid="input-app-id"
              placeholder="xxxxxxxx"
              value={appId}
              onChange={(e) => setAppId(e.target.value)}
              className="pl-9 font-mono"
              required
            />
          </div>
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium" htmlFor="app-key">App Key</label>
          <div className="relative">
            <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              id="app-key"
              data-testid="input-app-key"
              type="password"
              placeholder="xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
              value={appKey}
              onChange={(e) => setAppKey(e.target.value)}
              className="pl-9 font-mono"
              required
            />
          </div>
        </div>

        <Button
          type="submit"
          className="w-full"
          data-testid="button-save-credentials"
          disabled={mutation.isPending || !appId || !appKey}
        >
          {mutation.isPending ? "Saving…" : "Save credentials"}
        </Button>

        <p className="text-xs text-muted-foreground text-center">
          Credentials are stored in memory for this session only. Re-enter after restarting the server.
        </p>
      </form>
    </div>
  );
}

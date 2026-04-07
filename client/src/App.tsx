import { Switch, Route, Router } from "wouter";
import { useHashLocation } from "wouter/use-hash-location";
import { useSyncExternalStore } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import { ThemeProvider } from "@/components/theme-provider";
import Layout from "@/components/layout";
import SearchPage from "@/pages/search";
import SavedPage from "@/pages/saved";
import PollersPage from "@/pages/pollers";
import SetupPage from "@/pages/setup";
import NotFound from "@/pages/not-found";

// Robust hash location hook: normalises any hash variant ("#/", "##/", "", "#") to a clean path
const listeners: (() => void)[] = [];
const onHashChange = () => listeners.forEach((cb) => cb());
window.addEventListener("hashchange", onHashChange);

const subscribe = (cb: () => void) => {
  listeners.push(cb);
  return () => { listeners.splice(listeners.indexOf(cb), 1); };
};

const getHashPath = () => {
  // Strip ALL leading # and / characters, then prepend a single /
  const path = "/" + location.hash.replace(/^#+\/*/, "");
  return path === "/" ? "/" : path;
};

const navigate = (to: string) => { location.hash = to; };

const useRobustHashLocation = (): [string, (to: string) => void] => [
  useSyncExternalStore(subscribe, getHashPath, () => "/"),
  navigate,
];
useRobustHashLocation.hrefs = (href: string) => "#" + href;

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <Router hook={useRobustHashLocation}>
          <Layout>
            <Switch>
              <Route path="/" component={SearchPage} />
              <Route path="/saved" component={SavedPage} />
              <Route path="/pollers" component={PollersPage} />
              <Route path="/setup" component={SetupPage} />
              <Route component={NotFound} />
            </Switch>
          </Layout>
        </Router>
        <Toaster />
      </ThemeProvider>
    </QueryClientProvider>
  );
}

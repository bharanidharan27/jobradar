import { Link, useLocation } from "wouter";
import { useTheme } from "@/components/theme-provider";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Sun, Moon, Search, Bookmark, Radio, Settings2, Briefcase } from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/", label: "Search", icon: Search },
  { href: "/saved", label: "Saved", icon: Bookmark },
  { href: "/pollers", label: "Auto-Polls", icon: Radio },
  { href: "/setup", label: "Setup", icon: Settings2 },
];

export default function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const { theme, toggle } = useTheme();

  const { data: status } = useQuery({
    queryKey: ["/api/status"],
    queryFn: () => apiRequest("GET", "/api/status").then((r) => r.json()),
    refetchInterval: 30_000,
  });

  return (
    <div className="min-h-dvh flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-border bg-card/90 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            <svg
              aria-label="JobRadar"
              viewBox="0 0 32 32"
              fill="none"
              className="w-7 h-7"
            >
              <rect width="32" height="32" rx="8" fill="hsl(var(--primary))" />
              <path
                d="M6 20 L10 14 L14 18 L18 10 L22 16 L26 12"
                stroke="white"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <span className="font-bold text-base tracking-tight">JobRadar</span>
          </Link>

          {/* Nav */}
          <nav className="hidden md:flex items-center gap-1">
            {navItems.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                data-testid={`nav-${label.toLowerCase()}`}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors",
                  location === href
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                )}
              >
                <Icon className="w-3.5 h-3.5" />
                {label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            {/* API status indicator */}
            <div
              data-testid="api-status"
              className="hidden sm:flex items-center gap-1.5 text-xs font-medium"
            >
              <span
                className={cn(
                  "w-2 h-2 rounded-full",
                  status?.configured ? "bg-green-500" : "bg-amber-500"
                )}
              />
              <span className="text-muted-foreground">
                {status?.configured ? "API connected" : "Setup required"}
              </span>
            </div>

            {/* Theme toggle */}
            <button
              onClick={toggle}
              data-testid="theme-toggle"
              aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
              className="p-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            >
              {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Mobile nav */}
        <div className="md:hidden flex border-t border-border">
          {navItems.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex-1 flex flex-col items-center gap-0.5 py-2 text-xs font-medium transition-colors",
                location === href ? "text-primary" : "text-muted-foreground"
              )}
            >
              <Icon className="w-4 h-4" />
              {label}
            </Link>
          ))}
        </div>
      </header>

      {/* Main */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 py-6">{children}</main>

      {/* Footer */}
      <footer className="border-t border-border py-4 text-center text-xs text-muted-foreground">
        JobRadar — powered by{" "}
        <a
          href="https://developer.adzuna.com"
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary hover:underline"
        >
          Adzuna API
        </a>
      </footer>
    </div>
  );
}

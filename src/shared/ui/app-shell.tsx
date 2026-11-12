import { Link } from "@tanstack/react-router";
import { Sparkles } from "lucide-react";
import type * as React from "react";
import { cn } from "@/shared/lib/utils";
import { ThemeSwitcher } from "@/shared/ui/theme-switcher";

export interface NavItem {
  label: string;
  href: string;
  badge?: string;
}

export interface AppShellProps {
  children: React.ReactNode;
  navItems?: NavItem[];
  userMenuSlot?: React.ReactNode;
  className?: string;
}

const DEFAULT_NAV_ITEMS: NavItem[] = [
  { label: "Home", href: "/" },
  { label: "Showcase", href: "/showcase" },
];

export function AppShell({
  children,
  navItems = DEFAULT_NAV_ITEMS,
  userMenuSlot,
  className,
}: AppShellProps) {
  return (
    <div
      className={cn(
        "bg-background text-foreground selection:bg-primary-fixed selection:text-foreground flex min-h-screen flex-col",
        className,
      )}
      data-slot="app-shell"
    >
      <header className="border-outline-variant/40 bg-surface/90 sticky top-0 z-50 w-full border-b backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-6">
            <Link
              className="font-display text-foreground flex items-center gap-2.5 text-lg font-bold transition-opacity hover:opacity-90"
              to="/"
            >
              <div className="bg-primary text-primary-foreground shadow-tactile flex size-9 items-center justify-center rounded-xl">
                <Sparkles className="size-5" />
              </div>
              <span className="tracking-tight">tanstack-open-api</span>
            </Link>

            <nav className="hidden items-center gap-1 md:flex">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  activeProps={{
                    className: "bg-surface-container text-foreground font-semibold shadow-2xs",
                  }}
                  className="text-muted-foreground hover:bg-surface-container hover:text-foreground inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-sm font-medium transition-colors"
                  // biome-ignore lint/suspicious/noExplicitAny: Generic nav links typed via router paths
                  to={item.href as any}
                >
                  {item.label}
                  {item.badge && (
                    <span className="bg-primary-fixed py-0.2 text-foreground rounded-full px-1.5 text-[10px] font-bold">
                      {item.badge}
                    </span>
                  )}
                </Link>
              ))}
            </nav>
          </div>

          <div className="flex items-center gap-3">
            <ThemeSwitcher />
            {userMenuSlot}
          </div>
        </div>
      </header>

      <main className="flex-1">{children}</main>

      <footer className="border-outline-variant/30 bg-surface-container-low/50 text-muted-foreground border-t py-6 text-center text-xs">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-2 px-4 sm:flex-row sm:px-6 lg:px-8">
          <p>© 2026 tanstack-open-api. Single-source design system architecture.</p>
          <div className="flex items-center gap-4">
            <Link className="hover:text-foreground transition-colors" to="/showcase">
              Showcase
            </Link>
            <a
              className="hover:text-foreground transition-colors"
              href="https://github.com/Guiguerreiro39/tanstack-open-api"
              rel="noreferrer"
              target="_blank"
            >
              GitHub
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}

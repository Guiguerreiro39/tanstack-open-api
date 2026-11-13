import type { QueryClient } from "@tanstack/react-query";
import { createRootRouteWithContext, HeadContent, Outlet, Scripts } from "@tanstack/react-router";
import type { AppRuntime } from "@/app/runtime";
import appCss from "@/styles/index.css?url";

export interface RouterAppContext {
  queryClient: QueryClient;
  runtime: AppRuntime;
}

const THEME_SCRIPT = `
(function() {
  try {
    var mode = localStorage.getItem("theme-mode") || "system";
    var preset = localStorage.getItem("theme-preset") || "warm-tactile";
    var isDark = mode === "dark" || (mode === "system" && window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches);
    var root = document.documentElement;
    root.setAttribute("data-theme", preset);
    if (isDark) {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
  } catch (e) {}
})();
`;

export const Route = createRootRouteWithContext<RouterAppContext>()({
  head: () => ({
    meta: [
      {
        charSet: "utf-8",
      },
      {
        name: "viewport",
        content: "width=device-width, initial-scale=1",
      },
      {
        name: "color-scheme",
        content: "light dark",
      },
      {
        title: "tanstack-open-api",
      },
    ],
    links: [
      {
        rel: "preconnect",
        href: "https://fonts.googleapis.com",
      },
      {
        rel: "preconnect",
        href: "https://fonts.gstatic.com",
        crossOrigin: "anonymous",
      },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600;700&family=Plus+Jakarta+Sans:wght@400;500;600;700&family=Quicksand:wght@500;600;700&display=swap",
      },
      {
        rel: "stylesheet",
        href: appCss || "/src/styles/index.css",
      },
    ],
    scripts: [
      {
        children: THEME_SCRIPT,
      },
    ],
  }),

  component: RootDocument,
});

function RootDocument() {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <HeadContent />
      </head>
      <body className="bg-background text-foreground min-h-screen font-sans antialiased">
        <Outlet />
        <Scripts />
      </body>
    </html>
  );
}

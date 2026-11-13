import { Check, Laptop, Moon, Palette, Sun } from "lucide-react";
import { THEME_PRESETS, type ThemePreset, useTheme } from "@/shared/lib/theme";
import { Button } from "@/shared/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/shared/ui/dropdown-menu";

export function ThemeSwitcher() {
  const { mode, preset, setMode, setPreset, resolvedMode } = useTheme();

  return (
    <div className="flex items-center gap-1.5" data-slot="theme-switcher">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button aria-label="Toggle theme mode" className="size-8 p-0" size="sm" variant="ghost">
            {resolvedMode === "dark" ? (
              <Moon className="text-foreground size-4" />
            ) : (
              <Sun className="text-foreground size-4" />
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuLabel>Appearance</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            className="flex cursor-pointer items-center justify-between"
            onClick={() => setMode("light")}
          >
            <div className="flex items-center gap-2">
              <Sun className="text-muted-foreground size-4" />
              <span>Light</span>
            </div>
            {mode === "light" && <Check className="text-primary size-4" />}
          </DropdownMenuItem>
          <DropdownMenuItem
            className="flex cursor-pointer items-center justify-between"
            onClick={() => setMode("dark")}
          >
            <div className="flex items-center gap-2">
              <Moon className="text-muted-foreground size-4" />
              <span>Dark</span>
            </div>
            {mode === "dark" && <Check className="text-primary size-4" />}
          </DropdownMenuItem>
          <DropdownMenuItem
            className="flex cursor-pointer items-center justify-between"
            onClick={() => setMode("system")}
          >
            <div className="flex items-center gap-2">
              <Laptop className="text-muted-foreground size-4" />
              <span>System</span>
            </div>
            {mode === "system" && <Check className="text-primary size-4" />}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button aria-label="Select theme preset" className="gap-2" size="sm" variant="outline">
            <Palette className="text-primary size-3.5" />
            <span className="hidden capitalize sm:inline">{preset.replace("-", " ")}</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel>Design Presets</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {THEME_PRESETS.map((p) => (
            <DropdownMenuItem
              key={p.id}
              className="flex cursor-pointer items-start gap-2 py-2"
              onClick={() => setPreset(p.id as ThemePreset)}
            >
              <div className="flex flex-1 flex-col">
                <span className="text-foreground text-xs font-semibold">{p.label}</span>
                <span className="text-muted-foreground line-clamp-1 text-[11px]">
                  {p.description}
                </span>
              </div>
              {preset === p.id && <Check className="text-primary mt-0.5 size-4 shrink-0" />}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

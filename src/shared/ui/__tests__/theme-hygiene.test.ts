import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const HEX_LITERAL_REGEX = /#[0-9a-fA-F]{3,8}\b/g;
const HEX_UTILITY_REGEX =
  /\b(?:bg|text|border|ring|outline|fill|stroke|from|via|to)-\[#[0-9a-fA-F]{3,8}\]/g;
const CHUNKY_SHADOW_REGEX = /\bchunky-shadow\b/g;

function getSourceFiles(dir: string): string[] {
  if (!existsSync(dir)) return [];
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "node_modules" || entry.name === "dist" || entry.name === ".git") {
        return [];
      }
      return getSourceFiles(fullPath);
    }
    if (entry.isFile() && (fullPath.endsWith(".tsx") || fullPath.endsWith(".ts"))) {
      if (fullPath.includes("__tests__/theme-hygiene.test.ts")) {
        return [];
      }
      return [fullPath];
    }
    return [];
  });
}

describe("Theme Hygiene & Single-Source Tokens", () => {
  const themeCssPath = join(process.cwd(), "src/styles/theme.css");

  it("exists at src/styles/theme.css", () => {
    expect(existsSync(themeCssPath)).toBe(true);
  });

  it("contains zero hardcoded hex literals in src/styles/theme.css (enforces OKLCH palette)", () => {
    expect(existsSync(themeCssPath)).toBe(true);
    const content = readFileSync(themeCssPath, "utf8");
    const hexMatches = content.match(HEX_LITERAL_REGEX) ?? [];
    expect(hexMatches).toEqual([]);
  });

  it("defines tactile shadow and translation tokens", () => {
    expect(existsSync(themeCssPath)).toBe(true);
    const content = readFileSync(themeCssPath, "utf8");
    expect(content).toContain("--shadow-tactile:");
    expect(content).toContain("--shadow-tactile-hover:");
    expect(content).toContain("--shadow-tactile-active:");
    expect(content).toContain("--tactile-hover-translate-x:");
    expect(content).toContain("--tactile-hover-translate-y:");
    expect(content).toContain("--tactile-active-translate-x:");
    expect(content).toContain("--tactile-active-translate-y:");
    expect(content).toContain("@utility shadow-tactile");
    expect(content).toContain("@utility interactive-tactile");
  });

  it("defines built-in theme preset selectors (warm-tactile, editorial-slate, neo-brutalist)", () => {
    expect(existsSync(themeCssPath)).toBe(true);
    const content = readFileSync(themeCssPath, "utf8");
    expect(content).toContain('[data-theme="warm-tactile"]');
    expect(content).toContain('[data-theme="editorial-slate"]');
    expect(content).toContain('[data-theme="neo-brutalist"]');
  });

  it("forbids arbitrary hex color utilities and legacy chunky-shadow across source files", () => {
    const srcDir = join(process.cwd(), "src");
    const files = getSourceFiles(srcDir);
    const violations: string[] = [];

    for (const file of files) {
      const text = readFileSync(file, "utf8");
      const hexMatches = text.match(HEX_UTILITY_REGEX);
      if (hexMatches) {
        violations.push(`${file} (hex utility): ${hexMatches.join(", ")}`);
      }
      const chunkyMatches = text.match(CHUNKY_SHADOW_REGEX);
      if (chunkyMatches) {
        violations.push(`${file} (legacy chunky-shadow): ${chunkyMatches.join(", ")}`);
      }
    }

    expect(violations).toEqual([]);
  });
});

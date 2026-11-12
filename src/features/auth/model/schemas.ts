import { Schema } from "effect";

export const SignInSchema = Schema.Struct({
  email: Schema.NonEmptyTrimmedString.pipe(
    Schema.pattern(/^[^\s@]+@[^\s@]+\.[^\s@]+$/, {
      message: () => "Please enter a valid email address",
    }),
  ),
  password: Schema.NonEmptyTrimmedString.pipe(
    Schema.minLength(6, { message: () => "Password must be at least 6 characters" }),
  ),
});

export const SignUpSchema = Schema.Struct({
  name: Schema.NonEmptyTrimmedString.pipe(
    Schema.minLength(2, { message: () => "Name must be at least 2 characters" }),
  ),
  email: Schema.NonEmptyTrimmedString.pipe(
    Schema.pattern(/^[^\s@]+@[^\s@]+\.[^\s@]+$/, {
      message: () => "Please enter a valid email address",
    }),
  ),
  password: Schema.NonEmptyTrimmedString.pipe(
    Schema.minLength(6, { message: () => "Password must be at least 6 characters" }),
  ),
});

export type SignInInput = Schema.Schema.Type<typeof SignInSchema>;
export type SignUpInput = Schema.Schema.Type<typeof SignUpSchema>;

export function sanitizeRedirect(url?: string | null): string {
  if (!url || typeof url !== "string") {
    return "/";
  }
  // Disallow protocol-relative URLs (e.g. "//evil.com") and absolute URIs
  if (url.startsWith("/") && !url.startsWith("//") && !url.includes("://")) {
    return url;
  }
  return "/";
}

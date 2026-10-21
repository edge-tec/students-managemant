/**
 * Validates and sanitizes redirect destination URLs to prevent Open Redirect vulnerabilities (CWE-601).
 * Only strictly local, relative paths (starting with a single '/') are permitted.
 * Protocol-relative URLs (e.g. '//evil.com'), absolute URLs (e.g. 'http://evil.com'),
 * or URLs with control/backslash characters are rejected.
 */
export function validateSafeRedirect(targetUrl: string | null | undefined, fallback = "/admin"): string {
  if (!targetUrl || typeof targetUrl !== "string") {
    return fallback;
  }

  const trimmed = targetUrl.trim();

  // Must begin with a single '/'
  if (!trimmed.startsWith("/")) {
    return fallback;
  }

  // Reject protocol-relative URLs (e.g. '//attacker.com')
  if (trimmed.startsWith("//")) {
    return fallback;
  }

  // Reject backslashes which browsers might normalize into forward slashes (e.g. '/\\attacker.com')
  if (trimmed.includes("\\")) {
    return fallback;
  }

  // Reject embedded protocol schemes (e.g. '/http://evil.com')
  if (/^\/[a-zA-Z][a-zA-Z0-9+.-]*:/.test(trimmed)) {
    return fallback;
  }

  // Reject control characters or newlines
  if (/[\r\n\t\0]/.test(trimmed)) {
    return fallback;
  }

  return trimmed;
}

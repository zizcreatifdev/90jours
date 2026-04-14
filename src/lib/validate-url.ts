/**
 * Validates that a URL uses a safe protocol (http or https only).
 * Rejects javascript:, data:, vbscript:, and other XSS vectors.
 */
export function isValidUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

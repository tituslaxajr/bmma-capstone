/**
 * Input sanitization utilities for CapstonePH.
 *
 * React auto-escapes JSX text nodes, so the primary use cases are:
 *  - Sanitize before sending to API (prevent stored XSS)
 *  - Trim/validate text inputs before display in non-JSX contexts (e.g. title attributes)
 */

const HTML_ENTITY_MAP: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};

/** Escape HTML entities in a string (for title attrs, innerHTML, etc.) */
export function escapeHtml(str: string): string {
  return str.replace(/[&<>"']/g, (ch) => HTML_ENTITY_MAP[ch] || ch);
}

/** Strip HTML tags entirely, returning plain text */
export function stripHtml(str: string): string {
  return str.replace(/<[^>]*>/g, "");
}

/** Trim and collapse whitespace to a single space */
export function normalizeWhitespace(str: string): string {
  return str.replace(/\s+/g, " ").trim();
}

/**
 * Sanitize user-provided text before sending to the API.
 * Trims, strips HTML tags, and collapses whitespace.
 * Does NOT escape entities (React handles that for JSX output).
 */
export function sanitizeInput(str: string): string {
  return normalizeWhitespace(stripHtml(str));
}

/**
 * Validate and sanitize a file name.
 * Removes path traversal characters and non-safe chars.
 */
export function sanitizeFileName(name: string): string {
  return name
    .replace(/[/\\:*?"<>|]/g, "_") // replace unsafe path chars
    .replace(/\.\./g, "_")          // prevent directory traversal
    .trim();
}

/** Max length enforcer — truncates with ellipsis if needed */
export function truncate(str: string, maxLen: number): string {
  if (str.length <= maxLen) return str;
  return str.slice(0, maxLen - 1) + "\u2026";
}

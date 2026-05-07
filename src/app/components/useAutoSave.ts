import { useEffect, useRef, useCallback } from "react";

/* ═══════════════════════════════════════════
   Auto-Save Hook
   Persists form data to localStorage every N seconds
   with visual toast feedback on restore
   ═══════════════════════════════════════════ */

interface UseAutoSaveOptions<T> {
  /** Unique key for this form's localStorage entry */
  key: string;
  /** Current form data */
  data: T;
  /** Interval in ms (default: 30000 = 30s) */
  interval?: number;
  /** Whether auto-save is enabled (default: true) */
  enabled?: boolean;
}

/**
 * Auto-saves form data to localStorage periodically.
 * Returns:
 * - `restore()`: retrieves saved data (or null if none)
 * - `clear()`: removes saved data
 * - `hasSaved`: whether there's saved data available
 */
export function useAutoSave<T>({ key, data, interval = 30000, enabled = true }: UseAutoSaveOptions<T>) {
  const dataRef = useRef(data);
  dataRef.current = data;

  const storageKey = `capstoneph_autosave_${key}`;

  // Save on interval
  useEffect(() => {
    if (!enabled) return;

    const timer = setInterval(() => {
      try {
        const payload = JSON.stringify({
          data: dataRef.current,
          timestamp: Date.now(),
        });
        localStorage.setItem(storageKey, payload);
      } catch {
        // Silently fail if storage is full
      }
    }, interval);

    return () => clearInterval(timer);
  }, [storageKey, interval, enabled]);

  // Save on unmount (navigation away)
  useEffect(() => {
    if (!enabled) return;
    return () => {
      try {
        localStorage.setItem(storageKey, JSON.stringify({
          data: dataRef.current,
          timestamp: Date.now(),
        }));
      } catch { /* silent */ }
    };
  }, [storageKey, enabled]);

  const restore = useCallback((): { data: T; timestamp: number } | null => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      // Expire after 24 hours
      if (Date.now() - parsed.timestamp > 86400000) {
        localStorage.removeItem(storageKey);
        return null;
      }
      return parsed;
    } catch {
      return null;
    }
  }, [storageKey]);

  const clear = useCallback(() => {
    try {
      localStorage.removeItem(storageKey);
    } catch { /* silent */ }
  }, [storageKey]);

  const hasSaved = (() => {
    try {
      return localStorage.getItem(storageKey) !== null;
    } catch {
      return false;
    }
  })();

  return { restore, clear, hasSaved };
}

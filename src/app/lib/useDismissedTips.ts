import { useState, useEffect, useCallback, useRef } from "react";
import { apiFetch } from "./supabase";

/**
 * Shared hook: fetches user-settings once, exposes dismissed tip IDs,
 * and a dismiss() function that updates both local state + KV.
 *
 * Uses a module-level cache so multiple ContextualTip instances
 * on the same page don't each fire a request.
 */

let _cache: string[] | null = null;
let _fetching: Promise<string[]> | null = null;

function fetchDismissed(): Promise<string[]> {
  if (_cache) return Promise.resolve(_cache);
  if (_fetching) return _fetching;
  _fetching = apiFetch<{ settings: any }>("/me/settings")
    .then((res) => {
      const arr = res.settings?.dismissedTips ?? [];
      _cache = Array.isArray(arr) ? arr : [];
      return _cache;
    })
    .catch(() => {
      _cache = [];
      return _cache;
    })
    .finally(() => {
      _fetching = null;
    });
  return _fetching;
}

export function useDismissedTips() {
  const [dismissed, setDismissed] = useState<string[]>(_cache ?? []);
  const [loaded, setLoaded] = useState(_cache !== null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    fetchDismissed().then((arr) => {
      if (mountedRef.current) {
        setDismissed(arr);
        setLoaded(true);
      }
    });
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const dismiss = useCallback(
    (tipId: string) => {
      setDismissed((prev) => {
        if (prev.includes(tipId)) return prev;
        const next = [...prev, tipId];
        _cache = next;
        // Fire-and-forget persist
        apiFetch("/me/settings", {
          method: "PUT",
          body: JSON.stringify({ dismissedTips: next }),
        }).catch(() => {});
        return next;
      });
    },
    [],
  );

  const isDismissed = useCallback(
    (tipId: string) => dismissed.includes(tipId),
    [dismissed],
  );

  return { dismissed, loaded, dismiss, isDismissed };
}

/** Reset module cache (useful after logout) */
export function resetDismissedTipsCache() {
  _cache = null;
  _fetching = null;
}

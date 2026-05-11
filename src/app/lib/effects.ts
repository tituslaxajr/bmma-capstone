import { useEffect, useState } from "react";

function canUseHeavyEffects() {
  if (typeof window === "undefined") return false;

  if (window.matchMedia("(max-width: 1023px)").matches) return false;
  if (window.matchMedia("(pointer: coarse)").matches) return false;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return false;

  const nav = navigator as Navigator & {
    connection?: { saveData?: boolean; addEventListener?: (type: string, listener: () => void) => void; removeEventListener?: (type: string, listener: () => void) => void };
    deviceMemory?: number;
    hardwareConcurrency?: number;
  };

  if (nav.connection?.saveData) return false;
  if (typeof nav.deviceMemory === "number" && nav.deviceMemory <= 4) return false;
  if (typeof nav.hardwareConcurrency === "number" && nav.hardwareConcurrency <= 4) return false;

  return true;
}

export function useHeavyEffectsEnabled() {
  const [enabled, setEnabled] = useState(() => canUseHeavyEffects());

  useEffect(() => {
    const mediaQueries = [
      window.matchMedia("(max-width: 1023px)"),
      window.matchMedia("(pointer: coarse)"),
      window.matchMedia("(prefers-reduced-motion: reduce)"),
    ];

    const update = () => setEnabled(canUseHeavyEffects());
    mediaQueries.forEach((mediaQuery) => mediaQuery.addEventListener("change", update));

    const nav = navigator as Navigator & {
      connection?: { addEventListener?: (type: string, listener: () => void) => void; removeEventListener?: (type: string, listener: () => void) => void };
    };

    nav.connection?.addEventListener?.("change", update);

    return () => {
      mediaQueries.forEach((mediaQuery) => mediaQuery.removeEventListener("change", update));
      nav.connection?.removeEventListener?.("change", update);
    };
  }, []);

  return enabled;
}

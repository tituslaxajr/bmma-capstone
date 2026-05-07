import { useState, useEffect, useRef, useCallback } from "react";

/**
 * Returns a debounced version of the input value.
 * Updates after `delay` ms of no changes.
 */
export function useDebouncedValue<T>(value: T, delay = 300): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debounced;
}

/**
 * Returns a debounced callback. Calls are delayed until
 * `delay` ms have passed since the last invocation.
 */
export function useDebouncedCallback<T extends (...args: any[]) => void>(
  callback: T,
  delay = 300,
): T {
  const timerRef = useRef<ReturnType<typeof setTimeout>>();
  const cbRef = useRef(callback);
  cbRef.current = callback;

  // eslint-disable-next-line react-hooks/exhaustive-deps
  return useCallback(
    ((...args: any[]) => {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => cbRef.current(...args), delay);
    }) as T,
    [delay],
  );
}

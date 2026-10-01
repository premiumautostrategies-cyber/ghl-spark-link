import { useEffect, useState } from "react";

/** Small localStorage-backed state for prototype-only settings. */
export function useLocalStore<T>(key: string, initial: T) {
  const full = `systemize.${key}`;
  const [value, setValue] = useState<T>(initial);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    try {
      const raw = localStorage.getItem(full);
      if (raw) setValue(JSON.parse(raw) as T);
    } catch {
      /* ignore */
    }
    setReady(true);
  }, [full]);
  useEffect(() => {
    if (ready) localStorage.setItem(full, JSON.stringify(value));
  }, [full, ready, value]);
  return [value, setValue] as const;
}

export const money = (n: number) => `$${Math.round(n).toLocaleString()}`;
export const DAY_MS = 86_400_000;

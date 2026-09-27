import { useCallback, useEffect, useRef, useState } from "react";

export function usePoll<T>(
  fetcher: () => Promise<T>,
  intervalMs: number,
  enabled = true,
) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;
  const timer = useRef<number | null>(null);
  const mounted = useRef(true);

  const refresh = useCallback(async () => {
    try {
      const result = await fetcherRef.current();
      if (!mounted.current) return;
      setData(result);
      setError(null);
    } catch (err) {
      if (!mounted.current) return;
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      if (mounted.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    mounted.current = true;
    if (!enabled) {
      setLoading(false);
      return () => {
        mounted.current = false;
        if (timer.current) window.clearInterval(timer.current);
      };
    }
    void refresh();
    if (timer.current) window.clearInterval(timer.current);
    timer.current = window.setInterval(() => void refresh(), intervalMs);
    return () => {
      mounted.current = false;
      if (timer.current) window.clearInterval(timer.current);
    };
  }, [refresh, intervalMs, enabled]);

  return { data, error, loading, refresh, setData };
}

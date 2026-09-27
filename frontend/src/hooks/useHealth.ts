import { useCallback, useEffect, useRef, useState } from "react";
import { api, ApiError } from "@/api";

export type ConnectionState = "online" | "offline" | "checking" | "unknown";

export interface HealthInfo {
  state: ConnectionState;
  latencyMs?: number;
  lastChecked?: number;
  error?: string;
}

export function useHealth(pollMs = 15000) {
  const [health, setHealth] = useState<HealthInfo>({ state: "unknown" });
  const timer = useRef<number | null>(null);

  const check = useCallback(async () => {
    setHealth((h) => ({ ...h, state: "checking" }));
    const start = performance.now();
    try {
      await api.health();
      const latency = Math.round(performance.now() - start);
      setHealth({
        state: "online",
        latencyMs: latency,
        lastChecked: Date.now(),
      });
    } catch (err) {
      const latency = Math.round(performance.now() - start);
      setHealth({
        state: "offline",
        latencyMs: latency,
        lastChecked: Date.now(),
        error:
          err instanceof ApiError ? err.message : "Could not reach backend.",
      });
    }
  }, []);

  useEffect(() => {
    void check();
    if (timer.current) window.clearInterval(timer.current);
    timer.current = window.setInterval(() => void check(), pollMs);
    return () => {
      if (timer.current) window.clearInterval(timer.current);
    };
  }, [check, pollMs]);

  return { health, check };
}

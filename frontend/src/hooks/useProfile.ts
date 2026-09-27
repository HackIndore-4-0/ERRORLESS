import { useCallback, useEffect, useState } from "react";

const KEY = "humai_profile_v1";

import type { Profile } from "@/types";

export function loadProfile(): Profile | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    return JSON.parse(raw) as Profile;
  } catch {
    return null;
  }
}

export function saveProfile(p: Profile) {
  localStorage.setItem(KEY, JSON.stringify(p));
}

export function clearProfile() {
  localStorage.removeItem(KEY);
}

export function useProfile() {
  const [profile, setProfile] = useState<Profile | null>(() => loadProfile());

  const persist = useCallback((p: Profile) => {
    saveProfile(p);
    setProfile(p);
  }, []);

  const clear = useCallback(() => {
    clearProfile();
    setProfile(null);
  }, []);

  // keep profile in sync across tabs
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === KEY) setProfile(loadProfile());
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  return { profile, persist, clear };
}

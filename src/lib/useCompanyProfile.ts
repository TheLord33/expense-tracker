"use client";

import { useState, useEffect, useCallback } from "react";
import type { CompanyProfile } from "./types";

const KEY = "folio-company-profile";

const EMPTY: CompanyProfile = { name: "" };

export function useCompanyProfile() {
  const [profile, setProfile] = useState<CompanyProfile>(EMPTY);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) setProfile(JSON.parse(raw));
    } catch { /* ignore */ }
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (loaded) localStorage.setItem(KEY, JSON.stringify(profile));
  }, [profile, loaded]);

  const updateProfile = useCallback((data: Partial<CompanyProfile>) => {
    setProfile((prev) => ({ ...prev, ...data }));
  }, []);

  return { profile, updateProfile, loaded };
}

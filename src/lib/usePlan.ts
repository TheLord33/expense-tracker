"use client";
import { useState, useEffect, useCallback } from "react";

export type Plan = "free" | "pro" | "self_hosted";

const STORAGE_KEY = "folio-plan";

interface PlanRecord {
  plan: Plan;
  email: string;
  activatedAt: string;
}

export function usePlan() {
  const [record, setRecord] = useState<PlanRecord | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setRecord(JSON.parse(raw));
    } catch { /* ignore */ }
    setLoaded(true);
  }, []);

  // Called after a successful /api/subscription/activate verification
  const activatePlan = useCallback(async (token: string): Promise<boolean> => {
    try {
      const res = await fetch("/api/subscription/activate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      if (!res.ok) return false;
      const { plan, email } = await res.json();
      const rec: PlanRecord = { plan, email, activatedAt: new Date().toISOString() };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(rec));
      setRecord(rec);
      return true;
    } catch {
      return false;
    }
  }, []);

  // Called when user enters a self-hosted license key manually
  const activateLicense = useCallback(async (key: string): Promise<boolean> => {
    try {
      const res = await fetch("/api/license/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key }),
      });
      if (!res.ok) return false;
      const { email, issuedAt } = await res.json();
      const rec: PlanRecord = { plan: "self_hosted", email, activatedAt: issuedAt };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(rec));
      setRecord(rec);
      return true;
    } catch {
      return false;
    }
  }, []);

  const clearPlan = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setRecord(null);
  }, []);

  const plan: Plan = record?.plan ?? "free";
  const isPro = plan === "pro" || plan === "self_hosted";

  return { plan, isPro, email: record?.email ?? null, loaded, activatePlan, activateLicense, clearPlan };
}

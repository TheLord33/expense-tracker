"use client";

import { useState, useCallback } from "react";
import { BackupSchedule } from "@/lib/types";

const KEY = "expense-tracker-backup-schedule";

const DEFAULT: BackupSchedule = {
  enabled: false,
  frequency: "weekly",
  format: "csv",
  destination: "email",
  email: "",
  lastBackup: null,
};

function load(): BackupSchedule {
  if (typeof window === "undefined") return DEFAULT;
  try { return { ...DEFAULT, ...JSON.parse(localStorage.getItem(KEY) ?? "{}") }; }
  catch { return DEFAULT; }
}

function persist(s: BackupSchedule) {
  localStorage.setItem(KEY, JSON.stringify(s));
}

export function useBackupSchedule() {
  const [schedule, setSchedule] = useState<BackupSchedule>(load);

  const updateSchedule = useCallback((updates: Partial<BackupSchedule>) => {
    setSchedule((prev) => {
      const next = { ...prev, ...updates };
      persist(next);
      return next;
    });
  }, []);

  return { schedule, updateSchedule };
}

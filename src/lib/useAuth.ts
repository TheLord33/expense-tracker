"use client";

import { useState, useEffect, useCallback } from "react";

const STORAGE_KEY = "folio-auth";
const SESSION_KEY = "folio-session";

interface StoredCredentials {
  username: string;
  passwordHash: string;
}

async function sha256(value: string): Promise<string> {
  const data   = new TextEncoder().encode(value);
  const buffer = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export function useAuth() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [hasCredentials, setHasCredentials]   = useState<boolean | null>(null);
  const [loaded, setLoaded]                   = useState(false);

  useEffect(() => {
    const stored  = localStorage.getItem(STORAGE_KEY);
    const session = sessionStorage.getItem(SESSION_KEY);
    setHasCredentials(!!stored);
    setIsAuthenticated(!!stored && !!session);
    setLoaded(true);
  }, []);

  const setup = useCallback(async (username: string, password: string) => {
    const passwordHash = await sha256(password);
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ username, passwordHash }));
    sessionStorage.setItem(SESSION_KEY, "1");
    setHasCredentials(true);
    setIsAuthenticated(true);
  }, []);

  const login = useCallback(async (username: string, password: string): Promise<boolean> => {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return false;
    const creds = JSON.parse(raw) as StoredCredentials;
    const hash  = await sha256(password);
    if (creds.username === username && creds.passwordHash === hash) {
      sessionStorage.setItem(SESSION_KEY, "1");
      setIsAuthenticated(true);
      return true;
    }
    return false;
  }, []);

  const logout = useCallback(() => {
    sessionStorage.removeItem(SESSION_KEY);
    setIsAuthenticated(false);
  }, []);

  const changePassword = useCallback(async (currentPassword: string, newPassword: string): Promise<boolean> => {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return false;
    const creds = JSON.parse(raw) as StoredCredentials;
    const hash  = await sha256(currentPassword);
    if (creds.passwordHash !== hash) return false;
    const newHash = await sha256(newPassword);
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...creds, passwordHash: newHash }));
    return true;
  }, []);

  const getUsername = useCallback((): string => {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return "";
    return (JSON.parse(raw) as StoredCredentials).username;
  }, []);

  return { isAuthenticated, hasCredentials, loaded, setup, login, logout, changePassword, getUsername };
}

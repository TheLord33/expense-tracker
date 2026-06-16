"use client";

import { useState, useEffect, useCallback } from "react";
import type { Employee } from "./types";

export function useEmployees(companyId: string) {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loaded,    setLoaded]    = useState(false);

  useEffect(() => {
    setLoaded(false);
    try {
      const raw = localStorage.getItem(`folio-${companyId}-employees`);
      setEmployees(raw ? JSON.parse(raw) : []);
    } catch { /* ignore */ }
    setLoaded(true);
  }, [companyId]);

  useEffect(() => {
    if (loaded) localStorage.setItem(`folio-${companyId}-employees`, JSON.stringify(employees));
  }, [employees, loaded, companyId]);

  const addEmployee = useCallback((e: Omit<Employee, "id">) => {
    setEmployees((prev) => [...prev, { ...e, id: crypto.randomUUID() }]);
  }, []);

  const updateEmployee = useCallback((id: string, data: Partial<Omit<Employee, "id">>) => {
    setEmployees((prev) => prev.map((e) => e.id === id ? { ...e, ...data } : e));
  }, []);

  const deleteEmployee = useCallback((id: string) => {
    setEmployees((prev) => prev.filter((e) => e.id !== id));
  }, []);

  return { employees, loaded, addEmployee, updateEmployee, deleteEmployee };
}

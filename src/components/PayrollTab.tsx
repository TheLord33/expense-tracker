"use client";

import { useState, useMemo, useRef, useEffect, type FormEvent } from "react";
import {
  Card, CardBody, CardHeader, Divider, Button, Input, Select, SelectItem,
  Modal, ModalContent, ModalHeader, ModalBody, ModalFooter,
  Chip, useDisclosure,
} from "@nextui-org/react";
import { Plus, Pencil, Trash2, Download, CheckCircle, Users, Play } from "lucide-react";
import type { CheckRecord, CompanyProfile, Employee, FilingStatus, PayFrequency, PayRun, PayRunLine } from "@/lib/types";
import { calculatePayRunLine, defaultHours, payRunTotals, ytdWages, PERIODS_PER_YEAR, type HoursInput } from "@/lib/payroll";
import { generatePayStubPDF, generatePayrollSummaryPDF } from "@/lib/exportPDF";
import { downloadBlob } from "@/lib/importExport";
import { useLanguage, useCurrency } from "@/app/providers";

// ── Helpers ───────────────────────────────────────────────────────────────────

const todayISO = () => new Date().toISOString().split("T")[0];

function empFullName(e: Pick<Employee, "firstName" | "middleInitial" | "lastName">): string {
  return [e.firstName, e.middleInitial ? e.middleInitial + "." : "", e.lastName].filter(Boolean).join(" ");
}

function maskSSN(ssn: string): string {
  const digits = ssn.replace(/\D/g, "");
  if (digits.length !== 9) return ssn; // show as-is if not a full SSN
  return `***-**-${digits.slice(5)}`;
}

function formatSSN(raw: string): string {
  const digits = raw.replace(/\D/g, "").slice(0, 9);
  if (digits.length <= 3) return digits;
  if (digits.length <= 5) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  return `${digits.slice(0, 3)}-${digits.slice(3, 5)}-${digits.slice(5)}`;
}

function fmtDate(iso: string, locale: string) {
  const [y, m, d] = iso.split("-");
  return new Date(Number(y), Number(m) - 1, Number(d)).toLocaleDateString(locale, {
    month: "short", day: "numeric", year: "numeric",
  });
}

// ── Segmented date input (MM/DD/YYYY with auto-advance) ───────────────────────

function SegmentedDateInput({
  value, onChange, label, className = "",
}: {
  value: string; onChange: (v: string) => void; label: string; className?: string;
}) {
  const parse = (v: string) => {
    const m = v.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    return m ? [m[2], m[3], m[1]] : ["", "", ""];
  };
  const [init] = useState(() => parse(value));
  const [mo, setMo] = useState(init[0]);
  const [dy, setDy] = useState(init[1]);
  const [yr, setYr] = useState(init[2]);
  const moRef = useRef<HTMLInputElement>(null);
  const dyRef = useRef<HTMLInputElement>(null);
  const yrRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const [m, d, y] = parse(value);
    setMo(m); setDy(d); setYr(y);
  }, [value]);

  function emit(m: string, d: string, y: string) {
    if (m.length === 2 && d.length === 2 && y.length === 4) onChange(`${y}-${m}-${d}`);
  }

  const seg = "w-8 bg-transparent text-sm text-center text-foreground placeholder:text-default-400 focus:outline-none tabular-nums";

  return (
    <div className={`flex flex-col gap-1 ${className}`}>
      <span className="text-xs text-default-600 px-1">{label}</span>
      <div className="flex items-center h-10 rounded-xl border border-default-200 bg-default-100 px-3 gap-0.5 focus-within:border-primary-400 transition-colors">
        <input ref={moRef} type="text" inputMode="numeric" placeholder="MM" maxLength={2} value={mo}
          className={seg}
          onFocus={(e) => e.target.select()}
          onChange={(e) => {
            const v = e.target.value.replace(/\D/g, "").slice(0, 2);
            setMo(v); emit(v, dy, yr);
            if (v.length === 2) dyRef.current?.focus();
          }} />
        <span className="text-default-400 select-none text-sm">/</span>
        <input ref={dyRef} type="text" inputMode="numeric" placeholder="DD" maxLength={2} value={dy}
          className={seg}
          onFocus={(e) => e.target.select()}
          onChange={(e) => {
            const v = e.target.value.replace(/\D/g, "").slice(0, 2);
            setDy(v); emit(mo, v, yr);
            if (v.length === 2) yrRef.current?.focus();
          }}
          onKeyDown={(e) => { if (e.key === "Backspace" && dy === "") moRef.current?.focus(); }} />
        <span className="text-default-400 select-none text-sm">/</span>
        <input ref={yrRef} type="text" inputMode="numeric" placeholder="YYYY" maxLength={4} value={yr}
          className="w-12 bg-transparent text-sm text-center text-foreground placeholder:text-default-400 focus:outline-none tabular-nums"
          onFocus={(e) => e.target.select()}
          onChange={(e) => {
            const v = e.target.value.replace(/\D/g, "").slice(0, 4);
            setYr(v); emit(mo, dy, v);
          }}
          onKeyDown={(e) => { if (e.key === "Backspace" && yr === "") dyRef.current?.focus(); }} />
      </div>
    </div>
  );
}

// ── Props ─────────────────────────────────────────────────────────────────────

interface Props {
  employees: Employee[];
  payRuns: PayRun[];
  company: CompanyProfile;
  onAddEmployee:    (e: Omit<Employee, "id">) => void;
  onUpdateEmployee: (id: string, data: Partial<Omit<Employee, "id">>) => void;
  onDeleteEmployee: (id: string) => void;
  onAddPayRun:    (r: Omit<PayRun, "id" | "createdAt">) => void;
  onUpdatePayRun: (id: string, data: Partial<Omit<PayRun, "id">>) => void;
  onDeletePayRun: (id: string) => void;
  onAddChecks:    (checks: Omit<CheckRecord, "id">[]) => void;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function PayrollTab({
  employees, payRuns, company,
  onAddEmployee, onUpdateEmployee, onDeleteEmployee,
  onAddPayRun, onUpdatePayRun, onDeletePayRun, onAddChecks,
}: Props) {
  const { t, locale } = useLanguage();
  const { fmt } = useCurrency();

  const [view, setView] = useState<"employees" | "payRuns">("employees");

  // ── Employee form ─────────────────────────────────────────────────────────
  const empModal = useDisclosure();
  const [editingEmp,     setEditingEmp]     = useState<Employee | null>(null);
  const [eFirstName,     setEFirstName]     = useState("");
  const [eMiddle,        setEMiddle]        = useState("");
  const [eLastName,      setELastName]      = useState("");
  const [eTitle,         setETitle]         = useState("");
  const [eDept,          setEDept]          = useState("");
  const [eStartDate,     setEStartDate]     = useState(todayISO());
  const [ePayType,       setEPayType]       = useState<"salary" | "hourly">("salary");
  const [ePayRate,       setEPayRate]       = useState("");
  const [eFreq,          setEFreq]          = useState<PayFrequency>("biweekly");
  const [eFilingStatus,  setEFilingStatus]  = useState<FilingStatus>("single");
  const [eAddlFed,       setEAddlFed]       = useState("");
  const [eStateRate,     setEStateRate]     = useState("");
  const [eAddlState,     setEAddlState]     = useState("");
  const [eSsn,           setESsn]           = useState(""); // stores formatted XXX-XX-XXXX
  const [eStreet,        setEStreet]        = useState("");
  const [eCity,          setECity]          = useState("");
  const [eState,         setEState]         = useState("");
  const [eZip,           setEZip]           = useState("");
  const [eHealth,        setEHealth]        = useState("");
  const [eDental,        setEDental]        = useState("");
  const [eVision,        setEVision]        = useState("");
  const [e401k,          setE401k]          = useState("");
  const [eHsa,           setEHsa]           = useState("");
  const [eGarn,          setEGarn]          = useState("");
  const [eOtherPost,     setEOtherPost]     = useState("");
  const [eStdHours,      setEStdHours]      = useState("");
  const [eIsActive,      setEIsActive]      = useState(true);
  const [eErr,           setEErr]           = useState("");

  function openAddEmployee() {
    setEditingEmp(null);
    setEFirstName(""); setEMiddle(""); setELastName("");
    setETitle(""); setEDept(""); setEStartDate(todayISO());
    setEPayType("salary"); setEPayRate(""); setEFreq("biweekly");
    setEFilingStatus("single"); setEAddlFed(""); setEStateRate(""); setEAddlState("");
    setESsn(""); setEStreet(""); setECity(""); setEState(""); setEZip("");
    setEHealth(""); setEDental(""); setEVision("");
    setE401k(""); setEHsa(""); setEGarn(""); setEOtherPost("");
    setEStdHours(String(company.standardWeeklyHours ?? 40));
    setEIsActive(true); setEErr("");
    empModal.onOpen();
  }

  function openEditEmployee(e: Employee) {
    setEditingEmp(e);
    setEFirstName(e.firstName); setEMiddle(e.middleInitial ?? ""); setELastName(e.lastName);
    setETitle(e.jobTitle ?? ""); setEDept(e.department ?? "");
    setEStartDate(e.startDate); setEPayType(e.payType); setEPayRate(String(e.payRate));
    setEFreq(e.payFrequency); setEFilingStatus(e.filingStatus);
    setEAddlFed(e.additionalFedWithholding ? String(e.additionalFedWithholding) : "");
    setEStateRate(e.stateRate ? String(e.stateRate * 100) : "");
    setEAddlState(e.additionalStateWithholding ? String(e.additionalStateWithholding) : "");
    setESsn(e.ssn ? formatSSN(e.ssn) : "");
    setEStreet(e.street ?? ""); setECity(e.city ?? ""); setEState(e.state ?? ""); setEZip(e.zip ?? "");
    setEHealth(e.healthPremium ? String(e.healthPremium) : "");
    setEDental(e.dentalPremium ? String(e.dentalPremium) : "");
    setEVision(e.visionPremium ? String(e.visionPremium) : "");
    setE401k(e.retirement401kPct ? String(e.retirement401kPct * 100) : "");
    setEHsa(e.hsaContrib ? String(e.hsaContrib) : "");
    setEGarn(e.garnishment ? String(e.garnishment) : "");
    setEOtherPost(e.otherPostTax ? String(e.otherPostTax) : "");
    setEStdHours(e.standardWeeklyHours ? String(e.standardWeeklyHours) : String(company.standardWeeklyHours ?? 40));
    setEIsActive(e.isActive !== false); setEErr("");
    empModal.onOpen();
  }

  function handleEmpSubmit(ev: FormEvent) {
    ev.preventDefault();
    if (!eFirstName.trim())     { setEErr("First name is required");    return; }
    if (!eLastName.trim())      { setEErr("Last name is required");     return; }
    if (!ePayRate || Number(ePayRate) <= 0) { setEErr("Enter a valid pay rate"); return; }
    const data: Omit<Employee, "id"> = {
      firstName:     eFirstName.trim(),
      middleInitial: eMiddle.trim().slice(0, 1).toUpperCase() || undefined,
      lastName:      eLastName.trim(),
      jobTitle:      eTitle.trim()  || undefined,
      department:    eDept.trim()   || undefined,
      standardWeeklyHours: eStdHours ? parseFloat(eStdHours) : undefined,
      startDate:     eStartDate,
      isActive:      eIsActive,
      payType:       ePayType,
      payRate:       parseFloat(ePayRate),
      payFrequency:  eFreq,
      filingStatus:  eFilingStatus,
      additionalFedWithholding:   eAddlFed   ? parseFloat(eAddlFed)            : undefined,
      stateRate:                  eStateRate  ? parseFloat(eStateRate) / 100    : undefined,
      additionalStateWithholding: eAddlState ? parseFloat(eAddlState)          : undefined,
      ssn:    eSsn.replace(/\D/g, "") || undefined,
      street: eStreet.trim() || undefined,
      city:   eCity.trim()   || undefined,
      state:  eState.trim()  || undefined,
      zip:    eZip.trim()    || undefined,
      healthPremium: eHealth  ? parseFloat(eHealth)  : undefined,
      dentalPremium: eDental  ? parseFloat(eDental)  : undefined,
      visionPremium: eVision  ? parseFloat(eVision)  : undefined,
      retirement401kPct: e401k ? parseFloat(e401k) / 100 : undefined,
      hsaContrib:    eHsa     ? parseFloat(eHsa)     : undefined,
      garnishment:   eGarn    ? parseFloat(eGarn)    : undefined,
      otherPostTax:  eOtherPost ? parseFloat(eOtherPost) : undefined,
    };
    if (editingEmp) onUpdateEmployee(editingEmp.id, data);
    else            onAddEmployee(data);
    empModal.onClose();
  }

  // ── Pay run wizard ────────────────────────────────────────────────────────
  type WizardStep = "setup" | "review";
  const wizardModal = useDisclosure();
  const [wizardStep,   setWizardStep]   = useState<WizardStep>("setup");
  const [wPeriodFrom,  setWPeriodFrom]  = useState("");
  const [wPeriodTo,    setWPeriodTo]    = useState("");
  const [wPayDate,     setWPayDate]     = useState(todayISO());
  const [wFreq,        setWFreq]        = useState<PayFrequency>("biweekly");
  const [wSelectedIds, setWSelectedIds] = useState<Set<string>>(new Set());
  const [wLines,       setWLines]       = useState<PayRunLine[]>([]);
  const [wHours,       setWHours]       = useState<Record<string, HoursInput>>({});
  const [wYTD,         setWYTD]         = useState<Record<string, number>>({});
  const [wizardKey,    setWizardKey]    = useState(0);
  const [wNotes,       setWNotes]       = useState("");
  const [wErr,         setWErr]         = useState("");

  const activeEmployees = useMemo(() => employees.filter((e) => e.isActive !== false), [employees]);

  function openWizard() {
    setWizardStep("setup");
    setWPeriodFrom(""); setWPeriodTo(""); setWPayDate(todayISO());
    setWFreq("biweekly"); setWNotes(""); setWErr("");
    setWSelectedIds(new Set(activeEmployees.map((e) => e.id)));
    setWHours({}); setWYTD({});
    setWizardKey((k) => k + 1);
    wizardModal.onOpen();
  }

  function wizardNext() {
    if (!wPeriodFrom || !wPeriodTo) { setWErr(t("payroll.errorNoPeriod")); return; }
    if (wSelectedIds.size === 0)    { setWErr(t("payroll.errorNoEmployees")); return; }
    if (!wPayDate)                  { setWErr(t("payroll.errorNoPayDate")); return; }

    const lines: PayRunLine[] = [];
    const hoursMap: Record<string, HoursInput> = {};
    const ytdMap: Record<string, number> = {};
    for (const emp of activeEmployees) {
      if (!wSelectedIds.has(emp.id)) continue;
      const priorYTD = ytdWages(emp.id, payRuns);
      ytdMap[emp.id] = priorYTD;
      const wkHrs = emp.standardWeeklyHours ?? company.standardWeeklyHours ?? 40;
      const hrs = emp.payType === "hourly" ? defaultHours(wkHrs, wFreq) : undefined;
      if (hrs) hoursMap[emp.id] = hrs;
      try {
        lines.push(calculatePayRunLine(emp, priorYTD, hrs));
      } catch (err) {
        setWErr(`Calculation error for ${emp.firstName ?? (emp as unknown as {name?: string}).name ?? "employee"}: ${err instanceof Error ? err.message : String(err)}`);
        return;
      }
    }
    setWLines(lines);
    setWHours(hoursMap);
    setWYTD(ytdMap);
    setWErr("");
    setWizardStep("review");
  }

  function updateLineHours(empId: string, newHours: HoursInput) {
    const emp = employees.find((e) => e.id === empId);
    if (!emp) return;
    setWHours((prev) => ({ ...prev, [empId]: newHours }));
    const newLine = calculatePayRunLine(emp, wYTD[empId] ?? 0, newHours);
    setWLines((prev) => prev.map((l) => (l.employeeId === empId ? newLine : l)));
  }

  function updateLineField(empId: string, field: keyof PayRunLine, raw: string) {
    const val = parseFloat(raw);
    if (isNaN(val)) return;
    setWLines((prev) =>
      prev.map((l) => {
        if (l.employeeId !== empId) return l;
        const updated = { ...l, [field]: val };
        // Recompute net pay when a top-level number changes
        updated.netPay = Math.max(0,
          updated.grossPay
          - updated.totalPreTax
          - updated.totalEmployeeWithholding
          - updated.garnishment
          - updated.otherPostTax
        );
        return updated;
      })
    );
  }

  function handleApprove() {
    const run: Omit<PayRun, "id" | "createdAt"> = {
      periodFrom: wPeriodFrom, periodTo: wPeriodTo, payDate: wPayDate,
      frequency: wFreq, status: "approved", lines: wLines, notes: wNotes || undefined,
    };
    onAddPayRun(run);
    // Create a check per employee
    const checks: Omit<CheckRecord, "id">[] = wLines.map((l) => {
      const emp = employees.find((e) => e.id === l.employeeId);
      return {
        date:        wPayDate,
        checkNumber: l.checkNumber ?? "",
        payee:       emp ? empFullName(emp) : "—",
        amount:      l.netPay,
        memo:        `Payroll ${wPeriodFrom} – ${wPeriodTo}`,
        status:      "outstanding" as const,
      };
    });
    onAddChecks(checks);
    wizardModal.onClose();
  }

  const totals = useMemo(() => payRunTotals(wLines), [wLines]);

  // ── PDF handlers ──────────────────────────────────────────────────────────
  async function handlePayStub(run: PayRun, line: PayRunLine) {
    const emp = employees.find((e) => e.id === line.employeeId);
    if (!emp) return;
    const blob = await generatePayStubPDF(run, line, emp, company, fmt);
    downloadBlob(blob, `paystub-${empFullName(emp).replace(/\s+/g, "-")}-${run.payDate}.pdf`);
  }

  async function handleSummaryPDF(run: PayRun) {
    const blob = await generatePayrollSummaryPDF(run, employees, company, fmt);
    downloadBlob(blob, `payroll-summary-${run.payDate}.pdf`);
  }

  // ── Sorted pay runs ───────────────────────────────────────────────────────
  const sortedRuns = useMemo(
    () => [...payRuns].sort((a, b) => b.payDate.localeCompare(a.payDate)),
    [payRuns]
  );

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-4">
      {/* View toggle */}
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          <Button size="sm" variant={view === "employees" ? "solid" : "flat"} color={view === "employees" ? "primary" : "default"}
            startContent={<Users size={14} />} onPress={() => setView("employees")}>
            {t("payroll.tabEmployees")}
          </Button>
          <Button size="sm" variant={view === "payRuns" ? "solid" : "flat"} color={view === "payRuns" ? "primary" : "default"}
            onPress={() => setView("payRuns")}>
            {t("payroll.tabPayRuns")}
          </Button>
        </div>
        <div className="flex gap-2">
          {view === "employees" && (
            <Button size="sm" color="primary" startContent={<Plus size={14} />} onPress={openAddEmployee}>
              {t("payroll.addEmployee")}
            </Button>
          )}
          {view === "payRuns" && (
            <Button size="sm" color="primary" startContent={<Play size={14} />} onPress={openWizard}
              isDisabled={activeEmployees.length === 0}>
              {t("payroll.runPayroll")}
            </Button>
          )}
        </div>
      </div>

      {/* ── Employees ── */}
      {view === "employees" && (
        <>
          {employees.length === 0 ? (
            <Card shadow="none" className="border-2 border-dashed border-default-200">
              <CardBody className="py-16 text-center text-default-400">
                <Users size={32} className="mx-auto mb-3 opacity-30" />
                <p className="text-sm font-medium">{t("payroll.noEmployees")}</p>
                <p className="text-xs mt-1">{t("payroll.noEmployeesSub")}</p>
              </CardBody>
            </Card>
          ) : (
            <div className="space-y-2">
              {employees.map((emp) => {
                const periods = PERIODS_PER_YEAR[emp.payFrequency] ?? 26;
                const wkHrs = emp.standardWeeklyHours ?? company.standardWeeklyHours ?? 40;
                const periodPay = emp.payType === "salary"
                  ? emp.payRate / periods
                  : emp.payRate * (emp.payFrequency === "weekly" ? wkHrs : emp.payFrequency === "biweekly" ? wkHrs * 2 : Math.round(wkHrs * 52 / 12 * 10) / 10);
                return (
                  <Card key={emp.id} shadow="sm" className={!emp.isActive ? "opacity-60" : ""}>
                    <CardBody className="px-5 py-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-semibold text-sm text-default-900">{empFullName(emp)}</p>
                            {!emp.isActive && <Chip size="sm" variant="flat" color="default">Inactive</Chip>}
                          </div>
                          {(emp.jobTitle || emp.department) && (
                            <p className="text-xs text-default-400 mt-0.5">
                              {[emp.jobTitle, emp.department].filter(Boolean).join(" · ")}
                            </p>
                          )}
                          {(emp.street || emp.city) && (
                            <p className="text-xs text-default-400 mt-0.5">
                              {[emp.street, [emp.city, emp.state, emp.zip].filter(Boolean).join(", ")].filter(Boolean).join(" · ")}
                            </p>
                          )}
                          {emp.ssn && (
                            <p className="text-xs text-default-400 mt-0.5 font-mono">{maskSSN(emp.ssn)}</p>
                          )}
                          <p className="text-xs text-default-400 mt-0.5">
                            {emp.payType === "salary" ? "Salary" : "Hourly"} ·{" "}
                            {emp.payFrequency} · {emp.standardWeeklyHours ?? company.standardWeeklyHours ?? 40}h/wk · Filing: {emp.filingStatus}
                          </p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-sm font-bold text-default-900 tabular-nums">
                            {fmt(periodPay)}
                            <span className="text-xs font-normal text-default-400"> /period</span>
                          </p>
                          <p className="text-xs text-default-400 tabular-nums">
                            {emp.payType === "salary" ? `${fmt(emp.payRate)}/yr` : `${fmt(emp.payRate)}/hr`}
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-1 mt-2 justify-end">
                        <Button isIconOnly size="sm" variant="light" onPress={() => openEditEmployee(emp)}>
                          <Pencil size={13} />
                        </Button>
                        <Button isIconOnly size="sm" variant="light" color="danger" onPress={() => onDeleteEmployee(emp.id)}>
                          <Trash2 size={13} />
                        </Button>
                      </div>
                    </CardBody>
                  </Card>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* ── Pay Runs ── */}
      {view === "payRuns" && (
        <>
          {sortedRuns.length === 0 ? (
            <Card shadow="none" className="border-2 border-dashed border-default-200">
              <CardBody className="py-16 text-center text-default-400">
                <p className="text-sm font-medium">{t("payroll.noPayRuns")}</p>
                <p className="text-xs mt-1">{t("payroll.noPayRunsSub")}</p>
              </CardBody>
            </Card>
          ) : (
            <div className="space-y-3">
              {sortedRuns.map((run) => {
                const runTotals = payRunTotals(run.lines);
                return (
                  <Card key={run.id} shadow="sm">
                    <CardHeader className="px-5 pt-4 pb-2 flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-sm text-default-900">
                            {fmtDate(run.periodFrom, locale)} – {fmtDate(run.periodTo, locale)}
                          </p>
                          <Chip size="sm" variant="flat" color={run.status === "approved" ? "success" : "warning"}>
                            {run.status === "approved" ? t("payroll.approved") : t("payroll.draft")}
                          </Chip>
                        </div>
                        <p className="text-xs text-default-400 mt-0.5">
                          Pay Date: {fmtDate(run.payDate, locale)} · {run.lines.length} employee{run.lines.length !== 1 ? "s" : ""}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-sm font-bold tabular-nums text-default-900">{fmt(runTotals.totalNetPay)} net</p>
                        <p className="text-xs text-default-400 tabular-nums">Gross: {fmt(runTotals.totalGross)}</p>
                      </div>
                    </CardHeader>
                    <Divider />
                    <CardBody className="px-0 py-0">
                      {/* Per-employee rows */}
                      <div className="grid grid-cols-[1fr_72px_72px_72px_72px_80px] gap-2 px-5 py-2 text-xs font-medium text-default-400 bg-default-50 border-b border-default-100">
                        <span>Employee</span>
                        <span className="text-right">Gross</span>
                        <span className="text-right">Pre-Tax</span>
                        <span className="text-right">Withhold.</span>
                        <span className="text-right">Post-Tax</span>
                        <span className="text-right">Net Pay</span>
                      </div>
                      {run.lines.map((line) => {
                        const emp = employees.find((e) => e.id === line.employeeId);
                        const totalPostTax = line.garnishment + line.otherPostTax;
                        return (
                          <div key={line.employeeId}
                            className="grid grid-cols-[1fr_72px_72px_72px_72px_80px] gap-2 px-5 py-2.5 border-b border-default-100 text-sm items-center">
                            <div>
                              <p className="text-sm font-medium text-default-800">{emp ? empFullName(emp) : "—"}</p>
                              {emp?.jobTitle && <p className="text-xs text-default-400">{emp.jobTitle}</p>}
                            </div>
                            <span className="text-right tabular-nums text-xs text-default-700">{fmt(line.grossPay)}</span>
                            <span className="text-right tabular-nums text-xs text-default-500">{line.totalPreTax > 0 ? fmt(line.totalPreTax) : "—"}</span>
                            <span className="text-right tabular-nums text-xs text-default-500">{fmt(line.totalEmployeeWithholding)}</span>
                            <span className="text-right tabular-nums text-xs text-default-500">{totalPostTax > 0 ? fmt(totalPostTax) : "—"}</span>
                            <div className="text-right">
                              <span className="tabular-nums text-sm font-semibold text-success-700">{fmt(line.netPay)}</span>
                              <Button isIconOnly size="sm" variant="light" className="ml-1"
                                title={t("payroll.payStub")} onPress={() => handlePayStub(run, line)}>
                                <Download size={12} />
                              </Button>
                            </div>
                          </div>
                        );
                      })}
                      {/* Totals row */}
                      <div className="grid grid-cols-[1fr_72px_72px_72px_72px_80px] gap-2 px-5 py-2 bg-default-50 border-t border-default-200 text-xs font-bold">
                        <span className="text-default-600">TOTALS</span>
                        <span className="text-right tabular-nums">{fmt(runTotals.totalGross)}</span>
                        <span className="text-right tabular-nums">{fmt(runTotals.totalPreTax)}</span>
                        <span className="text-right tabular-nums">{fmt(runTotals.totalEmployeeWithholding)}</span>
                        <span className="text-right tabular-nums">{fmt(runTotals.totalGarnishment + runTotals.totalOtherPostTax)}</span>
                        <span className="text-right tabular-nums text-success-700">{fmt(runTotals.totalNetPay)}</span>
                      </div>
                      {/* Employer costs */}
                      <div className="px-5 py-2 bg-default-50 text-xs text-default-500">
                        Employer taxes: {fmt(runTotals.totalEmployerTax)} (SS: {fmt(runTotals.totalEmployerSS)} · Medicare: {fmt(runTotals.totalEmployerMedicare)} · FUTA: {fmt(runTotals.totalFuta)}) · Total payroll cost: <span className="font-semibold text-default-700">{fmt(runTotals.totalCost)}</span>
                      </div>
                    </CardBody>
                    <Divider />
                    <div className="px-5 py-2 flex gap-2 justify-end">
                      <Button size="sm" variant="flat" startContent={<Download size={12} />} onPress={() => handleSummaryPDF(run)}>
                        {t("payroll.summary")}
                      </Button>
                      <Button size="sm" variant="light" color="danger" startContent={<Trash2 size={12} />}
                        onPress={() => onDeletePayRun(run.id)}>
                        {t("payroll.deleteRun")}
                      </Button>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}

          {/* Disclaimer */}
          <p className="text-xs text-default-400 text-center px-4">{t("payroll.disclaimer")}</p>
        </>
      )}

      {/* ── Employee Add/Edit Modal ── */}
      <Modal isOpen={empModal.isOpen} onClose={empModal.onClose} placement="center" size="2xl" scrollBehavior="inside">
        <ModalContent>
          <form onSubmit={handleEmpSubmit}>
            <ModalHeader>{editingEmp ? t("payroll.editEmployee") : t("payroll.addEmployee")}</ModalHeader>
            <ModalBody className="gap-3">
              {/* Name */}
              <div className="flex gap-3">
                <Input label={t("payroll.firstName")} value={eFirstName}
                  onValueChange={(v) => { setEFirstName(v); setEErr(""); }}
                  isInvalid={!!eErr && !eFirstName.trim()} size="sm" className="flex-1" />
                <Input label={t("payroll.middleInitial")} maxLength={1} placeholder="M"
                  value={eMiddle} onValueChange={(v) => setEMiddle(v.toUpperCase())}
                  size="sm" className="w-20" />
                <Input label={t("payroll.lastName")} value={eLastName}
                  onValueChange={(v) => { setELastName(v); setEErr(""); }}
                  isInvalid={!!eErr && !eLastName.trim()} size="sm" className="flex-1" />
              </div>
              {/* Job + SSN */}
              <div className="flex gap-3">
                <Input label={t("payroll.jobTitle")} value={eTitle} onValueChange={setETitle} size="sm" className="flex-1" />
                <Input label={t("payroll.department")} value={eDept} onValueChange={setEDept} size="sm" className="flex-1" />
              </div>
              {/* Address */}
              <Input label={t("payroll.street")} placeholder="123 Main St"
                value={eStreet} onValueChange={setEStreet} size="sm" />
              <div className="flex gap-3">
                <Input label={t("payroll.city")} value={eCity} onValueChange={setECity} size="sm" className="flex-1" />
                <Input label={t("payroll.state")} placeholder="CA" maxLength={2}
                  value={eState} onValueChange={(v) => setEState(v.toUpperCase())} size="sm" className="w-20" />
                <Input label={t("payroll.zip")} value={eZip} onValueChange={setEZip} size="sm" className="w-32" />
              </div>
              {/* Start date + SSN */}
              <div className="flex gap-3">
                <Input type="date" label={t("payroll.startDate")} value={eStartDate} onValueChange={setEStartDate} size="sm" className="flex-1" />
                <Input label={t("payroll.ssn")} placeholder="XXX-XX-XXXX"
                  value={eSsn} onValueChange={(v) => setESsn(formatSSN(v))}
                  size="sm" className="flex-1"
                  description="Stored locally, displayed masked" />
              </div>

              {/* Pay */}
              <Divider />
              <p className="text-xs font-semibold text-default-500 uppercase tracking-wide">Pay</p>
              <div className="flex gap-3">
                <Select label={t("payroll.payType")} selectedKeys={[ePayType]}
                  onSelectionChange={(k) => setEPayType([...k][0] as "salary" | "hourly")} size="sm" className="flex-1">
                  <SelectItem key="salary">{t("payroll.payTypeSalary")}</SelectItem>
                  <SelectItem key="hourly">{t("payroll.payTypeHourly")}</SelectItem>
                </Select>
                <Input label={t("payroll.payRate")} type="number" min="0" step="0.01"
                  description={ePayType === "salary" ? t("payroll.payRateSalaryHint") : t("payroll.payRateHourlyHint")}
                  value={ePayRate} onValueChange={(v) => { setEPayRate(v); setEErr(""); }}
                  isInvalid={!!eErr && !(Number(ePayRate) > 0)} size="sm" className="flex-1" />
                <Select label={t("payroll.payFrequency")} selectedKeys={[eFreq]}
                  onSelectionChange={(k) => setEFreq([...k][0] as PayFrequency)} size="sm" className="flex-1">
                  <SelectItem key="weekly">{t("payroll.freqWeekly")}</SelectItem>
                  <SelectItem key="biweekly">{t("payroll.freqBiweekly")}</SelectItem>
                  <SelectItem key="monthly">{t("payroll.freqMonthly")}</SelectItem>
                </Select>
              </div>
              <Input label={t("payroll.standardWeeklyHours")} type="number" min="1" max="168" step="0.5"
                description={t("payroll.standardWeeklyHoursHint")}
                value={eStdHours} onValueChange={setEStdHours} size="sm" className="w-48" />

              {/* Tax */}
              <Divider />
              <p className="text-xs font-semibold text-default-500 uppercase tracking-wide">Tax Withholding</p>
              <div className="flex gap-3">
                <Select label={t("payroll.filingStatus")} selectedKeys={[eFilingStatus]}
                  onSelectionChange={(k) => setEFilingStatus([...k][0] as FilingStatus)} size="sm" className="flex-1">
                  <SelectItem key="single">{t("payroll.filingSingle")}</SelectItem>
                  <SelectItem key="married">{t("payroll.filingMarried")}</SelectItem>
                  <SelectItem key="head">{t("payroll.filingHead")}</SelectItem>
                </Select>
                <Input label={t("payroll.additionalFed")} type="number" min="0" step="0.01"
                  value={eAddlFed} onValueChange={setEAddlFed} size="sm" className="flex-1" />
              </div>
              <div className="flex gap-3">
                <Input label={t("payroll.stateRate")} type="number" min="0" max="20" step="0.01" placeholder="e.g. 5.25"
                  value={eStateRate} onValueChange={setEStateRate} size="sm" className="flex-1" />
                <Input label={t("payroll.additionalState")} type="number" min="0" step="0.01"
                  value={eAddlState} onValueChange={setEAddlState} size="sm" className="flex-1" />
              </div>

              {/* Pre-tax deductions */}
              <Divider />
              <p className="text-xs font-semibold text-default-500 uppercase tracking-wide">Pre-Tax Deductions (per period)</p>
              <div className="flex gap-3">
                <Input label={t("payroll.healthPremium")} type="number" min="0" step="0.01"
                  value={eHealth} onValueChange={setEHealth} size="sm" className="flex-1" />
                <Input label={t("payroll.dentalPremium")} type="number" min="0" step="0.01"
                  value={eDental} onValueChange={setEDental} size="sm" className="flex-1" />
                <Input label={t("payroll.visionPremium")} type="number" min="0" step="0.01"
                  value={eVision} onValueChange={setEVision} size="sm" className="flex-1" />
              </div>
              <div className="flex gap-3">
                <Input label={t("payroll.retirement401k")} type="number" min="0" max="100" step="0.5" placeholder="e.g. 6"
                  value={e401k} onValueChange={setE401k} size="sm" className="flex-1" />
                <Input label={t("payroll.hsaContrib")} type="number" min="0" step="0.01"
                  value={eHsa} onValueChange={setEHsa} size="sm" className="flex-1" />
              </div>

              {/* Post-tax */}
              <Divider />
              <p className="text-xs font-semibold text-default-500 uppercase tracking-wide">Post-Tax Deductions (per period)</p>
              <div className="flex gap-3">
                <Input label={t("payroll.garnishment")} type="number" min="0" step="0.01"
                  value={eGarn} onValueChange={setEGarn} size="sm" className="flex-1" />
                <Input label={t("payroll.otherPostTax")} type="number" min="0" step="0.01"
                  value={eOtherPost} onValueChange={setEOtherPost} size="sm" className="flex-1" />
              </div>

              {/* Active toggle */}
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={eIsActive} onChange={(e) => setEIsActive(e.target.checked)} className="rounded" />
                <span className="text-sm text-default-700">{t("payroll.isActive")}</span>
              </label>

              {eErr && <p className="text-xs text-danger-600">{eErr}</p>}
            </ModalBody>
            <ModalFooter>
              <Button variant="flat" onPress={empModal.onClose}>{t("cancel")}</Button>
              <Button color="primary" type="submit">{editingEmp ? t("save") : t("add")}</Button>
            </ModalFooter>
          </form>
        </ModalContent>
      </Modal>

      {/* ── Pay Run Wizard Modal ── */}
      <Modal isOpen={wizardModal.isOpen} onClose={wizardModal.onClose} placement="center"
        size={wizardStep === "review" ? "5xl" : "md"} scrollBehavior="inside">
        <ModalContent>
          <ModalHeader>
            {t("payroll.runPayroll")} — {wizardStep === "setup" ? "1/2 Setup" : "2/2 Review"}
          </ModalHeader>
          <ModalBody className="gap-3">
            {wizardStep === "setup" && (
              <>
                <div className="flex gap-3">
                  <SegmentedDateInput key={`pf-${wizardKey}`} label={t("payroll.periodFrom")} value={wPeriodFrom}
                    onChange={(v) => { setWPeriodFrom(v); setWErr(""); }} className="flex-1" />
                  <SegmentedDateInput key={`pt-${wizardKey}`} label={t("payroll.periodTo")} value={wPeriodTo}
                    onChange={(v) => { setWPeriodTo(v); setWErr(""); }} className="flex-1" />
                </div>
                <SegmentedDateInput key={`pd-${wizardKey}`} label={t("payroll.payDate")} value={wPayDate}
                  onChange={(v) => { setWPayDate(v); setWErr(""); }} />
                <Select label={t("payroll.frequency")} selectedKeys={[wFreq]}
                  onSelectionChange={(k) => setWFreq([...k][0] as PayFrequency)} size="sm">
                  <SelectItem key="weekly">{t("payroll.freqWeekly")}</SelectItem>
                  <SelectItem key="biweekly">{t("payroll.freqBiweekly")}</SelectItem>
                  <SelectItem key="monthly">{t("payroll.freqMonthly")}</SelectItem>
                </Select>

                <Divider />
                <p className="text-xs font-semibold text-default-500 uppercase tracking-wide">{t("payroll.selectEmployees")}</p>
                <div className="space-y-1.5">
                  {activeEmployees.map((emp) => (
                    <label key={emp.id} className="flex items-center gap-2 cursor-pointer hover:bg-default-50 px-2 py-1.5 rounded-lg">
                      <input type="checkbox"
                        checked={wSelectedIds.has(emp.id)}
                        onChange={(e) => {
                          const next = new Set(wSelectedIds);
                          e.target.checked ? next.add(emp.id) : next.delete(emp.id);
                          setWSelectedIds(next);
                        }}
                        className="rounded"
                      />
                      <span className="text-sm text-default-800">{empFullName(emp)}</span>
                      {emp.jobTitle && <span className="text-xs text-default-400">{emp.jobTitle}</span>}
                    </label>
                  ))}
                </div>

                <Input label="Notes (optional)" value={wNotes} onValueChange={setWNotes} size="sm" />
                {wErr && <p className="text-xs text-danger-600">{wErr}</p>}
              </>
            )}

            {wizardStep === "review" && (
              <>
                <p className="text-xs text-default-500">{t("payroll.reviewCalc")}</p>

                {/* ── Hours entry — hourly employees only ────────────────── */}
                {wLines.some((l) => employees.find((e) => e.id === l.employeeId)?.payType === "hourly") && (
                  <div>
                    <p className="text-xs font-semibold text-default-500 uppercase tracking-wide mb-2">{t("payroll.hoursEntry")}</p>
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs border-collapse">
                        <thead>
                          <tr className="bg-default-50 border-b border-default-200">
                            <th className="text-left px-3 py-2 font-medium text-default-500">Employee</th>
                            <th className="text-right px-2 py-2 font-medium text-default-500">{t("payroll.regularHours")}</th>
                            <th className="text-right px-2 py-2 font-medium text-default-500">{t("payroll.overtimeHours")}</th>
                            <th className="text-center px-2 py-2 font-medium text-default-500">{t("payroll.overtimeRate")}</th>
                            <th className="text-right px-2 py-2 font-medium text-default-500">{t("payroll.holidayHours")}</th>
                            <th className="text-right px-2 py-2 font-medium text-default-500">{t("payroll.sickHours")}</th>
                            <th className="text-right px-2 py-2 font-medium text-default-500">{t("payroll.vacationHours")}</th>
                            <th className="text-right px-3 py-2 font-medium text-default-500">{t("payroll.grossPay")}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {wLines
                            .filter((l) => employees.find((e) => e.id === l.employeeId)?.payType === "hourly")
                            .map((line) => {
                              const emp = employees.find((e) => e.id === line.employeeId);
                              const emp2 = employees.find((e) => e.id === line.employeeId);
                              const wkHrs2 = emp2?.standardWeeklyHours ?? company.standardWeeklyHours ?? 40;
                              const hrs = wHours[line.employeeId] ?? defaultHours(wkHrs2, wFreq);
                              const inp = "w-16 text-right bg-default-50 border border-default-200 rounded px-1 py-0.5 text-xs tabular-nums focus:outline-none focus:border-primary";
                              return (
                                <tr key={line.employeeId} className="border-b border-default-100">
                                  <td className="px-3 py-2 font-medium text-default-800">{emp ? empFullName(emp) : "—"}</td>
                                  <td className="px-2 py-1.5">
                                    <input type="number" min="0" step="0.5" className={inp} value={hrs.regular}
                                      onFocus={(e) => e.target.select()}
                                      onChange={(e) => updateLineHours(line.employeeId, { ...hrs, regular: parseFloat(e.target.value) || 0 })} />
                                  </td>
                                  <td className="px-2 py-1.5">
                                    <input type="number" min="0" step="0.5" className={inp} value={hrs.overtime}
                                      onFocus={(e) => e.target.select()}
                                      onChange={(e) => updateLineHours(line.employeeId, { ...hrs, overtime: parseFloat(e.target.value) || 0 })} />
                                  </td>
                                  <td className="px-2 py-1.5 text-center">
                                    <select
                                      className="bg-default-50 border border-default-200 rounded px-1 py-0.5 text-xs focus:outline-none focus:border-primary"
                                      value={hrs.overtimeMultiplier}
                                      onChange={(e) => updateLineHours(line.employeeId, { ...hrs, overtimeMultiplier: parseFloat(e.target.value) as 1.5 | 2.0 })}
                                    >
                                      <option value={1.5}>1.5×</option>
                                      <option value={2.0}>2.0×</option>
                                    </select>
                                  </td>
                                  <td className="px-2 py-1.5">
                                    <input type="number" min="0" step="0.5" className={inp} value={hrs.holiday}
                                      onFocus={(e) => e.target.select()}
                                      onChange={(e) => updateLineHours(line.employeeId, { ...hrs, holiday: parseFloat(e.target.value) || 0 })} />
                                  </td>
                                  <td className="px-2 py-1.5">
                                    <input type="number" min="0" step="0.5" className={inp} value={hrs.sick}
                                      onFocus={(e) => e.target.select()}
                                      onChange={(e) => updateLineHours(line.employeeId, { ...hrs, sick: parseFloat(e.target.value) || 0 })} />
                                  </td>
                                  <td className="px-2 py-1.5">
                                    <input type="number" min="0" step="0.5" className={inp} value={hrs.vacation}
                                      onFocus={(e) => e.target.select()}
                                      onChange={(e) => updateLineHours(line.employeeId, { ...hrs, vacation: parseFloat(e.target.value) || 0 })} />
                                  </td>
                                  <td className="px-3 py-2 text-right tabular-nums font-semibold text-default-800">{fmt(line.grossPay)}</td>
                                </tr>
                              );
                            })}
                        </tbody>
                      </table>
                    </div>
                    <Divider className="my-2" />
                  </div>
                )}

                {/* Scrollable review table */}
                <div className="overflow-x-auto">
                  <table className="w-full text-xs border-collapse">
                    <thead>
                      <tr className="bg-default-50 border-b border-default-200">
                        <th className="text-left px-3 py-2 font-medium text-default-500">Employee</th>
                        <th className="text-right px-2 py-2 font-medium text-default-500">{t("payroll.grossPay")}</th>
                        <th className="text-right px-2 py-2 font-medium text-default-500">{t("payroll.preTaxDed")}</th>
                        <th className="text-right px-2 py-2 font-medium text-default-500">{t("payroll.federalTax")}</th>
                        <th className="text-right px-2 py-2 font-medium text-default-500">{t("payroll.fica")}</th>
                        <th className="text-right px-2 py-2 font-medium text-default-500">{t("payroll.stateTax")}</th>
                        <th className="text-right px-2 py-2 font-medium text-default-500">{t("payroll.postTaxDed")}</th>
                        <th className="text-right px-3 py-2 font-medium text-default-500">{t("payroll.netPay")}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {wLines.map((line) => {
                        const emp = employees.find((e) => e.id === line.employeeId);
                        return (
                          <tr key={line.employeeId} className="border-b border-default-100">
                            <td className="px-3 py-2 font-medium text-default-800">{emp ? empFullName(emp) : "—"}</td>
                            <td className="px-2 py-1.5">
                              <input className="w-24 text-right bg-default-50 border border-default-200 rounded px-1 py-0.5 text-xs tabular-nums focus:outline-none focus:border-primary"
                                type="number" step="0.01" defaultValue={line.grossPay}
                                onFocus={(e) => e.target.select()}
                                onBlur={(e) => updateLineField(line.employeeId, "grossPay", e.target.value)} />
                            </td>
                            <td className="px-2 py-2 text-right tabular-nums">{fmt(line.totalPreTax)}</td>
                            <td className="px-2 py-1.5">
                              <input className="w-20 text-right bg-default-50 border border-default-200 rounded px-1 py-0.5 text-xs tabular-nums focus:outline-none focus:border-primary"
                                type="number" step="0.01" defaultValue={line.federalIncomeTax}
                                onFocus={(e) => e.target.select()}
                                onBlur={(e) => updateLineField(line.employeeId, "federalIncomeTax", e.target.value)} />
                            </td>
                            <td className="px-2 py-2 text-right tabular-nums">{fmt(line.socialSecurityTax + line.medicareTax)}</td>
                            <td className="px-2 py-1.5">
                              <input className="w-20 text-right bg-default-50 border border-default-200 rounded px-1 py-0.5 text-xs tabular-nums focus:outline-none focus:border-primary"
                                type="number" step="0.01" defaultValue={line.stateIncomeTax}
                                onFocus={(e) => e.target.select()}
                                onBlur={(e) => updateLineField(line.employeeId, "stateIncomeTax", e.target.value)} />
                            </td>
                            <td className="px-2 py-2 text-right tabular-nums">{fmt(line.garnishment + line.otherPostTax)}</td>
                            <td className="px-3 py-2 text-right tabular-nums font-bold text-success-700">{fmt(line.netPay)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot>
                      <tr className="bg-default-50 border-t-2 border-default-300 font-bold">
                        <td className="px-3 py-2 text-default-600">TOTALS</td>
                        <td className="px-2 py-2 text-right tabular-nums">{fmt(totals.totalGross)}</td>
                        <td className="px-2 py-2 text-right tabular-nums">{fmt(totals.totalPreTax)}</td>
                        <td className="px-2 py-2 text-right tabular-nums">{fmt(totals.totalFederalIncomeTax)}</td>
                        <td className="px-2 py-2 text-right tabular-nums">{fmt(totals.totalSocialSecurity + totals.totalMedicare)}</td>
                        <td className="px-2 py-2 text-right tabular-nums">{fmt(totals.totalStateIncomeTax)}</td>
                        <td className="px-2 py-2 text-right tabular-nums">{fmt(totals.totalGarnishment + totals.totalOtherPostTax)}</td>
                        <td className="px-3 py-2 text-right tabular-nums text-success-700">{fmt(totals.totalNetPay)}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>

                {/* Employer cost summary */}
                <div className="rounded-xl bg-default-50 px-4 py-3 text-xs text-default-600 space-y-1">
                  <div className="flex justify-between">
                    <span>Gross Wages</span><span className="tabular-nums">{fmt(totals.totalGross)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Employer SS + Medicare</span><span className="tabular-nums">{fmt(totals.totalEmployerSS + totals.totalEmployerMedicare)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>FUTA</span><span className="tabular-nums">{fmt(totals.totalFuta)}</span>
                  </div>
                  <div className="flex justify-between font-semibold border-t border-default-200 pt-1 mt-1 text-default-800">
                    <span>{t("payroll.totalCost")}</span><span className="tabular-nums">{fmt(totals.totalCost)}</span>
                  </div>
                </div>

                <p className="text-xs text-default-400">{t("payroll.disclaimer")}</p>
              </>
            )}
          </ModalBody>
          <ModalFooter>
            {wizardStep === "setup" ? (
              <>
                <Button variant="flat" onPress={wizardModal.onClose}>{t("cancel")}</Button>
                <Button color="primary" onPress={wizardNext}>Next →</Button>
              </>
            ) : (
              <>
                <Button variant="flat" onPress={() => setWizardStep("setup")}>← Back</Button>
                <Button color="success" startContent={<CheckCircle size={14} />} onPress={handleApprove}>
                  {t("payroll.approve")}
                </Button>
              </>
            )}
          </ModalFooter>
        </ModalContent>
      </Modal>
    </div>
  );
}

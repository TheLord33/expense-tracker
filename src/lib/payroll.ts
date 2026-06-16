"use client";

import type { Employee, FilingStatus, PayFrequency, PayRun, PayRunLine } from "./types";

// ── Constants (2025) ──────────────────────────────────────────────────────────
// Source: IRS Publication 15-T (2025). Verify annually for current year values.

export const PERIODS_PER_YEAR: Record<PayFrequency, number> = {
  weekly:    52,
  biweekly:  26,
  monthly:   12,
};

export const SS_WAGE_BASE   = 176100; // 2025 Social Security wage base
export const SS_RATE        = 0.062;  // employee + employer each
export const MEDICARE_RATE  = 0.0145; // employee + employer each
export const ADD_MEDICARE_THRESHOLD = 200000; // additional 0.9% for individual
export const FUTA_WAGE_BASE = 7000;
export const FUTA_RATE      = 0.006;  // net FUTA after state credit

// ── Federal withholding brackets (annual, Percentage Method, Standard) ────────
// Source: IRS Publication 15-T, 2025 — verify annually.

interface Bracket { over: number; upto: number; base: number; rate: number }

const FED_BRACKETS: Record<FilingStatus, Bracket[]> = {
  single: [
    { over: 0,       upto: 6300,    base: 0,        rate: 0.10 },
    { over: 6300,    upto: 18400,   base: 630,      rate: 0.12 },
    { over: 18400,   upto: 41775,   base: 2082,     rate: 0.22 },
    { over: 41775,   upto: 88225,   base: 7226.50,  rate: 0.24 },
    { over: 88225,   upto: 103350,  base: 18369.50, rate: 0.32 },
    { over: 103350,  upto: 197300,  base: 23289.50, rate: 0.35 },
    { over: 197300,  upto: Infinity,base: 56241.50, rate: 0.37 },
  ],
  married: [
    { over: 0,       upto: 12600,   base: 0,        rate: 0.10 },
    { over: 12600,   upto: 36800,   base: 1260,     rate: 0.12 },
    { over: 36800,   upto: 83550,   base: 4164,     rate: 0.22 },
    { over: 83550,   upto: 176450,  base: 14453,    rate: 0.24 },
    { over: 176450,  upto: 206700,  base: 36739,    rate: 0.32 },
    { over: 206700,  upto: 394600,  base: 46419,    rate: 0.35 },
    { over: 394600,  upto: Infinity,base: 112483,   rate: 0.37 },
  ],
  head: [
    { over: 0,       upto: 9450,    base: 0,        rate: 0.10 },
    { over: 9450,    upto: 24750,   base: 945,      rate: 0.12 },
    { over: 24750,   upto: 54000,   base: 2781,     rate: 0.22 },
    { over: 54000,   upto: 99950,   base: 9216,     rate: 0.24 },
    { over: 99950,   upto: 115500,  base: 22240,    rate: 0.32 },
    { over: 115500,  upto: 209325,  base: 27216,    rate: 0.35 },
    { over: 209325,  upto: Infinity,base: 60162,    rate: 0.37 },
  ],
};

function federalWithholding(
  perPeriodTaxableWages: number,
  frequency: PayFrequency,
  filingStatus: FilingStatus,
  additionalWithholding = 0
): number {
  const periods       = PERIODS_PER_YEAR[frequency] ?? 26;
  const annualized    = perPeriodTaxableWages * periods;
  const brackets      = FED_BRACKETS[filingStatus] ?? FED_BRACKETS.single;
  const bracket       = brackets.findLast((b) => annualized > b.over) ?? brackets[0];
  const annualTax     = bracket.base + (annualized - bracket.over) * bracket.rate;
  const perPeriodTax  = Math.max(0, annualTax / periods);
  return round2(perPeriodTax + additionalWithholding);
}

function round2(n: number): number { return Math.round(n * 100) / 100; }

// ── YTD helpers ───────────────────────────────────────────────────────────────

/** Returns the year-to-date gross wages for an employee from prior approved pay runs in the same calendar year. */
export function ytdWages(
  employeeId: string,
  payRuns: PayRun[],
  beforeRunId?: string
): number {
  const year = new Date().getFullYear().toString();
  return payRuns
    .filter(
      (r) =>
        r.status === "approved" &&
        r.payDate.startsWith(year) &&
        r.id !== beforeRunId
    )
    .flatMap((r) => r.lines)
    .filter((l) => l.employeeId === employeeId)
    .reduce((s, l) => s + l.grossPay, 0);
}

// ── Hours input ───────────────────────────────────────────────────────────────

export interface HoursInput {
  regular: number;
  overtime: number;
  overtimeMultiplier: 1.5 | 2.0;
  holiday: number;
  sick: number;
  vacation: number;
}

export function defaultHours(freq: PayFrequency): HoursInput {
  const reg = freq === "weekly" ? 40 : freq === "biweekly" ? 80 : 173;
  return { regular: reg, overtime: 0, overtimeMultiplier: 1.5, holiday: 0, sick: 0, vacation: 0 };
}

// ── Per-employee calculation ───────────────────────────────────────────────────

export function calculatePayRunLine(
  employee: Employee,
  priorYTDGross: number,
  hoursOverride?: Partial<HoursInput>
): PayRunLine {
  const periods = PERIODS_PER_YEAR[employee.payFrequency] ?? 26;

  // ── Gross pay ─────────────────────────────────────────────────────────────
  let regularPay: number;
  let overtimePay = 0;
  let holidayPay: number | undefined;
  let sickPay: number | undefined;
  let vacationPay: number | undefined;
  let regularHours: number | undefined;
  let overtimeHours: number | undefined;
  let overtimeMultiplier: 1.5 | 2.0 | undefined;
  let holidayHours: number | undefined;
  let sickHours: number | undefined;
  let vacationHours: number | undefined;

  if (employee.payType === "hourly") {
    const hrs = defaultHours(employee.payFrequency);
    const reg  = hoursOverride?.regular            ?? hrs.regular;
    const ot   = hoursOverride?.overtime           ?? 0;
    const mult = hoursOverride?.overtimeMultiplier ?? 1.5;
    const hol  = hoursOverride?.holiday            ?? 0;
    const sck  = hoursOverride?.sick               ?? 0;
    const vac  = hoursOverride?.vacation           ?? 0;
    regularHours      = reg;
    overtimeHours     = ot;
    overtimeMultiplier = mult;
    holidayHours      = hol;
    sickHours         = sck;
    vacationHours     = vac;
    regularPay        = round2(reg  * employee.payRate);
    overtimePay       = round2(ot   * employee.payRate * mult);
    holidayPay        = round2(hol  * employee.payRate);
    sickPay           = round2(sck  * employee.payRate);
    vacationPay       = round2(vac  * employee.payRate);
  } else {
    regularPay = round2(employee.payRate / periods);
  }
  const grossPay = round2(regularPay + overtimePay + (holidayPay ?? 0) + (sickPay ?? 0) + (vacationPay ?? 0));

  // ── Pre-tax deductions ────────────────────────────────────────────────────
  const healthPremium  = round2(employee.healthPremium  ?? 0);
  const dentalPremium  = round2(employee.dentalPremium  ?? 0);
  const visionPremium  = round2(employee.visionPremium  ?? 0);
  const retirement401k = round2(grossPay * (employee.retirement401kPct ?? 0));
  const hsa            = round2(employee.hsaContrib     ?? 0);
  const totalPreTax    = round2(healthPremium + dentalPremium + visionPremium + retirement401k + hsa);
  const taxableWages   = round2(Math.max(0, grossPay - totalPreTax));

  // ── Federal income tax ────────────────────────────────────────────────────
  const federalIncomeTax = federalWithholding(
    taxableWages,
    employee.payFrequency,
    employee.filingStatus,
    employee.additionalFedWithholding ?? 0
  );

  // ── FICA (employee) ───────────────────────────────────────────────────────
  const ssWagesThisPeriod = Math.max(0, Math.min(grossPay, SS_WAGE_BASE - priorYTDGross));
  const socialSecurityTax = round2(ssWagesThisPeriod * SS_RATE);
  const medicareTax       = round2(grossPay * MEDICARE_RATE);

  // ── State income tax ──────────────────────────────────────────────────────
  const stateIncomeTax = round2(
    taxableWages * (employee.stateRate ?? 0) + (employee.additionalStateWithholding ?? 0)
  );

  // ── Total employee withholding ────────────────────────────────────────────
  const totalEmployeeWithholding = round2(
    federalIncomeTax + socialSecurityTax + medicareTax + stateIncomeTax
  );

  // ── Post-tax deductions ───────────────────────────────────────────────────
  const garnishment  = round2(employee.garnishment  ?? 0);
  const otherPostTax = round2(employee.otherPostTax ?? 0);

  // ── Net pay ───────────────────────────────────────────────────────────────
  const netPay = round2(
    grossPay - totalPreTax - totalEmployeeWithholding - garnishment - otherPostTax
  );

  // ── Employer taxes ────────────────────────────────────────────────────────
  const employerSocialSecurity = socialSecurityTax; // same rate as employee
  const employerMedicare       = medicareTax;        // same rate as employee

  // FUTA: 0.6% on first $7,000 (net of state credit)
  const futaEligible = Math.max(0, Math.min(grossPay, FUTA_WAGE_BASE - priorYTDGross));
  const futa         = round2(futaEligible * FUTA_RATE);

  const totalEmployerTax = round2(employerSocialSecurity + employerMedicare + futa);

  return {
    employeeId: employee.id,
    regularHours, overtimeHours, overtimeMultiplier,
    holidayHours, sickHours, vacationHours,
    regularPay, overtimePay, holidayPay, sickPay, vacationPay, grossPay,
    healthPremium, dentalPremium, visionPremium, retirement401k, hsa,
    totalPreTax, taxableWages,
    federalIncomeTax, socialSecurityTax, medicareTax, stateIncomeTax,
    totalEmployeeWithholding,
    garnishment, otherPostTax,
    netPay,
    employerSocialSecurity, employerMedicare, futa, totalEmployerTax,
  };
}

// ── Pay run totals ────────────────────────────────────────────────────────────

export interface PayRunTotals {
  totalGross:              number;
  totalPreTax:             number;
  totalFederalIncomeTax:   number;
  totalSocialSecurity:     number;
  totalMedicare:           number;
  totalStateIncomeTax:     number;
  totalEmployeeWithholding:number;
  totalGarnishment:        number;
  totalOtherPostTax:       number;
  totalNetPay:             number;
  totalEmployerSS:         number;
  totalEmployerMedicare:   number;
  totalFuta:               number;
  totalEmployerTax:        number;
  totalCost:               number; // gross + employer taxes
}

export function payRunTotals(lines: PayRunLine[]): PayRunTotals {
  const sum = (fn: (l: PayRunLine) => number) => round2(lines.reduce((s, l) => s + fn(l), 0));
  const totalGross               = sum((l) => l.grossPay);
  const totalPreTax              = sum((l) => l.totalPreTax);
  const totalFederalIncomeTax    = sum((l) => l.federalIncomeTax);
  const totalSocialSecurity      = sum((l) => l.socialSecurityTax);
  const totalMedicare            = sum((l) => l.medicareTax);
  const totalStateIncomeTax      = sum((l) => l.stateIncomeTax);
  const totalEmployeeWithholding = sum((l) => l.totalEmployeeWithholding);
  const totalGarnishment         = sum((l) => l.garnishment);
  const totalOtherPostTax        = sum((l) => l.otherPostTax);
  const totalNetPay              = sum((l) => l.netPay);
  const totalEmployerSS          = sum((l) => l.employerSocialSecurity);
  const totalEmployerMedicare    = sum((l) => l.employerMedicare);
  const totalFuta                = sum((l) => l.futa);
  const totalEmployerTax         = sum((l) => l.totalEmployerTax);
  const totalCost                = round2(totalGross + totalEmployerTax);
  return {
    totalGross, totalPreTax,
    totalFederalIncomeTax, totalSocialSecurity, totalMedicare, totalStateIncomeTax,
    totalEmployeeWithholding, totalGarnishment, totalOtherPostTax, totalNetPay,
    totalEmployerSS, totalEmployerMedicare, totalFuta, totalEmployerTax, totalCost,
  };
}

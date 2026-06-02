"use client";

import { useState, useMemo, useEffect } from "react";
import {
  Card, CardBody, CardHeader, Divider,
  Input, Select, SelectItem, Button,
} from "@nextui-org/react";
import { ArrowRight } from "lucide-react";
import { useLanguage, useCurrency } from "@/app/providers";

type CalcMode = "loan" | "compound" | "breakeven" | "roi";

interface RoiPrefill { investment: string; years: string; netReturn: string }

// ── Math helpers ──────────────────────────────────────────────────────────────

function loanCalc(principal: number, annualRate: number, termMonths: number) {
  if (principal <= 0 || termMonths <= 0) return null;
  if (annualRate === 0) {
    const pmt = principal / termMonths;
    return { payment: pmt, totalPayment: principal, totalInterest: 0 };
  }
  const r = annualRate / 100 / 12;
  const n = termMonths;
  const pmt = (principal * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
  return { payment: pmt, totalPayment: pmt * n, totalInterest: pmt * n - principal };
}

function loanSchedule(principal: number, annualRate: number, termMonths: number) {
  const r = annualRate / 100 / 12;
  const n = termMonths;
  const pmt = annualRate === 0
    ? principal / n
    : (principal * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
  let bal = principal;
  const rows: { month: number; payment: number; principalPaid: number; interestPaid: number; balance: number }[] = [];
  for (let i = 1; i <= n; i++) {
    const interest = bal * r;
    const princ = pmt - interest;
    bal = Math.max(0, bal - princ);
    rows.push({ month: i, payment: pmt, principalPaid: princ, interestPaid: interest, balance: bal });
  }
  return rows;
}

function compoundCalc(start: number, annualRate: number, years: number, freq: number, monthlyContrib: number) {
  if (start < 0 || annualRate < 0 || years <= 0) return null;
  const r = annualRate / 100 / freq;
  const rows: { year: number; balance: number; contributions: number; growth: number }[] = [];
  let bal = start;
  let contributions = start;
  for (let y = 1; y <= years; y++) {
    for (let p = 0; p < freq; p++) {
      bal = bal * (1 + r) + monthlyContrib * (12 / freq);
      contributions += monthlyContrib * (12 / freq);
    }
    rows.push({ year: y, balance: bal, contributions, growth: bal - contributions });
  }
  return { futureValue: bal, totalContribs: contributions, totalGrowth: bal - contributions, rows };
}

function breakevenCalc(fixed: number, varCost: number, price: number) {
  if (price <= varCost) return null;
  const cm = price - varCost;
  const cmRatio = cm / price;
  const units = fixed / cm;
  return { cm, cmRatio, units, revenue: units * price };
}

function roiCalc(investment: number, netReturn: number, years: number) {
  if (investment <= 0) return null;
  const roi = (netReturn / investment) * 100;
  const annualized = years > 0 ? (Math.pow(1 + netReturn / investment, 1 / years) - 1) * 100 : null;
  const payback = netReturn > 0 && years > 0 ? investment / (netReturn / years) : null;
  return { roi, annualized, payback };
}

// ── Shared UI ─────────────────────────────────────────────────────────────────

function ResultRow({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className={`flex justify-between py-2 text-sm ${highlight ? "font-semibold" : ""}`}>
      <span className="text-default-600">{label}</span>
      <span className={highlight ? "text-indigo-600 text-base" : "text-default-800 font-medium"}>{value}</span>
    </div>
  );
}

function NumInput({ label, value, onChange, placeholder = "0" }: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string;
}) {
  return (
    <Input
      label={label}
      placeholder={placeholder}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      type="text"
      inputMode="decimal"
      size="sm"
    />
  );
}

// ── Loan Calculator ───────────────────────────────────────────────────────────

function LoanCalc({ onSendToROI }: { onSendToROI: (prefill: RoiPrefill) => void }) {
  const { t } = useLanguage();
  const { fmt } = useCurrency();
  const [principal, setPrincipal]     = useState("");
  const [rate, setRate]               = useState("");
  const [term, setTerm]               = useState("");
  const [showSchedule, setShowSchedule] = useState(false);

  const p = parseFloat(principal) || 0;
  const r = parseFloat(rate)      || 0;
  const n = parseInt(term)        || 0;

  const result   = useMemo(() => loanCalc(p, r, n), [p, r, n]);
  const schedule = useMemo(
    () => showSchedule && result ? loanSchedule(p, r, n) : [],
    [p, r, n, showSchedule, result]
  );

  const TERMS = [12, 24, 36, 48, 60, 84, 120, 180, 240, 360];

  return (
    <div className="space-y-4">
      <Card shadow="sm">
        <CardBody className="p-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
          <NumInput label={t("finCalc.principal")} value={principal} onChange={setPrincipal} />
          <NumInput label={t("finCalc.annualRate")} value={rate} onChange={setRate} placeholder="5.5" />
          <Select
            label={t("finCalc.termMonths")}
            size="sm"
            selectedKeys={term ? [term] : []}
            onSelectionChange={(k) => setTerm([...k][0] as string)}
          >
            {TERMS.map((m) => (
              <SelectItem key={String(m)} textValue={`${m} ${t("finCalc.months")}`}>
                {m} {t("finCalc.months")}
              </SelectItem>
            ))}
          </Select>
        </CardBody>
      </Card>

      {result && (
        <Card shadow="sm">
          <CardHeader className="px-6 pt-4 pb-2 flex items-center justify-between">
            <h3 className="font-semibold text-default-800">{t("finCalc.results")}</h3>
            <Button
              size="sm"
              variant="flat"
              color="primary"
              endContent={<ArrowRight size={13} />}
              onPress={() => onSendToROI({
                investment: principal,
                years: n > 0 ? String(+(n / 12).toFixed(2)) : "",
                netReturn: result ? String(+result.totalInterest.toFixed(2)) : "",
              })}
            >
              {t("finCalc.sendToROI")}
            </Button>
          </CardHeader>
          <Divider />
          <CardBody className="px-6 py-3 space-y-1">
            <ResultRow label={t("finCalc.monthlyPayment")} value={fmt(result.payment)}       highlight />
            <ResultRow label={t("finCalc.totalPayment")}   value={fmt(result.totalPayment)} />
            <ResultRow label={t("finCalc.totalInterest")}  value={fmt(result.totalInterest)} />

            <div className="pt-2">
              <Button size="sm" variant="flat" onPress={() => setShowSchedule((s) => !s)}>
                {showSchedule ? t("finCalc.hideSchedule") : t("finCalc.showSchedule")}
              </Button>
            </div>

            {showSchedule && schedule.length > 0 && (
              <div className="mt-3 overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-default-400 border-b border-default-100">
                      <th className="text-left py-1 pr-3">{t("finCalc.month")}</th>
                      <th className="text-right py-1 pr-3">{t("finCalc.payment")}</th>
                      <th className="text-right py-1 pr-3">{t("finCalc.principalCol")}</th>
                      <th className="text-right py-1 pr-3">{t("finCalc.interestCol")}</th>
                      <th className="text-right py-1">{t("finCalc.balance")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {schedule.map((row) => (
                      <tr key={row.month} className="border-b border-default-50">
                        <td className="py-1 pr-3 text-default-500">{row.month}</td>
                        <td className="py-1 pr-3 text-right">{fmt(row.payment)}</td>
                        <td className="py-1 pr-3 text-right text-success-600">{fmt(row.principalPaid)}</td>
                        <td className="py-1 pr-3 text-right text-danger-500">{fmt(row.interestPaid)}</td>
                        <td className="py-1 text-right font-medium">{fmt(row.balance)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardBody>
        </Card>
      )}
    </div>
  );
}

// ── Compound Interest ─────────────────────────────────────────────────────────

function CompoundCalc() {
  const { t } = useLanguage();
  const { fmt } = useCurrency();
  const [start,   setStart]   = useState("");
  const [rate,    setRate]    = useState("");
  const [years,   setYears]   = useState("");
  const [freq,    setFreq]    = useState("12");
  const [monthly, setMonthly] = useState("0");

  const s = parseFloat(start)   || 0;
  const r = parseFloat(rate)    || 0;
  const y = parseInt(years)     || 0;
  const f = parseInt(freq)      || 12;
  const m = parseFloat(monthly) || 0;

  const result = useMemo(() => compoundCalc(s, r, y, f, m), [s, r, y, f, m]);

  const FREQS = [
    { key: "365", label: t("finCalc.freqDaily")     },
    { key: "12",  label: t("finCalc.freqMonthly")   },
    { key: "4",   label: t("finCalc.freqQuarterly") },
    { key: "1",   label: t("finCalc.freqYearly")    },
  ];

  return (
    <div className="space-y-4">
      <Card shadow="sm">
        <CardBody className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
          <NumInput label={t("finCalc.startAmount")}    value={start}   onChange={setStart} />
          <NumInput label={t("finCalc.annualReturn")}   value={rate}    onChange={setRate} placeholder="7" />
          <NumInput label={t("finCalc.years")}          value={years}   onChange={setYears} placeholder="10" />
          <Select
            label={t("finCalc.compFreq")}
            size="sm"
            selectedKeys={[freq]}
            onSelectionChange={(k) => setFreq([...k][0] as string)}
          >
            {FREQS.map((f) => (
              <SelectItem key={f.key} textValue={f.label}>{f.label}</SelectItem>
            ))}
          </Select>
          <NumInput label={t("finCalc.monthlyContrib")} value={monthly} onChange={setMonthly} placeholder="0" />
        </CardBody>
      </Card>

      {result && (
        <Card shadow="sm">
          <CardHeader className="px-6 pt-4 pb-2">
            <h3 className="font-semibold text-default-800">{t("finCalc.results")}</h3>
          </CardHeader>
          <Divider />
          <CardBody className="px-6 py-3 space-y-1">
            <ResultRow label={t("finCalc.futureValue")}   value={fmt(result.futureValue)}   highlight />
            <ResultRow label={t("finCalc.totalContribs")} value={fmt(result.totalContribs)} />
            <ResultRow label={t("finCalc.totalGrowth")}   value={fmt(result.totalGrowth)} />

            {result.rows.length > 0 && (
              <div className="mt-3 overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-default-400 border-b border-default-100">
                      <th className="text-left py-1 pr-3">{t("finCalc.year")}</th>
                      <th className="text-right py-1 pr-3">{t("finCalc.balance")}</th>
                      <th className="text-right py-1 pr-3">{t("finCalc.totalContribs")}</th>
                      <th className="text-right py-1">{t("finCalc.totalGrowth")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.rows.map((row) => (
                      <tr key={row.year} className="border-b border-default-50">
                        <td className="py-1 pr-3 text-default-500">{row.year}</td>
                        <td className="py-1 pr-3 text-right font-medium">{fmt(row.balance)}</td>
                        <td className="py-1 pr-3 text-right">{fmt(row.contributions)}</td>
                        <td className="py-1 text-right text-success-600">{fmt(row.growth)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardBody>
        </Card>
      )}
    </div>
  );
}

// ── Break-even Calculator ─────────────────────────────────────────────────────

function BreakevenCalc() {
  const { t } = useLanguage();
  const { fmt } = useCurrency();
  const [fixed,   setFixed]   = useState("");
  const [varCost, setVarCost] = useState("");
  const [price,   setPrice]   = useState("");

  const f = parseFloat(fixed)   || 0;
  const v = parseFloat(varCost) || 0;
  const p = parseFloat(price)   || 0;

  const invalidPrice = p > 0 && v > 0 && p <= v;
  const result = useMemo(() => (f > 0 && p > 0 && !invalidPrice) ? breakevenCalc(f, v, p) : null, [f, v, p, invalidPrice]);

  return (
    <div className="space-y-4">
      <Card shadow="sm">
        <CardBody className="p-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
          <NumInput label={t("finCalc.fixedCosts")} value={fixed}   onChange={setFixed} />
          <NumInput label={t("finCalc.varCost")}    value={varCost} onChange={setVarCost} />
          <Input
            label={t("finCalc.sellPrice")}
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            type="text"
            inputMode="decimal"
            size="sm"
            isInvalid={invalidPrice}
            errorMessage={invalidPrice ? t("finCalc.errorMargin") : undefined}
          />
        </CardBody>
      </Card>

      {result && (
        <Card shadow="sm">
          <CardHeader className="px-6 pt-4 pb-2">
            <h3 className="font-semibold text-default-800">{t("finCalc.results")}</h3>
          </CardHeader>
          <Divider />
          <CardBody className="px-6 py-3 space-y-1">
            <ResultRow label={t("finCalc.beUnits")}       value={result.units.toFixed(2) + " units"} highlight />
            <ResultRow label={t("finCalc.beRevenue")}     value={fmt(result.revenue)}                highlight />
            <ResultRow label={t("finCalc.contribMargin")} value={fmt(result.cm)} />
            <ResultRow label={t("finCalc.cmRatio")}       value={(result.cmRatio * 100).toFixed(1) + "%"} />
          </CardBody>
        </Card>
      )}
    </div>
  );
}

// ── ROI Calculator ────────────────────────────────────────────────────────────

function ROICalc({ prefill, onPrefillUsed }: { prefill: RoiPrefill | null; onPrefillUsed: () => void }) {
  const { t } = useLanguage();
  const [investment, setInvestment] = useState("");
  const [netReturn,  setNetReturn]  = useState("");
  const [years,      setYears]      = useState("");
  const [fromLoan,   setFromLoan]   = useState(false);

  useEffect(() => {
    if (!prefill) return;
    setInvestment(prefill.investment);
    setYears(prefill.years);
    setNetReturn(prefill.netReturn);
    setFromLoan(true);
    onPrefillUsed();
  }, [prefill]); // eslint-disable-line react-hooks/exhaustive-deps

  const inv = parseFloat(investment) || 0;
  const ret = parseFloat(netReturn)  || 0;
  const yrs = parseFloat(years)      || 0;

  const result = useMemo(() => inv > 0 ? roiCalc(inv, ret, yrs) : null, [inv, ret, yrs]);

  function fmtPct(n: number | null) {
    if (n === null) return t("finCalc.na");
    return (n >= 0 ? "+" : "") + n.toFixed(2) + "%";
  }

  function fmtYrs(n: number | null) {
    if (n === null || n <= 0) return t("finCalc.na");
    return n.toFixed(1) + " " + t("finCalc.yrs");
  }

  return (
    <div className="space-y-4">
      {fromLoan && (
        <div className="rounded-lg bg-indigo-50 dark:bg-indigo-900/20 px-4 py-2 text-sm text-indigo-700 dark:text-indigo-300">
          {t("finCalc.fromLoan")}
        </div>
      )}
      <Card shadow="sm">
        <CardBody className="p-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
          <NumInput label={t("finCalc.investment")} value={investment} onChange={(v) => { setInvestment(v); setFromLoan(false); }} />
          <NumInput label={t("finCalc.netReturn")}  value={netReturn}  onChange={setNetReturn} />
          <NumInput label={t("finCalc.timePeriod")} value={years}      onChange={(v) => { setYears(v); setFromLoan(false); }} placeholder={t("finCalc.optional")} />
        </CardBody>
      </Card>

      {result && (
        <Card shadow="sm">
          <CardHeader className="px-6 pt-4 pb-2">
            <h3 className="font-semibold text-default-800">{t("finCalc.results")}</h3>
          </CardHeader>
          <Divider />
          <CardBody className="px-6 py-3 space-y-1">
            <ResultRow label={t("finCalc.roiPct")}    value={fmtPct(result.roi)}       highlight />
            <ResultRow label={t("finCalc.annualROI")} value={fmtPct(result.annualized)} />
            <ResultRow label={t("finCalc.payback")}   value={fmtYrs(result.payback)} />
          </CardBody>
        </Card>
      )}
    </div>
  );
}

// ── Main Tab ──────────────────────────────────────────────────────────────────

export function FinCalcTab() {
  const { t } = useLanguage();
  const [mode, setMode]       = useState<CalcMode>("loan");
  const [roiPrefill, setRoiPrefill] = useState<RoiPrefill | null>(null);

  const MODES: { key: CalcMode; label: string }[] = [
    { key: "loan",      label: t("finCalc.loan")      },
    { key: "compound",  label: t("finCalc.compound")  },
    { key: "breakeven", label: t("finCalc.breakeven") },
    { key: "roi",       label: t("finCalc.roi")       },
  ];

  function handleSendToROI(prefill: RoiPrefill) {
    setRoiPrefill(prefill);
    setMode("roi");
  }

  return (
    <div className="space-y-4">
      <Card shadow="sm">
        <CardBody className="p-3">
          <div className="flex gap-2 flex-wrap">
            {MODES.map((m) => (
              <Button
                key={m.key}
                size="sm"
                variant={mode === m.key ? "solid" : "flat"}
                color={mode === m.key ? "primary" : "default"}
                onPress={() => setMode(m.key)}
                className={mode === m.key ? "bg-indigo-600 text-white" : ""}
              >
                {m.label}
              </Button>
            ))}
          </div>
        </CardBody>
      </Card>

      {mode === "loan"      && <LoanCalc onSendToROI={handleSendToROI} />}
      {mode === "compound"  && <CompoundCalc />}
      {mode === "breakeven" && <BreakevenCalc />}
      {mode === "roi"       && (
        <ROICalc
          prefill={roiPrefill}
          onPrefillUsed={() => setRoiPrefill(null)}
        />
      )}
    </div>
  );
}

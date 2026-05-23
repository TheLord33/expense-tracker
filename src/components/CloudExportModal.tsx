"use client";

import { useState, useMemo } from "react";
import {
  Modal, ModalContent, ModalHeader, ModalBody,
  Button, Input, Switch, Select, SelectItem, Divider, Chip,
  Tabs, Tab,
} from "@nextui-org/react";
import {
  Download, Mail, Link, Clock, Check, Copy, RefreshCw,
  Trash2, LayoutTemplate, History, Settings, FileText,
  BarChart2, Calendar, CloudUpload, Shield, QrCode,
} from "lucide-react";
import { Expense, CategoryDef, ExportDestination } from "@/lib/types";
import { toCSV, toJSON, toText, download } from "@/lib/importExport";
import { useLanguage } from "@/app/providers";
import { useExportHistory } from "@/lib/useExportHistory";
import { useBackupSchedule } from "@/lib/useBackupSchedule";

// ── Types ──────────────────────────────────────────────────────────────────────

type Format = "csv" | "json" | "txt" | "pdf";
type Template = "custom" | "tax-report" | "monthly-summary" | "category-analysis";
type StorageId = "dropbox" | "onedrive" | "googledrive";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  expenses: Expense[];
  categories: CategoryDef[];
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function today() { return new Date().toISOString().split("T")[0]; }
function thisMonthStart() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
}
function thisYearStart() { return `${new Date().getFullYear()}-01-01`; }

function generateToken(expenses: Expense[]): string {
  const payload = { n: expenses.length, ts: Date.now() };
  return btoa(JSON.stringify(payload)).replace(/[+/=]/g, "").slice(0, 14);
}

function fmtTime(iso: string, locale: string) {
  return new Date(iso).toLocaleString(locale, {
    month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

function nextBackupDate(freq: "daily" | "weekly" | "monthly", locale: string) {
  const d = new Date();
  if (freq === "daily") d.setDate(d.getDate() + 1);
  else if (freq === "weekly") d.setDate(d.getDate() + 7);
  else d.setMonth(d.getMonth() + 1);
  return d.toLocaleDateString(locale, { month: "short", day: "numeric", year: "numeric" });
}

// ── QR Code SVG ───────────────────────────────────────────────────────────────

function QRCodeSVG({ data, size = 140 }: { data: string; size?: number }) {
  const CELLS = 21;
  const CELL = Math.floor(size / CELLS);
  const S = CELLS * CELL;
  const PAD = CELL;

  let h = 5381;
  for (let i = 0; i < data.length; i++) h = ((h << 5) + h + data.charCodeAt(i)) >>> 0;

  const modules = Array.from({ length: CELLS }, (_, r) =>
    Array.from({ length: CELLS }, (_, c) => {
      if ((r < 8 && c < 8) || (r < 8 && c >= CELLS - 8) || (r >= CELLS - 8 && c < 8)) return false;
      if (r === 6 || c === 6) return (r + c) % 2 === 0;
      const n = ((r * CELLS + c) ^ h) * 2654435761;
      return (n >>> 0) % 3 !== 0;
    })
  );

  const W = S + 2 * PAD;

  function FP({ x, y }: { x: number; y: number }) {
    const px = x * CELL + PAD;
    const py = y * CELL + PAD;
    return (
      <>
        <rect x={px} y={py} width={7*CELL} height={7*CELL} fill="#18181b" />
        <rect x={px+CELL} y={py+CELL} width={5*CELL} height={5*CELL} fill="white" />
        <rect x={px+2*CELL} y={py+2*CELL} width={3*CELL} height={3*CELL} fill="#18181b" />
      </>
    );
  }

  return (
    <svg width={W} height={W} viewBox={`0 0 ${W} ${W}`} className="rounded-xl">
      <rect width={W} height={W} fill="white" />
      {modules.flatMap((row, ri) =>
        row.map((on, ci) =>
          on ? <rect key={`${ri}-${ci}`} x={ci*CELL+PAD} y={ri*CELL+PAD} width={CELL} height={CELL} fill="#18181b" /> : null
        )
      )}
      <FP x={0} y={0} />
      <FP x={CELLS - 7} y={0} />
      <FP x={0} y={CELLS - 7} />
    </svg>
  );
}

// ── Storage provider config ────────────────────────────────────────────────────

const PROVIDERS: { id: StorageId; label: string; bg: string; letter: string }[] = [
  { id: "dropbox",    label: "Dropbox",      bg: "bg-blue-600",   letter: "D" },
  { id: "onedrive",   label: "OneDrive",     bg: "bg-sky-500",    letter: "O" },
  { id: "googledrive",label: "Google Drive", bg: "bg-yellow-500", letter: "G" },
];

// ── Main component ─────────────────────────────────────────────────────────────

export function CloudExportModal({ isOpen, onClose, expenses, categories }: Props) {
  const { t, locale } = useLanguage();
  const { history, addRecord, clearHistory } = useExportHistory();
  const { schedule, updateSchedule } = useBackupSchedule();

  // ─ Template tab state ───────────────────────────────────────────────────────
  const [template, setTemplate] = useState<Template>("custom");
  const [format, setFormat] = useState<Format>("csv");
  const [exporting, setExporting] = useState(false);

  // ─ Email state ──────────────────────────────────────────────────────────────
  const [email, setEmail] = useState("");
  const [emailSending, setEmailSending] = useState(false);
  const [emailSentTo, setEmailSentTo] = useState<string | null>(null);

  // ─ Google Sheets state ──────────────────────────────────────────────────────
  const [sheetsConnected, setSheetsConnected] = useState(false);
  const [sheetsConnecting, setSheetsConnecting] = useState(false);
  const [sheetsExporting, setSheetsExporting] = useState(false);
  const [sheetsSuccess, setSheetsSuccess] = useState(false);

  // ─ Cloud storage state ──────────────────────────────────────────────────────
  const [connectedProviders, setConnectedProviders] = useState<Set<StorageId>>(new Set());
  const [syncingProvider, setSyncingProvider] = useState<StorageId | null>(null);
  const [syncTimes, setSyncTimes] = useState<Map<StorageId, string>>(new Map());

  // ─ Share state ──────────────────────────────────────────────────────────────
  const [shareLink, setShareLink] = useState<string | null>(null);
  const [linkGenerating, setLinkGenerating] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);
  const [showQR, setShowQR] = useState(false);

  // ─ Schedule state ───────────────────────────────────────────────────────────
  const [schedEdit, setSchedEdit] = useState(schedule);
  const [schedSaved, setSchedSaved] = useState(false);

  // ── Filtered expenses per template ─────────────────────────────────────────
  const filteredExpenses = useMemo(() => {
    if (template === "tax-report") return expenses.filter(e => e.date >= thisYearStart());
    if (template === "monthly-summary") return expenses.filter(e => e.date >= thisMonthStart() && e.date <= today());
    return expenses;
  }, [expenses, template]);

  const total = filteredExpenses.reduce((s, e) => s + e.amount, 0);

  // ── Template definitions ───────────────────────────────────────────────────
  const TEMPLATES: { id: Template; icon: typeof Settings; color: string; defaultFmt: Format }[] = [
    { id: "custom",            icon: Settings,     color: "border-default-200 hover:border-default-400", defaultFmt: "csv" },
    { id: "tax-report",        icon: FileText,     color: "border-primary-200 hover:border-primary-400", defaultFmt: "pdf" },
    { id: "monthly-summary",   icon: Calendar,     color: "border-success-200 hover:border-success-400", defaultFmt: "csv" },
    { id: "category-analysis", icon: BarChart2,    color: "border-secondary-200 hover:border-secondary-400", defaultFmt: "json" },
  ];

  function selectTemplate(id: Template) {
    setTemplate(id);
    const tpl = TEMPLATES.find(t => t.id === id)!;
    setFormat(tpl.defaultFmt);
  }

  // ── Export action ──────────────────────────────────────────────────────────
  async function handleExport(dest: ExportDestination = "download", overrideEmail?: string) {
    if (filteredExpenses.length === 0) return;
    setExporting(true);
    try {
      const ts = today();
      const fname = `${template}-${ts}`;

      if (format === "pdf") {
        const { generatePDF } = await import("@/lib/exportPDF");
        const blob = await generatePDF(filteredExpenses);
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url; a.download = `${fname}.pdf`; a.click();
        URL.revokeObjectURL(url);
      } else {
        const content = format === "csv" ? toCSV(filteredExpenses) :
                        format === "json" ? toJSON(filteredExpenses) : toText(filteredExpenses);
        const ext = format;
        const mime = format === "csv" ? "text/csv" : format === "json" ? "application/json" : "text/plain";
        download(content, `${fname}.${ext}`, mime);
      }

      addRecord({
        format,
        template,
        recordCount: filteredExpenses.length,
        totalAmount: total,
        destination: dest,
        filename: fname,
        ...(overrideEmail ? { recipientEmail: overrideEmail } : {}),
      });
    } finally {
      setExporting(false);
    }
  }

  // ── Email send simulation ──────────────────────────────────────────────────
  async function handleSendEmail() {
    if (!email.includes("@")) return;
    setEmailSending(true);
    await new Promise(r => setTimeout(r, 1600));
    setEmailSending(false);
    setEmailSentTo(email);
    addRecord({
      format,
      template,
      recordCount: filteredExpenses.length,
      totalAmount: total,
      destination: "email",
      filename: `${template}-${today()}`,
      recipientEmail: email,
    });
  }

  // ── Google Sheets simulation ───────────────────────────────────────────────
  async function handleSheetsConnect() {
    setSheetsConnecting(true);
    await new Promise(r => setTimeout(r, 1500));
    setSheetsConnecting(false);
    setSheetsConnected(true);
  }

  async function handleSheetsExport() {
    setSheetsExporting(true);
    await new Promise(r => setTimeout(r, 1200));
    setSheetsExporting(false);
    setSheetsSuccess(true);
    addRecord({
      format: "csv",
      template,
      recordCount: filteredExpenses.length,
      totalAmount: total,
      destination: "googlesheets",
      filename: `${template}-${today()}`,
    });
    setTimeout(() => setSheetsSuccess(false), 3000);
  }

  // ── Cloud storage simulation ───────────────────────────────────────────────
  async function handleConnect(id: StorageId) {
    await new Promise(r => setTimeout(r, 1000));
    setConnectedProviders(prev => new Set([...prev, id]));
  }

  async function handleSync(id: StorageId) {
    setSyncingProvider(id);
    await new Promise(r => setTimeout(r, 1200));
    setSyncingProvider(null);
    setSyncTimes(prev => new Map(prev).set(id, new Date().toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" })));
    addRecord({
      format: "csv",
      template,
      recordCount: filteredExpenses.length,
      totalAmount: total,
      destination: id === "googledrive" ? "googlesheets" : (id as ExportDestination),
      filename: `${template}-${today()}`,
    });
  }

  // ── Link generation ────────────────────────────────────────────────────────
  async function handleGenerateLink() {
    setLinkGenerating(true);
    await new Promise(r => setTimeout(r, 800));
    const token = generateToken(filteredExpenses);
    setShareLink(`https://fintrack.share/${token}`);
    setLinkGenerating(false);
  }

  async function handleCopyLink() {
    if (!shareLink) return;
    await navigator.clipboard.writeText(shareLink);
    setLinkCopied(true);
    setTimeout(() => setLinkCopied(false), 2000);
  }

  function handleDownloadQR() {
    const svg = document.getElementById("qr-code-svg");
    if (!svg) return;
    const blob = new Blob([svg.outerHTML], { type: "image/svg+xml" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "expense-report-qr.svg"; a.click();
    URL.revokeObjectURL(url);
    addRecord({
      format: "link",
      template,
      recordCount: filteredExpenses.length,
      totalAmount: total,
      destination: "link",
      filename: shareLink ?? "qr-code",
    });
  }

  // ── Schedule save ──────────────────────────────────────────────────────────
  async function handleSaveSchedule() {
    updateSchedule(schedEdit);
    setSchedSaved(true);
    setTimeout(() => setSchedSaved(false), 2500);
  }

  // ── History destination label ──────────────────────────────────────────────
  function destLabel(dest: ExportDestination, recipientEmail?: string) {
    if (dest === "email")        return t("cloudExport.historyEmailed", { email: recipientEmail ?? "" });
    if (dest === "googlesheets") return t("cloudExport.historySheets");
    if (dest === "dropbox")      return t("cloudExport.historyDropbox");
    if (dest === "onedrive")     return t("cloudExport.historyOneDrive");
    if (dest === "link")         return t("cloudExport.historyLink");
    return t("cloudExport.historyDownloaded");
  }

  // ── Destination icon ───────────────────────────────────────────────────────
  function DestIcon({ dest }: { dest: ExportDestination }) {
    if (dest === "email")        return <Mail size={14} />;
    if (dest === "googlesheets") return <span className="text-xs font-bold">G</span>;
    if (dest === "dropbox")      return <span className="text-xs font-bold">D</span>;
    if (dest === "onedrive")     return <span className="text-xs font-bold">O</span>;
    if (dest === "link")         return <Link size={14} />;
    return <Download size={14} />;
  }

  // ── Note banner ────────────────────────────────────────────────────────────
  function NoteBanner({ children }: { children: string }) {
    return (
      <div className="flex items-start gap-2 bg-default-50 dark:bg-default-100/10 border border-default-200 rounded-lg px-3 py-2 text-xs text-default-500">
        <Shield size={12} className="shrink-0 mt-0.5 text-default-400" />
        <span>{children}</span>
      </div>
    );
  }

  // ── Tab styles ─────────────────────────────────────────────────────────────
  const tabCls = {
    tabList: "gap-1 bg-default-100 rounded-lg p-1 flex-wrap",
    tab: "rounded-md px-3 py-1.5 text-xs data-[selected=true]:bg-white data-[selected=true]:shadow-sm",
    tabContent: "text-default-600 group-data-[selected=true]:text-default-900 font-medium",
    cursor: "hidden",
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} placement="center" size="2xl" scrollBehavior="inside">
      <ModalContent>
        <ModalHeader className="flex items-center gap-2">
          <CloudUpload size={18} className="text-primary" />
          {t("cloudExport.title")}
        </ModalHeader>

        <ModalBody className="pb-6">
          <Tabs aria-label="Cloud export" classNames={tabCls}>

            {/* ── TEMPLATES TAB ──────────────────────────────────────────── */}
            <Tab key="templates" title={
              <span className="flex items-center gap-1.5"><LayoutTemplate size={13} />{t("cloudExport.tabTemplates")}</span>
            }>
              <div className="space-y-4 pt-3">
                <div className="grid grid-cols-2 gap-3">
                  {TEMPLATES.map(({ id, icon: Icon, color }) => {
                    const isSelected = template === id;
                    const filterCount = id === "tax-report"
                      ? expenses.filter(e => e.date >= thisYearStart()).length
                      : id === "monthly-summary"
                      ? expenses.filter(e => e.date >= thisMonthStart()).length
                      : expenses.length;
                    return (
                      <button
                        key={id}
                        onClick={() => selectTemplate(id)}
                        className={`text-left p-4 rounded-xl border-2 transition-all ${
                          isSelected
                            ? "border-primary bg-primary-50 dark:bg-primary-900/20"
                            : `${color} bg-white dark:bg-default-50/5`
                        }`}
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div className={`p-2 rounded-lg ${isSelected ? "bg-primary text-white" : "bg-default-100 text-default-600"}`}>
                            <Icon size={15} />
                          </div>
                          {isSelected && <Check size={16} className="text-primary mt-1" />}
                        </div>
                        <p className="font-semibold text-sm text-default-900">
                          {t(`cloudExport.template${id === "custom" ? "Custom" : id === "tax-report" ? "TaxReport" : id === "monthly-summary" ? "Monthly" : "Category"}`)}
                        </p>
                        <p className="text-xs text-default-500 mt-0.5 leading-snug">
                          {t(`cloudExport.template${id === "custom" ? "Custom" : id === "tax-report" ? "TaxReport" : id === "monthly-summary" ? "Monthly" : "Category"}Desc`)}
                        </p>
                        <p className="text-xs font-semibold text-primary mt-2">
                          {filterCount} {filterCount !== 1 ? t("trends.items") : t("trends.item")}
                        </p>
                      </button>
                    );
                  })}
                </div>

                <Divider />

                <div className="flex items-end gap-3">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-default-700 mb-2">{t("cloudExport.selectFormat")}</p>
                    <div className="flex gap-2 flex-wrap">
                      {(["csv", "json", "txt", "pdf"] as Format[]).map(f => (
                        <button key={f} onClick={() => setFormat(f)}
                          className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-all ${
                            format === f
                              ? "bg-indigo-600 text-white border-indigo-600"
                              : "bg-default-50 text-default-700 border-default-200 hover:bg-default-100"
                          }`}
                        >
                          {f.toUpperCase()}
                        </button>
                      ))}
                    </div>
                  </div>
                  <Button
                    color="primary"
                    startContent={exporting ? undefined : <Download size={14} />}
                    isLoading={exporting}
                    isDisabled={filteredExpenses.length === 0}
                    onPress={() => handleExport("download")}
                  >
                    {filteredExpenses.length !== 1
                      ? t("cloudExport.exportSelected", { count: filteredExpenses.length })
                      : t("cloudExport.exportSelectedOne", { count: filteredExpenses.length })}
                  </Button>
                </div>

                {filteredExpenses.length === 0 && (
                  <p className="text-sm text-warning-600 text-center py-2">{t("cloudExport.noData")}</p>
                )}

                {filteredExpenses.length > 0 && (
                  <div className="bg-default-50 rounded-lg px-4 py-3 flex justify-between text-sm">
                    <span className="text-default-500">
                      {filteredExpenses.length !== 1
                        ? t("cloudExport.exportSelected", { count: filteredExpenses.length })
                        : t("cloudExport.exportSelectedOne", { count: filteredExpenses.length })}
                    </span>
                    <span className="font-bold text-default-900">${total.toFixed(2)}</span>
                  </div>
                )}
              </div>
            </Tab>

            {/* ── CLOUD & EMAIL TAB ──────────────────────────────────────── */}
            <Tab key="cloud" title={
              <span className="flex items-center gap-1.5"><CloudUpload size={13} />{t("cloudExport.tabCloud")}</span>
            }>
              <div className="space-y-5 pt-3">

                {/* Email section */}
                <div className="space-y-3">
                  <h3 className="font-semibold text-sm text-default-800 flex items-center gap-2">
                    <Mail size={15} className="text-indigo-500" />
                    {t("cloudExport.emailTitle")}
                  </h3>
                  {emailSentTo ? (
                    <div className="flex items-center gap-2 bg-success-50 border border-success-200 rounded-lg px-4 py-3">
                      <Check size={16} className="text-success-600 shrink-0" />
                      <p className="text-sm text-success-700 font-medium">
                        {t("cloudExport.emailSuccess", { email: emailSentTo })}
                      </p>
                      <Button size="sm" variant="light" className="ml-auto" onPress={() => setEmailSentTo(null)}>
                        ✕
                      </Button>
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      <Input
                        size="sm"
                        label={t("cloudExport.emailAddress")}
                        placeholder={t("cloudExport.emailPlaceholder")}
                        type="email"
                        value={email}
                        onValueChange={setEmail}
                        startContent={<Mail size={14} className="text-default-400" />}
                      />
                      <Button
                        color="primary" size="sm" className="shrink-0 self-end"
                        isLoading={emailSending}
                        isDisabled={!email.includes("@") || filteredExpenses.length === 0}
                        onPress={handleSendEmail}
                      >
                        {emailSending ? t("cloudExport.emailSending") : t("cloudExport.emailSend")}
                      </Button>
                    </div>
                  )}
                  <NoteBanner>{t("cloudExport.emailNote")}</NoteBanner>
                </div>

                <Divider />

                {/* Google Sheets section */}
                <div className="space-y-3">
                  <h3 className="font-semibold text-sm text-default-800 flex items-center gap-2">
                    <span className="w-5 h-5 bg-green-600 text-white rounded text-xs font-bold flex items-center justify-center">G</span>
                    {t("cloudExport.sheetsTitle")}
                  </h3>
                  {!sheetsConnected ? (
                    <Button
                      variant="bordered" size="sm"
                      isLoading={sheetsConnecting}
                      onPress={handleSheetsConnect}
                      startContent={!sheetsConnecting ? <span className="font-bold text-sm">G</span> : undefined}
                    >
                      {sheetsConnecting ? t("cloudExport.sheetsConnecting") : t("cloudExport.sheetsConnect")}
                    </Button>
                  ) : (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Check size={14} className="text-success-600" />
                        <span className="text-sm text-default-700">
                          {t("cloudExport.sheetsConnected", { email: "demo@gmail.com" })}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          color="success" variant="flat" size="sm"
                          isLoading={sheetsExporting}
                          isDisabled={filteredExpenses.length === 0}
                          onPress={handleSheetsExport}
                        >
                          {sheetsExporting ? t("cloudExport.sheetsExporting") : t("cloudExport.sheetsExport")}
                        </Button>
                        {sheetsSuccess && (
                          <span className="text-xs text-success-600 flex items-center gap-1">
                            <Check size={12} />{t("cloudExport.sheetsSuccess")}
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                  <NoteBanner>{t("cloudExport.sheetsNote")}</NoteBanner>
                </div>

                <Divider />

                {/* Cloud storage section */}
                <div className="space-y-3">
                  <h3 className="font-semibold text-sm text-default-800 flex items-center gap-2">
                    <CloudUpload size={15} className="text-sky-500" />
                    {t("cloudExport.storageTitle")}
                  </h3>
                  <div className="space-y-2">
                    {PROVIDERS.map(({ id, label, bg, letter }) => {
                      const connected = connectedProviders.has(id);
                      const syncing = syncingProvider === id;
                      const syncedAt = syncTimes.get(id);
                      return (
                        <div key={id} className="flex items-center gap-3 p-3 rounded-xl border border-default-200 bg-white dark:bg-default-50/5">
                          <div className={`w-9 h-9 ${bg} rounded-xl flex items-center justify-center text-white font-bold text-sm shrink-0`}>
                            {letter}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-default-900">{label}</p>
                            {connected && (
                              <p className="text-xs text-default-400">
                                {syncedAt
                                  ? t("cloudExport.storageSynced", { time: syncedAt })
                                  : t("cloudExport.storageConnected")}
                              </p>
                            )}
                          </div>
                          {!connected ? (
                            <Button size="sm" variant="flat" onPress={() => handleConnect(id)}>
                              {t("cloudExport.storageConnect")}
                            </Button>
                          ) : (
                            <Button
                              size="sm" color="primary" variant="flat"
                              isLoading={syncing}
                              isDisabled={filteredExpenses.length === 0}
                              onPress={() => handleSync(id)}
                              startContent={!syncing ? <RefreshCw size={12} /> : undefined}
                            >
                              {syncing ? t("cloudExport.storageSyncing") : t("cloudExport.storageSyncNow")}
                            </Button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                  <NoteBanner>{t("cloudExport.storageNote")}</NoteBanner>
                </div>
              </div>
            </Tab>

            {/* ── SHARE TAB ──────────────────────────────────────────────── */}
            <Tab key="share" title={
              <span className="flex items-center gap-1.5"><Link size={13} />{t("cloudExport.tabShare")}</span>
            }>
              <div className="space-y-5 pt-3">
                <div className="space-y-3">
                  <h3 className="font-semibold text-sm text-default-800 flex items-center gap-2">
                    <Link size={15} className="text-indigo-500" />
                    {t("cloudExport.shareTitle")}
                  </h3>

                  {!shareLink ? (
                    <Button
                      color="primary" variant="flat"
                      isLoading={linkGenerating}
                      isDisabled={filteredExpenses.length === 0}
                      onPress={handleGenerateLink}
                      startContent={!linkGenerating ? <Link size={14} /> : undefined}
                    >
                      {linkGenerating ? t("cloudExport.shareGenerating") : t("cloudExport.shareGenerate")}
                    </Button>
                  ) : (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 bg-default-50 border border-default-200 rounded-lg px-3 py-2">
                        <span className="text-sm text-default-700 flex-1 font-mono truncate">{shareLink}</span>
                        <Button
                          size="sm" variant="flat"
                          onPress={handleCopyLink}
                          startContent={linkCopied ? <Check size={13} /> : <Copy size={13} />}
                          color={linkCopied ? "success" : "default"}
                        >
                          {linkCopied ? t("cloudExport.shareCopied") : t("cloudExport.shareCopy")}
                        </Button>
                      </div>
                      <p className="text-xs text-default-400 flex items-center gap-1">
                        <Clock size={11} />{t("cloudExport.shareExpires")}
                      </p>
                    </div>
                  )}
                  <NoteBanner>{t("cloudExport.shareNote")}</NoteBanner>
                </div>

                <Divider />

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-sm text-default-800 flex items-center gap-2">
                      <QrCode size={15} className="text-indigo-500" />
                      {t("cloudExport.shareQRTitle")}
                    </h3>
                    {shareLink && (
                      <Button size="sm" variant="light" onPress={() => setShowQR(v => !v)}>
                        {showQR ? t("cloudExport.hideQR") : t("cloudExport.showQR")}
                      </Button>
                    )}
                  </div>

                  {!shareLink ? (
                    <p className="text-sm text-default-400">{t("cloudExport.generateFirst")}</p>
                  ) : !showQR ? (
                    <Button variant="flat" size="sm" onPress={() => setShowQR(true)} startContent={<QrCode size={14} />}>
                      {t("cloudExport.shareQRTitle")}
                    </Button>
                  ) : (
                    <div className="flex flex-col items-center gap-3 py-2">
                      <div id="qr-code-svg">
                        <QRCodeSVG data={shareLink} size={160} />
                      </div>
                      <p className="text-xs text-default-500 text-center">{t("cloudExport.shareQRDesc")}</p>
                      <Button size="sm" variant="flat" onPress={handleDownloadQR} startContent={<Download size={13} />}>
                        {t("cloudExport.shareQRDownload")}
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </Tab>

            {/* ── SCHEDULE TAB ───────────────────────────────────────────── */}
            <Tab key="schedule" title={
              <span className="flex items-center gap-1.5"><Clock size={13} />{t("cloudExport.tabSchedule")}</span>
            }>
              <div className="space-y-5 pt-3">
                <div>
                  <h3 className="font-semibold text-sm text-default-800">{t("cloudExport.scheduleTitle")}</h3>
                  <p className="text-xs text-default-400 mt-0.5">{t("cloudExport.scheduleSubtitle")}</p>
                </div>

                <div className="flex items-center justify-between p-4 bg-default-50 dark:bg-default-100/10 rounded-xl border border-default-200">
                  <div>
                    <p className="font-semibold text-sm text-default-900">{t("cloudExport.scheduleEnable")}</p>
                    {schedEdit.enabled && (
                      <p className="text-xs text-default-400 mt-0.5">
                        {t("cloudExport.scheduleNextBackup", { date: nextBackupDate(schedEdit.frequency, locale) })}
                      </p>
                    )}
                    {schedule.lastBackup && (
                      <p className="text-xs text-default-400">
                        {t("cloudExport.scheduleLastBackup", { date: fmtTime(schedule.lastBackup, locale) })}
                      </p>
                    )}
                    {!schedule.lastBackup && schedEdit.enabled && (
                      <p className="text-xs text-default-400">{t("cloudExport.scheduleNever")}</p>
                    )}
                  </div>
                  <Switch
                    isSelected={schedEdit.enabled}
                    onValueChange={v => setSchedEdit(s => ({ ...s, enabled: v }))}
                    color="primary"
                  />
                </div>

                {schedEdit.enabled && (
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <Select
                        label={t("cloudExport.scheduleFrequency")}
                        size="sm"
                        selectedKeys={[schedEdit.frequency]}
                        onSelectionChange={keys => setSchedEdit(s => ({ ...s, frequency: [...keys][0] as "daily" | "weekly" | "monthly" }))}
                      >
                        <SelectItem key="daily">{t("cloudExport.freqDaily")}</SelectItem>
                        <SelectItem key="weekly">{t("cloudExport.freqWeekly")}</SelectItem>
                        <SelectItem key="monthly">{t("cloudExport.freqMonthly")}</SelectItem>
                      </Select>
                      <Select
                        label={t("cloudExport.scheduleFormat")}
                        size="sm"
                        selectedKeys={[schedEdit.format]}
                        onSelectionChange={keys => setSchedEdit(s => ({ ...s, format: [...keys][0] as "csv" | "json" | "pdf" }))}
                      >
                        <SelectItem key="csv">CSV</SelectItem>
                        <SelectItem key="json">JSON</SelectItem>
                        <SelectItem key="pdf">PDF</SelectItem>
                      </Select>
                    </div>
                    <Select
                      label={t("cloudExport.scheduleDestination")}
                      size="sm"
                      selectedKeys={[schedEdit.destination]}
                      onSelectionChange={keys => setSchedEdit(s => ({ ...s, destination: [...keys][0] as "email" | "dropbox" | "onedrive" }))}
                    >
                      <SelectItem key="email">{t("cloudExport.destEmail")}</SelectItem>
                      <SelectItem key="dropbox">{t("cloudExport.destDropbox")}</SelectItem>
                      <SelectItem key="onedrive">{t("cloudExport.destOneDrive")}</SelectItem>
                    </Select>
                    {schedEdit.destination === "email" && (
                      <Input
                        label={t("cloudExport.scheduleEmail")}
                        size="sm"
                        type="email"
                        value={schedEdit.email}
                        onValueChange={v => setSchedEdit(s => ({ ...s, email: v }))}
                        startContent={<Mail size={13} className="text-default-400" />}
                      />
                    )}
                  </div>
                )}

                <div className="flex items-center gap-3">
                  <Button
                    color={schedSaved ? "success" : "primary"} size="sm"
                    onPress={handleSaveSchedule}
                    startContent={schedSaved ? <Check size={14} /> : undefined}
                  >
                    {schedSaved ? t("cloudExport.scheduleSaved") : t("cloudExport.scheduleSave")}
                  </Button>
                </div>

                <NoteBanner>{t("cloudExport.scheduleNote")}</NoteBanner>
              </div>
            </Tab>

            {/* ── HISTORY TAB ────────────────────────────────────────────── */}
            <Tab key="history" title={
              <span className="flex items-center gap-1.5"><History size={13} />{t("cloudExport.tabHistory")}</span>
            }>
              <div className="space-y-3 pt-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-sm text-default-800">{t("cloudExport.historyTitle")}</h3>
                  {history.length > 0 && (
                    <Button
                      size="sm" variant="light" color="danger"
                      startContent={<Trash2 size={13} />}
                      onPress={clearHistory}
                    >
                      {t("cloudExport.historyClear")}
                    </Button>
                  )}
                </div>

                {history.length === 0 ? (
                  <div className="py-12 text-center space-y-1">
                    <History size={32} className="mx-auto text-default-300" />
                    <p className="font-medium text-default-500 text-sm">{t("cloudExport.historyEmpty")}</p>
                    <p className="text-xs text-default-400">{t("cloudExport.historyEmptySub")}</p>
                  </div>
                ) : (
                  <div className="space-y-1.5 max-h-96 overflow-y-auto">
                    {history.map(record => (
                      <div key={record.id} className="flex items-center gap-3 p-3 rounded-xl border border-default-100 hover:bg-default-50 transition-colors">
                        <div className="w-8 h-8 bg-default-100 rounded-lg flex items-center justify-center text-default-600 shrink-0">
                          <DestIcon dest={record.destination} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-medium text-default-900 truncate">
                              {destLabel(record.destination, record.recipientEmail)}
                            </span>
                            <Chip size="sm" variant="flat" className="text-xs">
                              {record.format.toUpperCase()}
                            </Chip>
                          </div>
                          <p className="text-xs text-default-400 mt-0.5">
                            {t("cloudExport.historyRecords", { count: record.recordCount })}
                            {" · "}${record.totalAmount.toFixed(2)}
                          </p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-xs text-default-400">
                            {fmtTime(record.timestamp, locale)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </Tab>

          </Tabs>
        </ModalBody>
      </ModalContent>
    </Modal>
  );
}

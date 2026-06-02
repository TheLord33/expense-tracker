import fs from "fs";
import path from "path";
import { randomBytes } from "crypto";

export interface LicenseRecord {
  key: string;
  email: string;
  issuedAt: string;
}

const DATA_DIR  = path.join(process.cwd(), "data");
const DATA_FILE = path.join(DATA_DIR, "licenses.json");

function read(): Record<string, LicenseRecord> {
  try { return JSON.parse(fs.readFileSync(DATA_FILE, "utf-8")); }
  catch { return {}; }
}

function write(records: Record<string, LicenseRecord>) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(DATA_FILE, JSON.stringify(records, null, 2));
}

export function generateLicenseKey(): string {
  const part = () => randomBytes(4).toString("hex").toUpperCase();
  return `FOLIO-${part()}-${part()}-${part()}`;
}

export function issueLicense(email: string): LicenseRecord {
  const key = generateLicenseKey();
  const record: LicenseRecord = { key, email, issuedAt: new Date().toISOString() };
  try {
    const all = read();
    all[key] = record;
    write(all);
  } catch {
    // Vercel serverless has no writable filesystem — log and continue.
    // In production, swap this for Upstash Redis or another KV store.
    console.warn("[license] Could not persist license key to disk:", key);
  }
  return record;
}

export function validateLicense(key: string): LicenseRecord | null {
  try { return read()[key] ?? null; }
  catch { return null; }
}

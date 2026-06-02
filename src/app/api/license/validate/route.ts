import { NextRequest } from "next/server";
import { validateLicense } from "@/lib/license";

export async function POST(req: NextRequest) {
  const { key } = (await req.json()) as { key?: string };
  if (!key) {
    return Response.json({ error: "Missing license key" }, { status: 400 });
  }

  // Check env-var-based owner keys (comma-separated, works on Vercel serverless)
  const ownerKeys = (process.env.FOLIO_OWNER_KEYS ?? "").split(",").map((k) => k.trim()).filter(Boolean);
  if (ownerKeys.includes(key)) {
    return Response.json({ valid: true, email: process.env.FOLIO_OWNER_EMAIL ?? "owner", issuedAt: new Date().toISOString() });
  }

  const record = validateLicense(key);
  if (!record) {
    return Response.json({ error: "Invalid license key" }, { status: 404 });
  }

  return Response.json({ valid: true, email: record.email, issuedAt: record.issuedAt });
}

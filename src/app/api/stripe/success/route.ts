import Stripe from "stripe";
import { NextRequest } from "next/server";
import { signActivationToken } from "@/lib/subscription";
import { issueLicense } from "@/lib/license";

function stripe() {
  return new Stripe(process.env.STRIPE_SECRET_KEY!);
}

export async function GET(req: NextRequest) {
  const sessionId = req.nextUrl.searchParams.get("session_id");
  if (!sessionId || !process.env.STRIPE_SECRET_KEY) {
    return Response.json({ error: "Missing session_id" }, { status: 400 });
  }

  const session = await stripe().checkout.sessions.retrieve(sessionId);
  if (session.payment_status !== "paid" && session.status !== "complete") {
    return Response.json({ error: "Payment not completed" }, { status: 402 });
  }

  const email = session.customer_email ?? session.customer_details?.email ?? "";
  const plan  = session.mode === "subscription" ? "pro" : "self_hosted";

  const activationToken = await signActivationToken(plan as "pro" | "self_hosted", email);

  // For self_hosted: issue (or re-issue) a license key
  let licenseKey: string | null = null;
  if (plan === "self_hosted" && email) {
    const record = issueLicense(email);
    licenseKey = record.key;
  }

  return Response.json({ plan, email, activationToken, licenseKey });
}

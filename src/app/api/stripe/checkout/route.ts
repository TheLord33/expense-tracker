import Stripe from "stripe";
import { NextRequest } from "next/server";

function stripe() {
  return new Stripe(process.env.STRIPE_SECRET_KEY!);
}

const BASE = process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000";

export async function POST(req: NextRequest) {
  if (!process.env.STRIPE_SECRET_KEY) {
    return Response.json({ error: "Stripe not configured" }, { status: 503 });
  }

  const { plan, email } = (await req.json()) as { plan: "hosted" | "self_hosted"; email?: string };

  if (plan === "hosted") {
    const session = await stripe().checkout.sessions.create({
      mode: "subscription",
      payment_method_types: ["card"],
      line_items: [{ price: process.env.STRIPE_HOSTED_PRICE_ID!, quantity: 1 }],
      success_url: `${BASE}/pricing/success?session_id={CHECKOUT_SESSION_ID}&plan=pro`,
      cancel_url:  `${BASE}/pricing`,
      customer_email: email,
    });
    return Response.json({ url: session.url });
  }

  if (plan === "self_hosted") {
    const session = await stripe().checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      line_items: [{ price: process.env.STRIPE_SELF_HOSTED_PRICE_ID!, quantity: 1 }],
      success_url: `${BASE}/pricing/success?session_id={CHECKOUT_SESSION_ID}&plan=self_hosted`,
      cancel_url:  `${BASE}/pricing`,
      customer_email: email,
    });
    return Response.json({ url: session.url });
  }

  return Response.json({ error: "Invalid plan" }, { status: 400 });
}

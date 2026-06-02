import Stripe from "stripe";
import { signActivationToken } from "@/lib/subscription";
import { issueLicense } from "@/lib/license";

function stripe() {
  return new Stripe(process.env.STRIPE_SECRET_KEY!);
}

export async function POST(req: Request) {
  const body = await req.text();
  const sig  = req.headers.get("stripe-signature");

  if (!sig || !process.env.STRIPE_WEBHOOK_SECRET) {
    return Response.json({ error: "Missing signature or webhook secret" }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe().webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch {
    return Response.json({ error: "Invalid signature" }, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const email   = session.customer_email ?? session.customer_details?.email ?? "";
    const plan    = session.metadata?.plan as "pro" | "self_hosted" | undefined;

    if (plan === "self_hosted" && email) {
      issueLicense(email);
    }
    // Activation tokens are generated on-demand in the /api/stripe/success route.
  }

  return Response.json({ received: true });
}

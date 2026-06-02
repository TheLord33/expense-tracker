import { SignJWT, jwtVerify } from "jose";

export type Plan = "free" | "pro" | "self_hosted";

const secret = () => new TextEncoder().encode(process.env.FOLIO_SUBSCRIPTION_SECRET ?? "dev-secret-change-me");

// Issued server-side after payment; short-lived (10 min) so it can't be shared across users.
export async function signActivationToken(plan: Plan, email: string): Promise<string> {
  return new SignJWT({ plan, email })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("10m")
    .sign(secret());
}

export async function verifyActivationToken(token: string): Promise<{ plan: Plan; email: string } | null> {
  try {
    const { payload } = await jwtVerify(token, secret());
    return { plan: payload.plan as Plan, email: payload.email as string };
  } catch {
    return null;
  }
}

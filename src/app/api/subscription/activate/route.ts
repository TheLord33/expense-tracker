import { NextRequest } from "next/server";
import { verifyActivationToken } from "@/lib/subscription";

export async function POST(req: NextRequest) {
  const { token } = (await req.json()) as { token?: string };
  if (!token) {
    return Response.json({ error: "Missing token" }, { status: 400 });
  }

  const payload = await verifyActivationToken(token);
  if (!payload) {
    return Response.json({ error: "Invalid or expired token" }, { status: 401 });
  }

  return Response.json({ plan: payload.plan, email: payload.email });
}

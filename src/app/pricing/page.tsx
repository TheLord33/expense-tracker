"use client";
import { useState } from "react";
import { Button, Card, CardBody, CardHeader, CardFooter, Input, Divider } from "@nextui-org/react";
import { Check, Zap, Server, Wallet } from "lucide-react";
import Link from "next/link";

const FREE_FEATURES = [
  "Expense & income tracking",
  "Budget management",
  "General Ledger",
  "Profit & Loss report",
  "Balance Sheet",
  "1 company profile",
  "CSV / JSON export",
];

const PRO_FEATURES = [
  "Everything in Free",
  "Accounts Payable (vendors & bills)",
  "Accounts Receivable (invoices & PDF)",
  "Inventory management",
  "Purchase Orders",
  "Bank reconciliation",
  "Unlimited company profiles",
  "Priority support",
];

const SELF_HOSTED_FEATURES = [
  "Everything in Pro",
  "Run on your own server",
  "Server-side SQLite storage",
  "No recurring fees",
  "Full data ownership",
  "Docker / Compose ready",
  "Lifetime license key",
];

export default function PricingPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState<"hosted" | "self_hosted" | null>(null);
  const [error, setError] = useState("");

  async function checkout(plan: "hosted" | "self_hosted") {
    if (!email.trim()) { setError("Please enter your email first."); return; }
    setError("");
    setLoading(plan);
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan, email: email.trim() }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        setError(data.error ?? "Checkout failed. Please try again.");
        setLoading(null);
      }
    } catch {
      setError("Network error. Please try again.");
      setLoading(null);
    }
  }

  return (
    <div className="min-h-screen bg-background py-16 px-4">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Wallet className="text-primary" size={32} />
            <span className="text-3xl font-bold">Folio</span>
          </div>
          <h1 className="text-4xl font-bold mb-3">Simple, transparent pricing</h1>
          <p className="text-default-500 text-lg max-w-xl mx-auto">
            Personal finance tools are always free. Upgrade for full business accounting — or host it yourself.
          </p>
        </div>

        {/* Email input */}
        <div className="max-w-sm mx-auto mb-10">
          <Input
            label="Your email"
            placeholder="you@example.com"
            type="email"
            value={email}
            onValueChange={setEmail}
            isInvalid={!!error}
            errorMessage={error}
            variant="bordered"
          />
        </div>

        {/* Pricing cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Free */}
          <Card className="border border-default-200">
            <CardHeader className="flex flex-col items-start gap-1 pb-0 pt-6 px-6">
              <div className="flex items-center gap-2 text-default-600 mb-2">
                <Wallet size={18} />
                <span className="text-sm font-semibold uppercase tracking-wide">Free</span>
              </div>
              <div className="flex items-end gap-1">
                <span className="text-4xl font-bold">$0</span>
                <span className="text-default-400 mb-1">/month</span>
              </div>
              <p className="text-default-500 text-sm">Perfect for personal finance</p>
            </CardHeader>
            <Divider className="my-4" />
            <CardBody className="px-6 py-0">
              <ul className="space-y-2">
                {FREE_FEATURES.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm">
                    <Check size={15} className="text-success mt-0.5 shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>
            </CardBody>
            <CardFooter className="pt-6 px-6 pb-6">
              <Link href="/" className="w-full">
                <Button variant="flat" className="w-full">Use for free</Button>
              </Link>
            </CardFooter>
          </Card>

          {/* Pro Cloud */}
          <Card className="border-2 border-primary relative">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2">
              <span className="bg-primary text-primary-foreground text-xs font-bold px-3 py-1 rounded-full">
                MOST POPULAR
              </span>
            </div>
            <CardHeader className="flex flex-col items-start gap-1 pb-0 pt-6 px-6">
              <div className="flex items-center gap-2 text-primary mb-2">
                <Zap size={18} />
                <span className="text-sm font-semibold uppercase tracking-wide">Pro Cloud</span>
              </div>
              <div className="flex items-end gap-1">
                <span className="text-4xl font-bold">$19</span>
                <span className="text-default-400 mb-1">/month</span>
              </div>
              <p className="text-default-500 text-sm">Full business accounting suite</p>
            </CardHeader>
            <Divider className="my-4" />
            <CardBody className="px-6 py-0">
              <ul className="space-y-2">
                {PRO_FEATURES.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm">
                    <Check size={15} className="text-success mt-0.5 shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>
            </CardBody>
            <CardFooter className="pt-6 px-6 pb-6">
              <Button
                color="primary"
                className="w-full"
                isLoading={loading === "hosted"}
                onPress={() => checkout("hosted")}
              >
                Subscribe — $19/mo
              </Button>
            </CardFooter>
          </Card>

          {/* Self-Hosted */}
          <Card className="border border-default-200">
            <CardHeader className="flex flex-col items-start gap-1 pb-0 pt-6 px-6">
              <div className="flex items-center gap-2 text-secondary mb-2">
                <Server size={18} />
                <span className="text-sm font-semibold uppercase tracking-wide">Self-Hosted</span>
              </div>
              <div className="flex items-end gap-1">
                <span className="text-4xl font-bold">$149</span>
                <span className="text-default-400 mb-1">one-time</span>
              </div>
              <p className="text-default-500 text-sm">Run it on your own server</p>
            </CardHeader>
            <Divider className="my-4" />
            <CardBody className="px-6 py-0">
              <ul className="space-y-2">
                {SELF_HOSTED_FEATURES.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm">
                    <Check size={15} className="text-success mt-0.5 shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>
            </CardBody>
            <CardFooter className="pt-6 px-6 pb-6">
              <Button
                color="secondary"
                variant="flat"
                className="w-full"
                isLoading={loading === "self_hosted"}
                onPress={() => checkout("self_hosted")}
              >
                Buy license — $149
              </Button>
            </CardFooter>
          </Card>
        </div>

        {/* Footer links */}
        <p className="text-center text-default-400 text-sm mt-10">
          Already have a license key?{" "}
          <Link href="/?activate=license" className="text-primary underline">
            Enter it here
          </Link>
          {" · "}
          <Link href="/" className="text-primary underline">
            Back to app
          </Link>
        </p>
      </div>
    </div>
  );
}

"use client";
import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Button, Card, CardBody, Spinner, Code, Snippet } from "@nextui-org/react";
import { CheckCircle, Copy, Wallet } from "lucide-react";
import Link from "next/link";

type Status = "loading" | "success" | "error";

interface SuccessData {
  plan: "pro" | "self_hosted";
  email: string;
  activationToken: string;
  licenseKey: string | null;
}

function SuccessContent() {
  const params = useSearchParams();
  const sessionId = params.get("session_id");
  const [status, setStatus] = useState<Status>("loading");
  const [data, setData] = useState<SuccessData | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!sessionId) { setStatus("error"); return; }
    fetch(`/api/stripe/success?session_id=${sessionId}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.error) { setStatus("error"); return; }
        setData(d);
        setStatus("success");
      })
      .catch(() => setStatus("error"));
  }, [sessionId]);

  function activateAndGo() {
    if (!data?.activationToken) return;
    window.location.href = `/?activate=${encodeURIComponent(data.activationToken)}`;
  }

  async function copyLicense() {
    if (!data?.licenseKey) return;
    await navigator.clipboard.writeText(data.licenseKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <Spinner size="lg" />
          <p className="text-default-500">Confirming your payment…</p>
        </div>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <Card className="max-w-md w-full">
          <CardBody className="text-center py-10 space-y-4">
            <p className="text-danger text-lg font-semibold">Payment verification failed</p>
            <p className="text-default-500 text-sm">
              If you were charged, please contact support with your session ID:
            </p>
            {sessionId && <Code className="text-xs break-all">{sessionId}</Code>}
            <Link href="/pricing">
              <Button variant="flat">Back to pricing</Button>
            </Link>
          </CardBody>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-16">
      <div className="max-w-lg w-full space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="flex justify-center mb-4">
            <CheckCircle size={56} className="text-success" />
          </div>
          <h1 className="text-3xl font-bold">Payment confirmed!</h1>
          <p className="text-default-500">
            Thank you, {data?.email}. Your{" "}
            <strong>{data?.plan === "pro" ? "Pro Cloud" : "Self-Hosted"}</strong> plan is ready.
          </p>
        </div>

        {/* Activate hosted plan */}
        {data?.plan === "pro" && (
          <Card>
            <CardBody className="space-y-4 py-6">
              <div className="flex items-center gap-2">
                <Wallet size={20} className="text-primary" />
                <span className="font-semibold">Activate on this device</span>
              </div>
              <p className="text-default-500 text-sm">
                Click the button below to activate your Pro plan in the app. This link expires in 10 minutes.
              </p>
              <Button color="primary" className="w-full" onPress={activateAndGo}>
                Open Folio &amp; activate
              </Button>
              <p className="text-default-400 text-xs text-center">
                To activate on another device, copy this link:
              </p>
              <Snippet
                symbol=""
                variant="bordered"
                className="text-xs w-full"
                codeString={`${typeof window !== "undefined" ? window.location.origin : ""}/?activate=${data.activationToken}`}
              >
                {`.../?activate=${data.activationToken.slice(0, 24)}…`}
              </Snippet>
            </CardBody>
          </Card>
        )}

        {/* Self-hosted license key */}
        {data?.plan === "self_hosted" && data.licenseKey && (
          <Card>
            <CardBody className="space-y-4 py-6">
              <div className="flex items-center gap-2">
                <Wallet size={20} className="text-secondary" />
                <span className="font-semibold">Your license key</span>
              </div>
              <p className="text-default-500 text-sm">
                Save this key — you will need it when setting up your self-hosted instance. A copy will also be emailed to you.
              </p>
              <div className="flex items-center gap-2">
                <Code className="flex-1 text-sm font-mono font-bold tracking-widest py-3">
                  {data.licenseKey}
                </Code>
                <Button isIconOnly variant="flat" size="sm" onPress={copyLicense} title="Copy">
                  <Copy size={14} className={copied ? "text-success" : ""} />
                </Button>
              </div>
              <p className="text-default-400 text-xs">
                Enter this key in the Docker instance under <strong>Settings → License</strong>, or via the <code>FOLIO_LICENSE_KEY</code> environment variable.
              </p>
            </CardBody>
          </Card>
        )}

        <p className="text-center text-default-400 text-sm">
          <Link href="/" className="text-primary underline">Back to app</Link>
          {" · "}
          <Link href="/pricing" className="text-primary underline">Pricing</Link>
        </p>
      </div>
    </div>
  );
}

export default function SuccessPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <Spinner size="lg" />
      </div>
    }>
      <SuccessContent />
    </Suspense>
  );
}

"use client";

import { useState, type FormEvent } from "react";
import { Card, CardBody, Input, Button, Divider } from "@nextui-org/react";
import { BookOpen, Lock, Eye, EyeOff } from "lucide-react";
import type { useAuth } from "@/lib/useAuth";
import { useLanguage } from "@/app/providers";

type AuthHook = ReturnType<typeof useAuth>;

interface Props {
  hasCredentials: boolean;
  onLogin: AuthHook["login"];
  onSetup: AuthHook["setup"];
}

export function LoginGate({ hasCredentials, onLogin, onSetup }: Props) {
  const { t } = useLanguage();

  const [username,   setUsername]   = useState("");
  const [password,   setPassword]   = useState("");
  const [confirm,    setConfirm]    = useState("");
  const [showPass,   setShowPass]   = useState(false);
  const [showConf,   setShowConf]   = useState(false);
  const [error,      setError]      = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");

    if (!username.trim()) { setError(t("auth.errorUsername")); return; }
    if (password.length < 6) { setError(t("auth.errorPassword")); return; }

    if (!hasCredentials) {
      if (password !== confirm) { setError(t("auth.errorPasswordMatch")); return; }
      setSubmitting(true);
      await onSetup(username.trim(), password);
      setSubmitting(false);
      return;
    }

    setSubmitting(true);
    const ok = await onLogin(username.trim(), password);
    setSubmitting(false);
    if (!ok) setError(t("auth.errorInvalid"));
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-default-50 to-default-100 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-primary flex items-center justify-center shadow-lg mb-4">
            <BookOpen size={28} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-default-900">Folio</h1>
          <p className="text-sm text-default-500 mt-1">{t("header.subtitle")}</p>
        </div>

        <Card shadow="sm" className="border border-default-200">
          <CardBody className="px-6 py-6">
            <h2 className="text-base font-semibold text-default-800 mb-1">
              {hasCredentials ? t("auth.loginTitle") : t("auth.setupTitle")}
            </h2>
            {!hasCredentials && (
              <p className="text-xs text-default-500 mb-4">{t("auth.setupSub")}</p>
            )}
            <Divider className="my-3" />

            <form onSubmit={handleSubmit} className="flex flex-col gap-3 mt-1">
              <Input
                label={t("auth.username")}
                autoComplete="username"
                value={username}
                onValueChange={(v) => { setUsername(v); setError(""); }}
                size="sm"
                autoFocus
              />
              <Input
                label={t("auth.password")}
                autoComplete={hasCredentials ? "current-password" : "new-password"}
                type={showPass ? "text" : "password"}
                value={password}
                onValueChange={(v) => { setPassword(v); setError(""); }}
                size="sm"
                endContent={
                  <button type="button" onClick={() => setShowPass((p) => !p)} className="text-default-400 hover:text-default-600">
                    {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                }
              />
              {!hasCredentials && (
                <Input
                  label={t("auth.confirmPassword")}
                  autoComplete="new-password"
                  type={showConf ? "text" : "password"}
                  value={confirm}
                  onValueChange={(v) => { setConfirm(v); setError(""); }}
                  size="sm"
                  endContent={
                    <button type="button" onClick={() => setShowConf((p) => !p)} className="text-default-400 hover:text-default-600">
                      {showConf ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  }
                />
              )}

              {error && (
                <p className="text-xs text-danger-600 px-1">{error}</p>
              )}

              <Button
                type="submit"
                color="primary"
                className="mt-1"
                isLoading={submitting}
                startContent={!submitting && <Lock size={15} />}
              >
                {hasCredentials ? t("auth.loginBtn") : t("auth.setupBtn")}
              </Button>
            </form>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}

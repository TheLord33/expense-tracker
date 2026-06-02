"use client";

import { useState, type FormEvent } from "react";
import {
  Button, Dropdown, DropdownTrigger, DropdownMenu, DropdownItem,
  Modal, ModalContent, ModalHeader, ModalBody, ModalFooter,
  Input,
} from "@nextui-org/react";
import { Wallet, Plus, Tag, Sun, Moon, Globe, HelpCircle, User, KeyRound, Lock, Eye, EyeOff } from "lucide-react";
import { useTheme, useLanguage, useCurrency } from "@/app/providers";
import { LANGUAGES } from "@/lib/i18n";
import { CURRENCIES } from "@/lib/currencies";

interface Props {
  onAddExpense: () => void;
  onAddCategory: () => void;
  importExportSlot: React.ReactNode;
  onHelp: () => void;
  onLock: () => void;
  onChangePassword: (current: string, next: string) => Promise<boolean>;
  username: string;
}

export function AppHeader({ onAddExpense, onAddCategory, importExportSlot, onHelp, onLock, onChangePassword, username }: Props) {
  const { theme, toggleTheme } = useTheme();
  const { t, language, setLanguage } = useLanguage();
  const { currency, setCurrency } = useCurrency();

  const [showChgPwd, setShowChgPwd]   = useState(false);
  const [curPwd,     setCurPwd]       = useState("");
  const [newPwd,     setNewPwd]       = useState("");
  const [confPwd,    setConfPwd]      = useState("");
  const [showCur,    setShowCur]      = useState(false);
  const [showNew,    setShowNew]      = useState(false);
  const [pwdErr,     setPwdErr]       = useState("");
  const [pwdOk,      setPwdOk]        = useState(false);
  const [submitting, setSubmitting]   = useState(false);

  function openChangePwd() {
    setCurPwd(""); setNewPwd(""); setConfPwd("");
    setPwdErr(""); setPwdOk(false); setShowCur(false); setShowNew(false);
    setShowChgPwd(true);
  }

  async function handleChangePwd(e: FormEvent) {
    e.preventDefault();
    setPwdErr(""); setPwdOk(false);
    if (newPwd.length < 6)       { setPwdErr(t("account.errorPassword"));     return; }
    if (newPwd !== confPwd)       { setPwdErr(t("account.errorPasswordMatch")); return; }
    setSubmitting(true);
    const ok = await onChangePassword(curPwd, newPwd);
    setSubmitting(false);
    if (!ok) { setPwdErr(t("account.errorWrongPassword")); return; }
    setPwdOk(true);
    setTimeout(() => setShowChgPwd(false), 1200);
  }

  return (
    <>
      <div className="bg-gradient-to-r from-indigo-600 via-blue-600 to-violet-600 shadow-lg">
        <div className="max-w-4xl mx-auto px-4 py-5 flex items-center justify-between gap-4 flex-wrap">
          {/* Brand */}
          <div className="flex items-center gap-3">
            <div className="bg-white/20 backdrop-blur-sm rounded-xl p-2.5">
              <Wallet className="text-white" size={24} strokeWidth={2} />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white leading-tight">
                {t("header.title")}
              </h1>
              <p className="text-blue-100 text-xs">
                {t("header.subtitle")}
              </p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Currency selector */}
            <Dropdown>
              <DropdownTrigger>
                <Button
                  size="sm"
                  variant="light"
                  className="text-white hover:bg-white/10 font-semibold min-w-0 px-2"
                  aria-label="Select currency"
                >
                  {currency.symbol}
                </Button>
              </DropdownTrigger>
              <DropdownMenu
                aria-label="Currency selection"
                selectedKeys={[currency.code]}
                selectionMode="single"
                onSelectionChange={(keys) => {
                  const found = CURRENCIES.find((c) => c.code === [...keys][0]);
                  if (found) setCurrency(found);
                }}
                className="max-h-72 overflow-y-auto"
              >
                {CURRENCIES.map((c) => (
                  <DropdownItem
                    key={c.code}
                    startContent={<span className="font-semibold w-8 text-right inline-block text-default-600">{c.symbol}</span>}
                    description={c.code}
                  >
                    {c.localizedNames?.[language] ?? c.label}
                  </DropdownItem>
                ))}
              </DropdownMenu>
            </Dropdown>

            {/* Language selector */}
            <Dropdown>
              <DropdownTrigger>
                <Button
                  isIconOnly
                  size="sm"
                  variant="light"
                  className="text-white hover:bg-white/10"
                  aria-label="Select language"
                >
                  <Globe size={16} />
                </Button>
              </DropdownTrigger>
              <DropdownMenu
                aria-label="Language selection"
                selectedKeys={[language]}
                selectionMode="single"
                onSelectionChange={(keys) => setLanguage([...keys][0] as typeof language)}
              >
                {LANGUAGES.map((lang) => (
                  <DropdownItem key={lang.value} startContent={<span>{lang.flag}</span>}>
                    {lang.label}
                  </DropdownItem>
                ))}
              </DropdownMenu>
            </Dropdown>

            {/* Dark mode toggle */}
            <Button
              isIconOnly
              size="sm"
              variant="light"
              className="text-white hover:bg-white/10"
              onPress={toggleTheme}
              aria-label="Toggle dark mode"
            >
              {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
            </Button>

            <div className="[&>button]:bg-white/10 [&>button]:text-white [&>button]:border-white/20 [&>button:hover]:bg-white/20">
              {importExportSlot}
            </div>

            {/* Help button */}
            <Button
              isIconOnly
              size="sm"
              variant="light"
              className="text-white hover:bg-white/10"
              onPress={onHelp}
              aria-label={t("help.open")}
              title={t("help.open")}
            >
              <HelpCircle size={16} />
            </Button>

            {/* Account / user dropdown */}
            <Dropdown>
              <DropdownTrigger>
                <Button
                  isIconOnly
                  size="sm"
                  variant="light"
                  className="text-white hover:bg-white/10"
                  aria-label={t("account.settings")}
                  title={username}
                >
                  <User size={16} />
                </Button>
              </DropdownTrigger>
              <DropdownMenu aria-label="Account menu">
                <DropdownItem key="user-display" isReadOnly className="opacity-60 cursor-default" textValue={username}>
                  <span className="text-xs font-mono">{username}</span>
                </DropdownItem>
                <DropdownItem key="change-pwd" startContent={<KeyRound size={13} />} onPress={openChangePwd}>
                  {t("account.changePassword")}
                </DropdownItem>
                <DropdownItem key="lock" startContent={<Lock size={13} />} color="danger" className="text-danger" onPress={onLock}>
                  {t("auth.logout")}
                </DropdownItem>
              </DropdownMenu>
            </Dropdown>

            <Button
              variant="bordered"
              size="sm"
              className="border-white/30 text-white hover:bg-white/10"
              startContent={<Tag size={14} />}
              onPress={onAddCategory}
            >
              {t("header.addCategory")}
            </Button>

            <Button
              size="sm"
              className="bg-white text-indigo-600 font-semibold hover:bg-blue-50 shadow-md"
              startContent={<Plus size={16} />}
              onPress={onAddExpense}
            >
              {t("header.addExpense")}
            </Button>
          </div>
        </div>
      </div>

      {/* Change Password modal */}
      <Modal isOpen={showChgPwd} onClose={() => setShowChgPwd(false)} placement="center" size="sm">
        <ModalContent>
          <form onSubmit={handleChangePwd}>
            <ModalHeader>{t("account.changePassword")}</ModalHeader>
            <ModalBody className="gap-3">
              <Input
                label={t("account.currentPassword")}
                type={showCur ? "text" : "password"}
                autoComplete="current-password"
                value={curPwd}
                onValueChange={(v) => { setCurPwd(v); setPwdErr(""); }}
                size="sm"
                endContent={
                  <button type="button" onClick={() => setShowCur((p) => !p)} className="text-default-400 hover:text-default-600">
                    {showCur ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                }
              />
              <Input
                label={t("account.newPassword")}
                type={showNew ? "text" : "password"}
                autoComplete="new-password"
                value={newPwd}
                onValueChange={(v) => { setNewPwd(v); setPwdErr(""); }}
                size="sm"
                endContent={
                  <button type="button" onClick={() => setShowNew((p) => !p)} className="text-default-400 hover:text-default-600">
                    {showNew ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                }
              />
              <Input
                label={t("account.confirmNewPassword")}
                type="password"
                autoComplete="new-password"
                value={confPwd}
                onValueChange={(v) => { setConfPwd(v); setPwdErr(""); }}
                size="sm"
                isInvalid={!!pwdErr}
                errorMessage={pwdErr}
              />
              {pwdOk && (
                <p className="text-xs text-success-600 text-center font-medium">{t("account.passwordChanged")} ✓</p>
              )}
            </ModalBody>
            <ModalFooter>
              <Button variant="flat" onPress={() => setShowChgPwd(false)}>{t("cancel")}</Button>
              <Button color="primary" type="submit" isLoading={submitting}>{t("save")}</Button>
            </ModalFooter>
          </form>
        </ModalContent>
      </Modal>
    </>
  );
}

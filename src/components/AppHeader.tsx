"use client";

import {
  Button, Dropdown, DropdownTrigger, DropdownMenu, DropdownItem,
} from "@nextui-org/react";
import { Wallet, Plus, Tag, Sun, Moon, Globe } from "lucide-react";
import { useTheme, useLanguage, useCurrency } from "@/app/providers";
import { LANGUAGES } from "@/lib/i18n";
import { CURRENCIES } from "@/lib/currencies";

interface Props {
  onAddExpense: () => void;
  onAddCategory: () => void;
  importExportSlot: React.ReactNode;
}

export function AppHeader({ onAddExpense, onAddCategory, importExportSlot }: Props) {
  const { theme, toggleTheme } = useTheme();
  const { t, language, setLanguage } = useLanguage();
  const { currency, setCurrency } = useCurrency();

  return (
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
  );
}

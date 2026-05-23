"use client";

import { Button } from "@nextui-org/react";
import { Wallet, Plus, Tag, ArrowLeftRight } from "lucide-react";

interface Props {
  onAddExpense: () => void;
  onAddCategory: () => void;
  importExportSlot: React.ReactNode;
}

export function AppHeader({ onAddExpense, onAddCategory, importExportSlot }: Props) {
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
              Expense Tracker
            </h1>
            <p className="text-blue-100 text-xs">
              Keep track of where your money goes
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Import/Export rendered by parent */}
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
            Category
          </Button>

          <Button
            size="sm"
            className="bg-white text-indigo-600 font-semibold hover:bg-blue-50 shadow-md"
            startContent={<Plus size={16} />}
            onPress={onAddExpense}
          >
            Add Expense
          </Button>
        </div>
      </div>
    </div>
  );
}

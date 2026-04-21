"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

const CATEGORIES = [
  { label: "喂养用品", value: "feeding" },
  { label: "护理清洁", value: "care" },
  { label: "辅食零食", value: "food" },
  { label: "医疗健康", value: "medical" },
  { label: "衣物穿戴", value: "clothing" },
  { label: "大件用品", value: "gear" },
  { label: "外出相关", value: "outing" },
  { label: "其他", value: "other" },
];

export interface QuickAddData {
  note: string;
  amount: number;
  category: string;
  date: string;
}

interface QuickAddProps {
  apiKey: string | null;
  onAdd: (data: QuickAddData) => Promise<void>;
}

export function QuickAdd({ apiKey, onAdd }: QuickAddProps) {
  const [note, setNote] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState(CATEGORIES[0].value);
  const [loading, setLoading] = useState(false);

  const isDisabled = !apiKey || loading;

  const handleSubmit = async () => {
    if (!note.trim() || !amount) return;

    const numAmount = Number(amount);
    if (isNaN(numAmount) || numAmount <= 0) return;

    setLoading(true);
    try {
      await onAdd({
        note: note.trim(),
        amount: numAmount,
        category,
        date: new Date().toISOString(),
      });
      // 清空备注和金额，保留分类
      setNote("");
      setAmount("");
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSubmit();
    }
  };

  return (
    <div className="space-y-2">
      {/* 备注 - 整行 */}
      <Input
        placeholder="备注（如：尿布）"
        value={note}
        onChange={(e) => setNote(e.target.value)}
        onKeyDown={handleKeyDown}
        disabled={isDisabled}
        className="h-11 text-base"
      />

      {/* 第二行：金额 + 分类 + 按钮 */}
      <div className="flex gap-2">
        <Input
          type="number"
          placeholder="金额"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={isDisabled}
          className="h-11 w-28 text-base"
        />
        <Select value={category} onValueChange={setCategory} disabled={isDisabled}>
          <SelectTrigger className="h-11 flex-1 text-base">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {CATEGORIES.map((cat) => (
              <SelectItem key={cat.value} value={cat.value}>
                {cat.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          size="default"
          onClick={handleSubmit}
          disabled={isDisabled || !note.trim() || !amount}
          className="h-11 w-11 p-0"
        >
          <Plus className="h-5 w-5" />
        </Button>
      </div>

      {/* 无 API Key 提示 */}
      {!apiKey && (
        <p className="text-xs text-gray-400">
          请先设置 API Key 才能添加记录
        </p>
      )}
    </div>
  );
}
"use client";

import * as React from "react";
import { Switch } from "@/components/ui/switch";

interface SwitchRowProps {
  label: React.ReactNode;
  checked: boolean;
  onCheckedChange: (v: boolean) => void;
}

export function SwitchRow({ label, checked, onCheckedChange }: SwitchRowProps) {
  const labelId = React.useId();

  return (
    <div className="flex items-center justify-between">
      <span
        id={labelId}
        className="text-[10px] uppercase tracking-[0.06em] text-(--fg-2)"
      >
        {label}
      </span>
      <Switch
        checked={checked}
        onCheckedChange={onCheckedChange}
        aria-labelledby={labelId}
      />
    </div>
  );
}

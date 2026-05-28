"use client";

import * as React from "react";
import { HexColorInput, HexColorPicker } from "react-colorful";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

export interface ColorFieldProps {
  label?: string;
  value: string;
  onChange: (hex: string) => void;
  ariaLabel?: string;
}

export function ColorField({ label, value, onChange, ariaLabel }: ColorFieldProps) {
  return (
    <div className="ctrl">
      {label ? (
        <div className="ctrl-label">
          <span className="name">{label}</span>
        </div>
      ) : null}
      <div className="grid grid-cols-[32px_1fr] items-center gap-2">
        <Popover>
          <PopoverTrigger asChild>
            <button
              type="button"
              className="color-chip"
              style={{ background: value }}
              aria-label={ariaLabel ?? label ?? "Pick color"}
            />
          </PopoverTrigger>
          <PopoverContent side="left" align="start" sideOffset={6}>
            <div className="flex flex-col gap-2">
              <HexColorPicker color={value} onChange={onChange} />
              <HexColorInput
                color={value}
                onChange={onChange}
                prefixed
                className="hex-input"
                spellCheck={false}
              />
            </div>
          </PopoverContent>
        </Popover>
        <HexColorInput
          color={value}
          onChange={onChange}
          prefixed
          className="hex-input"
          spellCheck={false}
        />
      </div>
    </div>
  );
}

export function CompactColorField({
  value,
  onChange,
  ariaLabel,
}: Pick<ColorFieldProps, "value" | "onChange" | "ariaLabel">) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="color-chip w-7 h-6"
          style={{ background: value }}
          aria-label={ariaLabel ?? "Pick color"}
        />
      </PopoverTrigger>
      <PopoverContent side="left" align="start" sideOffset={6}>
        <div className="flex flex-col gap-2">
          <HexColorPicker color={value} onChange={onChange} />
          <HexColorInput
            color={value}
            onChange={onChange}
            prefixed
            className="hex-input"
            spellCheck={false}
          />
        </div>
      </PopoverContent>
    </Popover>
  );
}

"use client";

import * as React from "react";
import { ChevronDown } from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

interface SectionProps {
  title: string;
  icon?: React.ReactNode;
  defaultOpen?: boolean;
  expertOnly?: boolean;
  expertActive?: boolean;
  children: React.ReactNode;
}

export function Section({
  title,
  icon,
  defaultOpen = true,
  expertOnly = false,
  expertActive = false,
  children,
}: SectionProps) {
  const [open, setOpen] = React.useState(defaultOpen);
  if (expertOnly && !expertActive) return null;
  return (
    <Collapsible open={open} onOpenChange={setOpen} className="section">
      <CollapsibleTrigger className="section-header" data-state={open ? "open" : "closed"}>
        <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {icon}
          {title}
          {expertOnly ? <span className="expert-only-tag">EXPERT</span> : null}
        </span>
        <span className="chev">
          <ChevronDown size={14} />
        </span>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="section-body">{children}</div>
      </CollapsibleContent>
    </Collapsible>
  );
}

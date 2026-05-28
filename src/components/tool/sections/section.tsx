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
  children: React.ReactNode;
}

export function Section({
  title,
  icon,
  defaultOpen = true,
  children,
}: SectionProps) {
  const [open, setOpen] = React.useState(defaultOpen);
  return (
    <Collapsible open={open} onOpenChange={setOpen} className="section">
      <CollapsibleTrigger className="section-header" data-state={open ? "open" : "closed"}>
        <span className="flex items-center gap-2">
          {icon}
          {title}
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

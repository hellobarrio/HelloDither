"use client";

import * as React from "react";
import { Switch as SwitchPrimitive } from "radix-ui";

import { cn } from "@/lib/utils";

function Switch({
  className,
  ...props
}: React.ComponentProps<typeof SwitchPrimitive.Root>) {
  return (
      <SwitchPrimitive.Root
        data-slot="switch"
        className={cn(
        "relative inline-block h-4.5 w-8 shrink-0 cursor-pointer border border-foreground bg-secondary transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50 data-[state=checked]:bg-primary disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb
        data-slot="switch-thumb"
        className="pointer-events-none absolute top-px left-px block h-3.5 w-3.5 bg-foreground transition-transform duration-200 ease-out data-[state=checked]:translate-x-3.5"
      />
    </SwitchPrimitive.Root>
  );
}

export { Switch };

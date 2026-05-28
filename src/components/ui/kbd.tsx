import * as React from "react";
import { cn } from "@/lib/utils";

export function Kbd({
  className,
  children,
  ...props
}: React.ComponentProps<"kbd">) {
  return (
    <kbd className={cn("kbd", className)} {...props}>
      {children}
    </kbd>
  );
}

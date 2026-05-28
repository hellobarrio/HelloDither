"use client";

import * as React from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MediaSection } from "./sections/media-section";
import { CanvasSection } from "./sections/canvas-section";
import { GridSection } from "./sections/grid-section";
import { ColorSection } from "./sections/color-section";
import { AudioSection } from "./sections/audio-section";

export function Sidebar() {
  return (
    <aside className="app-sidebar">
      <ScrollArea className="h-full">
        <MediaSection />
        <CanvasSection />
        <GridSection />
        <ColorSection />
        <AudioSection />
      </ScrollArea>
    </aside>
  );
}

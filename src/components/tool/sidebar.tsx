"use client";

import * as React from "react";
import { Keyboard } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MediaSection } from "./sections/media-section";
import { CanvasSection } from "./sections/canvas-section";
import { TransformSection } from "./sections/transform-section";
import { GridSection } from "./sections/grid-section";
import { ColorSection } from "./sections/color-section";
import { AudioSection } from "./sections/audio-section";
import { Button } from "../ui/button";

interface SidebarProps {
  onShowHelp: () => void;
}

export function Sidebar({ onShowHelp }: SidebarProps) {
  return (
    <aside className="app-sidebar">
      <ScrollArea className="h-full">
        <MediaSection />
        <CanvasSection />
        <TransformSection />
        <GridSection />
        <ColorSection />
        <AudioSection />
        <Button className="sidebar-footer-link" onClick={onShowHelp}>
          <Keyboard size={12} />
          Keyboard shortcuts
        </Button>
      </ScrollArea>
    </aside>
  );
}

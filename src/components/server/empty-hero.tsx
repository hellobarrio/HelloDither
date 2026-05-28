export function EmptyHero() {
  return (
    <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-6 px-8 text-center text-(--fg-2)">
      <div className="text-[13px] font-medium uppercase tracking-[0.12em] text-(--hb-black)">
        Load an image
      </div>
      <div className="max-w-[380px] text-[11px] uppercase leading-[1.5] tracking-[0.08em]">
        Drop a file anywhere on the canvas, or use the Upload button.
      </div>
    </div>
  );
}

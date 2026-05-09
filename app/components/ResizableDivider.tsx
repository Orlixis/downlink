"use client";

import { useCallback, useEffect, useRef, useState } from "react";

interface ResizableDividerProps {
  /** Controlled width of the RIGHT panel (queue) in pixels */
  width: number;
  onWidthChange: (width: number) => void;
  minWidth?: number;
  maxWidth?: number;
}

/**
 * A drag handle that sits between the preview panel and the download queue.
 * Dragging it left/right adjusts the queue width.
 */
export function ResizableDivider({
  width,
  onWidthChange,
  minWidth = 260,
  maxWidth = 480,
}: ResizableDividerProps) {
  const dragging = useRef(false);
  const startX = useRef(0);
  const startWidth = useRef(0);
  const [active, setActive] = useState(false);

  const onMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      dragging.current = true;
      startX.current = e.clientX;
      startWidth.current = width;
      setActive(true);
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
    },
    [width]
  );

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      if (!dragging.current) return;
      // Moving left = increasing queue width (divider moves left relative to right edge)
      const delta = startX.current - e.clientX;
      const next = Math.min(maxWidth, Math.max(minWidth, startWidth.current + delta));
      onWidthChange(next);
    };

    const onMouseUp = () => {
      if (!dragging.current) return;
      dragging.current = false;
      setActive(false);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };
  }, [minWidth, maxWidth, onWidthChange]);

  return (
    <div
      onMouseDown={onMouseDown}
      className="group relative flex w-1 flex-shrink-0 cursor-col-resize items-center justify-center bg-zinc-800/80 transition-colors hover:bg-blue-500/40"
      title="Drag to resize"
      role="separator"
      aria-orientation="vertical"
    >
      {/* Visual handle pill */}
      <div
        className={`
          absolute h-8 w-1 rounded-full transition-all duration-150
          ${active
            ? "bg-blue-500 opacity-100 scale-y-110"
            : "bg-zinc-600 opacity-0 group-hover:opacity-100"
          }
        `}
      />
      {/* Full-height invisible hit area */}
      <div className="absolute inset-y-0 -left-1.5 -right-1.5" />
    </div>
  );
}

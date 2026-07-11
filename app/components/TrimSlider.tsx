"use client";

import { useEffect, useRef, useCallback } from "react";

interface TrimSliderProps {
  duration: number; // total duration in seconds
  start: number;    // trim start in seconds
  end: number;      // trim end in seconds
  onChange: (start: number, end: number) => void;
}

function formatTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) {
    return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }
  return `${m}:${String(s).padStart(2, "0")}`;
}

export function TrimSlider({ duration, start, end, onChange }: TrimSliderProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const startThumbRef = useRef<HTMLDivElement>(null);
  const endThumbRef = useRef<HTMLDivElement>(null);
  const draggingRef = useRef<"start" | "end" | null>(null);

  const startPct = duration > 0 ? (start / duration) * 100 : 0;
  const endPct = duration > 0 ? (end / duration) * 100 : 100;
  const selectedDuration = end - start;

  const clamp = (val: number, min: number, max: number) =>
    Math.max(min, Math.min(max, val));

  const getPctFromEvent = useCallback(
    (clientX: number): number => {
      if (!trackRef.current) return 0;
      const rect = trackRef.current.getBoundingClientRect();
      return clamp((clientX - rect.left) / rect.width, 0, 1);
    },
    []
  );

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!draggingRef.current) return;
      const pct = getPctFromEvent(e.clientX);
      const seconds = pct * duration;

      if (draggingRef.current === "start") {
        const newStart = clamp(seconds, 0, end - 1);
        onChange(Math.round(newStart * 10) / 10, end);
      } else {
        const newEnd = clamp(seconds, start + 1, duration);
        onChange(start, Math.round(newEnd * 10) / 10);
      }
    },
    [draggingRef, getPctFromEvent, duration, start, end, onChange]
  );

  const handleMouseUp = useCallback(() => {
    draggingRef.current = null;
    document.body.style.cursor = "";
    document.body.style.userSelect = "";
  }, []);

  useEffect(() => {
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [handleMouseMove, handleMouseUp]);

  const startDrag = (handle: "start" | "end") => (e: React.MouseEvent) => {
    e.preventDefault();
    draggingRef.current = handle;
    document.body.style.cursor = "grabbing";
    document.body.style.userSelect = "none";
  };

  // Keyboard nudge: 1-second steps
  const handleKeyDown = (handle: "start" | "end") => (e: React.KeyboardEvent) => {
    const step = e.shiftKey ? 5 : 1;
    if (handle === "start") {
      if (e.key === "ArrowLeft") onChange(clamp(start - step, 0, end - 1), end);
      if (e.key === "ArrowRight") onChange(clamp(start + step, 0, end - 1), end);
    } else {
      if (e.key === "ArrowLeft") onChange(start, clamp(end - step, start + 1, duration));
      if (e.key === "ArrowRight") onChange(start, clamp(end + step, start + 1, duration));
    }
  };

  // Click on track to set nearest handle
  const handleTrackClick = (e: React.MouseEvent) => {
    if (draggingRef.current) return;
    const pct = getPctFromEvent(e.clientX);
    const seconds = pct * duration;
    const distStart = Math.abs(seconds - start);
    const distEnd = Math.abs(seconds - end);
    if (distStart <= distEnd) {
      onChange(clamp(seconds, 0, end - 1), end);
    } else {
      onChange(start, clamp(seconds, start + 1, duration));
    }
  };

  return (
    <div className="trim-slider px-1 py-3 select-none">
      {/* Timestamp badges row */}
      <div className="flex items-center justify-between mb-2.5 px-0.5">
        <div className="flex items-center gap-1">
          <span className="text-[9px] font-semibold uppercase tracking-widest text-zinc-500">Start</span>
          <span className="rounded-md bg-violet-600/20 px-2 py-0.5 text-[11px] font-mono font-semibold text-violet-300 ring-1 ring-violet-500/30 tabular-nums">
            {formatTime(start)}
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          <span className="rounded-full bg-zinc-800 px-2 py-0.5 text-[10px] font-medium text-zinc-400 ring-1 ring-zinc-700">
            {formatTime(selectedDuration)}
          </span>
        </div>

        <div className="flex items-center gap-1">
          <span className="rounded-md bg-violet-600/20 px-2 py-0.5 text-[11px] font-mono font-semibold text-violet-300 ring-1 ring-violet-500/30 tabular-nums">
            {formatTime(end)}
          </span>
          <span className="text-[9px] font-semibold uppercase tracking-widest text-zinc-500">End</span>
        </div>
      </div>

      {/* Track */}
      <div
        ref={trackRef}
        onClick={handleTrackClick}
        className="relative h-[5px] rounded-full bg-zinc-800 cursor-pointer"
        style={{ margin: "0 8px" }}
        role="presentation"
      >
        {/* Unselected region glow (left) */}
        <div
          className="absolute inset-y-0 left-0 rounded-full bg-zinc-700/60"
          style={{ width: `${startPct}%` }}
        />
        {/* Selected region */}
        <div
          className="absolute inset-y-0 rounded-full bg-gradient-to-r from-violet-600 to-violet-400"
          style={{
            left: `${startPct}%`,
            width: `${endPct - startPct}%`,
            boxShadow: "0 0 8px rgba(139,92,246,0.5)",
          }}
        />
        {/* Unselected region (right) */}
        <div
          className="absolute inset-y-0 right-0 rounded-full bg-zinc-700/60"
          style={{ width: `${100 - endPct}%` }}
        />

        {/* Start thumb */}
        <div
          ref={startThumbRef}
          role="slider"
          aria-valuemin={0}
          aria-valuemax={Math.round(end - 1)}
          aria-valuenow={Math.round(start)}
          aria-label="Trim start"
          tabIndex={0}
          onMouseDown={startDrag("start")}
          onKeyDown={handleKeyDown("start")}
          className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 flex h-4 w-4 cursor-grab items-center justify-center rounded-full bg-violet-500 ring-2 ring-violet-300/40 shadow-lg shadow-violet-900/50 transition-transform hover:scale-110 active:scale-95 focus:outline-none focus:ring-2 focus:ring-violet-400 focus:ring-offset-1 focus:ring-offset-zinc-900"
          style={{ left: `${startPct}%` }}
        >
          <div className="h-1 w-[2px] rounded-full bg-white/70" />
        </div>

        {/* End thumb */}
        <div
          ref={endThumbRef}
          role="slider"
          aria-valuemin={Math.round(start + 1)}
          aria-valuemax={Math.round(duration)}
          aria-valuenow={Math.round(end)}
          aria-label="Trim end"
          tabIndex={0}
          onMouseDown={startDrag("end")}
          onKeyDown={handleKeyDown("end")}
          className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 flex h-4 w-4 cursor-grab items-center justify-center rounded-full bg-violet-500 ring-2 ring-violet-300/40 shadow-lg shadow-violet-900/50 transition-transform hover:scale-110 active:scale-95 focus:outline-none focus:ring-2 focus:ring-violet-400 focus:ring-offset-1 focus:ring-offset-zinc-900"
          style={{ left: `${endPct}%` }}
        >
          <div className="h-1 w-[2px] rounded-full bg-white/70" />
        </div>
      </div>

      {/* Full duration label */}
      <div className="mt-2 flex justify-center">
        <span className="text-[9px] text-zinc-600">Total: {formatTime(duration)}</span>
      </div>
    </div>
  );
}

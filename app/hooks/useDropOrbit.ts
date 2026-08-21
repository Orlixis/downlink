"use client";

import { useState, useRef, useCallback } from "react";
import { normalizeBareUrls } from "@/app/types";

interface OrbitingUrl {
  id: string;
  url: string;
  startX: number;
  startY: number;
}

interface UseDropOrbitOptions {
  onUrlsDropped: (urls: string[]) => void;
}

export function useDropOrbit({ onUrlsDropped }: UseDropOrbitOptions) {
  const [isDragging, setIsDragging] = useState(false);
  const [orbitingUrls, setOrbitingUrls] = useState<OrbitingUrl[]>([]);
  const dragCounterRef = useRef(0);

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    dragCounterRef.current += 1;
    if (e.dataTransfer.types.includes("text/plain") || e.dataTransfer.types.includes("Files")) {
      setIsDragging(true);
    }
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    dragCounterRef.current -= 1;
    if (dragCounterRef.current <= 0) {
      setIsDragging(false);
      dragCounterRef.current = 0;
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      dragCounterRef.current = 0;

      const text = e.dataTransfer.getData("text/plain");
      if (!text) return;

      const normalized = normalizeBareUrls(text);
      const matches = normalized.match(/https?:\/\/[^\s]+/g);
      if (matches && matches.length > 0) {
        const dropX = e.clientX;
        const dropY = e.clientY;

        const newOrbiters = matches.map((url, idx) => ({
          id: `${Date.now()}-${idx}`,
          url,
          startX: dropX + (Math.random() * 60 - 30),
          startY: dropY + (Math.random() * 60 - 30),
        }));

        setOrbitingUrls(newOrbiters);
        onUrlsDropped(matches);
      }
    },
    [onUrlsDropped]
  );

  const clearOrbitingUrls = useCallback(() => {
    setOrbitingUrls([]);
  }, []);

  return {
    isDragging,
    orbitingUrls,
    handleDragEnter,
    handleDragLeave,
    handleDragOver,
    handleDrop,
    clearOrbitingUrls,
  };
}

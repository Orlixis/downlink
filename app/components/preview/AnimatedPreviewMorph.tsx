"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";

interface AnimatedPreviewMorphProps {
  loading: boolean;
  index?: number;
  children: React.ReactNode;
  className?: string;
  isExiting?: boolean;
}

export function AnimatedPreviewMorph({
  loading,
  index = 0,
  children,
  className,
  isExiting = false,
}: AnimatedPreviewMorphProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const prevLoadingRef = useRef(loading);

  useGSAP(
    () => {
      if (!containerRef.current || !contentRef.current) return;
      const delay = index * 0.08;

      gsap.fromTo(
        containerRef.current,
        {
          y: -24,
          opacity: 0,
          scale: 0.96,
        },
        {
          y: 0,
          opacity: 1,
          scale: 1,
          duration: 0.4,
          delay,
          ease: "power2.out",
        }
      );
    },
    { scope: containerRef }
  );

  useEffect(() => {
    if (!containerRef.current || !contentRef.current) return;

    if (prevLoadingRef.current !== loading) {
      prevLoadingRef.current = loading;
      gsap.fromTo(
        contentRef.current,
        { opacity: 0, y: 6 },
        { opacity: 1, y: 0, duration: 0.35, ease: "power2.out" }
      );
    }
  }, [loading]);

  useGSAP(() => {
    if (isExiting) {
      if (!containerRef.current || !contentRef.current) return;

      gsap.killTweensOf(containerRef.current);
      gsap.killTweensOf(contentRef.current);

      const tl = gsap.timeline();
      tl.to(contentRef.current, {
        opacity: 0,
        scale: 0.9,
        duration: 0.2,
        ease: "power2.in",
      });
      tl.to(
        containerRef.current,
        {
          y: 80,
          scale: 0.2,
          opacity: 0,
          borderRadius: "50%",
          duration: 0.35,
          ease: "back.in(1.7)",
        },
        "-=0.1"
      );
    }
  }, [isExiting]);

  return (
    <div
      ref={containerRef}
      className={`relative mx-auto flex w-full max-w-xl flex-col items-center justify-center transition-all duration-300 ${
        className || ""
      }`}
    >
      <div ref={contentRef} className="w-full">
        {children}
      </div>
    </div>
  );
}

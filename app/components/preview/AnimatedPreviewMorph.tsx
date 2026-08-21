"use client";

import { useRef } from "react";
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
  const hasLanded = useRef(false);

  useGSAP(
    () => {
      if (!containerRef.current || !contentRef.current) return;
      const delay = index * 0.15;

      gsap.set(containerRef.current, {
        y: -180,
        width: 450,
        height: 48,
        borderRadius: "12px",
        backgroundColor: "rgb(39 39 42)",
        border: "1px solid rgb(63 63 70)",
        overflow: "hidden",
      });
      gsap.set(contentRef.current, { opacity: 0 });

      const tl = gsap.timeline({
        onComplete: () => {
          hasLanded.current = true;
          expandToCurrent();
        },
      });

      const floorY = 60;

      tl.to(
        containerRef.current,
        {
          width: 24,
          height: 24,
          borderRadius: "12px",
          backgroundColor: "rgb(59 130 246)",
          border: "none",
          duration: 0.35,
          ease: "power2.in",
        },
        delay
      )
        .to(
          containerRef.current,
          {
            y: floorY,
            duration: 0.35,
            ease: "power2.in",
          },
          delay
        )
        .to(
          containerRef.current,
          {
            y: 0,
            duration: 0.3,
            ease: "back.out(1.5)",
          },
          ">"
        );
    },
    { scope: containerRef }
  );

  const expandToCurrent = () => {
    if (!containerRef.current || !contentRef.current || isExiting) return;

    contentRef.current.style.opacity = "0";
    contentRef.current.style.display = "";

    containerRef.current.style.width = "auto";
    containerRef.current.style.height = "auto";
    const targetH = contentRef.current.offsetHeight || 64;
    const targetW = contentRef.current.offsetWidth || 384;

    containerRef.current.style.width = "24px";
    containerRef.current.style.height = "24px";

    const tl = gsap.timeline();
    tl.to(containerRef.current, {
      width: targetW,
      height: targetH,
      borderRadius: "16px",
      backgroundColor: "transparent",
      duration: 0.5,
      ease: "power3.inOut",
    }).to(
      contentRef.current,
      {
        opacity: 1,
        duration: 0.3,
        onComplete: () => {
          if (containerRef.current) {
            containerRef.current.style.width = targetW + "px";
            containerRef.current.style.height = targetH + "px";
          }
        },
      },
      "-=0.2"
    );
  };

  useGSAP(() => {
    if (hasLanded.current && !loading && !isExiting) {
      if (!containerRef.current || !contentRef.current) return;

      const oldW = containerRef.current.style.width;
      const oldH = containerRef.current.style.height;

      containerRef.current.style.width = "auto";
      containerRef.current.style.height = "auto";

      const newH = contentRef.current.offsetHeight;
      const newW = contentRef.current.offsetWidth;

      containerRef.current.style.width = oldW;
      containerRef.current.style.height = oldH;

      contentRef.current.style.opacity = "0";

      const tl = gsap.timeline();
      tl.to(containerRef.current, {
        width: newW,
        height: newH,
        duration: 0.5,
        ease: "power3.inOut",
        onComplete: () => {
          if (containerRef.current) {
            gsap.set(containerRef.current, { clearProps: "all" });
          }
        },
      });

      tl.to(
        contentRef.current,
        {
          opacity: 1,
          duration: 0.3,
        },
        "-=0.2"
      );
    }
  }, [loading]);

  useGSAP(() => {
    if (isExiting) {
      if (!containerRef.current || !contentRef.current) return;

      gsap.killTweensOf(containerRef.current);
      gsap.killTweensOf(contentRef.current);

      const currentW = containerRef.current.offsetWidth;
      const currentH = containerRef.current.offsetHeight;
      containerRef.current.style.width = currentW + "px";
      containerRef.current.style.height = currentH + "px";

      const tl = gsap.timeline();
      tl.to(contentRef.current, { opacity: 0, duration: 0.15 });
      tl.to(containerRef.current, {
        width: 24,
        height: 24,
        borderRadius: "12px",
        backgroundColor: "rgb(59 130 246)",
        border: "none",
        duration: 0.25,
        ease: "power2.in",
      });
      tl.to(containerRef.current, {
        y: 120,
        opacity: 0,
        scale: 0.5,
        duration: 0.3,
        ease: "power2.in",
      });
    }
  }, [isExiting]);

  return (
    <div
      ref={containerRef}
      className={`relative mx-auto flex flex-col items-center justify-center ${
        className || ""
      }`}
    >
      <div ref={contentRef} className="w-full">
        {children}
      </div>
    </div>
  );
}

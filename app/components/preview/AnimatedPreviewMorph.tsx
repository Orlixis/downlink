"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { soundManager } from "@/app/lib/SoundManager";

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

  // Mount animation: the swoop and drop
  useGSAP(
    () => {
      if (!containerRef.current || !contentRef.current) return;
      const delay = index * 0.15;

      // Start state: Wide input field replica high near the top
      gsap.set(containerRef.current, {
        y: -180,
        width: 450,
        height: 48,
        borderRadius: "12px",
        backgroundColor: "rgb(39 39 42)", // zinc-800
        border: "1px solid rgb(63 63 70)", // zinc-700
        overflow: "hidden",
      });
      // Hide actual children while it's dropping
      gsap.set(contentRef.current, { opacity: 0 });

      const tl = gsap.timeline({
        onComplete: () => {
          hasLanded.current = true;
          // As soon as it lands, expand into CURRENT children (skeleton or card)
          expandToCurrent();
        },
      });

      const floorY = 60; // Simulate floor depth

      // Step 1: Swoop down and morph into a small ball
      tl.to(
        containerRef.current,
        {
          width: 24,
          height: 24,
          borderRadius: "12px",
          backgroundColor: "rgb(59 130 246)", // blue-500
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
        // Step 2: Bounce up to natural row/center position (y: 0)
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

    // Temporarily make content visible to measure
    contentRef.current.style.opacity = "0";
    contentRef.current.style.display = "";

    // Measure natural height of the skeleton/content
    containerRef.current.style.width = "auto";
    containerRef.current.style.height = "auto";
    const targetH = contentRef.current.offsetHeight || 64;
    const targetW = contentRef.current.offsetWidth || 384;

    // Revert to ball dimensions to animate to target
    containerRef.current.style.width = "24px";
    containerRef.current.style.height = "24px";

    const tl = gsap.timeline();
    tl.to(containerRef.current, {
      width: targetW,
      height: targetH,
      borderRadius: "16px",
      backgroundColor: "transparent",
      duration: 0.35,
      ease: "power2.out",
      onComplete: () => {
        if (!containerRef.current || !contentRef.current) return;
        // Release fixed dimensions so responsiveness / flex works
        containerRef.current.style.width = "100%";
        containerRef.current.style.height = "auto";
        containerRef.current.style.overflow = "visible";
      },
    }).to(
      contentRef.current,
      {
        opacity: 1,
        duration: 0.25,
      },
      "-=0.15"
    );
  };

  // When loading finishes (data is ready), morph from skeleton size to full preview card
  useEffect(() => {
    if (!hasLanded.current || !containerRef.current || !contentRef.current || isExiting)
      return;

    // Capture current visual bounding box
    const currentH = containerRef.current.offsetHeight;
    const currentW = containerRef.current.offsetWidth;
    containerRef.current.style.height = currentH + "px";
    containerRef.current.style.width = currentW + "px";
    containerRef.current.style.overflow = "hidden";

    // Fade content slightly while morphing
    gsap.to(contentRef.current, {
      opacity: 0.3,
      duration: 0.15,
      onComplete: () => {
        if (!containerRef.current || !contentRef.current) return;

        // Measure new target height
        containerRef.current.style.height = "auto";
        containerRef.current.style.width = "auto";
        const targetH = contentRef.current.offsetHeight;
        const targetW = contentRef.current.offsetWidth;

        // Restore fixed dimensions for GSAP tween
        containerRef.current.style.height = currentH + "px";
        containerRef.current.style.width = currentW + "px";

        gsap.to(containerRef.current, {
          height: targetH,
          width: targetW,
          duration: 0.4,
          ease: "power2.out",
          onComplete: () => {
            if (!containerRef.current) return;
            containerRef.current.style.height = "auto";
            containerRef.current.style.width = "100%";
            containerRef.current.style.overflow = "visible";
          },
        });

        gsap.to(contentRef.current, {
          opacity: 1,
          duration: 0.3,
          delay: 0.1,
        });
      },
    });
  }, [loading, isExiting]);

  // Exit Animation: Morph back to ball and bounce/fly into download queue
  useGSAP(() => {
    if (isExiting && containerRef.current && contentRef.current) {
      // Lock container at current size
      const currentH = containerRef.current.offsetHeight;
      const currentW = containerRef.current.offsetWidth;
      containerRef.current.style.width = currentW + "px";
      containerRef.current.style.height = currentH + "px";

      const tl = gsap.timeline();

      // Fade out the inner preview card rapidly
      tl.to(contentRef.current, { opacity: 0, duration: 0.15 });

      // Morph back into a blue ball
      tl.to(
        containerRef.current,
        {
          width: 24,
          height: 24,
          borderRadius: "12px",
          backgroundColor: "rgb(59 130 246)", // blue-500
          border: "none",
          duration: 0.3,
          ease: "power2.inOut",
        },
        "<"
      );

      // Drop to ground and bounce over into the download queue on the right
      const delay = index * 0.1; // Stagger multiple balls

      const rect = containerRef.current.getBoundingClientRect();
      const queueEl = document.getElementById("download-queue-container");
      const actionEl = document.getElementById("action-bar-container");

      // Calculate floorY accurately based on the action bar top
      let floorY = window.innerHeight - rect.bottom - 40;
      if (actionEl) {
        const actionRect = actionEl.getBoundingClientRect();
        floorY = actionRect.top - rect.bottom;
      }

      // Calculate targetX and targetY accurately based on the download queue
      let targetX = window.innerWidth - rect.right - 40;
      let targetY = 80 - rect.top;

      if (queueEl) {
        const queueRect = queueEl.getBoundingClientRect();
        // Fly to the left edge of the queue plus 40px padding inward
        targetX = queueRect.left + 40 - rect.left;
        // Target about 60px from the top of the queue
        targetY = queueRect.top + 60 - rect.top;
      }

      const peakY = targetY - 150; // The top of the bounce arc (150px higher than destination)

      tl.to(
        containerRef.current,
        {
          y: floorY, // hit the floor
          duration: 0.25,
          ease: "power2.in", // accelerate downwards (gravity)
          onStart: () => soundManager.playThrow(),
        },
        `+=${delay}`
      )
        .to(
          containerRef.current,
          {
            x: targetX, // travel horizontally
            scale: 0.5,
            duration: 0.5,
            ease: "none",
          },
          ">"
        )
        .to(
          containerRef.current,
          {
            y: peakY, // bounce upwards to the peak of the arc
            duration: 0.25,
            ease: "power2.out",
          },
          "<"
        )
        .to(
          containerRef.current,
          {
            y: targetY, // drop down into the queue from the peak
            duration: 0.25,
            ease: "power2.in",
          },
          ">"
        )
        .to(
          containerRef.current,
          {
            opacity: 0,
            duration: 0.15,
          },
          "-=0.15"
        );
    }
  }, [isExiting]);

  return (
    <div
      ref={containerRef}
      className={`mx-auto flex flex-col items-center justify-center relative ${
        className || ""
      }`}
    >
      <div ref={contentRef} className="w-full" style={{ display: "none" }}>
        {children}
      </div>
    </div>
  );
}

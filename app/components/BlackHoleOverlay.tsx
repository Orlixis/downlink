"use client";

import { useRef, useState, useEffect } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { Link } from "lucide-react";
import { soundManager } from "../lib/SoundManager";

interface BlackHoleOverlayProps {
  mode: "drag" | "clipboard";
  clipboardUrl?: string;
  onAbsorb?: () => void;
  onDismiss?: () => void;
}

export function BlackHoleOverlay({ mode, clipboardUrl, onAbsorb, onDismiss }: BlackHoleOverlayProps) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const coreRef = useRef<HTMLDivElement>(null);
  const ring1Ref = useRef<HTMLDivElement>(null);
  const ring2Ref = useRef<HTMLDivElement>(null);
  const ring3Ref = useRef<HTMLDivElement>(null);
  const urlPillRef = useRef<HTMLDivElement>(null);
  const accretionRef = useRef<HTMLDivElement>(null);
  const absorbedRef = useRef(false);
  const [isActive, setIsActive] = useState(true);

  const isDrag = mode === "drag";

  // ── Mouse tracking & Sound control ──────────────────────────────────────
  useEffect(() => {
    if (isActive && !absorbedRef.current) {
      soundManager.startPortalIdle();
      // Ensure it's visible if it became active again
      gsap.to(overlayRef.current, { opacity: 1, duration: 0.3, ease: "power2.out", overwrite: "auto" });
    } else if (!isActive && !absorbedRef.current) {
      soundManager.stopPortalIdle();
      // Hide the singularity
      gsap.to(overlayRef.current, { opacity: 0, duration: 0.3, ease: "power2.out", overwrite: "auto" });
    }

    return () => {
      soundManager.stopPortalIdle();
    };
  }, [isActive]);

  useEffect(() => {
    const handleDeactivate = () => setIsActive(false);
    const handleActivate = () => setIsActive(true);

    const handleMouseOut = (e: MouseEvent) => {
      if (!e.relatedTarget) {
        setIsActive(false);
      }
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (!isActive && !absorbedRef.current) {
        setIsActive(true);
        return;
      }

      if (!isActive || !coreRef.current || absorbedRef.current) return;
      
      const rect = coreRef.current.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      
      const dist = Math.hypot(e.clientX - centerX, e.clientY - centerY);
      
      const maxDist = window.innerWidth * 0.7; 
      
      let volume = 1.0 - (dist / maxDist);
      if (volume < 0.05) volume = 0.05;
      if (volume > 1.0) volume = 1.0;
      
      soundManager.setPortalVolume(volume);
    };

    window.addEventListener("mouseout", handleMouseOut);
    window.addEventListener("blur", handleDeactivate);
    window.addEventListener("focus", handleActivate);
    window.addEventListener("mousemove", handleMouseMove);

    return () => {
      window.removeEventListener("mouseout", handleMouseOut);
      window.removeEventListener("blur", handleDeactivate);
      window.removeEventListener("focus", handleActivate);
      window.removeEventListener("mousemove", handleMouseMove);
    };
  }, [isActive]);

  // ── Entrance animation ──────────────────────────────────────────────────
  useGSAP(() => {
    // Overlay itself: fade in from transparent (start is visible via CSS — GSAP just animates)
    gsap.fromTo(overlayRef.current, { opacity: 0 }, { opacity: 1, duration: 0.3, ease: "power2.out" });

    // Core springs in
    gsap.fromTo(
      coreRef.current,
      { scale: 0.2, opacity: 0 },
      { scale: 1, opacity: 1, duration: 0.5, delay: 0.1, ease: "back.out(2)" }
    );

    // Rings stagger in
    gsap.fromTo(
      [ring1Ref.current, ring2Ref.current, ring3Ref.current],
      { scale: 0.3, opacity: 0 },
      { scale: 1, opacity: 1, duration: 0.4, delay: 0.2, stagger: 0.08, ease: "back.out(1.5)" }
    );

    // URL pill drops in (clipboard mode)
    if (mode === "clipboard" && urlPillRef.current) {
      gsap.fromTo(
        urlPillRef.current,
        { y: -50, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.5, delay: 0.25, ease: "back.out(2)" }
      );
    }
  }, [mode]);

  // ── Continuous black hole physics ───────────────────────────────────────
  useGSAP(() => {
    // Event horizon pulse rings
    gsap.to(ring1Ref.current, { scale: 2.8, opacity: 0, duration: 3, repeat: -1, ease: "power1.in" });
    gsap.to(ring2Ref.current, { scale: 2.2, opacity: 0, duration: 2.3, delay: 0.9, repeat: -1, ease: "power1.in" });
    gsap.to(ring3Ref.current, { scale: 1.8, opacity: 0, duration: 1.7, delay: 1.6, repeat: -1, ease: "power1.in" });

    // Accretion disk rotation
    gsap.to(accretionRef.current, { rotation: 360, duration: 8, repeat: -1, ease: "none" });

    // URL pill bobs toward core
    if (mode === "clipboard" && urlPillRef.current) {
      gsap.to(urlPillRef.current, { y: 10, duration: 1.8, repeat: -1, yoyo: true, ease: "sine.inOut", delay: 0.8 });
    }
  }, [mode]);

  // ── Absorb: pill falls into singularity ────────────────────────────────
  const handleAbsorb = () => {
    if (absorbedRef.current) return;
    absorbedRef.current = true;
    
    soundManager.stopPortalIdle();

    const tl = gsap.timeline({ onComplete: () => onAbsorb?.() });

    if (urlPillRef.current) {
      tl.to(urlPillRef.current, { scale: 0, opacity: 0, y: 40, duration: 0.6, ease: "power3.in" });
    }
    tl.to(coreRef.current, { scale: 1.5, duration: 0.15, ease: "power2.out" }, "-=0.3");
    tl.to(coreRef.current, { scale: 0, opacity: 0, duration: 0.35, ease: "power3.in" });
    tl.to(overlayRef.current, { opacity: 0, duration: 0.25, ease: "power2.out" }, "-=0.1");
  };

  // ── Dismiss: fade out ──────────────────────────────────────────────────
  const handleDismiss = () => {
    soundManager.stopPortalIdle();
    gsap.to(overlayRef.current, {
      opacity: 0, duration: 0.25, ease: "power2.in",
      onComplete: () => onDismiss?.(),
    });
  };

  return (
    <div
      ref={overlayRef}
      className="absolute inset-0 z-[9999] flex flex-col items-center justify-center"
      style={{
        // Start slightly transparent — GSAP animates from 0 to 1
        // We use a high z-index to ensure it sits above everything
        background: isDrag
          ? "radial-gradient(ellipse at center, rgba(4,0,18,0.88) 0%, rgba(2,0,10,0.65) 100%)"
          : "radial-gradient(ellipse at center, rgba(4,0,18,0.94) 0%, rgba(2,0,10,0.80) 100%)",
        backdropFilter: "blur(10px)",
        WebkitBackdropFilter: "blur(10px)",
      }}
      onClick={isDrag ? undefined : handleDismiss}
    >
      <div className="flex flex-col items-center justify-center gap-8 pointer-events-none">

        {/* URL pill — clipboard mode only */}
        {!isDrag && (
          <div
            ref={urlPillRef}
            className="flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 backdrop-blur-sm"
          >
            <Link className="h-3.5 w-3.5 shrink-0 text-cyan-300" />
            <span className="max-w-[220px] truncate font-mono text-[11px] text-white/85">{clipboardUrl}</span>
          </div>
        )}

        {/* Black Hole Core */}
        <div className="relative flex h-48 w-48 items-center justify-center">

          {/* Event horizon rings */}
          <div ref={ring1Ref} className="absolute inset-0 rounded-full border border-violet-400/50" />
          <div ref={ring2Ref} className="absolute inset-0 rounded-full border border-indigo-400/60" />
          <div ref={ring3Ref} className="absolute inset-0 rounded-full border border-blue-400/70" />

          {/* Accretion disk */}
          <div
            ref={accretionRef}
            className="absolute h-36 w-36 rounded-full"
            style={{
              background: "conic-gradient(from 0deg, transparent 0%, rgba(139,92,246,0.5) 25%, rgba(59,130,246,0.7) 55%, rgba(6,182,212,0.5) 78%, transparent 100%)",
              filter: "blur(5px)",
            }}
          />

          {/* Singularity core — clickable in clipboard mode */}
          <div
            ref={coreRef}
            className="relative z-20 flex h-20 w-20 items-center justify-center rounded-full"
            style={{
              background: "radial-gradient(circle, #0a0020 40%, rgba(88,28,220,0.7) 80%, transparent 100%)",
              boxShadow: "0 0 0 2px rgba(139,92,246,0.4), 0 0 35px rgba(139,92,246,0.7), 0 0 70px rgba(59,130,246,0.4), inset 0 0 20px rgba(0,0,0,0.95)",
              cursor: isDrag ? "default" : "pointer",
              pointerEvents: "auto",
            }}
            onClick={!isDrag ? (e) => { e.stopPropagation(); handleAbsorb(); } : undefined}
          >
            <div className="absolute inset-2 rounded-full" style={{ background: "radial-gradient(circle, rgba(80,0,255,0.35) 0%, transparent 70%)" }} />
            <div className="h-4 w-4 rounded-full bg-black ring-2 ring-violet-400/70 shadow-[0_0_8px_rgba(139,92,246,0.8)]" />
          </div>
        </div>

        {/* Label */}
        <div className="text-center">
          {isDrag ? (
            <>
              <p className="text-lg font-semibold tracking-wide text-white/95">Drop to Download</p>
              <p className="mt-1 text-xs text-violet-300/80">Release your link to add it to the queue</p>
            </>
          ) : (
            <>
              <p className="text-base font-semibold tracking-wide text-white/95">Link Detected in Clipboard</p>
              <p className="mt-1 text-xs text-violet-300/80">Click the singularity to absorb it · Click outside to dismiss</p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

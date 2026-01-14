"use client";

import { useEffect, useState } from "react";
import Image from "next/image";

interface SplashScreenProps {
  onComplete: () => void;
  minimumDuration?: number;
}

export function SplashScreen({ onComplete, minimumDuration = 2000 }: SplashScreenProps) {
  const [isAnimating, setIsAnimating] = useState(true);
  const [isFadingOut, setIsFadingOut] = useState(false);

  useEffect(() => {
    // Start fade out after minimum duration
    const fadeTimer = setTimeout(() => {
      setIsFadingOut(true);
    }, minimumDuration - 500);

    // Complete after fade animation
    const completeTimer = setTimeout(() => {
      setIsAnimating(false);
      onComplete();
    }, minimumDuration);

    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(completeTimer);
    };
  }, [minimumDuration, onComplete]);

  if (!isAnimating) return null;

  return (
    <div
      className={`fixed inset-0 z-50 flex flex-col items-center justify-center bg-zinc-950 transition-opacity duration-500 ${isFadingOut ? "opacity-0" : "opacity-100"
        }`}
    >
      {/* Animated Logo Container */}
      <div className="relative">
        {/* Glow effect behind logo */}
        <div className="absolute inset-0 blur-3xl opacity-30">
          <div className="h-32 w-32 rounded-full bg-gradient-to-br from-blue-500 via-cyan-500 to-green-500 animate-pulse" />
        </div>

        {/* Logo with animation */}
        <div className="relative animate-logo-entrance">
          <Image
            src="/downlink-square.png"
            alt="Downlink"
            width={120}
            height={120}
            className="drop-shadow-2xl"
            priority
          />
        </div>

        {/* Animated trails */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
          <svg
            className="h-40 w-40 animate-spin-slow"
            viewBox="0 0 100 100"
            fill="none"
          >
            <circle
              cx="50"
              cy="50"
              r="45"
              stroke="url(#gradient)"
              strokeWidth="2"
              strokeLinecap="round"
              strokeDasharray="70 200"
              className="opacity-40"
            />
            <defs>
              <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#2563eb" />
                <stop offset="50%" stopColor="#06b6d4" />
                <stop offset="100%" stopColor="#10b981" />
              </linearGradient>
            </defs>
          </svg>
        </div>
      </div>

      {/* App name */}
      <h1 className="mt-8 text-3xl font-bold text-white animate-fade-in-up">
        Downlink
      </h1>

      {/* Tagline */}
      <p className="mt-2 text-sm text-zinc-400 animate-fade-in-up animation-delay-200">
        Fast & Beautiful Video Downloader
      </p>

      {/* Loading indicator */}
      <div className="mt-8 flex items-center gap-2 animate-fade-in-up animation-delay-400">
        <div className="flex gap-1">
          <span className="h-2 w-2 rounded-full bg-blue-500 animate-bounce" style={{ animationDelay: "0ms" }} />
          <span className="h-2 w-2 rounded-full bg-cyan-500 animate-bounce" style={{ animationDelay: "150ms" }} />
          <span className="h-2 w-2 rounded-full bg-green-500 animate-bounce" style={{ animationDelay: "300ms" }} />
        </div>
      </div>

      {/* Version */}
      <p className="absolute bottom-8 text-xs text-zinc-600">
        Loading...
      </p>

      <style jsx>{`
        @keyframes logo-entrance {
          0% {
            opacity: 0;
            transform: scale(0.5) translateY(20px);
          }
          50% {
            opacity: 1;
            transform: scale(1.1) translateY(-5px);
          }
          100% {
            opacity: 1;
            transform: scale(1) translateY(0);
          }
        }

        @keyframes fade-in-up {
          0% {
            opacity: 0;
            transform: translateY(10px);
          }
          100% {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes spin-slow {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }

        :global(.animate-logo-entrance) {
          animation: logo-entrance 0.8s ease-out forwards;
        }

        :global(.animate-fade-in-up) {
          animation: fade-in-up 0.6s ease-out forwards;
        }

        :global(.animation-delay-200) {
          animation-delay: 200ms;
          opacity: 0;
        }

        :global(.animation-delay-400) {
          animation-delay: 400ms;
          opacity: 0;
        }

        :global(.animate-spin-slow) {
          animation: spin-slow 3s linear infinite;
        }
      `}</style>
    </div>
  );
}

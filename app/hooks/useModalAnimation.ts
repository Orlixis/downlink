import { useState, useEffect, RefObject } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";

interface UseModalAnimationProps {
  isOpen: boolean;
  onClose: () => void;
  targetId: string;
  modalRef: RefObject<HTMLDivElement | null>;
  backdropRef: RefObject<HTMLDivElement | null>;
  contentRef: RefObject<HTMLDivElement | null>;
}

export function useModalAnimation({
  isOpen,
  onClose,
  targetId,
  modalRef,
  backdropRef,
  contentRef,
}: UseModalAnimationProps) {
  // Manual render state to keep the component in the DOM while GSAP animates the exit
  const [renderState, setRenderState] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setRenderState(true);
    }
  }, [isOpen]);

  useGSAP(() => {
    if (!renderState || !modalRef.current || !backdropRef.current || !contentRef.current) return;

    // Calculate dynamic coordinates of the target icon relative to the center of the screen
    let targetX = 0;
    let targetY = 0;
    
    const targetEl = document.getElementById(targetId);
    if (targetEl) {
      const rect = targetEl.getBoundingClientRect();
      const centerX = window.innerWidth / 2;
      const centerY = window.innerHeight / 2;
      
      const iconCenterX = rect.left + rect.width / 2;
      const iconCenterY = rect.top + rect.height / 2;
      
      targetX = iconCenterX - centerX;
      targetY = iconCenterY - centerY;
    } else {
      // Fallbacks if the element isn't found (top right corner roughly)
      targetX = window.innerWidth * 0.4;
      targetY = -window.innerHeight * 0.45;
    }

    if (isOpen) {
      // ENTRANCE ANIMATION
      const tl = gsap.timeline();

      const w = modalRef.current.offsetWidth || window.innerWidth * 0.5;
      const h = modalRef.current.offsetHeight || window.innerHeight * 0.5;

      // Lock the content size so it doesn't reflow when the modal wrapper shrinks to 40px
      gsap.set(contentRef.current, { width: w, height: h, opacity: 0 });

      // Start state: Tiny 40x40 ball exactly at the target icon
      gsap.set(modalRef.current, {
        width: 40,
        height: 40,
        x: targetX,
        y: targetY,
        borderRadius: "50%",
        backgroundColor: "#3b82f6", // Solid blue ball
        boxShadow: "0 0 30px 10px rgba(59, 130, 246, 0.6)", // Blue glow
        opacity: 1,
        // Reset scale in case it was applied previously
        scaleX: 1,
        scaleY: 1
      });
      gsap.set(backdropRef.current, { opacity: 0 });

      // Fade in backdrop
      tl.to(backdropRef.current, { opacity: 1, duration: 0.3 }, 0);

      // Arc Throw to center
      // X moves linearly (or slightly eased)
      tl.to(modalRef.current, {
        x: 0,
        duration: 0.6,
        ease: "power2.out"
      }, 0)
      // Y overshoots (bounces down into the center)
      .to(modalRef.current, {
        y: 0,
        duration: 0.6,
        ease: "bounce.out" // Bounces slightly as it "lands" in the center
      }, 0)
      
      // After hitting the center, morph into the large rectangular modal
      .to(modalRef.current, {
        width: w,
        height: h,
        borderRadius: "16px",
        backgroundColor: "rgba(24, 24, 27, 0.0)", // Fade to transparent, Tailwind will take over
        boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5)", // Fade out glow into standard shadow
        duration: 0.6,
        ease: "back.out(1.2)",
        onComplete: () => {
          // Clear inline styles so Tailwind classes take over perfectly
          gsap.set(modalRef.current, { clearProps: "width,height,boxShadow,backgroundColor,scaleX,scaleY" });
          gsap.set(contentRef.current, { clearProps: "width,height" });
        }
      })
      
      // Fade in contents
      .to(contentRef.current, {
        opacity: 1,
        duration: 0.2
      }, "-=0.2");

    } else {
      // EXIT ANIMATION
      const tl = gsap.timeline({
        onComplete: () => {
          setRenderState(false);
          // Only trigger the actual React unmount when animation is done
        }
      });

      const w = modalRef.current.offsetWidth || window.innerWidth * 0.5;
      const h = modalRef.current.offsetHeight || window.innerHeight * 0.5;

      // Lock the content size before the modal wrapper shrinks
      gsap.set(contentRef.current, { width: w, height: h });

      // 1. Fade out contents so it looks like a solid ball
      tl.to(contentRef.current, { opacity: 0, duration: 0.15 })
      
      // 2. Morph in place into a tiny ball
      .to(modalRef.current, {
        width: 40,
        height: 40,
        borderRadius: "50%",
        backgroundColor: "#3b82f6", // Solid blue ball
        boxShadow: "0 0 30px 10px rgba(59, 130, 246, 0.6)", // Blue glow
        duration: 0.35,
        ease: "power2.inOut"
      })
      
      // 3. Throw the ball to the target icon
      // X moves smoothly
      .to(modalRef.current, {
        x: targetX,
        duration: 0.6,
        ease: "power2.inOut"
      })
      // Y shoots UP high into the air first, then arcs down into the icon
      // Using a custom sequence to simulate jumping up and then falling into the icon
      .to(modalRef.current, {
        y: targetY - 100, // Shoot up 100px higher than the icon
        duration: 0.3,
        ease: "power1.out"
      }, "<") // Start at the same time as X
      .to(modalRef.current, {
        y: targetY, // Fall down into the icon
        duration: 0.3,
        ease: "bounce.out" // Bounce as it hits the icon
      }, ">"); // Run immediately after reaching the peak

      // Fade backdrop out near the end of the throw
      tl.to(backdropRef.current, { opacity: 0, duration: 0.3 }, "-=0.3");
    }
  }, [isOpen, renderState, targetId]);

  return { renderState };
}

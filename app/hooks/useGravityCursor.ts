import { RefObject, useEffect, useRef } from "react";

export function useGravityCursor(
  cursorRef: RefObject<HTMLDivElement | null>,
  coreRef: RefObject<HTMLDivElement | null>,
  isActive: boolean,
  onAbsorbed: () => void
) {
  const mousePos = useRef({ x: window.innerWidth / 2, y: window.innerHeight - 100 });
  const cursorObj = useRef({ x: window.innerWidth / 2, y: window.innerHeight - 100, vx: 0, vy: 0 });
  const absorbedRef = useRef(false);

  useEffect(() => {
    // Reset absorbed state when becoming active again
    if (isActive) {
      absorbedRef.current = false;
      cursorObj.current.vx = 0;
      cursorObj.current.vy = 0;
    }
  }, [isActive]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      mousePos.current.x = e.clientX;
      mousePos.current.y = e.clientY;
    };
    
    // Initialize starting position near mouse
    const initMouse = (e: MouseEvent) => {
      cursorObj.current.x = e.clientX;
      cursorObj.current.y = e.clientY;
      window.removeEventListener('mousemove', initMouse);
    };
    window.addEventListener('mousemove', initMouse);
    window.addEventListener('mousemove', handleMouseMove);

    let animationId: number;

    const animate = () => {
      if (!isActive || absorbedRef.current || !cursorRef.current || !coreRef.current) {
        animationId = requestAnimationFrame(animate);
        return;
      }

      const rect = coreRef.current.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;

      const p = cursorObj.current;
      const m = mousePos.current;

      // Spring force towards actual mouse
      const k = 0.08; // Looser spring stiffness for more elasticity
      const sx = (m.x - p.x) * k;
      const sy = (m.y - p.y) * k;

      // Gravity force towards core
      const dx = cx - p.x;
      const dy = cy - p.y;
      const dist = Math.hypot(dx, dy);

      // Event Horizon check
      if (dist < 40) {
        absorbedRef.current = true;
        onAbsorbed();
        return;
      }

      // Inverse-linear gravity for a much wider gravitational field
      const G = 1500;
      let force = G / Math.max(dist, 1);
      
      // Cap max force to prevent explosive teleporting
      if (force > 50) force = 50;

      const gx = (dx / dist) * force;
      const gy = (dy / dist) * force;

      // Update velocity and position
      p.vx = (p.vx + sx + gx) * 0.85; // Slightly more glide friction
      p.vy = (p.vy + sy + gy) * 0.85;

      p.x += p.vx;
      p.y += p.vy;

      const cRect = cursorRef.current.getBoundingClientRect();
      const hw = cRect.width / 2;
      const hh = cRect.height / 2;

      // Add a tiny bit of rotation just for a wobble effect, no stretching
      const wobble = p.vx * 0.5;

      cursorRef.current.style.transform = `translate3d(${p.x - hw}px, ${p.y - hh}px, 0) rotate(${wobble}deg)`;

      animationId = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      cancelAnimationFrame(animationId);
    };
  }, [isActive, onAbsorbed]);

  return absorbedRef;
}

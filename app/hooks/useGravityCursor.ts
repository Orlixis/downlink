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
    const hasMovedRef = { current: false };

    const handleMouseMove = (e: MouseEvent) => {
      mousePos.current.x = e.clientX;
      mousePos.current.y = e.clientY;
      hasMovedRef.current = true;
    };
    
    // Initialize starting position near mouse
    const initMouse = (e: MouseEvent) => {
      cursorObj.current.x = e.clientX;
      cursorObj.current.y = e.clientY;
      mousePos.current.x = e.clientX;
      mousePos.current.y = e.clientY;
      hasMovedRef.current = true;
      window.removeEventListener('mousemove', initMouse);
    };
    window.addEventListener('mousemove', initMouse);
    window.addEventListener('mousemove', handleMouseMove);

    let cx = window.innerWidth / 2;
    let cy = window.innerHeight / 2;

    const updateCenter = () => {
      cx = window.innerWidth / 2;
      cy = window.innerHeight / 2;
    };
    window.addEventListener("resize", updateCenter);

    let animationId: number;

    const animate = () => {
      if (!isActive || absorbedRef.current || !cursorRef.current || !coreRef.current) {
        animationId = requestAnimationFrame(animate);
        return;
      }

      const p = cursorObj.current;
      const m = mousePos.current;

      // Perfect tracking of mouse before event horizon
      if (!absorbedRef.current) {
        p.x = m.x;
        p.y = m.y;
        p.vx = 0;
        p.vy = 0;
      }

      const dx = cx - p.x;
      const dy = cy - p.y;
      const dist = Math.hypot(dx, dy);

      // Event Horizon check - instantly absorb when package reaches/touches the outer horizon circle
      // Outer vortex disc border is at radius ~70-85px.
      const EVENT_HORIZON_RADIUS = 65;
      if (hasMovedRef.current && dist <= EVENT_HORIZON_RADIUS && !absorbedRef.current) {
        absorbedRef.current = true;
        onAbsorbed();
      }

      // If absorbed, rapidly suck into singularity center
      if (absorbedRef.current) {
        p.x += (cx - p.x) * 0.35;
        p.y += (cy - p.y) * 0.35;
      }

      p.x += p.vx;
      p.y += p.vy;

      const hw = 24;
      const hh = 24;

      // Add a tiny bit of rotation just for a wobble effect, no stretching
      const wobble = p.vx * 0.5;

      cursorRef.current.style.transform = `translate3d(${p.x - hw}px, ${p.y - hh}px, 0) rotate(${wobble}deg)`;

      animationId = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener("resize", updateCenter);
      window.removeEventListener('mousemove', handleMouseMove);
      cancelAnimationFrame(animationId);
    };
  }, [isActive, onAbsorbed]);

  return absorbedRef;
}

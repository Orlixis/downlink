import { RefObject, useEffect, useRef } from "react";

class Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: string;
  prevX: number;
  prevY: number;

  constructor(x: number, y: number, isAccretion: boolean, centerX: number, centerY: number) {
    if (isAccretion) {
      // Spawn around the core
      const angle = Math.random() * Math.PI * 2;
      const radius = 50 + Math.random() * 120;
      this.x = centerX + Math.cos(angle) * radius;
      this.y = centerY + Math.sin(angle) * radius;
      
      // Tangential starting velocity for orbit
      this.vx = -Math.sin(angle) * (Math.random() * 2.5 + 1.2);
      this.vy = Math.cos(angle) * (Math.random() * 2.5 + 1.2);
    } else {
      // Spawn near mouse
      this.x = x + (Math.random() - 0.5) * 40;
      this.y = y + (Math.random() - 0.5) * 40;
      this.vx = (Math.random() - 0.5) * 2;
      this.vy = (Math.random() - 0.5) * 2;
    }

    this.prevX = this.x;
    this.prevY = this.y;
    this.maxLife = isAccretion ? 80 + Math.random() * 60 : 45 + Math.random() * 45;
    this.life = this.maxLife;
    
    this.size = Math.random() * 2 + 0.5;
    
    const colors = ['#8b5cf6', '#3b82f6', '#06b6d4', '#c4b5fd', '#a78bfa'];
    this.color = colors[Math.floor(Math.random() * colors.length)];
  }

  update(centerX: number, centerY: number, isAbsorbed: boolean) {
    this.prevX = this.x;
    this.prevY = this.y;

    const dx = centerX - this.x;
    const dy = centerY - this.y;
    const distSq = dx * dx + dy * dy;
    const dist = Math.sqrt(distSq);
    
    if (dist < 18) {
      this.life = 0;
      return dist;
    }

    let force = 350 / Math.max(dist, 12);
    if (isAbsorbed) force *= 3;
    
    const nx = dx / dist;
    const ny = dy / dist;
    const tx = -ny;
    const ty = nx;

    this.vx += nx * force * 0.04 + tx * force * 0.06;
    this.vy += ny * force * 0.04 + ty * force * 0.06;
    
    this.vx *= 0.96;
    this.vy *= 0.96;

    this.x += this.vx;
    this.y += this.vy;

    this.life--;
    return dist;
  }

  draw(ctx: CanvasRenderingContext2D) {
    const opacity = Math.max(0, this.life / this.maxLife);
    ctx.globalAlpha = opacity;
    
    ctx.beginPath();
    ctx.moveTo(this.prevX, this.prevY);
    ctx.lineTo(this.x, this.y);
    ctx.strokeStyle = this.color;
    
    const speed = Math.sqrt(this.vx * this.vx + this.vy * this.vy);
    ctx.lineWidth = Math.max(0.5, this.size - (speed * 0.08));
    ctx.lineCap = 'round';
    ctx.stroke();
    
    ctx.beginPath();
    ctx.arc(this.x, this.y, ctx.lineWidth * 0.7, 0, Math.PI * 2);
    ctx.fillStyle = '#ffffff';
    ctx.fill();
  }
}

export function useBlackHolePhysics(
  canvasRef: RefObject<HTMLCanvasElement | null>, 
  coreRef: RefObject<HTMLDivElement | null>,
  isActive: boolean,
  absorbedRef: React.MutableRefObject<boolean>
) {
  const mousePosRef = useRef<{ x: number, y: number } | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;

    let particles: Particle[] = [];
    let animationId: number;
    let centerX = window.innerWidth / 2;
    let centerY = window.innerHeight / 2;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      centerX = window.innerWidth / 2;
      centerY = window.innerHeight / 2;
    };
    window.addEventListener('resize', resize);
    resize();

    const handleMouseMove = (e: MouseEvent) => {
      mousePosRef.current = { x: e.clientX, y: e.clientY };
    };
    window.addEventListener('mousemove', handleMouseMove, { passive: true });

    const MAX_PARTICLES = 100;

    const animate = () => {
      if (!isActive) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        animationId = requestAnimationFrame(animate);
        return;
      }

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const isAbsorbed = absorbedRef.current || false;

      // Spawn accretion disk particles (capped)
      if (particles.length < MAX_PARTICLES && Math.random() < 0.4 && !isAbsorbed) {
        particles.push(new Particle(centerX, centerY, true, centerX, centerY));
      }

      // Spawn pointer particles
      if (mousePosRef.current && particles.length < MAX_PARTICLES && !isAbsorbed) {
        const distToCore = Math.hypot(mousePosRef.current.x - centerX, mousePosRef.current.y - centerY);
        if (distToCore > 80 && Math.random() < 0.6) {
          particles.push(new Particle(mousePosRef.current.x, mousePosRef.current.y, false, centerX, centerY));
        }
      }

      ctx.globalCompositeOperation = 'screen';
      
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.update(centerX, centerY, isAbsorbed);
        
        if (p.life <= 0) {
          particles.splice(i, 1);
        } else {
          p.draw(ctx);
        }
      }

      animationId = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener('resize', resize);
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, [isActive, canvasRef, absorbedRef]);

  return mousePosRef;
}

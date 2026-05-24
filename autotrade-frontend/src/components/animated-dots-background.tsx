"use client";

import { useEffect, useRef } from "react";

interface Dot {
  x: number;
  y: number;
  baseX: number;
  baseY: number;
  vx: number;
  vy: number;
  radius: number;
  opacity: number;
}

export function AnimatedDotsBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const dotsRef = useRef<Dot[]>([]);
  const animationRef = useRef<number>(0);
  const mouseRef = useRef({ x: -1000, y: -1000, isActive: false });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    const initDots = () => {
      // Much higher dot density - 3x more dots
      const dotCount = Math.floor((canvas.width * canvas.height) / 5000);
      dotsRef.current = [];

      for (let i = 0; i < dotCount; i++) {
        const x = Math.random() * canvas.width;
        const y = Math.random() * canvas.height;
        dotsRef.current.push({
          x,
          y,
          baseX: x,
          baseY: y,
          vx: (Math.random() - 0.5) * 0.5,
          vy: (Math.random() - 0.5) * 0.5,
          radius: Math.random() * 2.5 + 1,
          opacity: Math.random() * 0.5 + 0.15,
        });
      }
    };

    const drawDots = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const dots = dotsRef.current;
      const mouse = mouseRef.current;
      const mouseRadius = 250; // Larger cursor effect radius

      // Update and draw dots
      for (let i = 0; i < dots.length; i++) {
        const dot = dots[i];

        // Calculate distance to mouse
        const mouseDx = mouse.x - dot.x;
        const mouseDy = mouse.y - dot.y;
        const mouseDistance = Math.sqrt(mouseDx * mouseDx + mouseDy * mouseDy);

        if (mouse.isActive && mouseDistance < mouseRadius && mouseDistance > 0) {
          // Strong repulsion from cursor - dots flee away
          const force = (mouseRadius - mouseDistance) / mouseRadius;
          const angle = Math.atan2(mouseDy, mouseDx);
          
          // Push dots away from cursor
          const pushStrength = force * 8;
          dot.vx -= Math.cos(angle) * pushStrength;
          dot.vy -= Math.sin(angle) * pushStrength;

          // Increase opacity when near cursor
          const currentOpacity = Math.min(dot.opacity + force * 0.4, 0.9);
          
          // Draw glowing dot near cursor
          const gradient = ctx.createRadialGradient(
            dot.x, dot.y, 0,
            dot.x, dot.y, dot.radius * 3
          );
          gradient.addColorStop(0, `rgba(224, 122, 95, ${currentOpacity})`);
          gradient.addColorStop(1, `rgba(224, 122, 95, 0)`);
          ctx.beginPath();
          ctx.arc(dot.x, dot.y, dot.radius * 3, 0, Math.PI * 2);
          ctx.fillStyle = gradient;
          ctx.fill();

          // Draw connection line to cursor
          ctx.beginPath();
          ctx.moveTo(dot.x, dot.y);
          ctx.lineTo(mouse.x, mouse.y);
          ctx.strokeStyle = `rgba(224, 122, 95, ${0.3 * force})`;
          ctx.lineWidth = 1;
          ctx.stroke();
        } else {
          // Return to base position slowly when not affected by mouse
          const returnForce = 0.01;
          dot.vx += (dot.baseX - dot.x) * returnForce;
          dot.vy += (dot.baseY - dot.y) * returnForce;
        }

        // Update position
        dot.x += dot.vx;
        dot.y += dot.vy;

        // Wrap around edges
        if (dot.x < -50) dot.x = canvas.width + 50;
        if (dot.x > canvas.width + 50) dot.x = -50;
        if (dot.y < -50) dot.y = canvas.height + 50;
        if (dot.y > canvas.height + 50) dot.y = -50;

        // Dampen velocity
        dot.vx *= 0.92;
        dot.vy *= 0.92;

        // Add subtle drift
        dot.vx += (Math.random() - 0.5) * 0.05;
        dot.vy += (Math.random() - 0.5) * 0.05;

        // Draw main dot
        ctx.beginPath();
        ctx.arc(dot.x, dot.y, dot.radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(224, 122, 95, ${dot.opacity})`;
        ctx.fill();

        // Draw connections to nearby dots
        for (let j = i + 1; j < dots.length; j++) {
          const otherDot = dots[j];
          const dx = dot.x - otherDot.x;
          const dy = dot.y - otherDot.y;
          const distance = Math.sqrt(dx * dx + dy * dy);

          if (distance < 100) {
            ctx.beginPath();
            ctx.moveTo(dot.x, dot.y);
            ctx.lineTo(otherDot.x, otherDot.y);
            ctx.strokeStyle = `rgba(224, 122, 95, ${0.12 * (1 - distance / 100)})`;
            ctx.lineWidth = 0.6;
            ctx.stroke();
          }
        }
      }

      // Draw cursor glow effect
      if (mouse.isActive) {
        const cursorGradient = ctx.createRadialGradient(
          mouse.x, mouse.y, 0,
          mouse.x, mouse.y, mouseRadius
        );
        cursorGradient.addColorStop(0, `rgba(224, 122, 95, 0.08)`);
        cursorGradient.addColorStop(0.5, `rgba(224, 122, 95, 0.03)`);
        cursorGradient.addColorStop(1, `rgba(224, 122, 95, 0)`);
        ctx.beginPath();
        ctx.arc(mouse.x, mouse.y, mouseRadius, 0, Math.PI * 2);
        ctx.fillStyle = cursorGradient;
        ctx.fill();
      }

      animationRef.current = requestAnimationFrame(drawDots);
    };

    const handleMouseMove = (e: MouseEvent) => {
      mouseRef.current = { x: e.clientX, y: e.clientY, isActive: true };
    };

    const handleMouseLeave = () => {
      mouseRef.current = { ...mouseRef.current, isActive: false };
    };

    resizeCanvas();
    initDots();
    drawDots();

    window.addEventListener("resize", () => {
      resizeCanvas();
      initDots();
    });
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseleave", handleMouseLeave);

    return () => {
      cancelAnimationFrame(animationRef.current);
      window.removeEventListener("resize", resizeCanvas);
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseleave", handleMouseLeave);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none fixed inset-0 z-0"
      style={{ background: "transparent" }}
    />
  );
}

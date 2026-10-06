"use client";

import { useEffect, useRef } from "react";
import { useTheme } from "next-themes";

export function MouseReactiveGrid() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { resolvedTheme } = useTheme();
  const themeRef = useRef(resolvedTheme);
  
  useEffect(() => {
    themeRef.current = resolvedTheme;
  }, [resolvedTheme]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationFrameId: number;
    let mouse = { x: -1000, y: -1000 };
    let targetMouse = { x: -1000, y: -1000 };
    
    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      targetMouse.x = e.clientX - rect.left;
      targetMouse.y = e.clientY - rect.top;
    };

    const handleMouseLeave = () => {
      targetMouse.x = -1000;
      targetMouse.y = -1000;
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseleave", handleMouseLeave);

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    window.addEventListener("resize", resize);
    resize();

    // Grid properties
    const spacing = 25; // denser distance between balls
    const dotRadius = 1.5;
    
    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // smooth mouse movement
      mouse.x += (targetMouse.x - mouse.x) * 0.1;
      mouse.y += (targetMouse.y - mouse.y) * 0.1;

      // Use the exact color of the 'Connected' text (blue-500: #3b82f6 -> 59, 130, 246)
      // Make it stronger in dark mode so it's clearly visible
      const isDark = themeRef.current === "dark";
      ctx.fillStyle = isDark ? "rgba(59, 130, 246, 0.6)" : "rgba(59, 130, 246, 0.3)";

      const cols = Math.floor(canvas.width / spacing) + 1;
      const rows = Math.floor(canvas.height / spacing) + 1;

      for (let i = 0; i < cols; i++) {
        for (let j = 0; j < rows; j++) {
          let cx = i * spacing;
          let cy = j * spacing;

          const dx = mouse.x - cx;
          const dy = mouse.y - cy;
          const dist = Math.sqrt(dx * dx + dy * dy);
          
          // Reaction: repel slightly
          const maxDist = 180;
          let offsetX = 0;
          let offsetY = 0;
          
          if (dist < maxDist) {
            const force = (maxDist - dist) / maxDist;
            // Easing function for smooth repulsion
            const easeForce = Math.pow(force, 2); 
            offsetX = -(dx / dist) * easeForce * 12; // move away by up to 12px
            offsetY = -(dy / dist) * easeForce * 12;
          }

          ctx.beginPath();
          ctx.arc(cx + offsetX, cy + offsetY, dotRadius, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      animationFrameId = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseleave", handleMouseLeave);
      window.removeEventListener("resize", resize);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-0"
      style={{ width: "100%", height: "100%" }}
    />
  );
}

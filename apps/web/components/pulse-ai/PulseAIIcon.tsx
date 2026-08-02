"use client";

import { memo } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface PulseAIIconProps {
  className?: string;
  size?: number;
  animate?: boolean;
}

export const PulseAIIcon = memo(function PulseAIIcon({ className, size = 24, animate = false }: PulseAIIconProps) {
  return (
    <div 
      className={cn("relative flex items-center justify-center rounded-lg bg-primary/10 text-primary p-1", className)}
      style={{ width: size, height: size }}
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="w-full h-full"
      >
        <motion.path
          d="M3 12h4l3-8 4 16 3-8h4"
          initial={animate ? { pathLength: 0, opacity: 0 } : false}
          animate={animate ? { pathLength: 1, opacity: 1 } : false}
          transition={
            animate
              ? { duration: 1.5, repeat: Infinity, repeatType: "loop", ease: "linear" }
              : {}
          }
        />
        {/* Subtle Sparkle to denote AI */}
        <path d="M19 5v4m-2-2h4" className="stroke-primary opacity-60" strokeWidth="1.5" />
      </svg>
    </div>
  );
});

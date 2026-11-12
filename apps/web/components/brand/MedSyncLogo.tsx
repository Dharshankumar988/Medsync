import React from "react";
import { cn } from "@/lib/utils";

interface MedSyncLogoProps {
  size?: number;
  className?: string;
  imageClassName?: string;
  showWordmark?: boolean;
  wordmarkClassName?: string;
}

export function MedSyncLogo({
  size = 32,
  className,
  imageClassName,
  showWordmark = false,
  wordmarkClassName,
}: MedSyncLogoProps) {
  const radiusStyle = {
    width: size,
    height: size,
    borderRadius: Math.max(6, Math.round(size * 0.26)),
  };

  return (
    <span className={cn("inline-flex items-center gap-2.5 shrink-0 select-none", className)}>
      <span
        style={radiusStyle}
        className={cn(
          "relative inline-flex items-center justify-center overflow-hidden bg-[#00040D] border border-cyan-400/25 shadow-sm shrink-0",
          imageClassName
        )}
      >
        <img
          src="/medsync-logo.png"
          alt="MedSync"
          width={size}
          height={size}
          loading="eager"
          decoding="sync"
          draggable={false}
          className="h-full w-full object-cover block"
        />
      </span>
      {showWordmark && (
        <span className={cn("font-semibold tracking-tight text-foreground", wordmarkClassName)}>
          MedSync
        </span>
      )}
    </span>
  );
}


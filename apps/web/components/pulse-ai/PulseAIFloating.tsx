"use client";

import { useState, lazy, Suspense, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Scaling } from "lucide-react";
import { PulseAIIcon } from "./PulseAIIcon";
const PulseAIChat = lazy(() => import("./PulseAIChat").then(m => ({ default: m.PulseAIChat })));
import { cn } from "@/lib/utils";

interface PulseAIFloatingProps {
  role: "doctor" | "patient" | "pharmacy" | "admin";
}

export function PulseAIFloating({ role }: PulseAIFloatingProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [size, setSize] = useState({ width: 400, height: 600 });
  const [isResizing, setIsResizing] = useState(false);

  useEffect(() => {
    if (!isResizing) return;
    
    const handlePointerMove = (e: PointerEvent) => {
      // Calculate new size based on mouse position relative to the bottom-right corner of the window
      // The popup is anchored at bottom-6 (24px) right-6 (24px).
      // We also need to account for the button height (14 rem = 56px + margin).
      // Let's just calculate the distance from the pointer to the bottom right anchor.
      const newWidth = window.innerWidth - e.clientX - 24;
      const newHeight = window.innerHeight - e.clientY - 96; // 96 = bottom anchor space + button space
      
      setSize({
        width: Math.max(300, Math.min(newWidth, window.innerWidth - 48)),
        height: Math.max(400, Math.min(newHeight, window.innerHeight - 120))
      });
    };
    
    const handlePointerUp = () => setIsResizing(false);
    
    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };
  }, [isResizing]);

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="mb-4 shadow-2xl rounded-2xl overflow-hidden relative"
            style={{ width: size.width, height: size.height }}
          >
            {/* Custom Top-Left Resizer Handle */}
            <div 
              onPointerDown={(e) => {
                e.preventDefault();
                setIsResizing(true);
              }}
              className="absolute top-0 left-0 w-8 h-8 cursor-nwse-resize z-50 flex items-start justify-start group"
              title="Drag to resize"
            >
              <div className="w-4 h-4 m-1.5 opacity-50 group-hover:opacity-100 transition-opacity flex items-center justify-center bg-background/50 rounded-sm backdrop-blur">
                <Scaling size={12} className="text-muted-foreground rotate-90" />
              </div>
            </div>

            <div className="relative w-full h-full">
              <button 
                onClick={() => setIsOpen(false)}
                className="absolute right-4 top-4 z-10 p-1 bg-background/50 backdrop-blur rounded-full hover:bg-background transition-colors border border-border"
              >
                <X size={16} className="text-muted-foreground" />
              </button>
              <Suspense fallback={<div className="w-full h-full flex items-center justify-center bg-card">Loading AI...</div>}>
                <PulseAIChat role={role} fullPage={false} />
              </Suspense>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "flex h-14 w-14 items-center justify-center rounded-full shadow-lg transition-colors border",
          isOpen ? "bg-muted border-border" : "bg-primary border-primary hover:bg-primary/90"
        )}
      >
        {isOpen ? (
          <X className="h-6 w-6 text-foreground" />
        ) : (
          <PulseAIIcon size={28} className="text-primary-foreground bg-transparent p-0" />
        )}
      </motion.button>
    </div>
  );
}

"use client";

import { useState, lazy, Suspense } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { PulseAIIcon } from "./PulseAIIcon";
const PulseAIChat = lazy(() => import("./PulseAIChat").then(m => ({ default: m.PulseAIChat })));
import { cn } from "@/lib/utils";

interface PulseAIFloatingProps {
  role: "doctor" | "patient" | "pharmacy" | "admin";
}

export function PulseAIFloating({ role }: PulseAIFloatingProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="mb-4 shadow-2xl rounded-2xl overflow-hidden"
          >
            <div className="relative">
              <button 
                onClick={() => setIsOpen(false)}
                className="absolute right-4 top-4 z-10 p-1 bg-background/50 backdrop-blur rounded-full hover:bg-background transition-colors border border-border"
              >
                <X size={16} className="text-muted-foreground" />
              </button>
              <Suspense fallback={<div className="h-[600px] w-[400px] flex items-center justify-center bg-card">Loading AI...</div>}>
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

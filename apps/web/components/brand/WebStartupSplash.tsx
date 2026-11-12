"use client";

import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

export function WebStartupSplash() {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(false);
    }, 950);
    return () => clearTimeout(timer);
  }, []);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key="medsync-web-startup"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, scale: 1.02 }}
          transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
          className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-[#00040D] pointer-events-none select-none"
          aria-hidden="true"
        >
          <div className="relative flex flex-col items-center">
            <motion.div
              initial={{ opacity: 0, scale: 0.85 }}
              animate={{ opacity: [0.45, 0.85, 0.45], scale: [0.96, 1.08, 0.96] }}
              transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
              className="absolute -inset-4 rounded-[34px] bg-cyan-500/15 blur-xl"
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.86 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ type: "spring", stiffness: 220, damping: 20 }}
              className="relative h-24 w-24 overflow-hidden rounded-[26px] bg-[#00040D] border border-cyan-400/30 shadow-2xl shadow-cyan-500/20"
            >
              <img
                src="/medsync-logo.png"
                alt="MedSync"
                width={96}
                height={96}
                loading="eager"
                decoding="sync"
                draggable={false}
                className="h-full w-full object-cover block"
              />
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.16, duration: 0.32, ease: "easeOut" }}
              className="mt-5 text-center"
            >
              <div className="text-2xl font-bold tracking-tight text-slate-50">
                MedSync
              </div>
              <div className="mt-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-cyan-400">
                Secure Healthcare Network
              </div>
            </motion.div>

            <div className="mt-5 h-[3px] w-32 overflow-hidden rounded-full bg-cyan-500/15">
              <motion.div
                initial={{ scaleX: 0 }}
                animate={{ scaleX: 1 }}
                transition={{ duration: 0.78, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
                style={{ transformOrigin: "left" }}
                className="h-full w-full rounded-full bg-gradient-to-r from-blue-500 via-cyan-400 to-teal-300"
              />
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}


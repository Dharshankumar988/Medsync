"use client";

import { motion } from "framer-motion";
import { Activity, Shield, Database, Brain, Pill, Stethoscope, FileText, Scan } from "lucide-react";

export function HeroGraphic() {
  return (
    <div className="relative w-full aspect-square max-w-[400px] mx-auto flex items-center justify-center">
      {/* Background soft glow */}
      <div className="absolute inset-0 bg-blue-500/5 rounded-full blur-3xl" />
      
      {/* Central Hub */}
      <motion.div 
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1, y: [0, -12, 0] }}
        transition={{ 
          opacity: { duration: 0.8, ease: "easeOut" },
          scale: { duration: 0.8, ease: "easeOut" },
          y: { duration: 4.5, repeat: Infinity, ease: "easeInOut" }
        }}
        className="relative z-20 flex items-center justify-center w-36 h-36 rounded-full border border-blue-500/30 bg-blue-900/40 backdrop-blur-xl shadow-[0_0_50px_rgba(59,130,246,0.3)]"
      >
        <Activity className="h-16 w-16 text-blue-400" />
      </motion.div>

      {/* Floating Orbiting Nodes */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
        
        {/* Node 1: AI (Top-Left) */}
        <motion.div 
          initial={{ opacity: 0, scale: 0, x: -115, y: -65 }}
          animate={{ opacity: 1, scale: 1, x: -115, y: [-65, -75, -65] }}
          transition={{ 
            opacity: { duration: 0.8, delay: 0.2 },
            scale: { duration: 0.8, delay: 0.2 },
            y: { duration: 4, repeat: Infinity, ease: "easeInOut", delay: 0.2 } 
          }}
          className="absolute flex items-center justify-center w-14 h-14 rounded-2xl border border-white/10 bg-slate-900/90 backdrop-blur-md shadow-xl"
        >
          <Brain className="h-6 w-6 text-indigo-400" />
        </motion.div>

        {/* Node 2: Security (Top-Center) */}
        <motion.div 
          initial={{ opacity: 0, scale: 0, x: 0, y: -130 }}
          animate={{ opacity: 1, scale: 1, x: 0, y: [-130, -140, -130] }}
          transition={{ 
            opacity: { duration: 0.8, delay: 0.3 },
            scale: { duration: 0.8, delay: 0.3 },
            y: { duration: 4.5, repeat: Infinity, ease: "easeInOut", delay: 0.5 } 
          }}
          className="absolute flex items-center justify-center w-14 h-14 rounded-2xl border border-white/10 bg-slate-900/90 backdrop-blur-md shadow-xl"
        >
          <Shield className="h-6 w-6 text-emerald-400" />
        </motion.div>

        {/* Node 3: Pill (Top-Right) */}
        <motion.div 
          initial={{ opacity: 0, scale: 0, x: 115, y: -65 }}
          animate={{ opacity: 1, scale: 1, x: 115, y: [-65, -72, -65] }}
          transition={{ 
            opacity: { duration: 0.8, delay: 0.4 },
            scale: { duration: 0.8, delay: 0.4 },
            y: { duration: 5, repeat: Infinity, ease: "easeInOut", delay: 0.8 } 
          }}
          className="absolute flex items-center justify-center w-14 h-14 rounded-2xl border border-white/10 bg-slate-900/90 backdrop-blur-md shadow-xl"
        >
          <Pill className="h-6 w-6 text-rose-400" />
        </motion.div>

        {/* Node 4: Database (Bottom-Right) */}
        <motion.div 
          initial={{ opacity: 0, scale: 0, x: 115, y: 65 }}
          animate={{ opacity: 1, scale: 1, x: 115, y: [65, 75, 65] }}
          transition={{ 
            opacity: { duration: 0.8, delay: 0.5 },
            scale: { duration: 0.8, delay: 0.5 },
            y: { duration: 4.2, repeat: Infinity, ease: "easeInOut", delay: 0.1 } 
          }}
          className="absolute flex items-center justify-center w-14 h-14 rounded-2xl border border-white/10 bg-slate-900/90 backdrop-blur-md shadow-xl"
        >
          <Database className="h-6 w-6 text-amber-400" />
        </motion.div>

        {/* Node 5: Stethoscope (Bottom-Center) */}
        <motion.div 
          initial={{ opacity: 0, scale: 0, x: 0, y: 130 }}
          animate={{ opacity: 1, scale: 1, x: 0, y: [130, 140, 130] }}
          transition={{ 
            opacity: { duration: 0.8, delay: 0.6 },
            scale: { duration: 0.8, delay: 0.6 },
            y: { duration: 4.8, repeat: Infinity, ease: "easeInOut", delay: 1.2 } 
          }}
          className="absolute flex items-center justify-center w-14 h-14 rounded-2xl border border-white/10 bg-slate-900/90 backdrop-blur-md shadow-xl"
        >
          <Stethoscope className="h-6 w-6 text-cyan-400" />
        </motion.div>

        {/* Node 6: Medical Records (Bottom-Left) */}
        <motion.div 
          initial={{ opacity: 0, scale: 0, x: -115, y: 65 }}
          animate={{ opacity: 1, scale: 1, x: -115, y: [65, 72, 65] }}
          transition={{ 
            opacity: { duration: 0.8, delay: 0.7 },
            scale: { duration: 0.8, delay: 0.7 },
            y: { duration: 3.8, repeat: Infinity, ease: "easeInOut", delay: 0.4 } 
          }}
          className="absolute flex items-center justify-center w-14 h-14 rounded-2xl border border-white/10 bg-slate-900/90 backdrop-blur-md shadow-xl"
        >
          <FileText className="h-6 w-6 text-blue-400" />
        </motion.div>
      </div>
    </div>
  );
}

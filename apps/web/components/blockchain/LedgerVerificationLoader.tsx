"use client";

import { useEffect, useState } from "react";
import { Card, CardHeader, CardTitle, CardDescription, Badge } from "@medsync/ui";
import { motion, AnimatePresence } from "framer-motion";
import { ShieldCheck, Globe, Lock, Check, Cpu } from "lucide-react";

interface LedgerVerificationLoaderProps {
  title?: string;
  description?: string;
  identifier?: string;
  network?: string;
  steps?: string[];
  className?: string;
}

const DEFAULT_STEPS = [
  "Reading cryptographic credentials",
  "Querying Polygon Amoy RPC node",
  "Validating smart contract state",
];

export function LedgerVerificationLoader({
  title = "Verifying Pharmacy on Polygon Amoy Ledger...",
  description = "Validating smart contract authority and cryptographic node registry.",
  identifier,
  network = "Polygon Amoy",
  steps = DEFAULT_STEPS,
  className = "",
}: LedgerVerificationLoaderProps) {
  const [activeStep, setActiveStep] = useState(0);

  // Progressive telemetry stage timer
  useEffect(() => {
    const timer = setInterval(() => {
      setActiveStep((prev) => (prev < steps.length - 1 ? prev + 1 : prev));
    }, 1100);

    return () => clearInterval(timer);
  }, [steps.length]);

  return (
    <Card
      className={`rounded-3xl border border-primary/20 shadow-xl overflow-hidden relative max-w-xl mx-auto bg-card/95 backdrop-blur-md transition-all ${className}`}
    >
      {/* Top ambient indeterminate progress shimmer */}
      <div className="h-1 w-full bg-primary/10 relative overflow-hidden">
        <motion.div
          className="absolute inset-y-0 w-1/3 bg-gradient-to-r from-transparent via-primary to-transparent"
          animate={{ x: ["-100%", "300%"] }}
          transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
        />
      </div>

      <CardHeader className="text-center pt-10 pb-8 px-6 sm:px-10">
        {/* Core Radar Scanner Viewport */}
        <div className="relative w-32 h-32 mx-auto flex items-center justify-center mb-6 select-none">
          {/* Viewfinder HUD Corner Accents */}
          <div className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-primary/40 rounded-tl-sm pointer-events-none" />
          <div className="absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 border-primary/40 rounded-tr-sm pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-3 h-3 border-b-2 border-l-2 border-primary/40 rounded-bl-sm pointer-events-none" />
          <div className="absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 border-primary/40 rounded-br-sm pointer-events-none" />

          {/* Ambient Radial Glow */}
          <div className="absolute inset-2 rounded-full bg-primary/10 blur-xl pointer-events-none animate-pulse" />

          {/* Outer Dashed Orbital Ring */}
          <motion.svg
            className="absolute inset-0 w-full h-full text-primary/25 pointer-events-none"
            viewBox="0 0 100 100"
            animate={{ rotate: 360 }}
            transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
          >
            <circle
              cx="50"
              cy="50"
              r="47"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeDasharray="4 6"
            />
          </motion.svg>

          {/* Middle Counter-Rotating Arc */}
          <motion.div
            className="absolute inset-2 rounded-full border-2 border-transparent border-t-primary/70 border-r-primary/25 pointer-events-none"
            animate={{ rotate: -360 }}
            transition={{ duration: 3.5, repeat: Infinity, ease: "linear" }}
          />

          {/* Soft Expanding Pulse Wave */}
          <motion.div
            className="absolute inset-3 rounded-full border border-primary/40 pointer-events-none"
            animate={{
              scale: [1, 1.25, 1.35],
              opacity: [0.5, 0.2, 0],
            }}
            transition={{
              duration: 2.2,
              repeat: Infinity,
              ease: "easeOut",
            }}
          />

          {/* Orbiting Satellite Particle */}
          <motion.div
            className="absolute inset-0 pointer-events-none"
            animate={{ rotate: 360 }}
            transition={{ duration: 4.5, repeat: Infinity, ease: "linear" }}
          >
            <span className="absolute top-0.5 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-primary shadow-[0_0_8px_var(--primary)]" />
          </motion.div>

          {/* Center Hub Container */}
          <div className="relative w-16 h-16 rounded-2xl bg-card border border-border/80 shadow-md flex items-center justify-center overflow-hidden">
            {/* High-tech vertical scanning beam */}
            <motion.div
              className="absolute inset-x-0 h-0.5 bg-gradient-to-r from-transparent via-primary to-transparent opacity-80"
              animate={{ top: ["5%", "95%", "5%"] }}
              transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
            />

            {/* Subtle Grid Accent */}
            <div className="absolute inset-0 bg-[radial-gradient(#ffffff0d_1px,transparent_1px)] [background-size:6px_6px] pointer-events-none" />

            {/* Verification Shield Icon */}
            <ShieldCheck className="h-8 w-8 text-primary relative z-10 transition-transform duration-300" />
          </div>
        </div>

        {/* Title & Description */}
        <CardTitle className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
          {title}
        </CardTitle>
        <CardDescription className="text-sm mt-1.5 max-w-md mx-auto text-muted-foreground leading-relaxed">
          {description}
        </CardDescription>

        {/* Dynamic Verification Telemetry Steps */}
        <div className="mt-6 pt-5 border-t border-border/50 max-w-md mx-auto w-full space-y-2.5">
          <div className="flex flex-col gap-1.5 text-left">
            {steps.map((step, idx) => {
              const isCompleted = idx < activeStep;
              const isCurrent = idx === activeStep;

              return (
                <div
                  key={step}
                  className={`flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-xs transition-colors ${
                    isCurrent
                      ? "bg-primary/10 border border-primary/25 text-foreground font-medium"
                      : isCompleted
                      ? "bg-muted/30 border border-transparent text-muted-foreground"
                      : "text-muted-foreground/60 border border-transparent"
                  }`}
                >
                  <div className="w-4 h-4 rounded-full flex items-center justify-center shrink-0">
                    {isCompleted ? (
                      <Check className="w-3.5 h-3.5 text-emerald-500" />
                    ) : isCurrent ? (
                      <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-primary" />
                      </span>
                    ) : (
                      <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/30" />
                    )}
                  </div>
                  <span className="truncate">{step}</span>
                </div>
              );
            })}
          </div>

          {/* Metadata Ticker Badges */}
          <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
            <Badge
              variant="outline"
              className="text-[11px] font-mono gap-1.5 px-2.5 py-0.5 bg-background/50 border-border/60"
            >
              <Globe className="h-3 w-3 text-primary" />
              {network}
            </Badge>

            {identifier && (
              <Badge
                variant="outline"
                className="text-[11px] font-mono gap-1.5 px-2.5 py-0.5 bg-background/50 border-border/60 max-w-[200px] truncate"
              >
                <Lock className="h-3 w-3 text-muted-foreground" />
                {identifier.length > 20
                  ? `${identifier.slice(0, 10)}...${identifier.slice(-6)}`
                  : identifier}
              </Badge>
            )}

            <Badge
              variant="outline"
              className="text-[11px] font-mono gap-1.5 px-2.5 py-0.5 bg-background/50 border-border/60"
            >
              <Cpu className="h-3 w-3 text-emerald-500" />
              Consensus Node
            </Badge>
          </div>
        </div>
      </CardHeader>
    </Card>
  );
}

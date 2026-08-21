"use client";

import { motion } from "framer-motion";
import {
  Brain,
  Lock,
  Bone,
  ScanEye,
  Droplets,
  Fingerprint,
  FileText,
  Users,
  Stethoscope,
  Pill,
  ScrollText,
  Truck,
} from "lucide-react";

/* ─── Animation Variants ─── */
const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.25, 0.1, 0.25, 1] } },
};

const stagger = {
  visible: { transition: { staggerChildren: 0.08 } },
};

/* ─── Small reusable registry row ─── */
function RegistryRow({
  icon: Icon,
  title,
  description,
}: {
  icon: React.ElementType;
  title: string;
  description: string;
}) {
  return (
    <div className="flex items-start gap-3 group/row">
      <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-purple-500/10 text-purple-400 transition-colors duration-300 group-hover/row:bg-purple-500/15">
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0">
        <p className="text-sm font-semibold text-foreground leading-tight">{title}</p>
        <p className="text-xs text-muted-foreground leading-relaxed mt-0.5">{description}</p>
      </div>
    </div>
  );
}

/* ─── AI Diagnostics specialty pill ─── */
function DiagnosticPill({
  icon: Icon,
  label,
  specialty,
  accentClass,
}: {
  icon: React.ElementType;
  label: string;
  specialty: string;
  accentClass: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-border/50 bg-muted/30 px-4 py-3 transition-all duration-300 hover:border-blue-500/20 hover:bg-blue-500/[0.04]">
      <div className="flex items-center gap-3">
        <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${accentClass}`}>
          <Icon className="h-4 w-4" />
        </div>
        <span className="text-sm text-foreground font-medium">{label}</span>
      </div>
      <span className="text-xs font-semibold text-blue-500 tracking-wide uppercase whitespace-nowrap">{specialty}</span>
    </div>
  );
}

export function BentoGrid() {
  return (
    <motion.div
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: "-80px" }}
      variants={stagger}
      className="grid grid-cols-1 md:grid-cols-2 gap-5 max-w-6xl mx-auto"
    >
      {/* ──────────────────────────────────────────────
          Tile 1 — AI Neural Diagnostics (left column)
          ────────────────────────────────────────────── */}
      <motion.div
        variants={fadeUp}
        className="group relative rounded-2xl border border-border bg-card/50 p-8 md:p-10 transition-all duration-300 hover:border-blue-500/20 hover:bg-card hover:-translate-y-1 hover:shadow-xl hover:shadow-blue-500/[0.04] dark:hover:shadow-blue-500/[0.08] overflow-hidden"
      >
        {/* Subtle corner glow */}
        <div className="absolute -top-20 -right-20 h-40 w-40 rounded-full bg-blue-500/[0.06] blur-3xl transition-opacity duration-500 opacity-0 group-hover:opacity-100 pointer-events-none" />

        <div className="relative z-10">
          <div className="mb-6 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-blue-500/10 text-blue-500 transition-transform duration-300 group-hover:scale-105">
            <Brain className="h-6 w-6" />
          </div>

          <h3 className="text-xl font-bold text-foreground mb-2">AI Neural Diagnostics</h3>
          <p className="text-sm text-muted-foreground leading-relaxed mb-6">
            Integrated specialty models for clinical decision support.
          </p>

          <div className="space-y-3">
            <DiagnosticPill
              icon={Bone}
              label="Bone Fracture Detection"
              specialty="Orthopedic AI"
              accentClass="bg-amber-500/10 text-amber-500"
            />
            <DiagnosticPill
              icon={ScanEye}
              label="Brain Tumor Identification"
              specialty="Neurology AI"
              accentClass="bg-rose-500/10 text-rose-500"
            />
            <DiagnosticPill
              icon={Droplets}
              label="Kidney Stone Detection"
              specialty="Urology AI"
              accentClass="bg-teal-500/10 text-teal-500"
            />
            <DiagnosticPill
              icon={Fingerprint}
              label="Skin Disease Classification"
              specialty="Dermatology AI"
              accentClass="bg-violet-500/10 text-violet-500"
            />
          </div>
        </div>
      </motion.div>

      {/* ──────────────────────────────────────────────
          Tile 2 — Immutable Audit Trail (right column)
          ────────────────────────────────────────────── */}
      <motion.div
        variants={fadeUp}
        className="group relative rounded-2xl border border-border bg-card/50 p-8 md:p-10 transition-all duration-300 hover:border-purple-500/20 hover:bg-card hover:-translate-y-1 hover:shadow-xl hover:shadow-purple-500/[0.04] dark:hover:shadow-purple-500/[0.08] overflow-hidden"
      >
        <div className="absolute -top-20 -right-20 h-40 w-40 rounded-full bg-purple-500/[0.06] blur-3xl transition-opacity duration-500 opacity-0 group-hover:opacity-100 pointer-events-none" />

        <div className="relative z-10">
          <div className="mb-6 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-purple-500/10 text-purple-500 transition-transform duration-300 group-hover:scale-105">
            <Lock className="h-6 w-6" />
          </div>

          <h3 className="text-xl font-bold text-foreground mb-1">Immutable Audit Trail</h3>
          <p className="text-xs font-medium text-purple-500 uppercase tracking-widest mb-2">The blockchain aspect</p>
          <p className="text-sm text-muted-foreground leading-relaxed mb-6">
            Blockchain smart contracts powering zero-trust infrastructure.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <RegistryRow icon={FileText} title="Medical Record Registry" description="Secures and validates patient health records immutably on-chain." />
            <RegistryRow icon={Users} title="Patient Registry" description="Manages identity verification and patient consent approvals." />
            <RegistryRow icon={Stethoscope} title="Doctor Registry" description="Handles granular access rights for healthcare professionals." />
            <RegistryRow icon={Pill} title="Prescription Registry" description="Tracks medical prescriptions on-chain to prevent fraud." />
            <RegistryRow icon={Truck} title="Pharmacy Registry" description="Validates dispensing across decentralized pharmacy nodes." />
            <RegistryRow icon={ScrollText} title="Audit Trail Protocol" description="Maintains a cryptographic proof of every system interaction." />
          </div>
        </div>
      </motion.div>

    </motion.div>
  );
}

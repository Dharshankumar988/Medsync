"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowRight,
  Shield,
  Activity,
  Brain,
  FileText,
  Scan,
  Stethoscope,
  Heart,
  Building2,
  Pill,
  UserCog,
  Users,
  Lock,
  Eye,
  ClipboardCheck,
  ChevronDown,
  Menu,
  X,
  BarChart3,
  Fingerprint,
  Zap,
  Globe,
  Award,
  ShieldCheck,
  Clock,
} from "lucide-react";
import { Button } from "@medsync/ui";

/* ─── Animation Variants ─── */
const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.25, 0.1, 0.25, 1] } },
};

const stagger = {
  visible: { transition: { staggerChildren: 0.1 } },
};

/* ─── Reusable Section Header ─── */
function SectionHeader({ label, title, description }: { label?: string; title: string; description: string }) {
  return (
    <motion.div
      className="mx-auto max-w-2xl text-center mb-16"
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: "-80px" }}
      variants={fadeUp}
    >
      {label && (
        <p className="text-sm font-medium tracking-widest uppercase text-blue-500 mb-4">{label}</p>
      )}
      <h2 className="text-3xl sm:text-4xl lg:text-[2.75rem] font-bold tracking-tight leading-[1.15] text-foreground mb-5">
        {title}
      </h2>
      <p className="text-base sm:text-lg text-muted-foreground leading-relaxed max-w-xl mx-auto">
        {description}
      </p>
    </motion.div>
  );
}

/* ─── Feature Card ─── */
function FeatureCard({ icon: Icon, title, description }: { icon: any; title: string; description: string }) {
  return (
    <motion.div
      variants={fadeUp}
      className="group relative rounded-2xl border border-border bg-card/50 p-8 transition-all duration-300 hover:border-border/80 hover:bg-card hover:-translate-y-1 hover:shadow-lg hover:shadow-black/5 dark:hover:shadow-black/20"
    >
      <div className="mb-6 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-muted text-muted-foreground transition-colors duration-300 group-hover:bg-blue-500/10 group-hover:text-blue-500">
        <Icon className="h-6 w-6" />
      </div>
      <h3 className="text-lg font-semibold text-foreground mb-2">{title}</h3>
      <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>
    </motion.div>
  );
}

/* ─── FAQ Item ─── */
function FAQItem({ question, answer }: { question: string; answer: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-border">
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between py-5 text-left text-foreground hover:text-foreground/80 transition-colors"
        aria-expanded={open}
      >
        <span className="text-base font-medium pr-4">{question}</span>
        <ChevronDown className={`h-5 w-5 flex-shrink-0 text-muted-foreground transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
      </button>
      <div className={`overflow-hidden transition-all duration-300 ${open ? "max-h-40 pb-5" : "max-h-0"}`}>
        <p className="text-sm text-muted-foreground leading-relaxed">{answer}</p>
      </div>
    </div>
  );
}

/* ─── Hero Floating Composition (matches uploaded reference) ─── */
function HeroComposition() {
  return (
    <div className="relative h-[420px] w-full" aria-hidden="true">
      {/* Connecting lines from center to orbiting elements */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 400 420" fill="none">
        <line x1="200" y1="210" x2="68"  y2="78"  className="stroke-border/60 dark:stroke-white/[0.06]" strokeWidth="1.5" />
        <line x1="200" y1="210" x2="330" y2="63"  className="stroke-border/60 dark:stroke-white/[0.06]" strokeWidth="1.5" />
        <line x1="200" y1="210" x2="350" y2="226" className="stroke-border/60 dark:stroke-white/[0.06]" strokeWidth="1.5" />
        <line x1="200" y1="210" x2="330" y2="360" className="stroke-border/60 dark:stroke-white/[0.06]" strokeWidth="1.5" />
        <line x1="200" y1="210" x2="64"  y2="370" className="stroke-border/60 dark:stroke-white/[0.06]" strokeWidth="1.5" />
      </svg>

      {/* Central shield — larger, more prominent */}
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10 group cursor-default">
        <motion.div
          animate={{ y: [0, -8, 0] }}
          transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
          className="relative h-[120px] w-[120px] rounded-[32px] bg-background/80 dark:bg-[#0a0a0a]/90 backdrop-blur-xl border border-border/50 dark:border-white/[0.08] shadow-2xl flex items-center justify-center overflow-hidden transition-all duration-300 group-hover:border-blue-500/50 group-hover:shadow-blue-500/20"
        >
          <div className="absolute inset-0 bg-blue-500/5 dark:bg-blue-500/10" />
          <div className="absolute -inset-4 bg-gradient-to-tr from-blue-500/10 to-transparent blur-xl opacity-50 group-hover:opacity-100 transition-opacity duration-500" />
          <Shield className="h-12 w-12 text-blue-500 relative z-10" strokeWidth={1.5} />
        </motion.div>
        {/* Tooltip */}
        <div className="absolute -top-12 left-1/2 -translate-x-1/2 px-3 py-1.5 rounded-lg bg-foreground text-background text-xs font-medium opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-300 pointer-events-none whitespace-nowrap z-20 shadow-xl">
          Core Security
        </div>
      </div>

      {/* Orbiting element — Top Left (Fingerprint) */}
      <motion.div
        animate={{ y: [0, 8, 0] }}
        transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
        className="absolute top-[50px] left-[40px] group cursor-default z-10"
      >
        <div className="h-[56px] w-[56px] rounded-[18px] bg-background/80 dark:bg-[#0a0a0a]/90 backdrop-blur-md border border-border/50 dark:border-white/[0.08] shadow-lg flex items-center justify-center transition-all duration-300 group-hover:border-blue-500/50 group-hover:shadow-blue-500/20">
          <Fingerprint className="h-6 w-6 text-muted-foreground group-hover:text-blue-500 transition-colors" strokeWidth={1.5} />
        </div>
        <div className="absolute -top-10 left-1/2 -translate-x-1/2 px-3 py-1.5 rounded-lg bg-foreground text-background text-xs font-medium opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-300 pointer-events-none whitespace-nowrap shadow-xl">
          Identity Verification
        </div>
      </motion.div>

      {/* Orbiting element — Top Right (Brain) */}
      <motion.div
        animate={{ y: [0, -10, 0] }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut", delay: 1 }}
        className="absolute top-[35px] right-[30px] group cursor-default z-10"
      >
        <div className="h-[56px] w-[56px] rounded-[18px] bg-background/80 dark:bg-[#0a0a0a]/90 backdrop-blur-md border border-border/50 dark:border-white/[0.08] shadow-lg flex items-center justify-center transition-all duration-300 group-hover:border-blue-500/50 group-hover:shadow-blue-500/20">
          <Brain className="h-6 w-6 text-muted-foreground group-hover:text-blue-500 transition-colors" strokeWidth={1.5} />
        </div>
        <div className="absolute -top-10 left-1/2 -translate-x-1/2 px-3 py-1.5 rounded-lg bg-foreground text-background text-xs font-medium opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-300 pointer-events-none whitespace-nowrap shadow-xl">
          AI Diagnostics
        </div>
      </motion.div>

      {/* Orbiting element — Middle Right (Zap) */}
      <motion.div
        animate={{ y: [0, 10, 0] }}
        transition={{ duration: 6.5, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
        className="absolute top-[200px] right-[10px] group cursor-default z-10"
      >
        <div className="h-[52px] w-[52px] rounded-2xl bg-background/80 dark:bg-[#0a0a0a]/90 backdrop-blur-md border border-border/50 dark:border-white/[0.08] shadow-lg flex items-center justify-center transition-all duration-300 group-hover:border-blue-500/50 group-hover:shadow-blue-500/20">
          <Zap className="h-5 w-5 text-muted-foreground group-hover:text-blue-500 transition-colors" strokeWidth={1.5} />
        </div>
        <div className="absolute -top-10 left-1/2 -translate-x-1/2 px-3 py-1.5 rounded-lg bg-foreground text-background text-xs font-medium opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-300 pointer-events-none whitespace-nowrap shadow-xl">
          Real-time Sync
        </div>
      </motion.div>

      {/* Orbiting element — Bottom Right (FileText) */}
      <motion.div
        animate={{ y: [0, -8, 0] }}
        transition={{ duration: 7.5, repeat: Infinity, ease: "easeInOut", delay: 2 }}
        className="absolute bottom-[25px] right-[30px] group cursor-default z-10"
      >
        <div className="h-[52px] w-[52px] rounded-2xl bg-background/80 dark:bg-[#0a0a0a]/90 backdrop-blur-md border border-border/50 dark:border-white/[0.08] shadow-lg flex items-center justify-center transition-all duration-300 group-hover:border-blue-500/50 group-hover:shadow-blue-500/20">
          <FileText className="h-5 w-5 text-muted-foreground group-hover:text-blue-500 transition-colors" strokeWidth={1.5} />
        </div>
        <div className="absolute -top-10 left-1/2 -translate-x-1/2 px-3 py-1.5 rounded-lg bg-foreground text-background text-xs font-medium opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-300 pointer-events-none whitespace-nowrap shadow-xl">
          Medical Records
        </div>
      </motion.div>

      {/* Orbiting element — Bottom Left (Heart) */}
      <motion.div
        animate={{ y: [0, 10, 0] }}
        transition={{ duration: 7, repeat: Infinity, ease: "easeInOut", delay: 1.5 }}
        className="absolute bottom-[20px] left-[40px] group cursor-default z-10"
      >
        <div className="h-[48px] w-[48px] rounded-2xl bg-background/80 dark:bg-[#0a0a0a]/90 backdrop-blur-md border border-border/50 dark:border-white/[0.08] shadow-lg flex items-center justify-center transition-all duration-300 group-hover:border-blue-500/50 group-hover:shadow-blue-500/20">
          <Heart className="h-5 w-5 text-muted-foreground group-hover:text-blue-500 transition-colors" strokeWidth={1.5} />
        </div>
        <div className="absolute -top-10 left-1/2 -translate-x-1/2 px-3 py-1.5 rounded-lg bg-foreground text-background text-xs font-medium opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-300 pointer-events-none whitespace-nowrap shadow-xl">
          Patient Vitals
        </div>
      </motion.div>
    </div>
  );
}

/* ─── Main Page ─── */
export default function Home() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background text-foreground">

      {/* ━━━ NAVIGATION ━━━ */}
      <header className="sticky top-0 z-50 border-b border-border/60 bg-background/80 backdrop-blur-xl">
        <nav className="mx-auto max-w-6xl flex h-16 items-center justify-between px-6" aria-label="Main navigation">
          <Link href="/" className="flex items-center gap-2.5 font-semibold text-lg text-foreground" aria-label="MedSync Home">
            <Activity className="h-5 w-5 text-blue-500" />
            <span className="tracking-tight">MedSync</span>
          </Link>

          <div className="hidden md:flex items-center gap-8">
            <a href="#features" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Features</a>
            <a href="#security" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Security</a>
            <a href="#how-it-works" className="text-sm text-muted-foreground hover:text-foreground transition-colors">How It Works</a>
            <a href="#faq" className="text-sm text-muted-foreground hover:text-foreground transition-colors">FAQ</a>
          </div>

          <div className="hidden md:flex items-center gap-3">
            <Button asChild variant="ghost" className="text-sm text-muted-foreground hover:text-foreground">
              <Link href="/login">Sign In</Link>
            </Button>
            <Button asChild className="text-sm bg-blue-600 hover:bg-blue-500 text-white rounded-lg h-9 px-5">
              <Link href="/register">Get Started</Link>
            </Button>
          </div>

          <button
            className="md:hidden p-2 text-muted-foreground hover:text-foreground"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </nav>

        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
            className="md:hidden border-t border-border bg-background px-6 py-4 space-y-3"
          >
            <a href="#features" onClick={() => setMobileMenuOpen(false)} className="block py-2 text-sm text-muted-foreground hover:text-foreground">Features</a>
            <a href="#security" onClick={() => setMobileMenuOpen(false)} className="block py-2 text-sm text-muted-foreground hover:text-foreground">Security</a>
            <a href="#how-it-works" onClick={() => setMobileMenuOpen(false)} className="block py-2 text-sm text-muted-foreground hover:text-foreground">How It Works</a>
            <a href="#faq" onClick={() => setMobileMenuOpen(false)} className="block py-2 text-sm text-muted-foreground hover:text-foreground">FAQ</a>
            <div className="pt-3 border-t border-border flex flex-col gap-2">
              <Button asChild variant="ghost" className="w-full justify-center text-muted-foreground">
                <Link href="/login">Sign In</Link>
              </Button>
              <Button asChild className="w-full justify-center bg-blue-600 hover:bg-blue-500 text-white">
                <Link href="/register">Get Started</Link>
              </Button>
            </div>
          </motion.div>
        )}
      </header>

      <main>

        {/* ━━━ HERO ━━━ */}
        <section className="relative overflow-hidden">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-blue-500/[0.03] rounded-full blur-[120px] pointer-events-none" />

          <div className="mx-auto max-w-6xl px-6 pt-24 pb-20 md:pt-32 md:pb-28 lg:pt-40 lg:pb-36">
            <div className="grid lg:grid-cols-2 gap-16 lg:gap-20 items-center">
              <motion.div initial="hidden" animate="visible" variants={stagger} className="max-w-xl">
                <motion.h1
                  variants={fadeUp}
                  className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight leading-[1.1] text-foreground"
                >
                  Healthcare,{" "}
                  <br className="hidden sm:inline" />
                  Intelligently{" "}
                  <span className="text-blue-500">Connected.</span>
                </motion.h1>

                <motion.p variants={fadeUp} className="mt-6 text-base sm:text-lg text-muted-foreground leading-relaxed max-w-md">
                  MedSync unifies patients, doctors, and pharmacies on one secure platform — powered by AI diagnostics and protected by blockchain-verified records.
                </motion.p>

                <motion.div variants={fadeUp} className="mt-10 flex flex-col sm:flex-row gap-3">
                  <Button asChild className="h-12 px-8 text-base bg-blue-600 hover:bg-blue-500 text-white rounded-xl group">
                    <Link href="/register">
                      Get Started
                      <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                    </Link>
                  </Button>
                  <Button asChild variant="outline" className="h-12 px-8 text-base rounded-xl border-border text-muted-foreground hover:bg-muted hover:text-foreground">
                    <a href="#features">Explore Platform</a>
                  </Button>
                </motion.div>

                <motion.div variants={fadeUp} className="mt-10 flex items-center gap-6 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1.5"><Shield className="h-4 w-4 text-blue-500" /> HIPAA Ready</span>
                  <span className="flex items-center gap-1.5"><Lock className="h-4 w-4 text-blue-500" /> End-to-End Encrypted</span>
                </motion.div>
              </motion.div>

              {/* Floating composition */}
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.7, delay: 0.3 }}
                className="hidden lg:block"
              >
                <HeroComposition />
              </motion.div>
            </div>
          </div>
        </section>

        {/* ━━━ WHY MEDSYNC ━━━ */}
        <section id="features" className="py-24 md:py-32 content-auto">
          <div className="mx-auto max-w-6xl px-6">
            <SectionHeader
              label="Why MedSync"
              title="Everything your healthcare practice needs. Nothing it doesn't."
              description="A single platform that replaces fragmented systems with intelligent, secure, and interoperable healthcare infrastructure."
            />
            <motion.div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5" initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-80px" }} variants={stagger}>
              <FeatureCard icon={FileText} title="Unified Records" description="All patient data in one place — accessible to authorized professionals, verified by blockchain." />
              <FeatureCard icon={Shield} title="Zero-Trust Security" description="Role-based access control, cryptographic verification, and immutable audit trails at every layer." />
              <FeatureCard icon={Brain} title="AI-Powered Insights" description="Intelligent diagnostics, drug interaction checks, and clinical decision support built right in." />
              <FeatureCard icon={Users} title="Multi-Role Access" description="Purpose-built experiences for patients, doctors, pharmacies, hospitals, and administrators." />
              <FeatureCard icon={Activity} title="Real-Time Monitoring" description="Live dashboards, instant notifications, and continuous health data synchronization." />
              <FeatureCard icon={Stethoscope} title="Clinical Workflows" description="Prescriptions, appointments, lab results, and imaging — all digitized and connected." />
            </motion.div>
          </div>
        </section>

        {/* ━━━ AI FEATURES ━━━ */}
        <section className="py-24 md:py-32 border-t border-border/60 content-auto">
          <div className="mx-auto max-w-6xl px-6">
            <SectionHeader
              label="AI Intelligence"
              title="Clinical AI that works alongside your team."
              description="Practical artificial intelligence designed to assist — not replace — healthcare professionals in making faster, more confident decisions."
            />
            <motion.div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5" initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-80px" }} variants={stagger}>
              <FeatureCard icon={Scan} title="Medical Imaging" description="AI-assisted analysis of X-rays, CT scans, and MRIs to detect abnormalities and support radiological assessments." />
              <FeatureCard icon={Stethoscope} title="Clinical Assistant" description="Context-aware AI that helps doctors with differential diagnosis, SOAP notes, and treatment planning." />
              <FeatureCard icon={Heart} title="Disease Detection" description="Early detection models for bone fractures, brain anomalies, kidney conditions, and skin disorders." />
              <FeatureCard icon={BarChart3} title="Risk Prediction" description="Patient risk stratification based on clinical history, lab results, and medication profiles." />
              <FeatureCard icon={ClipboardCheck} title="Report Generation" description="Automated clinical summaries, lab interpretations, and structured prescription documentation." />
              <FeatureCard icon={Pill} title="Drug Safety" description="Real-time interaction checks, allergy screening, dosing guidance, and therapeutic duplication warnings." />
            </motion.div>
          </div>
        </section>

        {/* ━━━ BLOCKCHAIN SECURITY ━━━ */}
        <section id="security" className="py-24 md:py-32 border-t border-border/60 content-auto">
          <div className="mx-auto max-w-6xl px-6">
            <SectionHeader
              label="Blockchain Security"
              title="Security you can trust. Technology you never have to think about."
              description="MedSync quietly uses blockchain-backed smart contracts to protect medical records, verify permissions, maintain audit trails, and ensure patient consent — all without changing how healthcare professionals work."
            />
            <motion.div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-20" initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-80px" }} variants={stagger}>
              <FeatureCard icon={Lock} title="Smart Contracts" description="Automatically verify permissions before records are shared." />
              <FeatureCard icon={Fingerprint} title="Patient Consent" description="Patients stay in control of who accesses their healthcare data." />
              <FeatureCard icon={Shield} title="Immutable Records" description="Verified records cannot be silently altered or tampered with." />
              <FeatureCard icon={Eye} title="Audit Trail" description="Every authorized action is permanently and transparently recorded." />
            </motion.div>

            <motion.div className="mx-auto max-w-2xl" initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp}>
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 sm:gap-2">
                {["Patient", "Grants Permission", "Smart Contract", "Verifies Access", "Doctor", "Secure Record", "Audit Updated"].map((step, i) => (
                  <div key={step} className="flex items-center gap-2 sm:flex-col sm:gap-1 text-center">
                    {i > 0 && <div className="hidden sm:block w-8 h-px bg-border" />}
                    <div className={`text-xs font-medium px-3 py-1.5 rounded-full ${i % 2 === 0 ? "bg-muted text-foreground" : "text-muted-foreground"}`}>
                      {step}
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        </section>

        {/* ━━━ HOW IT WORKS ━━━ */}
        <section id="how-it-works" className="py-24 md:py-32 border-t border-border/60 content-auto">
          <div className="mx-auto max-w-6xl px-6">
            <SectionHeader label="How It Works" title="From registration to care — in four simple steps." description="MedSync streamlines every step of the healthcare journey without requiring any technical expertise." />
            <motion.div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5" initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-80px" }} variants={stagger}>
              {[
                { step: "01", title: "Register", desc: "Create your account and choose your role — patient, doctor, pharmacy, or administrator.", icon: Users },
                { step: "02", title: "Connect", desc: "Link with your healthcare providers, share records securely, and book appointments.", icon: Activity },
                { step: "03", title: "AI Insights", desc: "Get AI-powered diagnostics, clinical decision support, and prescription safety checks.", icon: Brain },
                { step: "04", title: "Verified", desc: "Every action is verified and recorded on the blockchain for complete transparency.", icon: Shield },
              ].map((item) => (
                <motion.div key={item.step} variants={fadeUp} className="group relative rounded-2xl border border-border bg-card/50 p-8 transition-all duration-300 hover:border-border/80 hover:-translate-y-1 hover:shadow-lg hover:shadow-black/5 dark:hover:shadow-black/20">
                  <span className="text-5xl font-bold text-muted/80">{item.step}</span>
                  <div className="mt-4 mb-3 inline-flex h-10 w-10 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                    <item.icon className="h-5 w-5" />
                  </div>
                  <h3 className="text-lg font-semibold text-foreground mb-2">{item.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{item.desc}</p>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </section>

        {/* ━━━ ROLE ECOSYSTEM ━━━ */}
        <section className="py-24 md:py-32 border-t border-border/60 content-auto">
          <div className="mx-auto max-w-6xl px-6">
            <SectionHeader label="Ecosystem" title="Purpose-built for every role in healthcare." description="Whether you're a patient managing your health or a hospital running an enterprise network, MedSync adapts to your needs." />
            <motion.div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-4" initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-80px" }} variants={stagger}>
              {[
                { icon: Heart, label: "Patient", desc: "Manage records, book appointments, track health" },
                { icon: Stethoscope, label: "Doctor", desc: "Prescribe, diagnose, access clinical AI tools" },
                { icon: Building2, label: "Hospital", desc: "Administer departments, manage staff, analytics" },
                { icon: Pill, label: "Pharmacy", desc: "Inventory, dispensing, prescription fulfillment" },
                { icon: UserCog, label: "Admin", desc: "Platform oversight, verification, compliance" },
              ].map((role) => (
                <motion.div key={role.label} variants={fadeUp} className="group rounded-2xl border border-border bg-card/50 p-6 text-center transition-all duration-300 hover:border-border/80 hover:-translate-y-1 hover:shadow-lg hover:shadow-black/5 dark:hover:shadow-black/20">
                  <div className="mx-auto mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-muted text-muted-foreground group-hover:text-blue-500 group-hover:bg-blue-500/10 transition-colors">
                    <role.icon className="h-6 w-6" />
                  </div>
                  <h3 className="text-sm font-semibold text-foreground mb-1">{role.label}</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">{role.desc}</p>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </section>

        {/* ━━━ STATISTICS ━━━ */}
        <section className="py-24 md:py-32 border-t border-border/60 content-auto">
          <div className="mx-auto max-w-6xl px-6">
            <motion.div className="grid grid-cols-2 lg:grid-cols-4 gap-8" initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-80px" }} variants={stagger}>
              {[
                { value: "50K+", label: "Records Secured" },
                { value: "1,200+", label: "Healthcare Professionals" },
                { value: "99.9%", label: "Uptime SLA" },
                { value: "10K+", label: "AI Analyses Performed" },
              ].map((stat) => (
                <motion.div key={stat.label} variants={fadeUp} className="text-center">
                  <p className="text-4xl sm:text-5xl font-bold text-foreground tracking-tight">{stat.value}</p>
                  <p className="mt-2 text-sm text-muted-foreground">{stat.label}</p>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </section>

        {/* ━━━ TESTIMONIALS ━━━ */}
        <section className="py-24 md:py-32 border-t border-border/60 content-auto">
          <div className="mx-auto max-w-6xl px-6">
            <SectionHeader label="Testimonials" title="Trusted by healthcare professionals." description="What doctors, pharmacists, and administrators say about working with MedSync." />
            <motion.div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5" initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-80px" }} variants={stagger}>
              {[
                { quote: "MedSync transformed how we manage patient records. The AI diagnostics save us hours every week.", name: "Dr. Priya Sharma", role: "Cardiologist" },
                { quote: "The inventory management and prescription integration is exactly what our pharmacy needed.", name: "Rajesh Kumar", role: "Pharmacy Manager" },
                { quote: "Finally, a platform that takes security seriously without making it complicated for our staff.", name: "Dr. Anand Patel", role: "Hospital Administrator" },
              ].map((testimonial) => (
                <motion.div key={testimonial.name} variants={fadeUp} className="rounded-2xl border border-border bg-card/50 p-8">
                  <p className="text-sm text-muted-foreground leading-relaxed mb-6">&ldquo;{testimonial.quote}&rdquo;</p>
                  <div>
                    <p className="text-sm font-semibold text-foreground">{testimonial.name}</p>
                    <p className="text-xs text-muted-foreground">{testimonial.role}</p>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </section>

        {/* ━━━ FAQ ━━━ */}
        <section id="faq" className="py-24 md:py-32 border-t border-border/60 content-auto">
          <div className="mx-auto max-w-6xl px-6">
            <SectionHeader label="FAQ" title="Common questions, clear answers." description="Everything you need to know about getting started with MedSync." />
            <div className="mx-auto max-w-2xl">
              <FAQItem question="How is my medical data protected?" answer="All data is encrypted end-to-end, stored with HIPAA-compliant infrastructure, and verified through blockchain smart contracts. Only authorized personnel with your explicit consent can access your records." />
              <FAQItem question="Do I need to understand blockchain to use MedSync?" answer="Not at all. Blockchain works entirely behind the scenes. You interact with a simple, modern interface — the security layer is invisible to you." />
              <FAQItem question="What AI capabilities are included?" answer="MedSync includes AI-powered medical imaging analysis, clinical decision support, drug interaction checking, automated report generation, and risk prediction models." />
              <FAQItem question="Can multiple hospitals use MedSync together?" answer="Yes. MedSync is designed for interoperability. Multiple healthcare facilities can securely share patient data with proper consent and verification." />
              <FAQItem question="Is MedSync suitable for small clinics?" answer="Absolutely. MedSync scales from individual practitioners to large hospital networks. The platform adapts to your practice size." />
            </div>
          </div>
        </section>

        {/* ━━━ CTA ━━━ */}
        <section className="py-24 md:py-32 border-t border-border/60">
          <div className="mx-auto max-w-6xl px-6">
            <motion.div className="mx-auto max-w-2xl text-center" initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp}>
              <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground mb-5">
                Ready to modernize your practice?
              </h2>
              <p className="text-base text-muted-foreground mb-10 max-w-md mx-auto">
                Join thousands of healthcare professionals already using MedSync to deliver better, safer care.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                <Button asChild className="h-12 px-8 text-base bg-blue-600 hover:bg-blue-500 text-white rounded-xl group">
                  <Link href="/register">
                    Create Free Account
                    <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </Link>
                </Button>
                <Button asChild variant="outline" className="h-12 px-8 text-base rounded-xl border-border text-muted-foreground hover:bg-muted hover:text-foreground">
                  <Link href="/login">Sign In</Link>
                </Button>
              </div>
            </motion.div>
          </div>
        </section>

      </main>

      {/* ━━━ FOOTER ━━━ */}
      <footer className="border-t border-border/60 py-12">
        <div className="mx-auto max-w-6xl px-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Activity className="h-4 w-4 text-blue-500" />
              <span>MedSync</span>
            </div>
            <div className="flex items-center gap-8 text-sm text-muted-foreground">
              <a href="#features" className="hover:text-foreground transition-colors">Features</a>
              <a href="#security" className="hover:text-foreground transition-colors">Security</a>
              <a href="#faq" className="hover:text-foreground transition-colors">FAQ</a>
              <Link href="/login" className="hover:text-foreground transition-colors">Sign In</Link>
            </div>
            <p className="text-xs text-muted-foreground/60">
              &copy; {new Date().getFullYear()} MedSync Systems. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

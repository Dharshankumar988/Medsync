"use client";

import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import Link from "next/link";
import { Activity, Shield, Brain, ArrowRight, ActivitySquare, Stethoscope, Dna, FileText } from "lucide-react";
import Image from "next/image";
import { Card } from "@/components/ui/card";

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-[#020817] text-foreground overflow-hidden selection:bg-primary/30">
      {/* Animated Background Gradients */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-[25%] -left-[10%] w-[50%] h-[50%] rounded-full bg-primary/20 blur-[120px]" />
        <div className="absolute top-[20%] -right-[10%] w-[40%] h-[40%] rounded-full bg-emerald-500/10 blur-[120px]" />
        <div className="absolute bottom-0 left-[20%] w-[60%] h-[40%] rounded-full bg-blue-600/10 blur-[150px]" />
      </div>

      {/* Hero Section */}
      <section className="relative z-10 flex flex-col items-center pt-32 pb-20 px-4">
        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
          className="max-w-5xl text-center space-y-8"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 backdrop-blur-md mb-4 shadow-glass">
            <span className="flex h-2 w-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span className="text-sm font-medium text-slate-300">MedSync AI v2.0 is now live</span>
          </div>
          
          <h1 className="text-5xl md:text-7xl lg:text-8xl font-heading font-bold tracking-tight text-white drop-shadow-sm">
            Intelligent Healthcare, <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-emerald-400">
              Decentralized.
            </span>
          </h1>
          
          <p className="text-xl md:text-2xl text-slate-400 max-w-3xl mx-auto font-light leading-relaxed">
            Uniting patients, doctors, and pharmacies through zero-knowledge blockchain privacy and cutting-edge AI diagnostics.
          </p>
          
          <div className="flex flex-col sm:flex-row justify-center gap-4 pt-8">
            <Button asChild size="lg" className="rounded-full h-14 px-8 text-base shadow-[0_0_40px_-10px_rgba(59,130,246,0.5)]">
              <Link href="/login">
                Access Portal <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
            <Button asChild variant="glass" size="lg" className="rounded-full h-14 px-8 text-base text-white">
              <Link href="/register">Join the Ecosystem</Link>
            </Button>
          </div>
        </motion.div>

        {/* Hero Image Showcase */}
        <motion.div 
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1.2, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
          className="w-full max-w-6xl mt-24 relative"
        >
          <div className="absolute inset-0 bg-gradient-to-t from-[#020817] via-transparent to-transparent z-10 rounded-3xl"></div>
          <div className="relative rounded-3xl overflow-hidden border border-white/10 shadow-2xl shadow-blue-900/20 backdrop-blur-sm aspect-[16/9] md:aspect-[21/9]">
            <Image 
              src="/hero-bg.png" 
              alt="Medical AI Abstract" 
              fill
              className="object-cover opacity-80 mix-blend-screen"
              priority
            />
          </div>
        </motion.div>
      </section>

      {/* Features Section */}
      <section className="relative z-10 py-32 px-4 max-w-7xl mx-auto">
        <div className="text-center mb-20 space-y-4">
          <h2 className="text-3xl md:text-5xl font-heading font-bold text-white">Enterprise-grade infrastructure</h2>
          <p className="text-lg text-slate-400 max-w-2xl mx-auto">Built for hospitals, clinics, and modern medical institutions.</p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          <FeatureCard 
            icon={<Shield className="w-6 h-6 text-emerald-400" />}
            title="Zero-Knowledge Privacy"
            description="Medical records anchored to the Polygon network. Immutable, verifiable, and strictly controlled by the patient."
            delay={0.1}
          />
          <FeatureCard 
            icon={<Brain className="w-6 h-6 text-blue-400" />}
            title="AI Diagnostics"
            description="Doctor AI analyzes MRI and CT scans instantly using EfficientNet, providing accurate differential diagnoses."
            delay={0.2}
          />
          <FeatureCard 
            icon={<ActivitySquare className="w-6 h-6 text-amber-400" />}
            title="Seamless Pharmacy"
            description="Prescriptions pushed directly to verified pharmacies on-chain. Track delivery and adherence in real-time."
            delay={0.3}
          />
          <FeatureCard 
            icon={<Dna className="w-6 h-6 text-cyan-400" />}
            title="Genomic Analysis"
            description="Advanced models predict potential health risks based on family history and personalized medical data."
            delay={0.4}
          />
          <FeatureCard 
            icon={<Stethoscope className="w-6 h-6 text-red-400" />}
            title="Telemedicine Ready"
            description="Integrated high-fidelity WebRTC consultations with real-time AI transcription and clinical note generation."
            delay={0.5}
          />
          <FeatureCard 
            icon={<FileText className="w-6 h-6 text-indigo-400" />}
            title="Smart Smart Contracts"
            description="Automated insurance claims and transparent billing executed flawlessly via deterministic blockchain logic."
            delay={0.6}
          />
        </div>
      </section>
      
      {/* Footer (Minimal) */}
      <footer className="border-t border-white/10 mt-20">
        <div className="max-w-7xl mx-auto px-4 py-12 flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-slate-500">
          <div className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-primary" />
            <span className="font-heading font-semibold text-white text-lg">MedSync</span>
          </div>
          <p>© 2026 MedSync Corporation. All rights reserved.</p>
          <div className="flex gap-6">
            <Link href="/privacy" className="hover:text-white transition-colors">Privacy</Link>
            <Link href="/terms" className="hover:text-white transition-colors">Terms</Link>
            <Link href="/docs" className="hover:text-white transition-colors">Documentation</Link>
          </div>
        </div>
      </footer>
    </main>
  );
}

function FeatureCard({ icon, title, description, delay }: { icon: React.ReactNode, title: string, description: string, delay: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-100px" }}
      transition={{ duration: 0.7, delay }}
    >
      <Card className="h-full bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20 p-8 shadow-none backdrop-blur-xl group cursor-pointer overflow-hidden relative">
        <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-[50px] -translate-y-1/2 translate-x-1/2 group-hover:bg-primary/20 transition-colors duration-500" />
        
        <div className="mb-6 bg-black/40 w-12 h-12 rounded-xl border border-white/10 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
          {icon}
        </div>
        <h3 className="text-xl font-heading font-semibold text-white mb-3">{title}</h3>
        <p className="text-slate-400 leading-relaxed text-sm">{description}</p>
      </Card>
    </motion.div>
  )
}

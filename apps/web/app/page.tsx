"use client";

import Link from "next/link";
import { ArrowRight, Shield, Activity, Lock, Database } from "lucide-react";
import { Button } from "@medsync/ui";
import { motion } from "framer-motion";

export default function Home() {
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.2,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 30 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.7,
        ease: [0.25, 0.1, 0.25, 1],
      },
    },
  };

  return (
    <div className="flex min-h-screen flex-col bg-slate-950 text-slate-50 selection:bg-primary/30 overflow-hidden relative">
      {/* Dynamic Animated Background Blobs */}
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
        <motion.div
          animate={{
            x: ["0%", "20%", "-20%", "0%"],
            y: ["0%", "-20%", "20%", "0%"],
            scale: [1, 1.2, 0.9, 1],
          }}
          transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
          className="absolute top-[-10%] left-[-10%] h-[600px] w-[600px] rounded-full bg-blue-600/20 blur-[120px]"
        />
        <motion.div
          animate={{
            x: ["0%", "-30%", "10%", "0%"],
            y: ["0%", "30%", "-10%", "0%"],
            scale: [1, 0.8, 1.3, 1],
          }}
          transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
          className="absolute top-[20%] right-[-10%] h-[500px] w-[500px] rounded-full bg-teal-500/20 blur-[120px]"
        />
        <motion.div
          animate={{
            x: ["0%", "40%", "-40%", "0%"],
            y: ["0%", "10%", "40%", "0%"],
            scale: [1, 1.1, 0.9, 1],
          }}
          transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
          className="absolute bottom-[-20%] left-[20%] h-[700px] w-[700px] rounded-full bg-indigo-600/20 blur-[150px]"
        />
      </div>

      <header className="sticky top-0 z-50 w-full border-b border-white/10 bg-slate-950/40 backdrop-blur-2xl supports-[backdrop-filter]:bg-slate-950/20">
        <div className="container flex h-20 max-w-screen-2xl items-center justify-between">
          <Link href="/" className="flex items-center gap-3 font-bold text-2xl group">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-blue-600 shadow-lg shadow-primary/25 transition-transform duration-300 group-hover:scale-110 group-hover:rotate-6">
              <Activity className="h-6 w-6 text-white" />
            </div>
            <span className="tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400">MedSync</span>
          </Link>
          <nav className="flex items-center gap-6">
            <Link href="/login" className="text-sm font-medium text-slate-300 hover:text-white transition-colors relative after:absolute after:bottom-0 after:left-0 after:h-[2px] after:w-0 after:bg-primary after:transition-all hover:after:w-full">
              Sign In
            </Link>
            <Button asChild size="lg" className="rounded-full px-6 bg-white text-slate-950 hover:bg-slate-200 transition-all hover:scale-105 shadow-[0_0_20px_rgba(255,255,255,0.15)] font-semibold">
              <Link href="/register">Get Started</Link>
            </Button>
          </nav>
        </div>
      </header>

      <main className="flex-1 relative z-10">
        {/* Hero Section */}
        <section className="relative space-y-6 pb-16 pt-24 md:pb-32 md:pt-32 lg:py-40 flex items-center justify-center min-h-[80vh]">
          <motion.div 
            className="container flex max-w-[72rem] flex-col items-center gap-8 text-center"
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          >
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2, duration: 0.5 }}
              className="inline-flex items-center rounded-full border border-white/10 bg-white/5 backdrop-blur-md px-4 py-1.5 text-sm font-medium text-blue-200 mb-2 shadow-[0_0_30px_rgba(59,130,246,0.15)]"
            >
              <Activity className="mr-2 h-4 w-4 animate-pulse text-blue-400" />
              MedSync Platform 2.0 is live
            </motion.div>
            
            <h1 className="font-extrabold text-5xl sm:text-6xl md:text-7xl lg:text-8xl tracking-tighter text-balance leading-[1.1]">
              The Enterprise Standard for <br className="hidden md:inline" />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-indigo-400 to-teal-400 drop-shadow-sm">
                Clinical Data Management
              </span>
            </h1>
            
            <p className="max-w-[46rem] leading-relaxed text-slate-300 sm:text-xl sm:leading-9 text-balance font-light">
              A highly secure, blockchain-verified healthcare platform integrating AI-driven insights and interoperable records for modern medical enterprises.
            </p>
            
            <motion.div 
              className="flex flex-col gap-4 sm:flex-row mt-10"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, duration: 0.5 }}
            >
              <Button asChild size="lg" className="h-14 px-10 rounded-full text-lg group bg-gradient-to-r from-primary to-blue-600 text-white shadow-[0_0_40px_rgba(59,130,246,0.4)] transition-all hover:shadow-[0_0_60px_rgba(59,130,246,0.6)] hover:scale-105 border border-white/10">
                <Link href="/register">
                  Enter Platform
                  <ArrowRight className="ml-3 h-5 w-5 transition-transform group-hover:translate-x-1.5" />
                </Link>
              </Button>
            </motion.div>
          </motion.div>
        </section>

        {/* Features Section */}
        <section id="features" className="relative container space-y-6 py-24 md:py-32">
          <motion.div 
            className="mx-auto flex max-w-[58rem] flex-col items-center space-y-4 text-center mb-20"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            variants={itemVariants}
          >
            <h2 className="font-bold text-3xl leading-[1.1] sm:text-4xl md:text-5xl text-white">Key Capabilities</h2>
            <p className="max-w-[85%] leading-relaxed text-slate-400 sm:text-lg">
              Enterprise-grade infrastructure designed specifically for stringent healthcare compliance and performance requirements.
            </p>
          </motion.div>

          <motion.div 
            className="mx-auto grid justify-center gap-8 sm:grid-cols-2 md:max-w-[72rem] md:grid-cols-3"
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
          >
            {/* Card 1 */}
            <motion.div variants={itemVariants} className="group relative overflow-hidden rounded-3xl border border-white/10 bg-white/5 p-8 backdrop-blur-xl transition-all duration-300 hover:shadow-[0_0_50px_rgba(59,130,246,0.2)] hover:-translate-y-2 hover:bg-white/10">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
              <div className="relative z-10">
                <div className="mb-8 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500/20 to-blue-600/10 text-blue-400 transition-transform duration-500 group-hover:scale-110 group-hover:rotate-12 border border-blue-500/20">
                  <Shield className="h-7 w-7" />
                </div>
                <h3 className="font-bold text-2xl mb-4 text-white">Blockchain Security</h3>
                <p className="text-slate-400 leading-relaxed font-light">Immutable ledger technology ensures data integrity and full audit trails for patient records.</p>
              </div>
            </motion.div>

            {/* Card 2 */}
            <motion.div variants={itemVariants} className="group relative overflow-hidden rounded-3xl border border-white/10 bg-white/5 p-8 backdrop-blur-xl transition-all duration-300 hover:shadow-[0_0_50px_rgba(16,185,129,0.2)] hover:-translate-y-2 hover:bg-white/10">
              <div className="absolute inset-0 bg-gradient-to-br from-teal-500/10 to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
              <div className="relative z-10">
                <div className="mb-8 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-teal-500/20 to-teal-600/10 text-teal-400 transition-transform duration-500 group-hover:scale-110 group-hover:-rotate-12 border border-teal-500/20">
                  <Database className="h-7 w-7" />
                </div>
                <h3 className="font-bold text-2xl mb-4 text-white">Interoperable EHR</h3>
                <p className="text-slate-400 leading-relaxed font-light">Seamlessly connect and exchange structured clinical data across different healthcare networks.</p>
              </div>
            </motion.div>

            {/* Card 3 */}
            <motion.div variants={itemVariants} className="group relative overflow-hidden rounded-3xl border border-white/10 bg-white/5 p-8 backdrop-blur-xl transition-all duration-300 hover:shadow-[0_0_50px_rgba(139,92,246,0.2)] hover:-translate-y-2 hover:bg-white/10">
              <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/10 to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
              <div className="relative z-10">
                <div className="mb-8 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500/20 to-indigo-600/10 text-indigo-400 transition-transform duration-500 group-hover:scale-110 group-hover:rotate-12 border border-indigo-500/20">
                  <Lock className="h-7 w-7" />
                </div>
                <h3 className="font-bold text-2xl mb-4 text-white">Zero-Trust Access</h3>
                <p className="text-slate-400 leading-relaxed font-light">Strict role-based access controls and cryptographic authentication at every layer.</p>
              </div>
            </motion.div>
          </motion.div>
        </section>

        {/* CTA Section */}
        <section className="relative py-32 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-b from-transparent to-primary/10" />
          <motion.div 
            className="container relative z-10 max-w-4xl text-center"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={itemVariants}
          >
            <div className="rounded-3xl border border-white/10 bg-white/5 backdrop-blur-xl p-12 md:p-20 shadow-2xl">
              <h2 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-6 text-white">Ready to modernize your clinic?</h2>
              <p className="text-slate-300 mb-10 text-lg md:text-xl font-light">Join the network of trust and experience the future of healthcare infrastructure today.</p>
              <Button asChild size="lg" className="h-14 rounded-full px-10 bg-white text-slate-950 shadow-[0_0_30px_rgba(255,255,255,0.2)] hover:shadow-[0_0_50px_rgba(255,255,255,0.4)] transition-all hover:-translate-y-1 hover:scale-105 font-bold text-lg">
                <Link href="/register">Create an Account Now</Link>
              </Button>
            </div>
          </motion.div>
        </section>
      </main>

      <footer className="relative z-10 border-t border-white/10 py-10 bg-slate-950/80 backdrop-blur-xl">
        <div className="container flex flex-col items-center justify-between gap-6 md:flex-row">
          <div className="flex items-center gap-3 font-bold text-lg text-white">
            <Activity className="h-6 w-6 text-primary" />
            MedSync Systems
          </div>
          <p className="text-sm text-slate-500">
            &copy; {new Date().getFullYear()} MedSync Systems Inc. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}

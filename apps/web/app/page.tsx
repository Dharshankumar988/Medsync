"use client";

import Link from "next/link";
import { ArrowRight, Shield, Activity, Lock, Database } from "lucide-react";
import { Button } from "@/components/ui/button";
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
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.5,
        ease: "easeOut",
      },
    },
  };

  return (
    <div className="flex min-h-screen flex-col bg-background selection:bg-primary/20">
      <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/80 backdrop-blur-xl supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 max-w-screen-2xl items-center justify-between">
          <Link href="/" className="flex items-center gap-2 font-bold text-xl group">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary transition-all group-hover:scale-110">
              <Activity className="h-5 w-5" />
            </div>
            <span className="tracking-tight">MedSync</span>
          </Link>
          <nav className="flex items-center gap-4">
            <Link href="/login" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
              Sign In
            </Link>
            <Button asChild size="sm" className="rounded-full px-5 transition-transform hover:scale-105">
              <Link href="/register">Get Started</Link>
            </Button>
          </nav>
        </div>
      </header>

      <main className="flex-1 overflow-hidden">
        {/* Hero Section */}
        <section className="relative space-y-6 pb-12 pt-16 md:pb-24 md:pt-20 lg:py-32">
          {/* Background decorative blobs */}
          <div className="absolute top-0 left-1/2 -z-10 h-[600px] w-[600px] -translate-x-1/2 rounded-full bg-primary/5 blur-[100px]" />
          <div className="absolute top-1/4 right-0 -z-10 h-[400px] w-[400px] rounded-full bg-blue-500/5 blur-[100px]" />

          <motion.div 
            className="container flex max-w-[64rem] flex-col items-center gap-6 text-center"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          >
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2, duration: 0.5 }}
              className="inline-flex items-center rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-sm font-medium text-primary mb-2"
            >
              <Activity className="mr-2 h-4 w-4" />
              MedSync Platform 2.0 is live
            </motion.div>
            
            <h1 className="font-bold text-4xl sm:text-5xl md:text-6xl lg:text-7xl tracking-tight text-balance leading-tight">
              The Enterprise Standard for <br className="hidden sm:inline" />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-blue-600">
                Clinical Data Management
              </span>
            </h1>
            
            <p className="max-w-[42rem] leading-relaxed text-muted-foreground sm:text-xl sm:leading-8 text-balance">
              A highly secure, blockchain-verified healthcare platform integrating AI-driven insights and interoperable records for modern medical enterprises.
            </p>
            
            <motion.div 
              className="flex flex-col gap-4 sm:flex-row mt-8"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, duration: 0.5 }}
            >
              <Button asChild size="lg" className="h-12 px-8 rounded-full text-base group shadow-lg shadow-primary/25 transition-all hover:shadow-xl hover:shadow-primary/30">
                <Link href="/register">
                  Enter Platform
                  <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                </Link>
              </Button>
            </motion.div>
          </motion.div>
        </section>

        {/* Features Section */}
        <section id="features" className="relative container space-y-6 py-16 md:py-24 lg:py-32">
          <motion.div 
            className="mx-auto flex max-w-[58rem] flex-col items-center space-y-4 text-center mb-16"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            variants={itemVariants}
          >
            <h2 className="font-bold text-3xl leading-[1.1] sm:text-4xl md:text-5xl">Key Capabilities</h2>
            <p className="max-w-[85%] leading-relaxed text-muted-foreground sm:text-lg">
              Enterprise-grade infrastructure designed specifically for stringent healthcare compliance and performance requirements.
            </p>
          </motion.div>

          <motion.div 
            className="mx-auto grid justify-center gap-6 sm:grid-cols-2 md:max-w-[64rem] md:grid-cols-3"
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
          >
            {/* Card 1 */}
            <motion.div variants={itemVariants} className="group relative overflow-hidden rounded-2xl border border-border/50 bg-card p-8 transition-all hover:shadow-xl hover:-translate-y-1 hover:border-primary/20">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
              <div className="relative">
                <div className="mb-6 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary transition-transform group-hover:scale-110">
                  <Shield className="h-6 w-6" />
                </div>
                <h3 className="font-bold text-xl mb-3">Blockchain Security</h3>
                <p className="text-muted-foreground leading-relaxed">Immutable ledger technology ensures data integrity and full audit trails for patient records.</p>
              </div>
            </motion.div>

            {/* Card 2 */}
            <motion.div variants={itemVariants} className="group relative overflow-hidden rounded-2xl border border-border/50 bg-card p-8 transition-all hover:shadow-xl hover:-translate-y-1 hover:border-primary/20">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
              <div className="relative">
                <div className="mb-6 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-blue-500/10 text-blue-500 transition-transform group-hover:scale-110">
                  <Database className="h-6 w-6" />
                </div>
                <h3 className="font-bold text-xl mb-3">Interoperable EHR</h3>
                <p className="text-muted-foreground leading-relaxed">Seamlessly connect and exchange structured clinical data across different healthcare networks.</p>
              </div>
            </motion.div>

            {/* Card 3 */}
            <motion.div variants={itemVariants} className="group relative overflow-hidden rounded-2xl border border-border/50 bg-card p-8 transition-all hover:shadow-xl hover:-translate-y-1 hover:border-primary/20">
              <div className="absolute inset-0 bg-gradient-to-br from-teal-500/5 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
              <div className="relative">
                <div className="mb-6 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-teal-500/10 text-teal-500 transition-transform group-hover:scale-110">
                  <Lock className="h-6 w-6" />
                </div>
                <h3 className="font-bold text-xl mb-3">Zero-Trust Access</h3>
                <p className="text-muted-foreground leading-relaxed">Strict role-based access controls and cryptographic authentication at every layer.</p>
              </div>
            </motion.div>
          </motion.div>
        </section>

        {/* CTA Section */}
        <section className="border-t border-border/50 bg-muted/30 py-20">
          <motion.div 
            className="container max-w-4xl text-center"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={itemVariants}
          >
            <h2 className="text-3xl font-bold tracking-tight mb-4">Ready to modernize your clinic?</h2>
            <p className="text-muted-foreground mb-8 text-lg">Join the network of trust and experience the future of healthcare infrastructure today.</p>
            <Button asChild size="lg" className="rounded-full px-8 shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30 transition-all hover:-translate-y-0.5">
              <Link href="/register">Create an Account Now</Link>
            </Button>
          </motion.div>
        </section>
      </main>

      <footer className="border-t border-border/40 py-8 bg-background">
        <div className="container flex flex-col items-center justify-between gap-4 md:flex-row">
          <div className="flex items-center gap-2 font-semibold">
            <Activity className="h-5 w-5 text-primary" />
            MedSync Systems
          </div>
          <p className="text-sm text-muted-foreground">
            &copy; {new Date().getFullYear()} MedSync Systems Inc. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}

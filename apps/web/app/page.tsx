"use client";

import Link from "next/link";
import { ArrowRight, Shield, Activity, Lock, Database } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-14 max-w-screen-2xl items-center justify-between">
          <div className="flex items-center gap-2 font-bold text-lg">
            <Activity className="h-5 w-5 text-primary" />
            MedSync
          </div>
          <nav className="flex items-center gap-4">
            <Link href="/login" className="text-sm font-medium text-muted-foreground hover:text-foreground">
              Sign In
            </Link>
            <Button asChild size="sm">
              <Link href="/login">Get Started</Link>
            </Button>
          </nav>
        </div>
      </header>

      <main className="flex-1">
        <section className="space-y-6 pb-8 pt-6 md:pb-12 md:pt-10 lg:py-32">
          <div className="container flex max-w-[64rem] flex-col items-center gap-4 text-center">
            <h1 className="font-semibold text-3xl sm:text-5xl md:text-6xl lg:text-7xl">
              The Enterprise Standard for <br className="hidden sm:inline" />
              <span className="text-primary">Clinical Data Management</span>
            </h1>
            <p className="max-w-[42rem] leading-normal text-muted-foreground sm:text-xl sm:leading-8">
              A highly secure, blockchain-verified healthcare platform integrating AI-driven insights and interoperable records for modern medical enterprises.
            </p>
            <div className="flex flex-col gap-4 sm:flex-row mt-8">
              <Button asChild size="lg" className="px-8">
                <Link href="/login">
                  Enter Platform
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>
        </section>

        <section id="features" className="container space-y-6 bg-slate-50 py-8 dark:bg-transparent md:py-12 lg:py-24">
          <div className="mx-auto flex max-w-[58rem] flex-col items-center space-y-4 text-center">
            <h2 className="font-bold text-3xl leading-[1.1] sm:text-3xl md:text-6xl">Key Capabilities</h2>
            <p className="max-w-[85%] leading-normal text-muted-foreground sm:text-lg sm:leading-7">
              Enterprise-grade infrastructure designed specifically for stringent healthcare compliance and performance requirements.
            </p>
          </div>
          <div className="mx-auto grid justify-center gap-4 sm:grid-cols-2 md:max-w-[64rem] md:grid-cols-3 mt-8">
            <div className="relative overflow-hidden rounded-xl border bg-background p-6">
              <Shield className="mb-4 h-8 w-8 text-primary" />
              <h3 className="font-bold">Blockchain Security</h3>
              <p className="mt-2 text-sm text-muted-foreground">Immutable ledger technology ensures data integrity and full audit trails for patient records.</p>
            </div>
            <div className="relative overflow-hidden rounded-xl border bg-background p-6">
              <Database className="mb-4 h-8 w-8 text-primary" />
              <h3 className="font-bold">Interoperable EHR</h3>
              <p className="mt-2 text-sm text-muted-foreground">Seamlessly connect and exchange structured clinical data across different healthcare networks.</p>
            </div>
            <div className="relative overflow-hidden rounded-xl border bg-background p-6">
              <Lock className="mb-4 h-8 w-8 text-primary" />
              <h3 className="font-bold">Zero-Trust Access</h3>
              <p className="mt-2 text-sm text-muted-foreground">Strict role-based access controls and cryptographic authentication at every layer.</p>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t py-6 md:py-0">
        <div className="container flex flex-col items-center justify-between gap-4 md:h-16 md:flex-row">
          <p className="text-sm leading-loose text-muted-foreground md:text-left">
            &copy; 2026 MedSync Systems Inc. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}

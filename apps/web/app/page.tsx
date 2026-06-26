"use client";

import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import Link from "next/link";
import { Activity, Shield, Brain } from "lucide-react";

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-background text-foreground flex flex-col items-center pt-32 px-4">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        className="max-w-4xl text-center space-y-8"
      >
        <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight">
          The Decentralized <span className="text-primary">Healthcare</span> Ecosystem
        </h1>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
          MedSync unites patients, doctors, and pharmacies through zero-knowledge blockchain privacy and cutting-edge Artificial Intelligence.
        </p>
        <div className="flex justify-center gap-4 pt-8">
          <Button asChild size="lg" className="rounded-full">
            <Link href="/login">Portal Login</Link>
          </Button>
          <Button asChild variant="outline" size="lg" className="rounded-full">
            <Link href="/register">Join MedSync</Link>
          </Button>
        </div>
      </motion.div>

      <div className="grid md:grid-cols-3 gap-8 mt-32 max-w-6xl w-full">
        <FeatureCard 
          icon={<Shield className="w-8 h-8 text-primary" />}
          title="Blockchain Security"
          description="Your medical records are anchored to the Polygon network. Immutable, verifiable, and completely under your control."
        />
        <FeatureCard 
          icon={<Brain className="w-8 h-8 text-primary" />}
          title="AI Diagnostics"
          description="Doctor AI analyzes MRI and CT scans instantly using EfficientNet, providing accurate differential diagnoses."
        />
        <FeatureCard 
          icon={<Activity className="w-8 h-8 text-primary" />}
          title="Seamless Pharmacy"
          description="Prescriptions are pushed directly to verified pharmacies. Track your medicine delivery in real-time."
        />
      </div>
    </main>
  );
}

function FeatureCard({ icon, title, description }: { icon: React.ReactNode, title: string, description: string }) {
  return (
    <div className="p-8 rounded-3xl bg-card border shadow-sm hover:shadow-md transition-shadow">
      <div className="mb-4 bg-primary/10 w-16 h-16 rounded-2xl flex items-center justify-center">
        {icon}
      </div>
      <h3 className="text-2xl font-bold mb-2">{title}</h3>
      <p className="text-muted-foreground">{description}</p>
    </div>
  )
}

"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Mail, ArrowRight, Activity } from "lucide-react";
import { Button } from "@medsync/ui";
import { motion } from "framer-motion";
import { Suspense } from "react";

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.25, 0.1, 0.25, 1] } },
};

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const email = searchParams.get("email");

  return (
    <div className="flex w-full flex-col justify-center bg-background px-6 py-8 sm:px-12 items-center min-h-screen">
      <motion.div 
        initial="hidden"
        animate="visible"
        variants={fadeUp}
        className="w-full max-w-md bg-card/50 border border-border/60 rounded-3xl p-8 shadow-2xl shadow-blue-500/[0.02] text-center relative overflow-hidden"
      >
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-32 bg-blue-500/10 blur-[50px] pointer-events-none" />
        
        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-blue-500/10 text-blue-500 ring-1 ring-blue-500/20 relative z-10">
          <Mail className="h-10 w-10" />
        </div>
        
        <h1 className="text-2xl font-bold tracking-tight text-foreground mb-3 relative z-10">
          Check Your Email
        </h1>
        
        <p className="text-sm text-muted-foreground leading-relaxed mb-8 relative z-10">
          We&apos;ve sent a verification link to <br/>
          <strong className="text-foreground font-medium">{email || "your email address"}</strong>.<br/>
          Please click the link in the email to activate your account and complete the registration process.
        </p>

        <div className="space-y-4 relative z-10">
          <Button asChild className="w-full h-12 text-base font-medium rounded-xl shadow-lg shadow-blue-500/20">
            <Link href="/login">
              Continue to Login
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
          
          <p className="text-xs text-muted-foreground">
            Didn&apos;t receive the email? Check your spam folder.
          </p>
        </div>
      </motion.div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Activity className="h-8 w-8 text-blue-500 animate-spin" />
      </div>
    }>
      <VerifyEmailContent />
    </Suspense>
  );
}

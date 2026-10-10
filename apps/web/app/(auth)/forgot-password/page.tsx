"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Input, Alert, AlertDescription } from "@medsync/ui";
import { Activity, Shield, Loader2, ArrowRight, Mail, CheckCircle2, ArrowLeft, ExternalLink, ArrowUpRight } from "lucide-react";
import Link from "next/link";
import { motion } from "framer-motion";
import axios from "axios";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.15, ease: [0.25, 0.1, 0.25, 1] } },
};

const stagger = {
  visible: { transition: { staggerChildren: 0.04 } },
};

const forgotSchema = z.object({
  email: z.string().email({ message: "Please enter a valid email address" }),
});

type ForgotFormValues = z.infer<typeof forgotSchema>;

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [redirectingProvider, setRedirectingProvider] = useState<string | null>(null);
  const [submittedEmail, setSubmittedEmail] = useState("");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [devResetLink, setDevResetLink] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotFormValues>({
    resolver: zodResolver(forgotSchema),
    defaultValues: {
      email: "",
    },
  });

  const onSubmit = async (data: ForgotFormValues) => {
    setIsLoading(true);
    setError("");
    setRedirectingProvider(null);

    try {
      const response = await axios.post("/api/auth/forgot-password", {
        email: data.email,
      });

      // Role check: Doctor / Pharmacy redirects directly to provider reset page
      if (response.data?.action === "REDIRECT" && response.data?.redirectUrl) {
        setRedirectingProvider(response.data.role || "Healthcare Provider");
        setTimeout(() => {
          router.push(response.data.redirectUrl);
        }, 1200);
        return;
      }

      // Patient: Email sent
      setSubmittedEmail(data.email);
      setIsSuccess(true);
      if (response.data?.previewUrl) {
        setPreviewUrl(response.data.previewUrl);
      }
      if (response.data?.devResetLink) {
        setDevResetLink(response.data.devResetLink);
      }
    } catch (err: any) {
      setError(
        err.response?.data?.error || 
        err.response?.data?.detail || 
        err.message || 
        "Failed to process password reset request. Please check the email entered."
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen">
      {/* ─── Left Graphic Panel ─── */}
      <div className="hidden lg:flex w-1/2 bg-muted/30 dark:bg-muted/10 relative overflow-hidden items-center justify-center border-r border-border/60">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-blue-500/[0.03] rounded-full blur-[100px] pointer-events-none" />
        <div className="relative z-10 flex flex-col items-center text-center px-16 max-w-lg">
          <div className="relative h-64 w-64 mb-12" aria-hidden="true">
            <div className="absolute inset-0 flex items-center justify-center z-10 group cursor-default">
              <div className="relative h-28 w-28 rounded-3xl bg-background/80 dark:bg-[#0a0a0a]/90 backdrop-blur-xl border border-border/50 dark:border-white/[0.08] shadow-2xl flex items-center justify-center overflow-hidden transition-all duration-300 group-hover:border-blue-500/50 group-hover:shadow-blue-500/20">
                <div className="absolute inset-0 bg-blue-500/5 dark:bg-blue-500/10" />
                <div className="absolute -inset-4 bg-gradient-to-tr from-blue-500/10 to-transparent blur-xl opacity-50 group-hover:opacity-100 transition-opacity duration-500" />
                <Shield className="h-12 w-12 text-blue-500 relative z-10" strokeWidth={1.5} />
              </div>
            </div>
          </div>

          <h2 className="text-2xl font-bold tracking-tight text-foreground mb-3">
            MedSync Security Verification
          </h2>
          <p className="text-sm text-muted-foreground leading-relaxed max-w-sm">
            Patient accounts are protected with strict 5-minute cryptographic one-time links authorized via Python SMTP.
          </p>
        </div>
      </div>

      {/* ─── Right Form Panel ─── */}
      <div className="flex w-full lg:w-1/2 flex-col justify-center bg-background px-6 sm:px-12 lg:px-20 xl:px-28">
        <motion.div
          className="mx-auto w-full max-w-[420px]"
          initial="hidden"
          animate="visible"
          variants={stagger}
        >
          <motion.div variants={fadeUp}>
            <Link href="/" className="inline-flex items-center gap-2 mb-10 group" aria-label="MedSync Home">
              <Activity className="h-5 w-5 text-blue-500" />
              <span className="text-lg font-semibold tracking-tight text-foreground">MedSync</span>
            </Link>
          </motion.div>

          <motion.div variants={fadeUp} className="mb-8">
            <h1 className="text-3xl font-bold tracking-tight text-foreground mb-2">Forgot Password</h1>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Enter your registered email address. Patients will receive a secure 5-minute email reset link.
            </p>
          </motion.div>

          {redirectingProvider ? (
            <motion.div variants={fadeUp} className="space-y-6 py-4">
              <div className="p-6 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-center space-y-3">
                <div className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-blue-500/20 mx-auto text-blue-600">
                  <ArrowUpRight className="h-8 w-8 animate-pulse" />
                </div>
                <h3 className="text-xl font-bold text-foreground">{redirectingProvider} Detected</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Redirecting you directly to the Provider Reset Password page...
                </p>
                <div className="flex justify-center pt-2">
                  <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />
                </div>
              </div>
            </motion.div>
          ) : isSuccess ? (
            <motion.div variants={fadeUp} className="space-y-6 py-4">
              <div className="p-6 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-center space-y-3">
                <div className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/20 mx-auto text-emerald-600">
                  <CheckCircle2 className="h-8 w-8" />
                </div>
                <h3 className="text-xl font-bold text-foreground">Check Your Patient Email</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  A cryptographic reset link has been dispatched to:
                </p>
                <div className="font-mono text-sm font-semibold bg-background py-1.5 px-3 rounded-lg border border-border/60 inline-block text-primary">
                  {submittedEmail}
                </div>
                
                {/* 5-minute timeout notice */}
                <div className="mt-3 p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-xs text-amber-600 dark:text-amber-400 font-medium text-left">
                  ⚠️ <strong>5-Minute Security Window:</strong> This link is short-lived and will expire in strictly <strong>5 minutes</strong>. If clicked after 5 minutes, it will return a 404 error.
                </div>
              </div>

              {/* Dev mode / test link helper */}
              {(previewUrl || devResetLink) && (
                <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/20 space-y-2">
                  <p className="text-xs font-semibold text-blue-600 dark:text-blue-400 flex items-center gap-1.5">
                    <ExternalLink className="h-3.5 w-3.5" />
                    Development &amp; Direct Access Link:
                  </p>
                  {devResetLink && (
                    <Link
                      href={devResetLink}
                      className="block text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline break-all"
                    >
                      👉 Click here to open the Patient Reset Page (5-min window)
                    </Link>
                  )}
                  {previewUrl && (
                    <a
                      href={previewUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block text-xs text-muted-foreground hover:text-foreground underline pt-1"
                    >
                      View sent email in test mailbox ↗
                    </a>
                  )}
                </div>
              )}

              <div className="pt-2 text-center">
                <Link
                  href="/login"
                  className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Return to login
                </Link>
              </div>
            </motion.div>
          ) : (
            <form onSubmit={handleSubmit(onSubmit)}>
              <motion.div variants={stagger} className="space-y-5">
                {error && (
                  <motion.div variants={fadeUp}>
                    <Alert variant="destructive" className="py-3 bg-destructive/10 text-destructive border-destructive/20">
                      <AlertDescription className="text-sm font-medium">{error}</AlertDescription>
                    </Alert>
                  </motion.div>
                )}

                <motion.div variants={fadeUp} className="space-y-2">
                  <label htmlFor="email" className="text-sm font-medium text-foreground/80">
                    Account Email Address
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-3.5 h-4 w-4 text-muted-foreground/40" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="name@example.com"
                      disabled={isLoading}
                      autoComplete="email"
                      className={`h-12 pl-10 pr-4 bg-background border-input hover:border-muted-foreground/30 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500/40 transition-all duration-200 ${
                        errors.email ? "border-destructive/50 focus:border-destructive" : ""
                      }`}
                      {...register("email")}
                    />
                  </div>
                  {errors.email && (
                    <p className="text-xs text-destructive mt-1">{errors.email.message}</p>
                  )}
                </motion.div>

                <motion.div variants={fadeUp}>
                  <Button
                    type="submit"
                    className="w-full h-12 text-sm font-medium bg-blue-600 hover:bg-blue-500 text-white rounded-xl transition-all duration-200 group mt-2"
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Verifying Account...
                      </>
                    ) : (
                      <>
                        Continue
                        <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                      </>
                    )}
                  </Button>
                </motion.div>

                <motion.div variants={fadeUp} className="text-center mt-6">
                  <Link
                    href="/login"
                    className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    Back to login
                  </Link>
                </motion.div>
              </motion.div>
            </form>
          )}
        </motion.div>
      </div>
    </div>
  );
}

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { authService } from "@/services/auth.service";
import { Button } from "@medsync/ui";
import { Input } from "@medsync/ui";
import { Activity, Shield, Loader2, ArrowRight, LockKeyhole, Mail, Eye, EyeOff, CheckCircle2 } from "lucide-react";
import { Alert, AlertDescription } from "@medsync/ui";
import Link from "next/link";
import { motion } from "framer-motion";

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.25, 0.1, 0.25, 1] } },
};

const stagger = {
  visible: { transition: { staggerChildren: 0.06 } },
};

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      const response = await authService.login({ email, password });
      const userRole = response.data?.role;

      if (!response.data?.session) {
        setError("Check your email to verify your Supabase account before signing in.");
        return;
      }
      
      if (userRole === "patient") router.push("/patient/dashboard");
      else if (userRole === "doctor") router.push("/doctor/dashboard");
      else if (userRole === "admin") router.push("/admin/dashboard");
      else if (userRole === "pharmacy") router.push("/pharmacy/dashboard");
      else router.push("/");
    } catch (err: any) {
      const detail = err.response?.data?.detail;
      if (Array.isArray(detail)) {
        setError(detail[0]?.msg || "Validation error");
      } else if (typeof detail === "string") {
        setError(detail);
      } else {
        setError(err.response?.data?.message || "Invalid credentials");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen">

      {/* ─── Left Panel — Illustration ─── */}
      <div className="hidden lg:flex w-1/2 bg-muted/30 dark:bg-muted/10 relative overflow-hidden items-center justify-center border-r border-border/60">
        {/* Subtle radial glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-blue-500/[0.03] rounded-full blur-[100px] pointer-events-none" />

        <div className="relative z-10 flex flex-col items-center text-center px-16 max-w-lg">
          {/* Floating composition */}
          <div className="relative h-64 w-64 mb-12" aria-hidden="true">
            {/* Connecting lines */}
            <svg className="absolute inset-0 w-full h-full" viewBox="0 0 256 256" fill="none">
              <line x1="128" y1="128" x2="48" y2="20" className="stroke-border" strokeWidth="1" />
              <line x1="128" y1="128" x2="220" y2="40" className="stroke-border" strokeWidth="1" />
              <line x1="128" y1="128" x2="36" y2="200" className="stroke-border" strokeWidth="1" />
              <line x1="128" y1="128" x2="210" y2="220" className="stroke-border" strokeWidth="1" />
            </svg>

            <div className="absolute inset-0 flex items-center justify-center">
              <div className="h-28 w-28 rounded-3xl bg-card border border-border flex items-center justify-center shadow-2xl shadow-black/5 dark:shadow-black/30 animate-float-slow">
                <Shield className="h-12 w-12 text-blue-500" />
              </div>
            </div>
            <div className="absolute top-0 right-3 animate-float-slow-reverse">
              <div className="h-12 w-12 rounded-xl bg-card border border-border flex items-center justify-center shadow-lg shadow-black/5 dark:shadow-black/20">
                <LockKeyhole className="h-5 w-5 text-muted-foreground" />
              </div>
            </div>
            <div className="absolute bottom-4 left-0 animate-float-slow" style={{ animationDelay: "1.5s" }}>
              <div className="h-11 w-11 rounded-xl bg-card border border-border flex items-center justify-center shadow-lg shadow-black/5 dark:shadow-black/20">
                <Activity className="h-5 w-5 text-muted-foreground" />
              </div>
            </div>
            <div className="absolute bottom-8 right-0 animate-float-slow-reverse" style={{ animationDelay: "0.8s" }}>
              <div className="h-10 w-10 rounded-lg bg-card border border-border flex items-center justify-center shadow-lg shadow-black/5 dark:shadow-black/20">
                <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
              </div>
            </div>
          </div>

          <h2 className="text-2xl font-bold tracking-tight text-foreground mb-3">
            Secure Healthcare Infrastructure
          </h2>
          <p className="text-sm text-muted-foreground leading-relaxed max-w-sm">
            Your clinical data is protected by end-to-end encryption and blockchain-verified access controls.
          </p>

          <div className="mt-8 flex items-center gap-5 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5"><Shield className="h-3.5 w-3.5 text-blue-500" /> HIPAA Ready</span>
            <span className="flex items-center gap-1.5"><LockKeyhole className="h-3.5 w-3.5 text-blue-500" /> Encrypted</span>
          </div>
        </div>
      </div>

      {/* ─── Right Panel — Login Form ─── */}
      <div className="flex w-full lg:w-1/2 flex-col justify-center bg-background px-6 sm:px-12 lg:px-20 xl:px-28">
        <motion.div
          className="mx-auto w-full max-w-[400px]"
          initial="hidden"
          animate="visible"
          variants={stagger}
        >
          {/* Logo */}
          <motion.div variants={fadeUp}>
            <Link href="/" className="inline-flex items-center gap-2 mb-12 group" aria-label="MedSync Home">
              <Activity className="h-5 w-5 text-blue-500" />
              <span className="text-lg font-semibold tracking-tight text-foreground">MedSync</span>
            </Link>
          </motion.div>

          {/* Heading */}
          <motion.div variants={fadeUp} className="mb-8">
            <h1 className="text-3xl font-bold tracking-tight text-foreground mb-2">Welcome back</h1>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Sign in to access your dashboard and health records.
            </p>
          </motion.div>

          {/* Form */}
          <form onSubmit={handleLogin}>
            <motion.div variants={stagger} className="space-y-5">
              {/* Error */}
              {error && (
                <motion.div variants={fadeUp}>
                  <Alert variant="destructive" className="py-3 bg-destructive/10 text-destructive border-destructive/20">
                    <AlertDescription className="text-sm">{error}</AlertDescription>
                  </Alert>
                </motion.div>
              )}

              {/* Email */}
              <motion.div variants={fadeUp} className="space-y-2">
                <label htmlFor="email" className="text-sm font-medium text-foreground/80">
                  Email
                </label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-3.5 h-4 w-4 text-muted-foreground/40" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="name@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    disabled={isLoading}
                    autoComplete="email"
                    className="h-12 pl-10 pr-4 bg-background border-input hover:border-muted-foreground/30 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500/40 transition-all duration-200"
                  />
                </div>
              </motion.div>

              {/* Password */}
              <motion.div variants={fadeUp} className="space-y-2">
                <div className="flex items-center justify-between">
                  <label htmlFor="password" className="text-sm font-medium text-foreground/80">
                    Password
                  </label>
                  <Link href="/reset-password" className="text-xs font-medium text-blue-500 hover:text-blue-400 transition-colors">
                    Forgot password?
                  </Link>
                </div>
                <div className="relative">
                  <LockKeyhole className="absolute left-3.5 top-3.5 h-4 w-4 text-muted-foreground/40" />
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    disabled={isLoading}
                    autoComplete="current-password"
                    className="h-12 pl-10 pr-12 bg-background border-input hover:border-muted-foreground/30 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500/40 transition-all duration-200"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-3.5 text-muted-foreground/40 hover:text-muted-foreground transition-colors"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </motion.div>

              {/* Remember me */}
              <motion.div variants={fadeUp} className="flex items-center gap-2">
                <input
                  id="remember"
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="h-4 w-4 rounded border-input text-blue-500 focus:ring-blue-500/20 bg-background"
                />
                <label htmlFor="remember" className="text-sm text-muted-foreground cursor-pointer">
                  Remember me
                </label>
              </motion.div>

              {/* Submit */}
              <motion.div variants={fadeUp}>
                <Button
                  type="submit"
                  className="w-full h-12 text-sm font-medium bg-blue-600 hover:bg-blue-500 text-white rounded-xl transition-all duration-200 group"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      Sign In
                      <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                    </>
                  )}
                </Button>
              </motion.div>
            </motion.div>
          </form>

          {/* Secure indicator */}
          <motion.div variants={fadeUp} className="mt-6 flex items-center justify-center gap-1.5 text-xs text-muted-foreground/60">
            <Shield className="h-3 w-3" />
            <span>Secured with end-to-end encryption</span>
          </motion.div>

          {/* Sign up link */}
          <motion.p variants={fadeUp} className="mt-8 text-center text-sm text-muted-foreground">
            Don&apos;t have an account?{" "}
            <Link href="/register" className="font-medium text-blue-500 hover:text-blue-400 transition-colors">
              Create account
            </Link>
          </motion.p>
        </motion.div>
      </div>
    </div>
  );
}

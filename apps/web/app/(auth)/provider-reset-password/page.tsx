"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button, Input, Alert, AlertDescription } from "@medsync/ui";
import { Stethoscope, LockKeyhole, Eye, EyeOff, CheckCircle2, ArrowRight, ArrowLeft, Loader2, Mail, ShieldAlert } from "lucide-react";
import Link from "next/link";
import { motion } from "framer-motion";
import axios from "axios";

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.15, ease: [0.25, 0.1, 0.25, 1] } },
};

const stagger = {
  visible: { transition: { staggerChildren: 0.04 } },
};

function ProviderResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialEmail = searchParams.get("email") || "";

  const [email, setEmail] = useState(initialEmail);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const passwordsMatch = confirmPassword.length > 0 && password === confirmPassword;
  const passwordsMismatch = confirmPassword.length > 0 && password !== confirmPassword;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!email || !email.includes("@")) {
      setError("Please provide a valid provider email address.");
      return;
    }

    if (!password || password.length < 6) {
      setError("New password must be at least 6 characters long.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match. Please verify both fields.");
      return;
    }

    setIsLoading(true);

    try {
      const response = await axios.post("/api/auth/provider-reset-password", {
        email,
        password,
        confirmPassword,
      });

      setSuccess(response.data?.message || "Provider password updated successfully! Redirecting to login...");
      setTimeout(() => {
        router.push("/login?reset=success");
      }, 2000);
    } catch (err: any) {
      setError(
        err.response?.data?.error || 
        err.response?.data?.detail || 
        err.message || 
        "Failed to update provider password. Please check the email entered."
      );
    } finally {
      setIsLoading(false);
    }
  };

  if (success) {
    return (
      <motion.div
        initial="hidden"
        animate="visible"
        variants={fadeUp}
        className="w-full max-w-md bg-card p-8 rounded-2xl shadow-xl border border-border/50 text-center space-y-6"
      >
        <div className="w-16 h-16 bg-emerald-500/15 rounded-full flex items-center justify-center mx-auto text-emerald-500">
          <CheckCircle2 className="w-9 h-9" />
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl font-bold tracking-tight text-foreground">Password Reset Complete!</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Your provider account password has been updated. You can now log into your MedSync provider dashboard.
          </p>
        </div>
        <Link href="/login" className="block w-full pt-2">
          <Button className="w-full h-11 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl">
            Go to Login
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </Link>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={stagger}
      className="w-full max-w-md bg-card p-8 rounded-2xl shadow-xl border border-border/50"
    >
      <div className="flex flex-col items-center text-center mb-6">
        <div className="w-14 h-14 bg-indigo-500/10 rounded-2xl flex items-center justify-center mb-3 text-indigo-600 dark:text-indigo-400">
          <Stethoscope className="w-7 h-7" />
        </div>
        <h1 className="text-2xl font-bold tracking-tight">Provider Password Reset</h1>
        <p className="text-xs text-muted-foreground mt-1 max-w-xs">
          Direct reset portal for registered Doctors and Pharmacies. Always accessible for healthcare staff.
        </p>
      </div>

      {error && (
        <Alert variant="destructive" className="py-2.5 mb-5 bg-destructive/10 text-destructive border-destructive/20 text-xs">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Email Address */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Provider Email Address
          </label>
          <div className="relative">
            <Mail className="absolute left-3.5 top-3.5 h-4 w-4 text-muted-foreground/40" />
            <Input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="doctor@clinic.com"
              disabled={isLoading}
              className="h-11 pl-10 pr-4 bg-background"
            />
          </div>
        </div>

        {/* New Password */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            New Password
          </label>
          <div className="relative">
            <LockKeyhole className="absolute left-3.5 top-3.5 h-4 w-4 text-muted-foreground/40" />
            <Input
              type={showPassword ? "text" : "password"}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              disabled={isLoading}
              className="h-11 pl-10 pr-10 bg-background"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          <p className="text-[11px] text-muted-foreground">Minimum 6 characters.</p>
        </div>

        {/* Confirm Password */}
        <div className="space-y-1.5">
          <div className="flex justify-between items-center">
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Confirm New Password
            </label>
            {passwordsMatch && (
              <span className="text-xs font-medium text-emerald-500">✓ Passwords match</span>
            )}
            {passwordsMismatch && (
              <span className="text-xs font-medium text-destructive">✗ Does not match</span>
            )}
          </div>
          <div className="relative">
            <LockKeyhole className="absolute left-3.5 top-3.5 h-4 w-4 text-muted-foreground/40" />
            <Input
              type={showConfirmPassword ? "text" : "password"}
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="••••••••"
              disabled={isLoading}
              className={`h-11 pl-10 pr-10 bg-background ${
                passwordsMismatch ? "border-destructive focus-visible:ring-destructive" : ""
              }`}
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        <Button
          type="submit"
          className="w-full h-11 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-medium mt-2"
          disabled={isLoading || !passwordsMatch || password.length < 6}
        >
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Updating Provider Password...
            </>
          ) : (
            "Reset Provider Password"
          )}
        </Button>

        <div className="text-center pt-2">
          <Link href="/login" className="text-xs text-muted-foreground hover:text-foreground">
            Cancel and return to login
          </Link>
        </div>
      </form>
    </motion.div>
  );
}

export default function ProviderResetPasswordPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 dark:bg-muted/10 px-4">
      <Suspense fallback={<Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />}>
        <ProviderResetPasswordForm />
      </Suspense>
    </div>
  );
}

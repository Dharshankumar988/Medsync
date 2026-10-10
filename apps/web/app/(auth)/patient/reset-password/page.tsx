"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button, Input, Alert, AlertDescription } from "@medsync/ui";
import { ShieldCheck, ShieldAlert, Loader2, LockKeyhole, Eye, EyeOff, CheckCircle2, ArrowRight, ArrowLeft, Clock, FileX2 } from "lucide-react";
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

function PatientResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") || "";
  const emailParam = searchParams.get("email") || "";

  const [email, setEmail] = useState(emailParam);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  const [isVerifyingToken, setIsVerifyingToken] = useState(true);
  const [isExpiredOrNotFound, setIsExpiredOrNotFound] = useState(false);
  const [expiryErrorMessage, setExpiryErrorMessage] = useState("");
  const [remainingSeconds, setRemainingSeconds] = useState<number | null>(null);
  
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // 1. Verify token on page load (Strict 5-minute timeout check)
  useEffect(() => {
    if (!token) {
      setIsExpiredOrNotFound(true);
      setExpiryErrorMessage("404 - Password reset token was not provided or link is malformed.");
      setIsVerifyingToken(false);
      return;
    }

    let isMounted = true;

    async function checkToken() {
      try {
        const res = await axios.get(
          `/api/auth/reset-password?token=${encodeURIComponent(token)}&email=${encodeURIComponent(emailParam)}`
        );
        if (isMounted) {
          if (res.data?.email) {
            setEmail(res.data.email);
          }
          if (typeof res.data?.remaining_seconds === 'number') {
            setRemainingSeconds(res.data.remaining_seconds);
          }
          setIsVerifyingToken(false);
        }
      } catch (err: any) {
        if (isMounted) {
          setIsExpiredOrNotFound(true);
          const detail = err.response?.data?.error || err.response?.data?.detail;
          setExpiryErrorMessage(
            detail || "404 - Password reset link has expired after 5 minutes or does not exist."
          );
          setIsVerifyingToken(false);
        }
      }
    }

    checkToken();

    return () => {
      isMounted = false;
    };
  }, [token, emailParam]);

  // Countdown timer for remaining seconds if available
  useEffect(() => {
    if (remainingSeconds === null || remainingSeconds <= 0) return;

    const timer = setInterval(() => {
      setRemainingSeconds((prev) => {
        if (prev === null || prev <= 1) {
          clearInterval(timer);
          setIsExpiredOrNotFound(true);
          setExpiryErrorMessage("404 - Password reset link has timed out (5-minute window exceeded).");
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [remainingSeconds]);

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

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
      const response = await axios.post("/api/auth/reset-password", {
        token,
        email,
        password,
        confirmPassword,
      });

      setSuccess(response.data?.message || "Password updated successfully! Redirecting to login...");
      setTimeout(() => {
        router.push("/login?reset=success");
      }, 2000);
    } catch (err: any) {
      if (err.response?.status === 404 || err.response?.data?.error?.includes("expired")) {
        setIsExpiredOrNotFound(true);
        setExpiryErrorMessage(err.response?.data?.error || "404 - Password reset link has expired.");
      } else {
        setError(
          err.response?.data?.error || 
          err.response?.data?.detail || 
          err.message || 
          "Failed to update password. The link might have expired."
        );
      }
    } finally {
      setIsLoading(false);
    }
  };

  const passwordsMatch = confirmPassword.length > 0 && password === confirmPassword;
  const passwordsMismatch = confirmPassword.length > 0 && password !== confirmPassword;

  // State A: Verifying token
  if (isVerifyingToken) {
    return (
      <div className="flex flex-col items-center justify-center p-8 space-y-4">
        <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
        <p className="text-sm text-muted-foreground font-medium">Verifying 5-minute security token...</p>
      </div>
    );
  }

  // State B: 404 / Page Not Found / Expired Timeout View (After 5 minutes or invalid)
  if (isExpiredOrNotFound || !token) {
    return (
      <motion.div
        initial="hidden"
        animate="visible"
        variants={stagger}
        className="w-full max-w-md bg-card p-8 rounded-2xl shadow-xl border border-destructive/20 text-center space-y-6"
      >
        <div className="w-20 h-20 bg-destructive/10 rounded-full flex items-center justify-center mx-auto text-destructive">
          <FileX2 className="w-10 h-10" />
        </div>
        
        <div className="space-y-2">
          <div className="inline-block px-3 py-1 rounded-full text-xs font-mono font-bold uppercase tracking-wider bg-destructive/15 text-destructive">
            404 NOT FOUND • TIMEOUT
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-foreground">
            Password Reset Link Expired
          </h2>
          <p className="text-sm text-muted-foreground leading-relaxed pt-1">
            {expiryErrorMessage || "For patient security, password reset links expire strictly after 5 minutes. This link has expired, already been used, or does not exist."}
          </p>
        </div>

        <div className="p-4 bg-muted/40 rounded-xl border border-border/50 text-xs text-muted-foreground text-left space-y-1.5">
          <p className="font-semibold text-foreground flex items-center gap-1.5">
            <Clock className="w-4 h-4 text-amber-500" /> Why did this happen?
          </p>
          <p>• Patient reset links are limited to a strict 5-minute validity window.</p>
          <p>• Once clicked or after 5 minutes pass, the cryptographic token is permanently invalidated.</p>
        </div>

        <div className="pt-2 space-y-3">
          <Link href="/forgot-password" className="block w-full">
            <Button className="w-full h-11 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-medium">
              Request New Reset Link
            </Button>
          </Link>
          <Link href="/login" className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-3.5 w-3.5" />
            Return to login
          </Link>
        </div>
      </motion.div>
    );
  }

  // State C: Success
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
          <h2 className="text-2xl font-bold tracking-tight text-foreground">Patient Password Updated!</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Your MedSync Patient password has been securely reset. Redirecting to login...
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

  // State D: Valid token form with 2 password fields
  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={stagger}
      className="w-full max-w-md bg-card p-8 rounded-2xl shadow-xl border border-border/50"
    >
      <div className="flex flex-col items-center text-center mb-6">
        <div className="w-14 h-14 bg-blue-500/10 rounded-2xl flex items-center justify-center mb-3 text-blue-600 dark:text-blue-400">
          <ShieldCheck className="w-7 h-7" />
        </div>
        <h1 className="text-2xl font-bold tracking-tight">Patient Password Reset</h1>
        <p className="text-xs text-muted-foreground mt-1">
          Authorized Patient Session • Verified via Email
        </p>

        {remainingSeconds !== null && (
          <div className="mt-2.5 inline-flex items-center gap-1.5 px-3 py-1 bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 rounded-full text-xs font-mono font-medium">
            <Clock className="w-3.5 h-3.5" />
            Expires in: {Math.floor(remainingSeconds / 60)}:{(remainingSeconds % 60).toString().padStart(2, "0")}
          </div>
        )}

        {email && (
          <span className="text-xs font-mono font-medium text-primary bg-primary/10 px-2.5 py-1 rounded-full mt-2">
            {email}
          </span>
        )}
      </div>

      {error && (
        <Alert variant="destructive" className="py-2.5 mb-5 bg-destructive/10 text-destructive border-destructive/20 text-xs">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <form onSubmit={handleReset} className="space-y-4">
        {/* Field 1: New Password */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Enter New Password
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
              autoFocus
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

        {/* Field 2: Confirm New Password (user requirement: enter two times and match) */}
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
          className="w-full h-11 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-medium mt-2"
          disabled={isLoading || !passwordsMatch || password.length < 6}
        >
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Resetting Patient Password...
            </>
          ) : (
            "Reset Password"
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

export default function PatientResetPasswordPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 dark:bg-muted/10 px-4">
      <Suspense fallback={<Loader2 className="w-8 h-8 text-blue-500 animate-spin" />}>
        <PatientResetPasswordForm />
      </Suspense>
    </div>
  );
}

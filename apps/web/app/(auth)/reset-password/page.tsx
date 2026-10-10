"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button, Input, Alert, AlertDescription } from "@medsync/ui";
import { ShieldCheck, ShieldAlert, Loader2, LockKeyhole, Eye, EyeOff, CheckCircle2, ArrowRight, ArrowLeft } from "lucide-react";
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

function ResetPasswordForm() {
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
  const [tokenError, setTokenError] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // Verify the token when page loads
  useEffect(() => {
    if (!token) {
      setTokenError("Missing password reset token. Please request a new reset link from the forgot password page.");
      setIsVerifyingToken(false);
      return;
    }

    async function checkToken() {
      try {
        const res = await axios.get(`/api/auth/reset-password?token=${encodeURIComponent(token)}&email=${encodeURIComponent(emailParam)}`);
        if (res.data?.email) {
          setEmail(res.data.email);
        }
        setIsVerifyingToken(false);
      } catch (err: any) {
        setTokenError(
          err.response?.data?.error || 
          "The password reset link is invalid or has expired. Please request a new link."
        );
        setIsVerifyingToken(false);
      }
    }

    checkToken();
  }, [token, emailParam]);

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!password || password.length < 6) {
      setError("New password must be at least 6 characters long.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match. Please verify both inputs.");
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
      setError(
        err.response?.data?.error || 
        err.response?.data?.detail || 
        err.message || 
        "Failed to update password. The link might have expired."
      );
    } finally {
      setIsLoading(false);
    }
  };

  const passwordsMatch = confirmPassword.length > 0 && password === confirmPassword;
  const passwordsMismatch = confirmPassword.length > 0 && password !== confirmPassword;

  // 1. Loading State while checking token
  if (isVerifyingToken) {
    return (
      <div className="flex flex-col items-center justify-center p-8 space-y-4">
        <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
        <p className="text-sm text-muted-foreground">Verifying security token...</p>
      </div>
    );
  }

  // 2. Disconnected / Invalid Token State
  if (tokenError || !token) {
    return (
      <motion.div
        initial="hidden"
        animate="visible"
        variants={stagger}
        className="w-full max-w-md bg-card p-8 rounded-2xl shadow-xl border border-border/50 text-center space-y-6"
      >
        <div className="w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center mx-auto text-destructive">
          <ShieldAlert className="w-8 h-8" />
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl font-bold tracking-tight text-foreground">Access Restricted</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {tokenError || "Direct access to this page without a verified email link is disconnected for security."}
          </p>
        </div>
        <div className="pt-2 space-y-3">
          <Link href="/forgot-password" className="block w-full">
            <Button className="w-full h-11 bg-blue-600 hover:bg-blue-500 text-white rounded-xl">
              Request New Reset Link
            </Button>
          </Link>
          <Link href="/login" className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to login
          </Link>
        </div>
      </motion.div>
    );
  }

  // 3. Success State
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
            Your MedSync password has been updated. You will now be redirected to the login page.
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

  // 4. Form with New Password and Confirm New Password
  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={stagger}
      className="w-full max-w-md bg-card p-8 rounded-2xl shadow-xl border border-border/50"
    >
      <div className="flex flex-col items-center text-center mb-6">
        <div className="w-14 h-14 bg-blue-500/10 rounded-2xl flex items-center justify-center mb-3">
          <ShieldCheck className="w-7 h-7 text-blue-600" />
        </div>
        <h1 className="text-2xl font-bold tracking-tight">Set New Password</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Enter and confirm your new password below.
        </p>
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
        {/* New Password */}
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

        {/* Confirm New Password */}
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
              Updating Password...
            </>
          ) : (
            "Update Password"
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

export default function ResetPasswordPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 dark:bg-muted/10 px-4">
      <Suspense fallback={<Loader2 className="w-8 h-8 text-blue-500 animate-spin" />}>
        <ResetPasswordForm />
      </Suspense>
    </div>
  );
}

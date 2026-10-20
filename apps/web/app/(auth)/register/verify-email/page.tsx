"use client";

import { useState, useRef, useEffect, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Mail, ArrowRight, Activity, ShieldCheck, Loader2, RefreshCw, CheckCircle2, ArrowLeft, AlertCircle } from "lucide-react";
import { Button, Alert, AlertDescription } from "@medsync/ui";
import { motion, AnimatePresence } from "framer-motion";
import { authService } from "@/services/auth.service";

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3, ease: [0.25, 0.1, 0.25, 1] } },
};

function VerifyEmailContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const emailParam = searchParams.get("email") || "";

  const [email] = useState(emailParam);
  const [otpDigits, setOtpDigits] = useState<string[]>(["", "", "", "", "", ""]);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [countdown, setCountdown] = useState(60);
  const [canResend, setCanResend] = useState(false);
  const [devCode, setDevCode] = useState<string | null>(null);

  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Countdown timer for resend
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    } else {
      setCanResend(true);
    }
  }, [countdown]);

  // Focus the first input on load
  useEffect(() => {
    if (inputRefs.current[0]) {
      inputRefs.current[0].focus();
    }
  }, []);

  const handleDigitChange = (index: number, value: string) => {
    // Only accept numeric digits
    const cleaned = value.replace(/\D/g, "");
    if (!cleaned) {
      const newDigits = [...otpDigits];
      newDigits[index] = "";
      setOtpDigits(newDigits);
      return;
    }

    const digit = cleaned.slice(-1);
    const newDigits = [...otpDigits];
    newDigits[index] = digit;
    setOtpDigits(newDigits);
    setError("");

    // Jump to next input if not at the end
    if (index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    // Auto submit if all 6 digits filled
    const fullCode = newDigits.join("");
    if (fullCode.length === 6 && !newDigits.some((d) => d === "")) {
      executeVerification(fullCode);
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !otpDigits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    } else if (e.key === "ArrowLeft" && index > 0) {
      inputRefs.current[index - 1]?.focus();
    } else if (e.key === "ArrowRight" && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (!pasted) return;

    const newDigits = [...otpDigits];
    for (let i = 0; i < 6; i++) {
      newDigits[i] = pasted[i] || "";
    }
    setOtpDigits(newDigits);
    setError("");

    // Focus last filled digit
    const lastFilledIndex = Math.min(pasted.length, 5);
    inputRefs.current[lastFilledIndex]?.focus();

    if (pasted.length === 6) {
      executeVerification(pasted);
    }
  };

  const executeVerification = async (codeToVerify?: string) => {
    const code = codeToVerify || otpDigits.join("");
    if (code.length !== 6) {
      setError("Please enter the complete 6-digit verification code.");
      return;
    }

    if (!email) {
      setError("No email address provided. Please return to registration.");
      return;
    }

    setIsVerifying(true);
    setError("");

    try {
      await authService.verifyEmailOtp(email, code);
      setSuccess(true);
      // Wait 1.5s for green confirmation and redirect
      setTimeout(() => {
        router.push("/login?verified=true");
      }, 1500);
    } catch (err: any) {
      const detail = err.response?.data?.detail;
      if (typeof detail === "string" && detail.trim() && detail.trim() !== "{}" && detail.trim() !== "[object Object]") {
        setError(detail.trim());
      } else if (err.message && err.message !== "{}" && err.message !== "[object Object]") {
        setError(err.message);
      } else {
        setError("Invalid or expired verification code. Please try again.");
      }
    } finally {
      setIsVerifying(false);
    }
  };

  const handleResend = async () => {
    if (!canResend || isResending || !email) return;

    setIsResending(true);
    setError("");

    try {
      const res = await authService.sendVerificationOtp(email);
      setCountdown(60);
      setCanResend(false);
      setOtpDigits(["", "", "", "", "", ""]);
      inputRefs.current[0]?.focus();
      if (res?.data?.preview_code) {
        setDevCode(res.data.preview_code);
      }
    } catch (err: any) {
      const detail = err.response?.data?.detail;
      if (typeof detail === "string" && detail.trim() && detail.trim() !== "{}" && detail.trim() !== "[object Object]") {
        setError(detail.trim());
      } else if (err.message && err.message !== "{}" && err.message !== "[object Object]") {
        setError(err.message);
      } else {
        setError("Failed to resend code. Please try again later.");
      }
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className="flex w-full flex-col justify-center bg-background px-6 py-12 sm:px-12 items-center min-h-screen">
      <motion.div
        initial="hidden"
        animate="visible"
        variants={fadeUp}
        className="w-full max-w-md bg-card/60 backdrop-blur-xl border border-border/70 rounded-3xl p-8 shadow-2xl shadow-blue-500/[0.04] text-center relative overflow-hidden"
      >
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-36 bg-blue-500/10 blur-[60px] pointer-events-none" />

        <AnimatePresence mode="wait">
          {success ? (
            <motion.div
              key="success-card"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="py-8 space-y-4"
            >
              <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-500 ring-2 ring-emerald-500/20">
                <CheckCircle2 className="h-10 w-10" />
              </div>
              <h2 className="text-2xl font-bold tracking-tight text-foreground">
                Email Verified!
              </h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Your MedSync Patient account is now verified and fully active. Redirecting to login...
              </p>
              <div className="flex justify-center pt-2">
                <Loader2 className="h-5 w-5 text-blue-500 animate-spin" />
              </div>
            </motion.div>
          ) : (
            <motion.div key="otp-card" className="space-y-6">
              {/* Header Icon */}
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-500/10 text-blue-500 ring-1 ring-blue-500/20 relative z-10 shadow-lg shadow-blue-500/10">
                <Mail className="h-8 w-8" />
              </div>

              <div>
                <h1 className="text-2xl font-bold tracking-tight text-foreground mb-2">
                  Verify Your Email
                </h1>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  We sent a 6-digit verification code to
                </p>
                <p className="text-sm font-semibold text-foreground mt-0.5 break-all">
                  {email || "your registered email address"}
                </p>
              </div>

              {/* Dev mode OTP notice if live SMTP isn't configured */}
              {devCode && (
                <Alert className="py-2.5 bg-blue-500/10 border-blue-500/30 text-blue-600 dark:text-blue-400 text-xs">
                  <AlertDescription>
                    <strong>Dev Code:</strong> {devCode} (SMTP in preview mode)
                  </AlertDescription>
                </Alert>
              )}

              {/* Error message */}
              {error && (
                <Alert variant="destructive" className="py-2.5 bg-destructive/10 text-destructive border-destructive/20 text-xs text-left">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    <AlertDescription>{error}</AlertDescription>
                  </div>
                </Alert>
              )}

              {/* 6-Digit OTP Boxes */}
              <div className="flex justify-center gap-2 sm:gap-3 py-2">
                {otpDigits.map((digit, idx) => (
                  <input
                    key={idx}
                    ref={(el) => {
                      inputRefs.current[idx] = el;
                    }}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleDigitChange(idx, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(idx, e)}
                    onPaste={handlePaste}
                    disabled={isVerifying}
                    className={`w-12 h-14 sm:w-13 sm:h-16 text-center text-2xl font-bold rounded-xl border bg-background/90 text-foreground transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 ${
                      digit ? "border-blue-500/60 shadow-sm shadow-blue-500/20 bg-blue-500/[0.03]" : "border-input hover:border-muted-foreground/30"
                    }`}
                  />
                ))}
              </div>

              {/* Verify Button */}
              <div className="space-y-3 pt-2">
                <Button
                  onClick={() => executeVerification()}
                  disabled={isVerifying || otpDigits.some((d) => !d)}
                  className="w-full h-12 text-sm font-medium bg-blue-600 hover:bg-blue-500 text-white rounded-xl shadow-lg shadow-blue-500/20 transition-all duration-200"
                >
                  {isVerifying ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Activating Account...
                    </>
                  ) : (
                    <>
                      Verify & Activate Account
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </>
                  )}
                </Button>

                {/* Resend Link */}
                <div className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
                  <span>Didn&apos;t receive the code?</span>
                  {canResend ? (
                    <button
                      type="button"
                      onClick={handleResend}
                      disabled={isResending}
                      className="text-blue-500 hover:text-blue-400 font-medium inline-flex items-center gap-1 transition-colors"
                    >
                      {isResending ? (
                        <>
                          <Loader2 className="h-3 w-3 animate-spin" />
                          Sending...
                        </>
                      ) : (
                        <>
                          <RefreshCw className="h-3 w-3" />
                          Resend code
                        </>
                      )}
                    </button>
                  ) : (
                    <span className="text-muted-foreground font-medium">
                      Resend in {countdown}s
                    </span>
                  )}
                </div>
              </div>

              {/* Bottom links */}
              <div className="pt-4 border-t border-border/40 flex items-center justify-between text-xs text-muted-foreground">
                <Link
                  href="/register"
                  className="inline-flex items-center gap-1 hover:text-foreground transition-colors"
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                  Back to Register
                </Link>
                <Link
                  href="/login"
                  className="text-blue-500 hover:text-blue-400 font-medium transition-colors"
                >
                  Already verified? Log in
                </Link>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-background">
          <Activity className="h-8 w-8 text-blue-500 animate-spin" />
        </div>
      }
    >
      <VerifyEmailContent />
    </Suspense>
  );
}

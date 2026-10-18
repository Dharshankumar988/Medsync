"use client";

import { useState, useRef, useEffect, Suspense } from "react";
import { useRouter } from "next/navigation";
import { Button, Input, Alert, AlertDescription } from "@medsync/ui";
import {
  Activity,
  Shield,
  Loader2,
  ArrowRight,
  Mail,
  CheckCircle2,
  ArrowLeft,
  LockKeyhole,
  Eye,
  EyeOff,
  RefreshCw,
  AlertCircle,
  KeyRound
} from "lucide-react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import axios from "axios";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { authService } from "@/services/auth.service";

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.15, ease: [0.25, 0.1, 0.25, 1] } },
};

const stagger = {
  visible: { transition: { staggerChildren: 0.04 } },
};

const emailSchema = z.object({
  email: z.string().email({ message: "Please enter a valid email address" }),
});

type EmailFormValues = z.infer<typeof emailSchema>;

function ForgotPasswordContent() {
  const router = useRouter();

  // Step state: "EMAIL" | "OTP_AND_PASSWORD" | "SUCCESS"
  const [step, setStep] = useState<"EMAIL" | "OTP_AND_PASSWORD" | "SUCCESS">("EMAIL");
  const [submittedEmail, setSubmittedEmail] = useState("");
  const [redirectingProvider, setRedirectingProvider] = useState<string | null>(null);

  // Form errors and loading
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [devOtpPreview, setDevOtpPreview] = useState<string | null>(null);

  // Step 2 form states (OTP + New Password)
  const [otpDigits, setOtpDigits] = useState<string[]>(["", "", "", "", "", ""]);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [resendCountdown, setResendCountdown] = useState(60);
  const [canResend, setCanResend] = useState(false);
  const [isResending, setIsResending] = useState(false);

  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);

  const {
    register: registerEmail,
    handleSubmit: handleSubmitEmail,
    formState: { errors: emailErrors },
  } = useForm<EmailFormValues>({
    resolver: zodResolver(emailSchema),
    defaultValues: { email: "" },
  });

  // Countdown for OTP resend
  useEffect(() => {
    if (step !== "OTP_AND_PASSWORD") return;
    if (resendCountdown > 0) {
      const timer = setTimeout(() => setResendCountdown(resendCountdown - 1), 1000);
      return () => clearTimeout(timer);
    } else {
      setCanResend(true);
    }
  }, [resendCountdown, step]);

  const onEmailSubmit = async (data: EmailFormValues) => {
    setIsLoading(true);
    setError("");
    setRedirectingProvider(null);

    const cleanEmail = data.email.trim().toLowerCase();

    try {
      const response = await axios.post("/api/auth/forgot-password", {
        email: cleanEmail,
      });

      // Role check: Doctor / Pharmacy / Admin redirects directly to provider reset page
      if (response.data?.action === "REDIRECT" && response.data?.redirectUrl) {
        setRedirectingProvider(response.data.role || "Healthcare Staff");
        setTimeout(() => {
          router.push(response.data.redirectUrl);
        }, 1200);
        return;
      }

      // Patient: 6-digit OTP code dispatched via Brevo
      setSubmittedEmail(cleanEmail);
      if (response.data?.previewUrl) {
        setDevOtpPreview(response.data.previewUrl);
      }
      setStep("OTP_AND_PASSWORD");
      setResendCountdown(60);
      setCanResend(false);
      setTimeout(() => {
        otpRefs.current[0]?.focus();
      }, 100);
    } catch (err: any) {
      setError(
        err.response?.data?.error ||
        err.response?.data?.detail ||
        err.message ||
        "Failed to initiate password reset. Please check your email."
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleOtpChange = (index: number, val: string) => {
    const cleaned = val.replace(/\D/g, "");
    if (!cleaned) {
      const copy = [...otpDigits];
      copy[index] = "";
      setOtpDigits(copy);
      return;
    }

    const digit = cleaned.slice(-1);
    const copy = [...otpDigits];
    copy[index] = digit;
    setOtpDigits(copy);
    setError("");

    if (index < 5) {
      otpRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !otpDigits[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    } else if (e.key === "ArrowLeft" && index > 0) {
      otpRefs.current[index - 1]?.focus();
    } else if (e.key === "ArrowRight" && index < 5) {
      otpRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (!pasted) return;

    const copy = [...otpDigits];
    for (let i = 0; i < 6; i++) {
      copy[i] = pasted[i] || "";
    }
    setOtpDigits(copy);
    setError("");

    const lastIdx = Math.min(pasted.length, 5);
    otpRefs.current[lastIdx]?.focus();
  };

  const onResetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const otpCode = otpDigits.join("");
    if (otpCode.length !== 6) {
      setError("Please enter the complete 6-digit verification code sent to your email.");
      return;
    }

    if (newPassword.length < 6) {
      setError("Password must be at least 6 characters long.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match. Please re-enter.");
      return;
    }

    setIsLoading(true);

    try {
      await authService.verifyResetOtp({
        email: submittedEmail,
        otp_code: otpCode,
        new_password: newPassword,
        confirm_password: confirmPassword,
      });

      setStep("SUCCESS");
      setTimeout(() => {
        router.push("/login?reset=success");
      }, 2000);
    } catch (err: any) {
      const detail = err.response?.data?.detail || err.message || "Failed to reset password.";
      setError(detail);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (!canResend || isResending || !submittedEmail) return;

    setIsResending(true);
    setError("");

    try {
      const res = await authService.sendResetOtp(submittedEmail);
      setResendCountdown(60);
      setCanResend(false);
      setOtpDigits(["", "", "", "", "", ""]);
      otpRefs.current[0]?.focus();
      if (res?.data?.preview_code) {
        setDevOtpPreview(res.data.preview_code);
      }
    } catch (err: any) {
      setError(err.response?.data?.detail || "Failed to resend code.");
    } finally {
      setIsResending(false);
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
                <KeyRound className="h-12 w-12 text-blue-500 relative z-10" strokeWidth={1.5} />
              </div>
            </div>
          </div>

          <h2 className="text-2xl font-bold tracking-tight text-foreground mb-3">
            Secure Account Recovery
          </h2>
          <p className="text-sm text-muted-foreground leading-relaxed max-w-sm">
            Patient password reset protected by 6-digit Brevo email verification. Staff and providers enjoy instant direct reset.
          </p>

          <div className="mt-8 flex items-center gap-5 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5"><Shield className="h-3.5 w-3.5 text-blue-500" /> Brevo Secured</span>
            <span className="flex items-center gap-1.5"><LockKeyhole className="h-3.5 w-3.5 text-blue-500" /> 5-Min Expiry</span>
          </div>
        </div>
      </div>

      {/* ─── Right Form Panel ─── */}
      <div className="flex w-full lg:w-1/2 flex-col justify-center bg-background px-6 sm:px-12 lg:px-20 xl:px-28 py-10">
        <motion.div
          className="mx-auto w-full max-w-[420px]"
          initial="hidden"
          animate="visible"
          variants={stagger}
        >
          <motion.div variants={fadeUp}>
            <Link href="/login" className="inline-flex items-center gap-2 mb-10 group" aria-label="Back to login">
              <Activity className="h-5 w-5 text-blue-500" />
              <span className="text-lg font-semibold tracking-tight text-foreground">MedSync</span>
            </Link>
          </motion.div>

          <AnimatePresence mode="wait">
            {/* PROVIDER REDIRECT OVERLAY */}
            {redirectingProvider ? (
              <motion.div
                key="redirecting"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="p-8 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-center space-y-4"
              >
                <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-500/20 text-indigo-500 mx-auto">
                  <KeyRound className="h-7 w-7" />
                </div>
                <h3 className="text-xl font-bold text-foreground">
                  Direct Password Reset
                </h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {redirectingProvider} accounts do not require email OTP. Redirecting to direct reset portal...
                </p>
                <div className="flex justify-center pt-2">
                  <Loader2 className="h-5 w-5 text-indigo-500 animate-spin" />
                </div>
              </motion.div>
            ) : step === "SUCCESS" ? (
              /* SUCCESS STATE */
              <motion.div
                key="success"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="py-6 space-y-4 text-center"
              >
                <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-500 ring-2 ring-emerald-500/20">
                  <CheckCircle2 className="h-10 w-10" />
                </div>
                <h2 className="text-2xl font-bold tracking-tight text-foreground">
                  Password Reset Complete!
                </h2>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Your password has been successfully updated. Redirecting to sign in...
                </p>
                <div className="flex justify-center pt-2">
                  <Loader2 className="h-5 w-5 text-blue-500 animate-spin" />
                </div>
              </motion.div>
            ) : step === "OTP_AND_PASSWORD" ? (
              /* STEP 2: OTP + NEW PASSWORD FORM */
              <motion.div
                key="otp-and-password"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                className="space-y-6"
              >
                <div>
                  <h1 className="text-2xl font-bold tracking-tight text-foreground mb-1.5">
                    Enter Verification Code
                  </h1>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    We sent a 6-digit OTP code to <strong className="text-foreground">{submittedEmail}</strong>.
                  </p>
                </div>

                {devOtpPreview && (
                  <Alert className="py-2 bg-blue-500/10 border-blue-500/30 text-blue-600 dark:text-blue-400 text-xs">
                    <AlertDescription>
                      <strong>Dev OTP:</strong> {devOtpPreview} (Brevo preview mode)
                    </AlertDescription>
                  </Alert>
                )}

                {error && (
                  <Alert variant="destructive" className="py-2.5 bg-destructive/10 text-destructive border-destructive/20 text-xs text-left">
                    <div className="flex items-center gap-1.5">
                      <AlertCircle className="h-4 w-4 shrink-0" />
                      <AlertDescription>{error}</AlertDescription>
                    </div>
                  </Alert>
                )}

                <form onSubmit={onResetSubmit} className="space-y-4">
                  {/* 6-Digit OTP */}
                  <div className="space-y-2">
                    <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      6-Digit Security Code
                    </label>
                    <div className="flex justify-between gap-1.5 py-1">
                      {otpDigits.map((digit, idx) => (
                        <input
                          key={idx}
                          ref={(el) => {
                            otpRefs.current[idx] = el;
                          }}
                          type="text"
                          inputMode="numeric"
                          maxLength={1}
                          value={digit}
                          onChange={(e) => handleOtpChange(idx, e.target.value)}
                          onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                          onPaste={handleOtpPaste}
                          disabled={isLoading}
                          className={`w-11 h-13 sm:w-12 sm:h-14 text-center text-xl font-bold rounded-xl border bg-background text-foreground transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 ${
                            digit ? "border-blue-500/60 bg-blue-500/[0.04]" : "border-input"
                          }`}
                        />
                      ))}
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
                        placeholder="•••••••• (min 6 characters)"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        disabled={isLoading}
                        className="h-11 pl-10 pr-12 text-sm bg-background"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3.5 top-3 text-muted-foreground/40 hover:text-muted-foreground"
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Confirm Password */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Confirm New Password
                    </label>
                    <div className="relative">
                      <LockKeyhole className="absolute left-3.5 top-3.5 h-4 w-4 text-muted-foreground/40" />
                      <Input
                        type={showConfirmPassword ? "text" : "password"}
                        placeholder="••••••••"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        disabled={isLoading}
                        className="h-11 pl-10 pr-12 text-sm bg-background"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-3.5 top-3 text-muted-foreground/40 hover:text-muted-foreground"
                      >
                        {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  <Button
                    type="submit"
                    disabled={isLoading || otpDigits.some((d) => !d) || !newPassword || !confirmPassword}
                    className="w-full h-11 text-sm font-medium bg-blue-600 hover:bg-blue-500 text-white rounded-xl shadow-md transition-all mt-2"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Updating Password...
                      </>
                    ) : (
                      <>
                        Reset Password
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </>
                    )}
                  </Button>

                  <div className="flex items-center justify-between text-xs text-muted-foreground pt-2">
                    <button
                      type="button"
                      onClick={() => setStep("EMAIL")}
                      className="hover:text-foreground inline-flex items-center gap-1"
                    >
                      <ArrowLeft className="h-3 w-3" />
                      Change email
                    </button>

                    {canResend ? (
                      <button
                        type="button"
                        onClick={handleResendOtp}
                        disabled={isResending}
                        className="text-blue-500 hover:text-blue-400 font-medium inline-flex items-center gap-1"
                      >
                        {isResending ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
                        Resend OTP
                      </button>
                    ) : (
                      <span>Resend in {resendCountdown}s</span>
                    )}
                  </div>
                </form>
              </motion.div>
            ) : (
              /* STEP 1: ENTER EMAIL */
              <motion.div key="enter-email" variants={fadeUp}>
                <div className="mb-6">
                  <h1 className="text-3xl font-bold tracking-tight text-foreground mb-2">
                    Reset password
                  </h1>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Enter your account email. Patients will receive a 6-digit OTP; healthcare providers and admins will be redirected to direct reset.
                  </p>
                </div>

                {error && (
                  <Alert variant="destructive" className="py-2.5 mb-5 bg-destructive/10 text-destructive border-destructive/20 text-xs">
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                <form onSubmit={handleSubmitEmail(onEmailSubmit)} className="space-y-4">
                  <div className="space-y-1.5">
                    <label htmlFor="email" className="text-sm font-medium text-foreground/80">
                      Account Email
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-3.5 top-3.5 h-4 w-4 text-muted-foreground/40" />
                      <Input
                        id="email"
                        type="email"
                        placeholder="name@example.com"
                        disabled={isLoading}
                        autoComplete="email"
                        className={`h-12 pl-10 pr-4 bg-background border-input ${
                          emailErrors.email ? "border-destructive/50" : ""
                        }`}
                        {...registerEmail("email")}
                      />
                    </div>
                    {emailErrors.email && (
                      <p className="text-xs text-destructive mt-1">{emailErrors.email.message}</p>
                    )}
                  </div>

                  <Button
                    type="submit"
                    className="w-full h-12 text-sm font-medium bg-blue-600 hover:bg-blue-500 text-white rounded-xl shadow-md transition-all group mt-2"
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

                  <div className="text-center pt-4">
                    <Link
                      href="/login"
                      className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <ArrowLeft className="h-3.5 w-3.5" />
                      Back to sign in
                    </Link>
                  </div>
                </form>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </div>
  );
}

export default function ForgotPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-background">
          <Activity className="h-8 w-8 text-blue-500 animate-spin" />
        </div>
      }
    >
      <ForgotPasswordContent />
    </Suspense>
  );
}

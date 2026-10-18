"use client";

import { useState, useEffect, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { authService } from "@/services/auth.service";
import { Button, Input, Alert, AlertDescription } from "@medsync/ui";
import {
  Activity,
  Shield,
  Loader2,
  ArrowRight,
  LockKeyhole,
  Mail,
  Eye,
  EyeOff,
  CheckCircle2,
  Brain,
  Clock,
  ShieldAlert,
  ArrowLeft,
  RefreshCw,
  AlertCircle
} from "lucide-react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.15, ease: [0.25, 0.1, 0.25, 1] } },
};

const stagger = {
  visible: { transition: { staggerChildren: 0.03 } },
};

const loginSchema = z.object({
  email: z.string().email({ message: "Invalid email address" }),
  password: z.string().min(1, { message: "Password is required" }),
  rememberMe: z.boolean().optional(),
});

type LoginFormValues = z.infer<typeof loginSchema>;

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const isVerifiedParam = searchParams.get("verified") === "true";
  const isPendingApprovalParam = searchParams.get("pending_approval") === "true";
  const pendingRoleParam = searchParams.get("role") || "Healthcare Provider";

  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Inline OTP verification states
  const [showInlineOtp, setShowInlineOtp] = useState(false);
  const [unverifiedEmail, setUnverifiedEmail] = useState("");
  const [savedPassword, setSavedPassword] = useState("");
  const [otpDigits, setOtpDigits] = useState<string[]>(["", "", "", "", "", ""]);
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
  const [otpError, setOtpError] = useState("");
  const [otpResending, setOtpResending] = useState(false);
  const [resendCountdown, setResendCountdown] = useState(60);
  const [canResendOtp, setCanResendOtp] = useState(false);
  const [devOtpPreview, setDevOtpPreview] = useState<string | null>(null);

  // Pending admin approval notice state
  const [showPendingApproval, setShowPendingApproval] = useState(isPendingApprovalParam);

  const otpInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
      rememberMe: false,
    },
  });

  // Countdown timer for inline OTP resend
  useEffect(() => {
    if (!showInlineOtp) return;
    if (resendCountdown > 0) {
      const timer = setTimeout(() => setResendCountdown(resendCountdown - 1), 1000);
      return () => clearTimeout(timer);
    } else {
      setCanResendOtp(true);
    }
  }, [resendCountdown, showInlineOtp]);

  // Focus first OTP box when opened
  useEffect(() => {
    if (showInlineOtp) {
      setTimeout(() => {
        otpInputRefs.current[0]?.focus();
      }, 100);
    }
  }, [showInlineOtp]);

  const onSubmit = async (data: LoginFormValues) => {
    setIsLoading(true);
    setError("");
    setShowPendingApproval(false);
    setShowInlineOtp(false);

    try {
      const response = await authService.login({ email: data.email, password: data.password });
      const userRole = response.data?.role;

      if (!response.data?.session) {
        setError("Check your email to verify your Supabase account before signing in.");
        setIsLoading(false);
        return;
      }

      if (userRole === "patient") router.push("/patient/dashboard");
      else if (userRole === "doctor") router.push("/doctor/dashboard");
      else if (userRole === "admin") router.push("/admin/dashboard");
      else if (userRole === "pharmacy") router.push("/pharmacy/dashboard");
      else router.push("/");
    } catch (err: any) {
      const errCode = err.code;
      const detail = err.response?.data?.detail || err.message || "";

      if (errCode === "EMAIL_NOT_VERIFIED" || detail.includes("EMAIL_NOT_VERIFIED")) {
        // Patient is unverified -> Offer inline OTP verification box
        setUnverifiedEmail(data.email);
        setSavedPassword(data.password);
        setShowInlineOtp(true);
        setResendCountdown(60);
        setCanResendOtp(false);
        setOtpDigits(["", "", "", "", "", ""]);
        setOtpError("");

        // Auto trigger sending of verification OTP
        try {
          const res = await authService.sendVerificationOtp(data.email);
          if (res?.data?.preview_code) {
            setDevOtpPreview(res.data.preview_code);
          }
        } catch {
          // ignore error if already dispatched
        }
      } else if (errCode === "PENDING_ADMIN_APPROVAL" || detail.includes("PENDING_ADMIN_APPROVAL")) {
        // Doctor or Pharmacy is awaiting admin review
        setShowPendingApproval(true);
      } else if (errCode === "ACCOUNT_SUSPENDED" || detail.includes("ACCOUNT_SUSPENDED")) {
        setError("Your account has been suspended. Please contact system administrators.");
      } else {
        const resDetail = err.response?.data?.detail;
        if (Array.isArray(resDetail)) {
          setError(resDetail[0]?.msg || "Validation error");
        } else if (typeof resDetail === "string") {
          setError(resDetail);
        } else {
          setError(err.response?.data?.message || err.message || "Invalid email or password.");
        }
      }
      setIsLoading(false);
    }
  };

  const handleInlineOtpChange = (index: number, val: string) => {
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
    setOtpError("");

    if (index < 5) {
      otpInputRefs.current[index + 1]?.focus();
    }

    const fullCode = copy.join("");
    if (fullCode.length === 6 && !copy.some((d) => d === "")) {
      executeInlineOtpVerification(fullCode);
    }
  };

  const handleInlineOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !otpDigits[index] && index > 0) {
      otpInputRefs.current[index - 1]?.focus();
    } else if (e.key === "ArrowLeft" && index > 0) {
      otpInputRefs.current[index - 1]?.focus();
    } else if (e.key === "ArrowRight" && index < 5) {
      otpInputRefs.current[index + 1]?.focus();
    }
  };

  const handleInlineOtpPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (!pasted) return;

    const copy = [...otpDigits];
    for (let i = 0; i < 6; i++) {
      copy[i] = pasted[i] || "";
    }
    setOtpDigits(copy);
    setOtpError("");

    const lastIdx = Math.min(pasted.length, 5);
    otpInputRefs.current[lastIdx]?.focus();

    if (pasted.length === 6) {
      executeInlineOtpVerification(pasted);
    }
  };

  const executeInlineOtpVerification = async (codeToVerify?: string) => {
    const code = codeToVerify || otpDigits.join("");
    if (code.length !== 6) {
      setOtpError("Please enter all 6 digits of the verification code.");
      return;
    }

    setIsVerifyingOtp(true);
    setOtpError("");

    try {
      // 1. Verify OTP with backend
      await authService.verifyEmailOtp(unverifiedEmail, code);

      // 2. Immediately complete login with saved credentials
      const loginRes = await authService.login({
        email: unverifiedEmail,
        password: savedPassword,
      });

      const userRole = loginRes.data?.role;
      if (userRole === "patient") router.push("/patient/dashboard");
      else router.push("/");
    } catch (err: any) {
      const detail = err.response?.data?.detail || err.message || "Invalid or expired code.";
      setOtpError(detail);
      setIsVerifyingOtp(false);
    }
  };

  const handleResendInlineOtp = async () => {
    if (!canResendOtp || otpResending) return;
    setOtpResending(true);
    setOtpError("");

    try {
      const res = await authService.sendVerificationOtp(unverifiedEmail);
      setResendCountdown(60);
      setCanResendOtp(false);
      setOtpDigits(["", "", "", "", "", ""]);
      otpInputRefs.current[0]?.focus();
      if (res?.data?.preview_code) {
        setDevOtpPreview(res.data.preview_code);
      }
    } catch (err: any) {
      setOtpError(err.response?.data?.detail || "Failed to resend code.");
    } finally {
      setOtpResending(false);
    }
  };

  return (
    <div className="flex min-h-screen">
      {/* ─── Left Panel — Illustration ─── */}
      <div className="hidden lg:flex w-1/2 bg-muted/30 dark:bg-muted/10 relative overflow-hidden items-center justify-center border-r border-border/60">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-blue-500/[0.03] rounded-full blur-[100px] pointer-events-none" />
        <div className="relative z-10 flex flex-col items-center text-center px-16 max-w-lg">
          <div className="relative h-64 w-64 mb-12" aria-hidden="true">
            <div className="absolute inset-0 flex items-center justify-center z-10 group cursor-default">
              <div className="relative h-28 w-28 rounded-3xl bg-background/80 dark:bg-[#0a0a0a]/90 backdrop-blur-xl border border-border/50 dark:border-white/[0.08] shadow-2xl flex items-center justify-center overflow-hidden animate-float-slow transition-all duration-300 group-hover:border-blue-500/50 group-hover:shadow-blue-500/20">
                <div className="absolute inset-0 bg-blue-500/5 dark:bg-blue-500/10" />
                <div className="absolute -inset-4 bg-gradient-to-tr from-blue-500/10 to-transparent blur-xl opacity-50 group-hover:opacity-100 transition-opacity duration-500" />
                <Shield className="h-12 w-12 text-blue-500 relative z-10" strokeWidth={1.5} />
              </div>
            </div>

            <div className="absolute top-2 left-2 animate-float-slow group cursor-default z-10" style={{ animationDelay: "0.5s" }}>
              <div className="h-10 w-10 rounded-[12px] bg-background/80 dark:bg-[#0a0a0a]/90 backdrop-blur-md border border-border/50 dark:border-white/[0.08] flex items-center justify-center shadow-lg transition-all duration-300 group-hover:border-blue-500/50 group-hover:shadow-blue-500/20">
                <Brain className="h-4 w-4 text-muted-foreground group-hover:text-blue-500 transition-colors" strokeWidth={1.5} />
              </div>
            </div>
            <div className="absolute top-0 right-3 animate-float-slow-reverse group cursor-default z-10">
              <div className="h-12 w-12 rounded-[14px] bg-background/80 dark:bg-[#0a0a0a]/90 backdrop-blur-md border border-border/50 dark:border-white/[0.08] flex items-center justify-center shadow-lg transition-all duration-300 group-hover:border-blue-500/50 group-hover:shadow-blue-500/20">
                <LockKeyhole className="h-5 w-5 text-muted-foreground group-hover:text-blue-500 transition-colors" strokeWidth={1.5} />
              </div>
            </div>
            <div className="absolute bottom-4 left-0 animate-float-slow group cursor-default z-10" style={{ animationDelay: "1.5s" }}>
              <div className="h-11 w-11 rounded-[14px] bg-background/80 dark:bg-[#0a0a0a]/90 backdrop-blur-md border border-border/50 dark:border-white/[0.08] flex items-center justify-center shadow-lg transition-all duration-300 group-hover:border-blue-500/50 group-hover:shadow-blue-500/20">
                <Activity className="h-5 w-5 text-muted-foreground group-hover:text-blue-500 transition-colors" strokeWidth={1.5} />
              </div>
            </div>
            <div className="absolute bottom-8 right-0 animate-float-slow-reverse group cursor-default z-10" style={{ animationDelay: "0.8s" }}>
              <div className="h-10 w-10 rounded-[12px] bg-background/80 dark:bg-[#0a0a0a]/90 backdrop-blur-md border border-border/50 dark:border-white/[0.08] flex items-center justify-center shadow-lg transition-all duration-300 group-hover:border-blue-500/50 group-hover:shadow-blue-500/20">
                <CheckCircle2 className="h-4 w-4 text-muted-foreground group-hover:text-blue-500 transition-colors" strokeWidth={1.5} />
              </div>
            </div>
          </div>

          <h2 className="text-2xl font-bold tracking-tight text-foreground mb-3">
            Secure Healthcare Infrastructure
          </h2>
          <p className="text-sm text-muted-foreground leading-relaxed max-w-sm">
            Clinical records and patient access guarded by automated Brevo email verification and administrator authorization.
          </p>

          <div className="mt-8 flex items-center gap-5 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5"><Shield className="h-3.5 w-3.5 text-blue-500" /> HIPAA Ready</span>
            <span className="flex items-center gap-1.5"><LockKeyhole className="h-3.5 w-3.5 text-blue-500" /> Encrypted</span>
          </div>
        </div>
      </div>

      {/* ─── Right Panel — Forms & Guards ─── */}
      <div className="flex w-full lg:w-1/2 flex-col justify-center bg-background px-6 sm:px-12 lg:px-20 xl:px-28 py-10">
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

          <AnimatePresence mode="wait">
            {/* 1. INLINE OTP VERIFICATION BOX (for unverified patients) */}
            {showInlineOtp ? (
              <motion.div
                key="inline-otp"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                className="space-y-6 bg-card/70 border border-blue-500/30 rounded-2xl p-6 shadow-xl shadow-blue-500/[0.04] relative overflow-hidden"
              >
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 to-indigo-500" />

                <div className="text-center space-y-1.5">
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-blue-500/10 text-blue-500 mb-2">
                    <Mail className="h-6 w-6" />
                  </div>
                  <h2 className="text-xl font-bold tracking-tight text-foreground">
                    Verify Email to Continue
                  </h2>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Your account is registered but unverified. We dispatched a 6-digit OTP code to:
                  </p>
                  <p className="text-xs font-semibold text-foreground break-all">
                    {unverifiedEmail}
                  </p>
                </div>

                {devOtpPreview && (
                  <Alert className="py-2 bg-blue-500/10 border-blue-500/30 text-blue-600 dark:text-blue-400 text-xs">
                    <AlertDescription>
                      <strong>Dev OTP:</strong> {devOtpPreview} (Brevo preview mode)
                    </AlertDescription>
                  </Alert>
                )}

                {otpError && (
                  <Alert variant="destructive" className="py-2.5 bg-destructive/10 text-destructive border-destructive/20 text-xs text-left">
                    <div className="flex items-center gap-1.5">
                      <AlertCircle className="h-4 w-4 shrink-0" />
                      <AlertDescription>{otpError}</AlertDescription>
                    </div>
                  </Alert>
                )}

                {/* 6 Digit Input Boxes */}
                <div className="flex justify-center gap-2 py-1">
                  {otpDigits.map((digit, idx) => (
                    <input
                      key={idx}
                      ref={(el) => {
                        otpInputRefs.current[idx] = el;
                      }}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      value={digit}
                      onChange={(e) => handleInlineOtpChange(idx, e.target.value)}
                      onKeyDown={(e) => handleInlineOtpKeyDown(idx, e)}
                      onPaste={handleInlineOtpPaste}
                      disabled={isVerifyingOtp}
                      className={`w-11 h-13 text-center text-xl font-bold rounded-lg border bg-background text-foreground transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 ${
                        digit ? "border-blue-500/60 bg-blue-500/[0.04]" : "border-input"
                      }`}
                    />
                  ))}
                </div>

                <div className="space-y-3">
                  <Button
                    type="button"
                    onClick={() => executeInlineOtpVerification()}
                    disabled={isVerifyingOtp || otpDigits.some((d) => !d)}
                    className="w-full h-11 text-sm font-medium bg-blue-600 hover:bg-blue-500 text-white rounded-xl shadow-md transition-all"
                  >
                    {isVerifyingOtp ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Verifying & Signing In...
                      </>
                    ) : (
                      <>
                        Verify & Sign In
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </>
                    )}
                  </Button>

                  <div className="flex items-center justify-between text-xs text-muted-foreground pt-1">
                    <button
                      type="button"
                      onClick={() => setShowInlineOtp(false)}
                      className="hover:text-foreground inline-flex items-center gap-1 transition-colors"
                    >
                      <ArrowLeft className="h-3 w-3" />
                      Back to sign in
                    </button>

                    {canResendOtp ? (
                      <button
                        type="button"
                        onClick={handleResendInlineOtp}
                        disabled={otpResending}
                        className="text-blue-500 hover:text-blue-400 font-medium inline-flex items-center gap-1"
                      >
                        {otpResending ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
                        Resend OTP
                      </button>
                    ) : (
                      <span>Resend in {resendCountdown}s</span>
                    )}
                  </div>
                </div>
              </motion.div>
            ) : showPendingApproval ? (
              /* 2. PENDING ADMINISTRATOR APPROVAL NOTICE (for doctors & pharmacies) */
              <motion.div
                key="pending-approval"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                className="space-y-6 bg-card/70 border border-amber-500/30 rounded-2xl p-6 shadow-xl shadow-amber-500/[0.04] relative overflow-hidden"
              >
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-amber-500 to-orange-500" />

                <div className="text-center space-y-2">
                  <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-500 mb-2 ring-1 ring-amber-500/20">
                    <Clock className="h-7 w-7" />
                  </div>
                  <h2 className="text-xl font-bold tracking-tight text-foreground">
                    Awaiting Administrator Verification
                  </h2>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Your {pendingRoleParam} credentials have been submitted and are currently awaiting review by a MedSync system administrator.
                  </p>
                </div>

                <div className="p-3.5 rounded-xl bg-amber-500/[0.06] border border-amber-500/20 text-xs text-amber-700 dark:text-amber-300 space-y-1">
                  <div className="font-semibold flex items-center gap-1.5">
                    <ShieldAlert className="h-4 w-4 shrink-0" />
                    Authorization Required
                  </div>
                  <p className="text-[11px] leading-relaxed text-amber-600/90 dark:text-amber-300/80">
                    To maintain clinical standards and patient safety, all healthcare provider and pharmacy accounts require identity and license validation prior to dashboard access.
                  </p>
                </div>

                <div className="space-y-2 pt-2">
                  <Button
                    type="button"
                    onClick={() => setShowPendingApproval(false)}
                    variant="outline"
                    className="w-full h-11 text-xs font-medium rounded-xl border-border/80"
                  >
                    Return to Sign In Form
                  </Button>
                </div>
              </motion.div>
            ) : (
              /* 3. STANDARD LOGIN FORM */
              <motion.div key="standard-login" variants={fadeUp}>
                <div className="mb-6">
                  <h1 className="text-3xl font-bold tracking-tight text-foreground mb-2">Welcome back</h1>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Sign in to access your dashboard and health records.
                  </p>
                </div>

                {isVerifiedParam && (
                  <motion.div variants={fadeUp} className="mb-4">
                    <Alert className="py-2.5 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 text-xs">
                      <div className="flex items-center gap-1.5">
                        <CheckCircle2 className="h-4 w-4 shrink-0" />
                        <AlertDescription>
                          Email verified successfully! You may now sign in.
                        </AlertDescription>
                      </div>
                    </Alert>
                  </motion.div>
                )}

                <form onSubmit={handleSubmit(onSubmit)}>
                  <motion.div variants={stagger} className="space-y-5">
                    {error && (
                      <motion.div variants={fadeUp}>
                        <Alert variant="destructive" className="py-3 bg-destructive/10 text-destructive border-destructive/20 text-xs">
                          <AlertDescription>{error}</AlertDescription>
                        </Alert>
                      </motion.div>
                    )}

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

                    <motion.div variants={fadeUp} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <label htmlFor="password" className="text-sm font-medium text-foreground/80">
                          Password
                        </label>
                        <Link href="/forgot-password" className="text-xs font-medium text-blue-500 hover:text-blue-400 transition-colors">
                          Forgot password?
                        </Link>
                      </div>
                      <div className="relative">
                        <LockKeyhole className="absolute left-3.5 top-3.5 h-4 w-4 text-muted-foreground/40" />
                        <Input
                          id="password"
                          type={showPassword ? "text" : "password"}
                          placeholder="••••••••"
                          disabled={isLoading}
                          autoComplete="current-password"
                          className={`h-12 pl-10 pr-12 bg-background border-input hover:border-muted-foreground/30 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500/40 transition-all duration-200 ${
                            errors.password ? "border-destructive/50 focus:border-destructive" : ""
                          }`}
                          {...register("password")}
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
                      {errors.password && (
                        <p className="text-xs text-destructive mt-1">{errors.password.message}</p>
                      )}
                    </motion.div>

                    <motion.div variants={fadeUp} className="flex items-center gap-2">
                      <input
                        id="remember"
                        type="checkbox"
                        className="h-4 w-4 rounded border-input text-blue-500 focus:ring-blue-500/20 bg-background"
                        {...register("rememberMe")}
                      />
                      <label htmlFor="remember" className="text-sm text-muted-foreground cursor-pointer">
                        Remember me
                      </label>
                    </motion.div>

                    <motion.div variants={fadeUp}>
                      <Button
                        type="submit"
                        className="w-full h-12 text-sm font-medium bg-blue-600 hover:bg-blue-500 text-white rounded-xl transition-all duration-200 group"
                        disabled={isLoading}
                      >
                        {isLoading ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Checking credentials...
                          </>
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
                  <span>Protected by multi-tier verification guards</span>
                </motion.div>

                {/* Sign up link */}
                <motion.p variants={fadeUp} className="mt-8 text-center text-sm text-muted-foreground">
                  Don&apos;t have an account?{" "}
                  <Link href="/register" className="font-medium text-blue-500 hover:text-blue-400 transition-colors">
                    Create account
                  </Link>
                </motion.p>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-background">
          <Activity className="h-8 w-8 text-blue-500 animate-spin" />
        </div>
      }
    >
      <LoginContent />
    </Suspense>
  );
}

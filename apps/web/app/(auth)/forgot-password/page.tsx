"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@medsync/ui";
import { Input } from "@medsync/ui";
import { Activity, Shield, Loader2, ArrowRight, LockKeyhole, Mail, CheckCircle2 } from "lucide-react";
import { Alert, AlertDescription } from "@medsync/ui";
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
  visible: { transition: { staggerChildren: 0.03 } },
};

const resetSchema = z.object({
  email: z.string().email({ message: "Invalid email address" }),
  password: z.string().min(6, { message: "Password must be at least 6 characters" }),
});

type ResetFormValues = z.infer<typeof resetSchema>;

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ResetFormValues>({
    resolver: zodResolver(resetSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const onSubmit = async (data: ResetFormValues) => {
    setIsLoading(true);
    setError("");

    try {
      const baseUrl = process.env.NEXT_PUBLIC_API_URL as string;
      const apiUrl = baseUrl.endsWith("/api/v1") ? baseUrl : `${baseUrl}/api/v1`;
      
      await axios.post(`${apiUrl}/auth/force-reset-password`, {
        email: data.email,
        new_password: data.password
      });

      setIsSuccess(true);
      setTimeout(() => {
        router.push("/login");
      }, 2000);
    } catch (err: any) {
      setError(err.response?.data?.detail || err.message || "Failed to reset password. Check the email.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen">
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
          </div>

          <h2 className="text-2xl font-bold tracking-tight text-foreground mb-3">
            Secure Password Reset
          </h2>
          <p className="text-sm text-muted-foreground leading-relaxed max-w-sm">
            Quickly override your password for testing environments.
          </p>
        </div>
      </div>

      <div className="flex w-full lg:w-1/2 flex-col justify-center bg-background px-6 sm:px-12 lg:px-20 xl:px-28">
        <motion.div
          className="mx-auto w-full max-w-[400px]"
          initial="hidden"
          animate="visible"
          variants={stagger}
        >
          <motion.div variants={fadeUp}>
            <Link href="/" className="inline-flex items-center gap-2 mb-12 group" aria-label="MedSync Home">
              <Activity className="h-5 w-5 text-blue-500" />
              <span className="text-lg font-semibold tracking-tight text-foreground">MedSync</span>
            </Link>
          </motion.div>

          <motion.div variants={fadeUp} className="mb-8">
            <h1 className="text-3xl font-bold tracking-tight text-foreground mb-2">Reset Password</h1>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Enter your email and a new password below.
            </p>
          </motion.div>

          {isSuccess ? (
            <motion.div variants={fadeUp} className="space-y-6 text-center py-6">
              <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/10 mb-4">
                <CheckCircle2 className="h-8 w-8 text-emerald-500" />
              </div>
              <h3 className="text-xl font-bold">Password Reset!</h3>
              <p className="text-muted-foreground text-sm">
                Your password has been forcibly reset. Redirecting to login...
              </p>
            </motion.div>
          ) : (
            <form onSubmit={handleSubmit(onSubmit)}>
              <motion.div variants={stagger} className="space-y-5">
                {error && (
                  <motion.div variants={fadeUp}>
                    <Alert variant="destructive" className="py-3 bg-destructive/10 text-destructive border-destructive/20">
                      <AlertDescription className="text-sm">{error}</AlertDescription>
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
                      className={`h-12 pl-10 pr-4 bg-background border-input hover:border-muted-foreground/30 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500/40 transition-all duration-200 ${errors.email ? "border-destructive/50 focus:border-destructive" : ""}`}
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
                      New Password
                    </label>
                  </div>
                  <div className="relative">
                    <LockKeyhole className="absolute left-3.5 top-3.5 h-4 w-4 text-muted-foreground/40" />
                    <Input
                      id="password"
                      type="password"
                      placeholder="••••••••"
                      disabled={isLoading}
                      className={`h-12 pl-10 pr-4 bg-background border-input hover:border-muted-foreground/30 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500/40 transition-all duration-200 ${errors.password ? "border-destructive/50 focus:border-destructive" : ""}`}
                      {...register("password")}
                    />
                  </div>
                  {errors.password && (
                    <p className="text-xs text-destructive mt-1">{errors.password.message}</p>
                  )}
                </motion.div>

                <motion.div variants={fadeUp}>
                  <Button
                    type="submit"
                    className="w-full h-12 text-sm font-medium bg-blue-600 hover:bg-blue-500 text-white rounded-xl transition-all duration-200 group mt-4"
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Resetting...
                      </>
                    ) : (
                      <>
                        Reset Password
                        <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                      </>
                    )}
                  </Button>
                </motion.div>
                
                <motion.div variants={fadeUp} className="text-center mt-6">
                  <Link href="/login" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
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

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { authService } from "@/services/auth.service";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Activity, Loader2, CheckCircle2, ArrowRight, UserPlus, LockKeyhole, Mail, User } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import Link from "next/link";
import Image from "next/image";

const ROLES = [
  { value: "PATIENT", label: "Patient", description: "Book appointments & manage health." },
  { value: "DOCTOR", label: "Doctor", description: "Write prescriptions & see patients." },
  { value: "PHARMACY", label: "Pharmacy", description: "Manage medicine & dispensing." },
];

export default function RegisterPage() {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [role, setRole] = useState("PATIENT");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    setIsLoading(true);

    try {
      const response = await authService.register({
        full_name: fullName,
        email,
        password,
        role,
      });

      if (response.data?.needsEmailVerification) {
        router.push("/login?registered=true&verification=true");
        return;
      }

      router.push("/login?registered=true");
    } catch (err: any) {
      const detail = err.response?.data?.detail;
      if (Array.isArray(detail)) {
        setError(detail[0]?.msg || "Validation error");
      } else if (typeof detail === "string") {
        setError(detail);
      } else {
        setError(err.response?.data?.message || "Registration failed. Please try again.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-background">
      {/* Left side - Register Form */}
      <div className="flex w-full flex-col justify-center px-8 py-10 sm:px-12 md:w-1/2 lg:px-24 xl:px-32 relative z-10 animate-in fade-in duration-700 slide-in-from-left-8 overflow-y-auto">
        <div className="mx-auto w-full max-w-[420px]">
          <Link href="/" className="flex items-center gap-3 mb-10 group w-fit">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary transition-all duration-300 group-hover:scale-110 group-hover:shadow-lg group-hover:shadow-primary/20">
              <Activity className="h-7 w-7" />
            </div>
            <span className="text-3xl font-bold tracking-tight text-foreground/90">MedSync</span>
          </Link>

          <div className="mb-8 space-y-3">
            <h1 className="text-4xl font-bold tracking-tight text-foreground">Create Account</h1>
            <p className="text-base text-muted-foreground/80 leading-relaxed">
              Join the MedSync platform to experience seamless, blockchain-verified healthcare.
            </p>
          </div>

          <form onSubmit={handleRegister} className="space-y-4">
            {error && (
              <Alert variant="destructive" className="py-3 bg-destructive/10 text-destructive border-destructive/20 animate-in zoom-in-95">
                <AlertDescription className="font-medium">{error}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <label className="text-sm font-semibold text-foreground/80 tracking-wide">Account Type</label>
              <div className="grid grid-cols-1 gap-2.5">
                {ROLES.map((r) => (
                  <button
                    key={r.value}
                    type="button"
                    onClick={() => setRole(r.value)}
                    disabled={isLoading}
                    className={`flex items-center gap-4 rounded-xl border p-3.5 text-left transition-all duration-300 ${
                      role === r.value
                        ? "border-primary bg-primary/5 ring-1 ring-primary/20 shadow-sm shadow-primary/10"
                        : "border-border hover:border-primary/40 hover:bg-muted/30"
                    }`}
                  >
                    <div className={`flex h-6 w-6 items-center justify-center rounded-full border transition-colors ${
                      role === r.value ? "border-primary bg-primary" : "border-muted-foreground/30 bg-background"
                    }`}>
                      {role === r.value && <CheckCircle2 className="h-4 w-4 text-primary-foreground" />}
                    </div>
                    <div>
                      <p className={`text-sm font-semibold ${role === r.value ? 'text-primary' : 'text-foreground'}`}>{r.label}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{r.description}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2.5 mt-4">
              <label className="text-sm font-semibold text-foreground/80 tracking-wide">Full Name</label>
              <div className="relative">
                <Input
                  type="text"
                  placeholder="Dr. John Smith"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                  disabled={isLoading}
                  className="h-12 px-4 pl-10 transition-all duration-300 focus:ring-2 focus:ring-primary/20 bg-background hover:bg-muted/50"
                />
                <User className="absolute left-3.5 top-3.5 h-5 w-5 text-muted-foreground/50" />
              </div>
            </div>

            <div className="space-y-2.5">
              <label className="text-sm font-semibold text-foreground/80 tracking-wide">Email Address</label>
              <div className="relative">
                <Input
                  type="email"
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={isLoading}
                  className="h-12 px-4 pl-10 transition-all duration-300 focus:ring-2 focus:ring-primary/20 bg-background hover:bg-muted/50"
                />
                <Mail className="absolute left-3.5 top-3.5 h-5 w-5 text-muted-foreground/50" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2.5">
                <label className="text-sm font-semibold text-foreground/80 tracking-wide">Password</label>
                <div className="relative">
                  <Input
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    disabled={isLoading}
                    className="h-12 px-4 pl-10 transition-all duration-300 focus:ring-2 focus:ring-primary/20 bg-background hover:bg-muted/50"
                  />
                  <LockKeyhole className="absolute left-3.5 top-3.5 h-5 w-5 text-muted-foreground/50" />
                </div>
              </div>

              <div className="space-y-2.5">
                <label className="text-sm font-semibold text-foreground/80 tracking-wide">Confirm</label>
                <div className="relative">
                  <Input
                    type="password"
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    disabled={isLoading}
                    className="h-12 px-4 pl-10 transition-all duration-300 focus:ring-2 focus:ring-primary/20 bg-background hover:bg-muted/50"
                  />
                  <LockKeyhole className="absolute left-3.5 top-3.5 h-5 w-5 text-muted-foreground/50" />
                </div>
              </div>
            </div>

            <Button type="submit" size="lg" className="w-full h-12 mt-6 text-base font-semibold group transition-all duration-300 hover:shadow-lg hover:shadow-primary/25" disabled={isLoading}>
              {isLoading ? (
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              ) : (
                <>
                  Register Account
                  <UserPlus className="ml-2 h-4 w-4 transition-transform group-hover:scale-110" />
                </>
              )}
            </Button>
          </form>

          {(role === "DOCTOR" || role === "PHARMACY") && (
            <div className="mt-6 rounded-xl bg-amber-500/10 p-4 text-xs text-amber-600/90 dark:text-amber-400/90 border border-amber-500/20 animate-in fade-in slide-in-from-top-2">
              <strong className="block mb-1 font-semibold uppercase tracking-wider text-[10px]">Verification Required</strong>
              Doctor and Pharmacy accounts require Supabase email verification before platform access is granted.
            </div>
          )}

          <p className="mt-8 text-center text-sm text-muted-foreground pb-8">
            Already have an account?{" "}
            <Link href="/login" className="font-semibold text-primary transition-colors hover:text-primary/80 hover:underline underline-offset-4">
              Sign in here
            </Link>
          </p>
        </div>
      </div>

      {/* Right side - Image/Info */}
      <div className="hidden w-1/2 md:flex relative overflow-hidden bg-black">
        <Image 
          src="/auth-bg.png" 
          alt="Abstract medical blockchain" 
          fill
          priority
          className="object-cover object-center opacity-70 mix-blend-screen scale-105"
        />
        
        <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-background/20 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-background/80 via-transparent to-transparent" />
        
        <div className="absolute bottom-0 left-0 right-0 p-16 z-20 animate-in fade-in duration-1000 slide-in-from-bottom-12 delay-300 fill-mode-both">
          <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-black/40 p-8 backdrop-blur-xl shadow-2xl">
            <div className="absolute -left-10 -top-10 h-40 w-40 rounded-full bg-teal-500/30 blur-3xl mix-blend-screen" />
            <div className="absolute -right-10 -bottom-10 h-40 w-40 rounded-full bg-primary/30 blur-3xl mix-blend-screen" />
            
            <div className="relative z-10">
              <div className="flex items-center gap-3 font-semibold text-primary mb-4 text-sm tracking-widest uppercase">
                <Activity className="h-5 w-5" />
                Decentralized Health
              </div>
              <h2 className="text-3xl font-bold tracking-tight text-white mb-4 leading-tight">
                Join the Network<br />of Trust
              </h2>
              <p className="text-base text-gray-300 max-w-md leading-relaxed font-light">
                MedSync bridges the gap between patients, doctors, and pharmacies through an immutable, blockchain-verified platform designed for modern, transparent healthcare.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

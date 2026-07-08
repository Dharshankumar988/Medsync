"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { authService } from "@/services/auth.service";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Activity, Shield, Loader2, ArrowRight, LockKeyhole } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import Link from "next/link";
import Image from "next/image";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

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
    <div className="flex min-h-screen bg-background">
      {/* Left side - Login Form */}
      <div className="flex w-full flex-col justify-center px-8 sm:px-12 md:w-1/2 lg:px-24 xl:px-32 relative z-10 animate-in fade-in duration-700 slide-in-from-left-8">
        
        <div className="mx-auto w-full max-w-[420px]">
          <Link href="/" className="flex items-center gap-3 mb-16 group w-fit">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary transition-all duration-300 group-hover:scale-110 group-hover:shadow-lg group-hover:shadow-primary/20">
              <Activity className="h-7 w-7" />
            </div>
            <span className="text-3xl font-bold tracking-tight text-foreground/90">MedSync</span>
          </Link>

          <div className="mb-10 space-y-3">
            <h1 className="text-4xl font-bold tracking-tight text-foreground">Welcome back</h1>
            <p className="text-base text-muted-foreground/80 leading-relaxed">
              Securely authenticate to access your decentralized clinical dashboard and health records.
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-5">
            {error && (
              <Alert variant="destructive" className="py-3 bg-destructive/10 text-destructive border-destructive/20 animate-in zoom-in-95">
                <AlertDescription className="font-medium">{error}</AlertDescription>
              </Alert>
            )}
            
            <div className="space-y-2.5 group">
              <label className="text-sm font-semibold text-foreground/80 tracking-wide">
                Email Address
              </label>
              <div className="relative">
                <Input
                  type="email"
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={isLoading}
                  className="h-12 px-4 transition-all duration-300 focus:ring-2 focus:ring-primary/20 border-input bg-background hover:bg-muted/50"
                />
              </div>
            </div>
            
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <label className="text-sm font-semibold text-foreground/80 tracking-wide">
                  Password
                </label>
                <Link href="/reset-password" className="text-sm font-medium text-primary hover:text-primary/80 transition-colors">
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <Input
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={isLoading}
                  className="h-12 px-4 pr-10 transition-all duration-300 focus:ring-2 focus:ring-primary/20 border-input bg-background hover:bg-muted/50"
                />
                <LockKeyhole className="absolute right-3.5 top-3.5 h-5 w-5 text-muted-foreground/50" />
              </div>
            </div>

            <Button type="submit" size="lg" className="w-full h-12 mt-2 text-base font-semibold group transition-all duration-300 hover:shadow-lg hover:shadow-primary/25" disabled={isLoading}>
              {isLoading ? (
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              ) : (
                <>
                  Sign In to Dashboard
                  <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                </>
              )}
            </Button>
          </form>

          <p className="mt-10 text-center text-sm text-muted-foreground">
            Don&apos;t have an account?{" "}
            <Link href="/register" className="font-semibold text-primary transition-colors hover:text-primary/80 hover:underline underline-offset-4">
              Create an account
            </Link>
          </p>
        </div>
      </div>

      {/* Right side - Image/Info */}
      <div className="hidden w-1/2 md:flex relative overflow-hidden bg-black">
        {/* The beautiful generated AI image */}
        <Image 
          src="/auth-bg.png" 
          alt="Abstract medical blockchain" 
          fill
          priority
          className="object-cover object-center opacity-80 mix-blend-screen"
        />
        
        <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-background/20 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-background/80 via-transparent to-transparent" />
        
        <div className="absolute bottom-0 left-0 right-0 p-16 z-20 animate-in fade-in duration-1000 slide-in-from-bottom-12 delay-300 fill-mode-both">
          <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-black/40 p-8 backdrop-blur-xl shadow-2xl">
            <div className="absolute -left-10 -top-10 h-40 w-40 rounded-full bg-primary/30 blur-3xl mix-blend-screen" />
            <div className="absolute -right-10 -bottom-10 h-40 w-40 rounded-full bg-blue-500/30 blur-3xl mix-blend-screen" />
            
            <div className="relative z-10">
              <div className="flex items-center gap-3 font-semibold text-primary mb-4 text-sm tracking-widest uppercase">
                <Shield className="h-5 w-5" />
                Enterprise Grade Security
              </div>
              <h2 className="text-3xl font-bold tracking-tight text-white mb-4 leading-tight">
                Secure Healthcare<br />Infrastructure
              </h2>
              <p className="text-base text-gray-300 max-w-md leading-relaxed font-light">
                MedSync utilizes cryptographic verification and immutable ledger technology to ensure all patient data is handled with the highest standards of privacy, transparency, and clinical security.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

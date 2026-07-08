"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { authService } from "@/services/auth.service";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Activity, Loader2, CheckCircle2 } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import Link from "next/link";

const ROLES = [
  { value: "PATIENT", label: "Patient", description: "Book appointments, view records, and manage prescriptions." },
  { value: "DOCTOR", label: "Doctor", description: "Manage patients, write prescriptions, and access clinical tools." },
  { value: "PHARMACY", label: "Pharmacy", description: "View prescriptions and manage medicine dispensing." },
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
      await authService.register({
        full_name: fullName,
        email,
        password,
        role,
      });
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
    <div className="flex min-h-screen">
      {/* Left side - Register Form */}
      <div className="flex w-full flex-col justify-center px-8 sm:px-12 md:w-1/2 lg:px-24 xl:px-32">
        <div className="mx-auto w-full max-w-md">
          <Link href="/" className="flex items-center gap-2 mb-10">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <Activity className="h-6 w-6 text-primary" />
            </div>
            <span className="text-2xl font-bold tracking-tight">MedSync</span>
          </Link>

          <div className="mb-8">
            <h1 className="text-3xl font-semibold tracking-tight text-foreground">Create Account</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Register to access the MedSync healthcare platform.
            </p>
          </div>

          <form onSubmit={handleRegister} className="space-y-4">
            {error && (
              <Alert variant="destructive" className="py-2.5">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <label className="text-sm font-medium">Full Name</label>
              <Input
                type="text"
                placeholder="Dr. John Smith"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
                disabled={isLoading}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Email</label>
              <Input
                type="email"
                placeholder="name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={isLoading}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">I am a...</label>
              <div className="grid grid-cols-1 gap-2">
                {ROLES.map((r) => (
                  <button
                    key={r.value}
                    type="button"
                    onClick={() => setRole(r.value)}
                    disabled={isLoading}
                    className={`flex items-start gap-3 rounded-lg border p-3 text-left transition-all ${
                      role === r.value
                        ? "border-primary bg-primary/5 ring-1 ring-primary/20"
                        : "border-border hover:border-muted-foreground/30"
                    }`}
                  >
                    <div className={`mt-0.5 flex h-5 w-5 items-center justify-center rounded-full border ${
                      role === r.value ? "border-primary bg-primary" : "border-muted-foreground/30"
                    }`}>
                      {role === r.value && <CheckCircle2 className="h-4 w-4 text-primary-foreground" />}
                    </div>
                    <div>
                      <p className="text-sm font-medium">{r.label}</p>
                      <p className="text-xs text-muted-foreground">{r.description}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Password</label>
              <Input
                type="password"
                placeholder="Minimum 8 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={isLoading}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Confirm Password</label>
              <Input
                type="password"
                placeholder="Re-enter your password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                disabled={isLoading}
              />
            </div>

            <Button type="submit" className="w-full mt-4" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create Account
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link href="/login" className="font-medium text-primary hover:underline">
              Sign in
            </Link>
          </p>

          {(role === "DOCTOR" || role === "PHARMACY") && (
            <div className="mt-4 rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground border border-border">
              <strong>Note:</strong> Doctor and Pharmacy accounts require admin approval before they can access the platform.
            </div>
          )}
        </div>
      </div>

      {/* Right side - Info */}
      <div className="hidden w-1/2 flex-col justify-between bg-muted p-12 md:flex border-l border-border relative overflow-hidden">
        <div className="absolute inset-0 bg-primary/5" />
        <div className="relative z-10 flex items-center gap-2 font-medium text-primary">
          <Activity className="h-5 w-5" />
          MedSync Healthcare Platform
        </div>
        <div className="relative z-10">
          <h2 className="text-4xl font-semibold tracking-tight mb-4">
            Join Our Healthcare Network
          </h2>
          <p className="text-lg text-muted-foreground max-w-md leading-relaxed">
            MedSync connects patients, doctors, and pharmacies through a secure, blockchain-verified platform designed for modern healthcare.
          </p>
        </div>
      </div>
    </div>
  );
}

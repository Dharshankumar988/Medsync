"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { authService } from "@/services/auth.service";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Activity, Shield, Loader2 } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import Link from "next/link";

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
      
      // Persist the token
      if (response.data?.access_token) {
        localStorage.setItem("token", response.data.access_token);
      }
      
      // Extract role from the response structure defined in auth endpoint (APIResponse[Token])
      const userRole = response.data?.role;
      
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

  const handleDemoLogin = (role: string) => {
    setEmail(`${role}@demo.com`);
    
    const rolePasswords: Record<string, string> = {
      admin: "Admin@1234",
      doctor: "Demo@1234",
      patient: "Demo@1234",
      pharmacy: "Demo@1234"
    };
    
    setPassword(rolePasswords[role]);
  };

  return (
    <div className="flex min-h-screen">
      {/* Left side - Login Form */}
      <div className="flex w-full flex-col justify-center px-8 sm:px-12 md:w-1/2 lg:px-24 xl:px-32">
        <div className="mx-auto w-full max-w-sm">
          <Link href="/" className="flex items-center gap-2 mb-12">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <Activity className="h-6 w-6 text-primary" />
            </div>
            <span className="text-2xl font-bold tracking-tight">MedSync</span>
          </Link>

          <div className="mb-8">
            <h1 className="text-3xl font-semibold tracking-tight text-foreground">Sign In</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Enter your credentials to access the clinical portal.
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            {error && (
              <Alert variant="destructive" className="py-2.5">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            
            <div className="space-y-2">
              <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                Email
              </label>
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
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                  Password
                </label>
                <Link href="#" className="text-xs font-medium text-primary hover:underline">
                  Forgot password?
                </Link>
              </div>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={isLoading}
              />
            </div>

            <Button type="submit" className="w-full mt-4" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Sign In
            </Button>
          </form>

          <div className="mt-8 pt-6 border-t border-border">
            <p className="text-sm text-muted-foreground mb-4 font-medium">Demo Access</p>
            <div className="grid grid-cols-2 gap-2">
              <Button variant="outline" size="sm" onClick={() => handleDemoLogin('patient')} disabled={isLoading}>Patient</Button>
              <Button variant="outline" size="sm" onClick={() => handleDemoLogin('doctor')} disabled={isLoading}>Doctor</Button>
              <Button variant="outline" size="sm" onClick={() => handleDemoLogin('admin')} disabled={isLoading}>Admin</Button>
              <Button variant="outline" size="sm" onClick={() => handleDemoLogin('pharmacy')} disabled={isLoading}>Pharmacy</Button>
            </div>
          </div>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            Don&apos;t have an account?{" "}
            <Link href="/register" className="font-medium text-primary hover:underline">
              Create an account
            </Link>
          </p>
        </div>
      </div>

      {/* Right side - Image/Info */}
      <div className="hidden w-1/2 flex-col justify-between bg-muted p-12 md:flex border-l border-border relative overflow-hidden">
        <div className="absolute inset-0 bg-primary/5" />
        <div className="relative z-10 flex items-center gap-2 font-medium text-primary">
          <Shield className="h-5 w-5" />
          Enterprise Grade Security
        </div>
        <div className="relative z-10">
          <h2 className="text-4xl font-semibold tracking-tight mb-4">
            Secure Healthcare Infrastructure
          </h2>
          <p className="text-lg text-muted-foreground max-w-md leading-relaxed">
            MedSync utilizes cryptographic verification and immutable ledger technology to ensure all patient data is handled with the highest standards of privacy and security.
          </p>
        </div>
      </div>
    </div>
  );
}

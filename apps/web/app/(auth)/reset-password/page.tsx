"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Input } from "@medsync/ui";
import { ShieldAlert, Loader2, KeyRound } from "lucide-react";
import api from "@/lib/api";

export default function ForceResetPasswordPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    setIsLoading(true);
    try {
      await api.post("/api/v1/auth/force-reset-password", {
        email,
        new_password: password
      });
      setSuccess("Password reset successfully! You can now log in.");
      setTimeout(() => {
        router.push("/login");
      }, 2000);
    } catch (err: any) {
      setError(err.response?.data?.detail || "Failed to reset password. Please check if the email exists.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 px-4">
      <div className="w-full max-w-md bg-card p-8 rounded-2xl shadow-xl border border-border/50">
        <div className="flex flex-col items-center text-center mb-8">
          <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mb-4">
            <KeyRound className="w-8 h-8 text-red-500" />
          </div>
          <h1 className="text-2xl font-bold">Emergency Password Reset</h1>
          <p className="text-sm text-muted-foreground mt-2">
            Reset your password directly. No authentication required.
          </p>
        </div>

        {error && (
          <div className="bg-red-500/10 text-red-500 p-3 rounded-xl text-sm mb-6 flex items-start">
            <ShieldAlert className="w-5 h-5 mr-2 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="bg-emerald-500/10 text-emerald-500 p-3 rounded-xl text-sm mb-6 text-center font-medium">
            {success}
          </div>
        )}

        <form onSubmit={handleReset} className="space-y-4">
          <div className="space-y-1">
            <label className="text-sm font-medium">Email Address</label>
            <Input 
              type="email" 
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@example.com"
              className="bg-background"
            />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium">New Password</label>
            <Input 
              type="password" 
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="bg-background"
            />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium">Confirm New Password</label>
            <Input 
              type="password" 
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="••••••••"
              className="bg-background"
            />
          </div>
          <Button type="submit" className="w-full h-12 bg-red-600 hover:bg-red-500 text-white" disabled={isLoading || success.length > 0}>
            {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Reset Password"}
          </Button>
        </form>
      </div>
    </div>
  );
}

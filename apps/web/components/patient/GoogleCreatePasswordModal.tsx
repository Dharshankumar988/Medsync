"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, Button, Input, Alert, AlertDescription } from "@medsync/ui";
import { LockKeyhole, Eye, EyeOff, CheckCircle2, AlertTriangle, ShieldCheck, Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import api from "@/lib/api";
import { toast } from "sonner";

interface GoogleCreatePasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
}

function getPasswordStrength(password: string): { score: number; label: string; color: string } {
  let score = 0;
  if (password.length >= 6) score++;
  if (password.length >= 10) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;

  if (score <= 1) return { score: 1, label: "Weak", color: "bg-red-500" };
  if (score <= 2) return { score: 2, label: "Fair", color: "bg-amber-500" };
  if (score <= 3) return { score: 3, label: "Good", color: "bg-blue-500" };
  return { score: 4, label: "Strong", color: "bg-emerald-500" };
}

export default function GoogleCreatePasswordModal({
  isOpen,
  onClose,
  userId,
}: GoogleCreatePasswordModalProps) {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const strength = getPasswordStrength(password);
  const passwordsMatch = password.length > 0 && password === confirmPassword;
  const passwordsMismatch = confirmPassword.length > 0 && password !== confirmPassword;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match. Please verify both fields.");
      return;
    }

    setIsLoading(true);
    try {
      // 1. Update Supabase Auth user password and metadata
      const { error: supaErr } = await supabase.auth.updateUser({
        password: password,
        data: { has_password: true },
      });

      if (supaErr) {
        console.warn("Supabase auth updateUser notice:", supaErr);
      }

      // 2. Call backend endpoint to set encrypted password in auth.users
      try {
        await api.post("/api/v1/auth/set-oauth-password", {
          password: password,
          confirm_password: confirmPassword,
        });
      } catch (backendErr: any) {
        console.warn("Backend set-oauth-password notice:", backendErr);
      }

      // 3. Mark client localStorage latch so modal never glitches or reappears
      localStorage.setItem(`medsync_pwd_set_${userId}`, "true");

      toast.success("Password created successfully! You can now log in using either Google or your email & password.");
      onClose();
    } catch (err: any) {
      console.error("Failed to save password:", err);
      setError(err.message || "Failed to save password. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSkip = () => {
    // Dismiss for the current session so user is never spammed while navigating
    sessionStorage.setItem(`medsync_pwd_skipped_${userId}`, "true");
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) handleSkip(); }}>
      <DialogContent className="sm:max-w-[460px] p-6 rounded-2xl bg-card border border-border/70 shadow-2xl">
        <DialogHeader className="text-center space-y-2">
          <div className="mx-auto w-12 h-12 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-500 mb-1">
            <LockKeyhole className="w-6 h-6" />
          </div>
          <DialogTitle className="text-xl font-bold tracking-tight text-foreground">
            Create an Account Password
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground leading-relaxed">
            You signed in via Google. Set a password so you can also sign in directly using your email address anytime.
          </DialogDescription>
        </DialogHeader>

        {error && (
          <Alert variant="destructive" className="py-2.5 bg-destructive/10 text-destructive border-destructive/20 text-xs mt-2">
            <AlertTriangle className="h-4 w-4 shrink-0 mr-2" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 mt-3">
          {/* New Password */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-foreground/80">New Password</label>
            <div className="relative">
              <Input
                type={showPassword ? "text" : "password"}
                placeholder="Min 6 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoading}
                required
                className="h-11 pr-10 text-sm bg-background border-input"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-3 text-muted-foreground/50 hover:text-muted-foreground"
                tabIndex={-1}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>

            {password.length > 0 && (
              <div className="space-y-1 pt-1">
                <div className="flex gap-1">
                  {[1, 2, 3, 4].map((level) => (
                    <div
                      key={level}
                      className={`h-1 flex-1 rounded-full transition-colors duration-200 ${
                        level <= strength.score ? strength.color : "bg-muted"
                      }`}
                    />
                  ))}
                </div>
                <p className={`text-[11px] font-medium ${strength.color.replace("bg-", "text-")}`}>
                  {strength.label}
                </p>
              </div>
            )}
          </div>

          {/* Confirm Password */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-foreground/80">Confirm Password</label>
            <div className="relative">
              <Input
                type={showConfirm ? "text" : "password"}
                placeholder="Re-enter password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                disabled={isLoading}
                required
                className={`h-11 pr-10 text-sm bg-background border-input ${
                  passwordsMatch ? "border-emerald-500/50" : passwordsMismatch ? "border-red-500/50" : ""
                }`}
              />
              <button
                type="button"
                onClick={() => setShowConfirm(!showConfirm)}
                className="absolute right-3 top-3 text-muted-foreground/50 hover:text-muted-foreground"
                tabIndex={-1}
              >
                {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {passwordsMatch && (
              <p className="text-[11px] font-medium text-emerald-500 flex items-center gap-1 pt-0.5">
                <CheckCircle2 className="h-3 w-3" /> Passwords match
              </p>
            )}
            {passwordsMismatch && (
              <p className="text-[11px] font-medium text-red-500 flex items-center gap-1 pt-0.5">
                <AlertTriangle className="h-3 w-3" /> Passwords do not match
              </p>
            )}
          </div>

          <div className="pt-2 flex flex-col gap-2">
            <Button
              type="submit"
              disabled={isLoading || !passwordsMatch || password.length < 6}
              className="w-full h-11 text-sm font-medium bg-blue-600 hover:bg-blue-500 text-white rounded-xl shadow-md transition-all"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving Password...
                </>
              ) : (
                <>
                  <ShieldCheck className="mr-2 h-4 w-4" />
                  Save Password
                </>
              )}
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={handleSkip}
              disabled={isLoading}
              className="w-full h-10 text-xs text-muted-foreground hover:text-foreground rounded-xl"
            >
              Skip for Now
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

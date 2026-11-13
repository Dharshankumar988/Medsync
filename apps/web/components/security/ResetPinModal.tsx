"use client";

import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  Button,
  Input,
} from "@medsync/ui";
import {
  KeyRound,
  Lock,
  Eye,
  EyeOff,
  Loader2,
  CheckCircle2,
  ShieldAlert,
} from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";

interface ResetPinModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: (newPin: string) => void;
  role?: "patient" | "doctor" | "pharmacy" | string;
  title?: string;
  description?: string;
}

export default function ResetPinModal({
  open,
  onOpenChange,
  onSuccess,
  role = "user",
  title = "Reset Authorization PIN",
  description = "Verify your account identity with your password to set a new 6-digit PIN.",
}: ResetPinModalProps) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [newPin, setNewPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [isResetting, setIsResetting] = useState(false);

  useEffect(() => {
    if (open) {
      setCurrentPassword("");
      setShowPassword(false);
      setNewPin("");
      setConfirmPin("");
      setIsResetting(false);
    }
  }, [open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!currentPassword) {
      toast.error("Please enter your current account password.");
      return;
    }

    if (newPin.length !== 6 || !/^\d{6}$/.test(newPin)) {
      toast.error("New PIN must be exactly 6 digits.");
      return;
    }

    if (newPin !== confirmPin) {
      toast.error("New PIN and Confirm PIN do not match.");
      return;
    }

    setIsResetting(true);
    try {
      const formData = new FormData();
      formData.append("current_password", currentPassword);
      formData.append("new_pin", newPin);

      await api.post("/api/v1/security/reset-pin-with-password", formData);

      toast.success("Authorization PIN reset successfully! You can now proceed.");
      if (onSuccess) {
        onSuccess(newPin);
      }
      onOpenChange(false);
    } catch (err: any) {
      const msg =
        err.response?.data?.detail ||
        err.response?.data?.message ||
        "Failed to reset PIN. Please verify your current password.";
      toast.error(msg);
    } finally {
      setIsResetting(false);
    }
  };

  const roleLabel =
    role.toLowerCase() === "pharmacy"
      ? "Pharmacy"
      : role.toLowerCase() === "doctor"
      ? "Doctor"
      : "Patient";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-card border border-border/80 rounded-2xl shadow-2xl p-6">
        <DialogHeader className="text-left space-y-1">
          <div className="flex items-center gap-2 text-primary font-semibold">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <KeyRound className="w-4 h-4 text-primary" />
            </div>
            <DialogTitle className="text-lg font-bold text-foreground">
              {title}
            </DialogTitle>
          </div>
          <DialogDescription className="text-xs text-muted-foreground pt-1">
            {description}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          {/* Account Password Field */}
          <div className="space-y-1.5 text-left">
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Current Account Password *
            </label>
            <div className="relative">
              <Input
                type={showPassword ? "text" : "password"}
                placeholder="Enter your account password"
                className="h-11 rounded-xl bg-background border-border/80 pr-10 text-sm"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required
                autoFocus
              />
              <button
                type="button"
                tabIndex={-1}
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-1"
              >
                {showPassword ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            </div>
            <p className="text-[11px] text-muted-foreground">
              Used to verify your identity as the authorized {roleLabel}.
            </p>
          </div>

          {/* New PIN & Confirm PIN Grid */}
          <div className="grid grid-cols-2 gap-3 pt-1">
            <div className="space-y-1.5 text-left">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                New 6-Digit PIN *
              </label>
              <Input
                type="password"
                placeholder="••••••"
                maxLength={6}
                value={newPin}
                onChange={(e) =>
                  setNewPin(e.target.value.replace(/\D/g, ""))
                }
                className="tracking-widest font-mono text-center text-lg h-11 rounded-xl bg-background border-border/80"
                required
              />
            </div>

            <div className="space-y-1.5 text-left">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Confirm PIN *
              </label>
              <Input
                type="password"
                placeholder="••••••"
                maxLength={6}
                value={confirmPin}
                onChange={(e) =>
                  setConfirmPin(e.target.value.replace(/\D/g, ""))
                }
                className="tracking-widest font-mono text-center text-lg h-11 rounded-xl bg-background border-border/80"
                required
              />
            </div>
          </div>

          {/* Validation Feedback */}
          {confirmPin.length > 0 && (
            <div className="text-xs font-medium pt-0.5">
              {newPin === confirmPin && newPin.length === 6 ? (
                <span className="text-emerald-500 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> PINs match perfectly
                </span>
              ) : (
                <span className="text-rose-500 flex items-center gap-1">
                  <ShieldAlert className="w-3.5 h-3.5" /> PINs do not match or incomplete
                </span>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="pt-2 flex gap-2">
            <Button
              type="button"
              variant="outline"
              className="flex-1 h-11 rounded-xl border-border/80 text-sm font-medium"
              onClick={() => onOpenChange(false)}
              disabled={isResetting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="flex-1 h-11 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-sm shadow-sm"
              disabled={
                isResetting ||
                !currentPassword ||
                newPin.length !== 6 ||
                newPin !== confirmPin
              }
            >
              {isResetting ? (
                <Loader2 className="w-4 h-4 animate-spin mr-1.5" />
              ) : (
                <Lock className="w-4 h-4 mr-1.5" />
              )}
              {isResetting ? "Resetting..." : "Save New PIN"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}


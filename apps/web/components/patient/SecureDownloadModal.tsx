"use client";

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@medsync/ui';
import { Button } from '@medsync/ui';
import { Input } from '@medsync/ui';
import { Lock, Download, KeyRound, Loader2, UserSquare2, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import api from '@/lib/api';

interface SecureDownloadModalProps {
  prescriptionId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function SecureDownloadModal({ prescriptionId, open, onOpenChange }: SecureDownloadModalProps) {
  const [pin, setPin] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Forgot PIN Flow State
  const [isForgotPin, setIsForgotPin] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmNewPin, setConfirmNewPin] = useState('');
  const [isResetting, setIsResetting] = useState(false);

  useEffect(() => {
    if (open) {
      setPin('');
      setIsForgotPin(false);
      setNewPin('');
      setConfirmNewPin('');
      setCurrentPassword('');
    }
  }, [open]);

  const handleDownloadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prescriptionId || pin.length !== 6) return;
    setIsSubmitting(true);

    try {
      const formData = new FormData();
      formData.append('pin', pin);

      const res = await api.post(`/api/v1/prescriptions/${prescriptionId}/authorize-download`, formData);

      if (res.data?.data?.authorization_reference) {
        const ref = res.data.data.authorization_reference;
        const dlRes = await api.get(`/api/v1/prescriptions/download/${ref}`);

        if (dlRes.data?.data?.url) {
          window.open(dlRes.data.data.url, '_blank');
          toast.success("Download authorized successfully.");
          onOpenChange(false);
        }
      }
    } catch (err: any) {
      toast.error(err.response?.data?.detail || err.response?.data?.message || "Authorization failed.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleForgotPinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPin.length !== 6 || newPin !== confirmNewPin) {
      toast.error("New PIN must be 6 digits and match.");
      return;
    }
    if (!currentPassword) {
      toast.error("Please enter your current account password.");
      return;
    }
    setIsResetting(true);
    try {
      const formData = new FormData();
      formData.append('current_password', currentPassword);
      formData.append('new_pin', newPin);

      await api.post('/api/v1/security/reset-pin-with-password', formData);

      toast.success("PIN reset successfully! You can now use it.");
      setIsForgotPin(false);
      setPin('');
      setCurrentPassword('');
    } catch (err: any) {
      console.error(err);
      toast.error(err.response?.data?.detail || "Failed to reset PIN.");
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-card border border-border/80 rounded-2xl shadow-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-foreground">
            {isForgotPin ? (
              <><UserSquare2 className="w-5 h-5 text-primary" /> Reset Authorization PIN</>
            ) : (
              <><Lock className="w-5 h-5 text-primary" /> Secure Download Authorization</>
            )}
          </DialogTitle>
        </DialogHeader>

        {isForgotPin ? (
          <form onSubmit={handleForgotPinSubmit} className="space-y-5 py-2">
            <p className="text-sm text-muted-foreground">
              Verify your identity using your account password to securely set a new 6-digit authorization PIN.
            </p>
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Current Account Password</label>
                <Input
                  type="password"
                  placeholder="Enter your password"
                  className="h-11 rounded-xl bg-background border-border/80"
                  value={currentPassword}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCurrentPassword(e.target.value)}
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">New PIN</label>
                  <Input
                    type="password"
                    placeholder="••••••"
                    className="tracking-widest font-mono text-center text-lg h-11 rounded-xl bg-background border-border/80"
                    maxLength={6}
                    value={newPin}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewPin(e.target.value.replace(/\D/g, ''))}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Confirm PIN</label>
                  <Input
                    type="password"
                    placeholder="••••••"
                    className="tracking-widest font-mono text-center text-lg h-11 rounded-xl bg-background border-border/80"
                    maxLength={6}
                    value={confirmNewPin}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setConfirmNewPin(e.target.value.replace(/\D/g, ''))}
                    required
                  />
                </div>
              </div>
            </div>

            <div className="pt-2 space-y-2">
              <Button
                type="submit"
                className="w-full h-11 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-semibold"
                disabled={isResetting || newPin.length !== 6 || newPin !== confirmNewPin || !currentPassword}
              >
                {isResetting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <CheckCircle2 className="w-4 h-4 mr-2" />}
                Reset PIN
              </Button>

              <Button
                variant="outline"
                className="w-full h-11 rounded-xl border-border/80"
                type="button"
                onClick={() => setIsForgotPin(false)}
                disabled={isResetting}
              >
                Cancel Reset
              </Button>
            </div>
          </form>
        ) : (
          <form onSubmit={handleDownloadSubmit} className="space-y-5 py-3">
            <p className="text-sm text-muted-foreground">
              Please enter your 6-digit Authorization PIN to decrypt and download your prescription.
            </p>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-semibold flex items-center gap-1.5 text-foreground">
                  <Lock className="w-4 h-4 text-primary" /> Authorization PIN
                </label>
                <button
                  type="button"
                  onClick={() => setIsForgotPin(true)}
                  className="text-xs font-medium text-primary hover:underline flex items-center gap-1"
                >
                  <KeyRound className="w-3 h-3" /> Forgot PIN?
                </button>
              </div>
              <Input
                required
                type="password"
                placeholder="••••••"
                className="tracking-widest font-mono text-center text-xl h-12 rounded-xl bg-background border border-border/80 focus-visible:ring-1 focus-visible:ring-primary"
                maxLength={6}
                value={pin}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPin(e.target.value.replace(/\D/g, ''))}
                autoFocus
              />
            </div>

            <Button
              type="submit"
              className="w-full h-11 rounded-xl text-sm font-semibold bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm"
              disabled={isSubmitting || pin.length !== 6}
            >
              {isSubmitting ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <><Download className="w-4 h-4 mr-2" /> Authorize & Download</>
              )}
            </Button>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

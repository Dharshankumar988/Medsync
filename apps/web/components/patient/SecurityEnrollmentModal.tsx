"use client";

import React, { useState, useEffect } from 'react';
import { useSecurityEnrollment } from '@/hooks/useSecurityEnrollment';
import { authService } from '@/services/auth.service';
import { supabase } from '@/lib/supabase';
import api from '@/lib/api';
import { ShieldCheck, CheckCircle2, Loader2, Lock, X, Eye, EyeOff, KeyRound } from 'lucide-react';
import { Button, Input } from '@medsync/ui';
import { useSecurityStore } from '@/store/useSecurityStore';

export default function SecurityEnrollmentModal() {
  const [userId, setUserId] = useState<string>();
  const [userEmail, setUserEmail] = useState<string>();
  const [role, setRole] = useState<string>();

  useEffect(() => {
    authService.me().then(u => {
      setUserId(u.id);
      setUserEmail(u.email);
      setRole(u.role?.toLowerCase());
    }).catch(() => {
      supabase.auth.getUser().then(({ data: { user } }) => {
        if (user) {
          setUserId(user.id);
          setUserEmail(user.email);
          setRole(user.user_metadata?.role?.toLowerCase() || 'patient');
        }
      });
    });
  }, []);

  const { status, isLoading: isStatusLoading } = useSecurityEnrollment(userId, role);

  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [pinError, setPinError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [enrollmentSuccess, setEnrollmentSuccess] = useState(false);

  const { isEnrollmentModalOpen, closeEnrollmentModal, setStatus, onSuccessCallback } = useSecurityStore();

  if (!isEnrollmentModalOpen || role !== 'patient') {
    return null;
  }

  const handlePinSubmit = async () => {
    if (!password || password.length < 6) {
      setPinError('Account password is required (minimum 6 characters) to verify identity.');
      return;
    }

    if (pin.length !== 6 || !/^\d+$/.test(pin)) {
      setPinError('PIN must be exactly 6 digits.');
      return;
    }
    if (pin !== confirmPin) {
      setPinError('PINs do not match. Please verify both inputs.');
      return;
    }
    
    setPinError('');
    setIsSubmitting(true);

    try {
      // 1. Verify account password
      if (userEmail) {
        const { error: authError } = await supabase.auth.signInWithPassword({
          email: userEmail,
          password: password,
        });

        if (authError) {
          setPinError('Incorrect account password. Please enter your valid account password.');
          setIsSubmitting(false);
          return;
        }
      }

      // 2. Submit PIN enrollment along with password to backend
      const formData = new FormData();
      formData.append('pin', pin);
      formData.append('password', password);
      
      await api.post('/api/v1/security/enroll-pin', formData);
      
      setEnrollmentSuccess(true);
      setStatus('COMPLETED');
      
      const cb = onSuccessCallback;
      setTimeout(() => {
        closeEnrollmentModal();
        setEnrollmentSuccess(false);
        setPassword('');
        setPin('');
        setConfirmPin('');
        if (cb) {
          cb();
        }
      }, 900);
    } catch (err: any) {
      setPinError(err.response?.data?.detail || err.message || 'Failed to enroll PIN');
    } finally {
      setIsSubmitting(false);
    }
  };

  const isFormValid = password.length >= 6 && pin.length === 6 && confirmPin.length === 6 && pin === confirmPin;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-card w-full max-w-md p-6 rounded-2xl shadow-2xl relative border border-border/60">
        <Button variant="ghost" size="icon" className="absolute right-4 top-4 rounded-full" onClick={closeEnrollmentModal}>
          <X className="h-4 w-4" />
        </Button>

        {enrollmentSuccess ? (
          <div className="text-center py-6">
            <div className="mx-auto w-16 h-16 bg-emerald-500/15 rounded-full flex items-center justify-center mb-4">
              <CheckCircle2 className="w-9 h-9 text-emerald-500" />
            </div>
            <h3 className="text-xl font-bold mb-1">PIN Created Successfully</h3>
            <p className="text-sm text-muted-foreground">Your 6-digit authorization PIN is set and active.</p>
          </div>
        ) : (
          <>
            <div className="mx-auto w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center mb-4">
              <ShieldCheck className="w-6 h-6 text-primary" />
            </div>
            <h3 className="text-xl font-bold mb-1 text-center">Set Your Authorization PIN</h3>
            <p className="text-xs text-muted-foreground mb-5 text-center">
              First-time setup: Verify your account password and create a 6-digit PIN for authorizing actions.
            </p>

            <div className="space-y-4">
              {/* Account Password Verification */}
              <div className="space-y-1.5 p-3 rounded-xl bg-muted/40 border border-border/50">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-semibold uppercase tracking-wider text-foreground/80 flex items-center gap-1.5">
                    <KeyRound className="w-3.5 h-3.5 text-primary" />
                    Account Password (First Time Only)
                  </label>
                </div>
                <div className="relative">
                  <Input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pr-10 h-10 rounded-lg text-sm bg-background"
                    placeholder="Enter account password"
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Required only once to confirm identity before setting your PIN.
                </p>
              </div>

              {/* New PIN */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">New 6-Digit PIN</label>
                <Input
                  type="password"
                  inputMode="numeric"
                  maxLength={6}
                  value={pin}
                  onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
                  className="text-center tracking-widest text-2xl font-mono h-12 rounded-xl"
                  placeholder="••••••"
                />
              </div>

              {/* Confirm PIN */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Confirm 6-Digit PIN</label>
                  {confirmPin.length === 6 && (
                    <span className={`text-xs font-medium ${confirmPin === pin ? 'text-emerald-500' : 'text-red-500'}`}>
                      {confirmPin === pin ? '✓ Matches' : '✗ Does not match'}
                    </span>
                  )}
                </div>
                <Input
                  type="password"
                  inputMode="numeric"
                  maxLength={6}
                  value={confirmPin}
                  onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, ''))}
                  className="text-center tracking-widest text-2xl font-mono h-12 rounded-xl"
                  placeholder="••••••"
                />
              </div>

              {pinError && (
                <div className="p-2.5 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm text-center">
                  {pinError}
                </div>
              )}

              <Button
                className="w-full h-11 rounded-xl text-base font-medium shadow-md shadow-primary/20"
                disabled={isSubmitting || !isFormValid}
                onClick={handlePinSubmit}
              >
                {isSubmitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Lock className="w-4 h-4 mr-2" />}
                Verify & Set PIN
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

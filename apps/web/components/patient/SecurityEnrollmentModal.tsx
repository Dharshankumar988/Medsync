"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { useSecurityEnrollment } from '@/hooks/useSecurityEnrollment';
import { authService } from '@/services/auth.service';
import { supabase } from '@/lib/supabase';
import api from '@/lib/api';
import { ShieldCheck, CheckCircle2, Loader2, Lock, X, Eye, EyeOff, LogOut } from 'lucide-react';
import { Button, Input } from '@medsync/ui';
import { useSecurityStore } from '@/store/useSecurityStore';
import { MedSyncLogo } from '@/components/brand/MedSyncLogo';

const PIN_ENABLED_ROLES = new Set(['patient', 'pharmacy', 'doctor']);

const ROLE_COPY: Record<string, { badge: string; desc: string }> = {
  patient: {
    badge: 'PATIENT VAULT',
    desc: 'Create your 6-digit Authorization PIN before uploading or downloading medical records, booking clinic visits, or placing medicine orders.',
  },
  pharmacy: {
    badge: 'PHARMACY NODE',
    desc: 'Create your 6-digit Pharmacy Authorization PIN before verifying prescriptions, dispensing orders, or updating inventory.',
  },
  doctor: {
    badge: 'CLINICAL PRACTITIONER',
    desc: 'Create your 6-digit Clinical Authorization PIN to sign digital prescriptions and authorize patient care actions.',
  },
};

export default function SecurityEnrollmentModal() {
  const router = useRouter();
  const [userId, setUserId] = useState<string>();
  const [userEmail, setUserEmail] = useState<string>();
  const [role, setRole] = useState<string>();
  const [isOAuthWithoutPassword, setIsOAuthWithoutPassword] = useState(false);

  useEffect(() => {
    let mounted = true;
    const resolveUser = async () => {
      try {
        const u = await authService.me();
        if (mounted && u) {
          setUserId(u.id);
          setUserEmail(u.email);
          setRole(u.role?.toLowerCase());
        }
      } catch {
        // Fallback to Supabase session
      }

      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (mounted && user) {
          setUserId((prev) => prev || user.id);
          setUserEmail((prev) => prev || user.email || undefined);
          setRole((prev) =>
            prev ||
            String(
              user.user_metadata?.role || user.app_metadata?.role || 'patient'
            ).toLowerCase()
          );
          const provider = String(user.app_metadata?.provider || '').toLowerCase();
          const hasPassword = Boolean(user.user_metadata?.has_password);
          setIsOAuthWithoutPassword(provider === 'google' && !hasPassword);
        }
      } catch {
        // Ignore
      }
    };

    resolveUser();
    return () => {
      mounted = false;
    };
  }, []);

  const { status } = useSecurityEnrollment(userId, role);

  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [pinError, setPinError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [enrollmentSuccess, setEnrollmentSuccess] = useState(false);

  const {
    isEnrollmentModalOpen,
    isMandatory,
    closeEnrollmentModal,
    completeEnrollment,
    onSuccessCallback,
  } = useSecurityStore();

  const normalizedRole = (role || '').toLowerCase();
  const isBlocked = isMandatory && status !== 'COMPLETED';

  useEffect(() => {
    if (!isEnrollmentModalOpen || !isBlocked) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
      }
    };
    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [isEnrollmentModalOpen, isBlocked]);

  if (!isEnrollmentModalOpen || !PIN_ENABLED_ROLES.has(normalizedRole)) {
    return null;
  }

  const handlePinSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!password.trim()) {
      setPinError(
        isOAuthWithoutPassword
          ? 'Please set an account password to protect your PIN.'
          : 'Please enter your account password to verify your identity.'
      );
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
      // Only set Supabase password if this is a passwordless Google OAuth account
      if (isOAuthWithoutPassword) {
        try {
          const {
            data: { user },
          } = await supabase.auth.getUser();
          if (user) {
            await supabase.auth.updateUser({
              password: password.trim(),
              data: { has_password: true },
            });
          }
        } catch (authErr) {
          console.warn('Supabase auth password sync during PIN enrollment:', authErr);
        }
      }

      const formData = new FormData();
      formData.append('pin', pin);
      formData.append('password', password.trim());

      await api.post('/api/v1/security/enroll-pin', formData);

      setEnrollmentSuccess(true);
      const cb = onSuccessCallback;

      setTimeout(() => {
        completeEnrollment();
        setEnrollmentSuccess(false);
        setPassword('');
        setPin('');
        setConfirmPin('');
        if (cb) {
          cb();
        } else {
          if (normalizedRole === 'doctor') {
            router.push('/doctor/profile');
          } else if (normalizedRole === 'pharmacy') {
            router.push('/pharmacy/settings');
          }
        }
      }, 950);
    } catch (err: any) {
      setPinError(err.response?.data?.detail || err.message || 'Failed to enroll PIN');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSignOut = async () => {
    await authService.logout().catch(() => {});
    useSecurityStore.setState({
      isEnrollmentModalOpen: false,
      isMandatory: false,
      status: 'UNKNOWN',
      checkedUserId: null,
      onSuccessCallback: null,
    });
    router.replace('/login');
  };

  const isFormValid =
    pin.length === 6 &&
    confirmPin.length === 6 &&
    pin === confirmPin &&
    password.trim().length > 0;

  const copy = ROLE_COPY[normalizedRole] || ROLE_COPY.patient;

  return (
    <AnimatePresence>
      <motion.div
        key="mandatory-pin-backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.22 }}
        className="fixed inset-0 z-[100] flex items-center justify-center bg-black/75 backdrop-blur-md p-4"
      >
        <motion.div
          key="mandatory-pin-dialog"
          initial={{ opacity: 0, scale: 0.94, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 8 }}
          transition={{ type: 'spring', stiffness: 280, damping: 24 }}
          className="bg-card w-full max-w-md p-6 sm:p-7 rounded-2xl shadow-2xl relative border border-border/70"
        >
          {!isBlocked && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-4 top-4 rounded-full"
              onClick={closeEnrollmentModal}
            >
              <X className="h-4 w-4" />
            </Button>
          )}

          {enrollmentSuccess ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.92 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center py-6"
            >
              <div className="mx-auto w-16 h-16 bg-emerald-500/15 rounded-full flex items-center justify-center mb-4 ring-1 ring-emerald-500/30">
                <CheckCircle2 className="w-9 h-9 text-emerald-500" />
              </div>
              <h3 className="text-xl font-bold mb-1">Authorization PIN Active</h3>
              <p className="text-sm text-muted-foreground">
                Your 6-digit PIN is configured. Unlocking your workspace...
              </p>
            </motion.div>
          ) : (
            <form onSubmit={handlePinSubmit} className="space-y-4">
              <div className="flex flex-col items-center text-center">
                <div className="flex items-center gap-2 mb-3">
                  <MedSyncLogo size={34} />
                  <span className="text-[10px] font-bold tracking-widest uppercase px-2.5 py-1 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/25">
                    {isBlocked ? `REQUIRED SETUP • ${copy.badge}` : copy.badge}
                  </span>
                </div>
                <h3 className="text-xl font-bold tracking-tight">Set Your 6-Digit Auth PIN</h3>
                <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">
                  {copy.desc}
                </p>
                {userEmail && (
                  <p className="text-[11px] text-muted-foreground/80 mt-1 font-medium">
                    Signed in as {userEmail}
                  </p>
                )}
              </div>

              {/* Account Password */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {isOAuthWithoutPassword ? 'Create Account Password' : 'Account Password'}
                </label>
                <div className="relative">
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      if (pinError) setPinError('');
                    }}
                    className="h-11 rounded-xl pr-10"
                    placeholder={
                      isOAuthWithoutPassword
                        ? 'Create a password for your MedSync account'
                        : 'Enter your account password to verify'
                    }
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* New PIN */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  New 6-Digit PIN
                </label>
                <Input
                  type="password"
                  inputMode="numeric"
                  maxLength={6}
                  value={pin}
                  onChange={(e) => {
                    setPin(e.target.value.replace(/\D/g, '').slice(0, 6));
                    if (pinError) setPinError('');
                  }}
                  className="text-center tracking-[0.5em] text-2xl font-mono h-12 rounded-xl"
                  placeholder="••••••"
                />
              </div>

              {/* Confirm PIN */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Confirm 6-Digit PIN
                  </label>
                  {confirmPin.length === 6 && (
                    <span
                      className={`text-xs font-medium ${
                        confirmPin === pin ? 'text-emerald-500' : 'text-red-500'
                      }`}
                    >
                      {confirmPin === pin ? '✓ Matches' : '✗ Does not match'}
                    </span>
                  )}
                </div>
                <Input
                  type="password"
                  inputMode="numeric"
                  maxLength={6}
                  value={confirmPin}
                  onChange={(e) => {
                    setConfirmPin(e.target.value.replace(/\D/g, '').slice(0, 6));
                    if (pinError) setPinError('');
                  }}
                  className="text-center tracking-[0.5em] text-2xl font-mono h-12 rounded-xl"
                  placeholder="••••••"
                />
              </div>

              {pinError && (
                <div className="p-2.5 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs font-medium text-center">
                  {pinError}
                </div>
              )}

              <Button
                type="submit"
                className="w-full h-11 rounded-xl text-sm font-semibold shadow-md shadow-primary/20"
                disabled={isSubmitting || !isFormValid}
              >
                {isSubmitting ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Lock className="w-4 h-4 mr-2" />
                )}
                {isSubmitting ? 'Setting Up Security PIN...' : 'Save Authorization PIN & Continue'}
              </Button>

              {isBlocked && (
                <div className="pt-1 text-center">
                  <button
                    type="button"
                    onClick={handleSignOut}
                    className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    Sign out & switch account
                  </button>
                </div>
              )}
            </form>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

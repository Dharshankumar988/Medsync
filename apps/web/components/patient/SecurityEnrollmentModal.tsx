"use client";

import React, { useState, useEffect } from 'react';
import { useSecurityEnrollment } from '@/hooks/useSecurityEnrollment';
import { authService } from '@/services/auth.service';
import api from '@/lib/api';
import { ShieldCheck, CheckCircle2, Loader2, Lock, X } from 'lucide-react';
import { Button, Input } from '@medsync/ui';
import { useSecurityStore } from '@/store/useSecurityStore';

export default function SecurityEnrollmentModal() {
  const [userId, setUserId] = useState<string>();
  const [role, setRole] = useState<string>();

  useEffect(() => {
    authService.me().then(u => {
      setUserId(u.id);
      setRole(u.role?.toLowerCase());
    }).catch(() => {});
  }, []);

  const { status, isLoading: isStatusLoading } = useSecurityEnrollment(userId, role);

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
      const formData = new FormData();
      formData.append('pin', pin);
      
      await api.post('/api/v1/security/enroll-pin', formData);
      
      setEnrollmentSuccess(true);
      setStatus('COMPLETED');
      
      const cb = onSuccessCallback;
      setTimeout(() => {
        closeEnrollmentModal();
        setEnrollmentSuccess(false);
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

  const isFormValid = pin.length === 6 && confirmPin.length === 6 && pin === confirmPin;

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
            <p className="text-sm text-muted-foreground mb-6 text-center">
              Create a 6-digit PIN to authorize actions like appointments, records, and prescriptions.
            </p>

            <div className="space-y-4">
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
                  autoFocus
                />
              </div>

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
                Confirm & Set PIN
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

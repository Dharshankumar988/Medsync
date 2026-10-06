"use client";

import React, { useState, useEffect } from 'react';
import { useSecurityEnrollment } from '@/hooks/useSecurityEnrollment';
import { SecurityService } from '@/services/security.service';
import { authService } from '@/services/auth.service';
import { supabase } from '@/lib/supabase';
import { ShieldAlert, ShieldCheck, CheckCircle2, Loader2, Lock, X } from 'lucide-react';
import { Button, Input } from '@medsync/ui';
import { useSecurityStore } from '@/store/useSecurityStore';

export default function SecurityEnrollmentModal() {
  const [userId, setUserId] = useState<string>();
  const [role, setRole] = useState<string>();

  useEffect(() => {
    authService.me().then(u => {
      setUserId(u.id);
      setRole(u.role.toLowerCase());
    }).catch(() => {});
  }, []);

  const { status, isLoading: isStatusLoading } = useSecurityEnrollment(userId, role);

  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [pinError, setPinError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [enrollmentSuccess, setEnrollmentSuccess] = useState(false);

  const { isEnrollmentModalOpen, closeEnrollmentModal, setStatus } = useSecurityStore();

  if (!isEnrollmentModalOpen || role !== 'patient' || isStatusLoading || status === 'PIN_CREATED') {
    return null;
  }

  const handlePinSubmit = async () => {
    if (pin.length !== 6 || !/^\d+$/.test(pin)) {
      setPinError('PIN must be 6 digits.');
      return;
    }
    if (pin !== confirmPin) {
      setPinError('PINs do not match.');
      return;
    }
    setPinError('');
    setIsSubmitting(true);

    try {
      const { data: session } = await supabase.auth.getSession();
      if (session?.session?.access_token) {
        await SecurityService.enrollPin(session.session.access_token, pin);
        setEnrollmentSuccess(true);
        setStatus('PIN_CREATED');
        setTimeout(() => {
          closeEnrollmentModal();
          setEnrollmentSuccess(false);
          setPin('');
          setConfirmPin('');
        }, 2000);
      }
    } catch (err: any) {
      setPinError(err.response?.data?.detail || 'Failed to enroll PIN');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-card w-full max-w-md p-6 rounded-2xl shadow-xl relative border border-border/50">
        <Button variant="ghost" size="icon" className="absolute right-4 top-4" onClick={closeEnrollmentModal}>
          <X className="h-4 w-4" />
        </Button>

        {enrollmentSuccess ? (
          <div className="text-center py-8">
            <div className="mx-auto w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center mb-4">
              <CheckCircle2 className="w-8 h-8 text-green-500" />
            </div>
            <h3 className="text-xl font-bold mb-2">PIN Enrolled Successfully</h3>
            <p className="text-muted-foreground">Your security PIN has been set up.</p>
          </div>
        ) : (
          <>
            <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-4">
              <ShieldCheck className="w-6 h-6 text-primary" />
            </div>
            <h3 className="text-xl font-bold mb-2">Set Your Security PIN</h3>
            <p className="text-sm text-muted-foreground mb-6">
              Create a 6-digit PIN to authorize sensitive actions like prescription downloads.
            </p>

            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">New 6-Digit PIN</label>
                <Input
                  type="password"
                  inputMode="numeric"
                  maxLength={6}
                  value={pin}
                  onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
                  className="text-center tracking-widest text-xl"
                  placeholder="•••••••"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Confirm PIN</label>
                <Input
                  type="password"
                  inputMode="numeric"
                  maxLength={6}
                  value={confirmPin}
                  onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, ''))}
                  className="text-center tracking-widest text-xl"
                  placeholder="•••••••"
                />
              </div>
              {pinError && <p className="text-red-500 text-sm">{pinError}</p>}
              <Button
                className="w-full"
                disabled={isSubmitting || pin.length !== 6 || confirmPin.length !== 6}
                onClick={handlePinSubmit}
              >
                {isSubmitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Lock className="w-4 h-4 mr-2" />}
                Set PIN
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

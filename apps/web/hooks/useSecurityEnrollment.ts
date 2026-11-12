import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { SecurityService } from '@/services/security.service';
import { useSecurityStore } from '@/store/useSecurityStore';

const PIN_ENABLED_ROLES = new Set(['patient', 'pharmacy', 'doctor']);

export function useSecurityEnrollment(userId?: string, role?: string) {
  const {
    status,
    checkedUserId,
    setStatus,
    openEnrollmentModal,
    resetForUser,
  } = useSecurityStore();

  const normalizedRole = (role || '').toLowerCase();
  const isAlreadyCheckedCompleted =
    Boolean(userId) &&
    checkedUserId === userId &&
    (status === 'COMPLETED' || status === 'PIN_CREATED');

  const [isLoading, setIsLoading] = useState(!isAlreadyCheckedCompleted);

  useEffect(() => {
    let isMounted = true;

    async function checkSecurity() {
      try {
        let activeUserId = userId;
        let activeRole = normalizedRole;

        if (!activeUserId || !activeRole) {
          const {
            data: { session },
          } = await supabase.auth.getSession();
          if (session?.user) {
            activeUserId = activeUserId || session.user.id;
            activeRole =
              activeRole ||
              String(
                session.user.user_metadata?.role ||
                  session.user.app_metadata?.role ||
                  'patient'
              ).toLowerCase();
          }
        }

        if (!activeUserId || !PIN_ENABLED_ROLES.has(activeRole)) {
          if (isMounted) setIsLoading(false);
          return;
        }

        resetForUser(activeUserId);

        let resolvedHasPin: boolean | null = null;

        // 1. Authoritative backend status check across Patient, Pharmacy, Doctor
        try {
          const {
            data: { session },
          } = await supabase.auth.getSession();
          if (session?.access_token) {
            const res = await SecurityService.getStatus(session.access_token);
            const dataHasPin = res?.data?.has_pin;
            const statusVal = res?.data?.status || res?.status;
            if (typeof dataHasPin === 'boolean') {
              resolvedHasPin = dataHasPin;
            } else if (statusVal === 'COMPLETED' || statusVal === 'PIN_CREATED') {
              resolvedHasPin = true;
            } else if (statusVal === 'NOT_STARTED') {
              resolvedHasPin = false;
            }
          }
        } catch (apiErr) {
          console.warn('Backend security status check fallback:', apiErr);
        }

        // 2. Direct Supabase fallback if backend API was unavailable
        if (resolvedHasPin === null) {
          try {
            if (activeRole === 'patient') {
              const { data: cred } = await supabase
                .from('patient_security_credentials')
                .select('id, is_active')
                .eq('patient_id', activeUserId)
                .maybeSingle();
              resolvedHasPin = Boolean(cred && cred.is_active !== false);
            } else if (activeRole === 'pharmacy') {
              const { data: ph } = await supabase
                .from('pharmacies')
                .select('security_pin_hash')
                .eq('user_id', activeUserId)
                .maybeSingle();
              resolvedHasPin = Boolean(ph?.security_pin_hash);
            } else if (activeRole === 'doctor') {
              const { data: doc } = await supabase
                .from('doctors')
                .select('security_pin_hash')
                .eq('user_id', activeUserId)
                .maybeSingle();
              resolvedHasPin = Boolean(doc?.security_pin_hash);
            }
          } catch (dbErr) {
            console.warn('Direct security credential check note:', dbErr);
          }
        }

        if (!isMounted) return;

        if (resolvedHasPin === true) {
          setStatus('COMPLETED', activeUserId);
        } else if (resolvedHasPin === false) {
          setStatus('NOT_STARTED', activeUserId);
          openEnrollmentModal(undefined, true);
        }
      } catch (err) {
        console.error('Error fetching security status:', err);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    checkSecurity();

    return () => {
      isMounted = false;
    };
  }, [userId, normalizedRole, resetForUser, setStatus, openEnrollmentModal]);

  return { status, isLoading };
}

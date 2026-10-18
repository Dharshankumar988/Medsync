import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { SecurityService } from '@/services/security.service';
import { useSecurityStore } from '@/store/useSecurityStore';

export function useSecurityEnrollment(userId?: string, role?: string) {
  const { status, setStatus } = useSecurityStore();
  const isInitiallyEnrolled = status === 'COMPLETED' || status === 'PIN_CREATED';
  const [isLoading, setIsLoading] = useState(!isInitiallyEnrolled);

  useEffect(() => {
    let isMounted = true;

    async function checkSecurity() {
      try {
        let activeUserId = userId;
        let activeRole = (role || '').toLowerCase();

        // 1. Auto-resolve session if parameters are not yet populated by caller
        if (!activeUserId || !activeRole) {
          const { data: { session } } = await supabase.auth.getSession();
          if (session?.user) {
            activeUserId = activeUserId || session.user.id;
            activeRole = activeRole || (session.user.user_metadata?.role || session.user.app_metadata?.role || 'patient').toLowerCase();
          }
        }

        if (!activeUserId || activeRole !== 'patient') {
          if (isMounted) setIsLoading(false);
          return;
        }

        // 2. Direct Supabase credential check (fast, resilient against backend spin-down)
        try {
          const { data: cred } = await supabase
            .from('patient_security_credentials')
            .select('id, is_active')
            .eq('patient_id', activeUserId)
            .maybeSingle();

          if (cred && cred.is_active !== false) {
            if (isMounted) {
              setStatus('COMPLETED');
              setIsLoading(false);
            }
            return;
          }
        } catch (dbErr) {
          console.warn('Direct security credential check note:', dbErr);
        }

        // 3. Authoritative check via backend API
        const { data: session } = await supabase.auth.getSession();
        if (session?.session?.access_token) {
          const res = await SecurityService.getStatus(session.session.access_token);
          const statusVal = res?.data?.status || res?.status || 'NOT_STARTED';
          if (isMounted) {
            setStatus(statusVal);
          }
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
  }, [userId, role]);

  return { status, isLoading };
}

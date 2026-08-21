import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { SecurityService } from '@/services/security.service';

export function useSecurityEnrollment(userId: string | undefined, role: string | undefined) {
  const [status, setStatus] = useState<string>('NOT_STARTED');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!userId || role !== 'patient') {
      setIsLoading(false);
      return;
    }

    async function checkSecurity() {
      setIsLoading(true);
      try {
        const { data: session } = await supabase.auth.getSession();
        if (session?.session?.access_token) {
          const res = await SecurityService.getStatus(session.session.access_token);
          setStatus(res.status);
        }
      } catch (err) {
        console.error('Error fetching security status:', err);
      } finally {
        setIsLoading(false);
      }
    }

    checkSecurity();
  }, [userId, role]);

  return { status, isLoading };
}

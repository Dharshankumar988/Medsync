import { useState, useEffect, useCallback } from 'react';

const THROTTLE_KEY = 'medsync_profile_popup_last_shown';
const THROTTLE_DURATION_MS = 30 * 60 * 1000; // 30 minutes

/**
 * Hook that throttles the profile completion popup to show at most once every 30 minutes.
 * Returns whether the popup should be shown and a function to dismiss it.
 */
export function useProfilePopupThrottle() {
  const [shouldShow, setShouldShow] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    const lastShown = localStorage.getItem(THROTTLE_KEY);
    const now = Date.now();

    if (!lastShown || now - parseInt(lastShown, 10) > THROTTLE_DURATION_MS) {
      setShouldShow(true);
    }
  }, []);

  const dismiss = useCallback(() => {
    setShouldShow(false);
    if (typeof window !== 'undefined') {
      localStorage.setItem(THROTTLE_KEY, Date.now().toString());
    }
  }, []);

  const markShown = useCallback(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(THROTTLE_KEY, Date.now().toString());
    }
  }, []);

  return { shouldShow, dismiss, markShown };
}

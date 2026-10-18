import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface SecurityState {
  isEnrollmentModalOpen: boolean;
  status: string;
  onSuccessCallback: (() => void) | null;
  openEnrollmentModal: (onSuccess?: () => void) => void;
  closeEnrollmentModal: () => void;
  setStatus: (status: string) => void;
}

export const useSecurityStore = create<SecurityState>()(
  persist(
    (set) => ({
      isEnrollmentModalOpen: false,
      status: 'NOT_STARTED',
      onSuccessCallback: null,
      openEnrollmentModal: (onSuccess) => set({ 
        isEnrollmentModalOpen: true,
        onSuccessCallback: onSuccess || null
      }),
      closeEnrollmentModal: () => set({ 
        isEnrollmentModalOpen: false,
        onSuccessCallback: null
      }),
      setStatus: (status: string) => set({ status }),
    }),
    {
      name: 'medsync-security-storage',
      partialize: (state) => ({ status: state.status }),
    }
  )
);

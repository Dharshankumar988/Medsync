import { create } from 'zustand';

interface SecurityState {
  isEnrollmentModalOpen: boolean;
  status: string;
  onSuccessCallback: (() => void) | null;
  openEnrollmentModal: (onSuccess?: () => void) => void;
  closeEnrollmentModal: () => void;
  setStatus: (status: string) => void;
}

export const useSecurityStore = create<SecurityState>((set) => ({
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
}));

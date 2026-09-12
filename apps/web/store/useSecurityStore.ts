import { create } from 'zustand';

interface SecurityState {
  isEnrollmentModalOpen: boolean;
  status: string;
  openEnrollmentModal: () => void;
  closeEnrollmentModal: () => void;
  setStatus: (status: string) => void;
}

export const useSecurityStore = create<SecurityState>((set) => ({
  isEnrollmentModalOpen: false,
  status: 'NOT_STARTED',
  openEnrollmentModal: () => set({ isEnrollmentModalOpen: true }),
  closeEnrollmentModal: () => set({ isEnrollmentModalOpen: false }),
  setStatus: (status: string) => set({ status }),
}));

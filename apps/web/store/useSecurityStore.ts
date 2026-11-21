import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface SecurityState {
  isEnrollmentModalOpen: boolean;
  isMandatory: boolean;
  status: string;
  checkedUserId: string | null;
  dismissedForSession: boolean;
  onSuccessCallback: (() => void) | null;
  openEnrollmentModal: (onSuccess?: () => void, mandatory?: boolean) => void;
  closeEnrollmentModal: () => void;
  completeEnrollment: () => void;
  setStatus: (status: string, userId?: string | null) => void;
  resetForUser: (userId: string | null) => void;
}

export const useSecurityStore = create<SecurityState>()(
  persist(
    (set, get) => ({
      isEnrollmentModalOpen: false,
      isMandatory: false,
      status: 'UNKNOWN',
      checkedUserId: null,
      dismissedForSession: false,
      onSuccessCallback: null,
      openEnrollmentModal: (onSuccess, mandatory = false) =>
        set({
          isEnrollmentModalOpen: true,
          isMandatory: mandatory,
          onSuccessCallback: onSuccess || null,
        }),
      closeEnrollmentModal: () => {
        set({
          isEnrollmentModalOpen: false,
          isMandatory: false,
          dismissedForSession: true,
          onSuccessCallback: null,
        });
      },
      completeEnrollment: () =>
        set({
          status: 'COMPLETED',
          isEnrollmentModalOpen: false,
          isMandatory: false,
          dismissedForSession: false,
          onSuccessCallback: null,
        }),
      setStatus: (status: string, userId?: string | null) =>
        set((state) => ({
          status,
          checkedUserId: userId !== undefined ? userId : state.checkedUserId,
        })),
      resetForUser: (userId: string | null) => {
        if (get().checkedUserId !== userId) {
          set({
            checkedUserId: userId,
            status: 'UNKNOWN',
            dismissedForSession: false,
            isEnrollmentModalOpen: false,
            isMandatory: false,
            onSuccessCallback: null,
          });
        }
      },
    }),
    {
      name: 'medsync-security-storage',
      partialize: (state) => ({
        status: state.status,
        checkedUserId: state.checkedUserId,
      }),
    }
  )
);

import { create } from 'zustand';
import { SprintResult } from '../types/sprint.types';

interface UIState {
  // State
  showSprintResult: boolean;
  lastSprintResult: SprintResult | null;
  toastMessage: string | null;

  // Actions
  showResult: (result: SprintResult) => void;
  dismissResult: () => void;
  toast: (message: string) => void;
  clearToast: () => void;
}

export const useUIStore = create<UIState>()((set) => ({
  showSprintResult: false,
  lastSprintResult: null,
  toastMessage: null,

  showResult: (result: SprintResult) =>
    set({
      lastSprintResult: result,
      showSprintResult: true,
    }),

  dismissResult: () =>
    set({ showSprintResult: false }),

  toast: (message: string) =>
    set({ toastMessage: message }),

  clearToast: () =>
    set({ toastMessage: null }),
}));

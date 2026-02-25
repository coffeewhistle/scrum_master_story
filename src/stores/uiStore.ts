import { create } from 'zustand';
import { SprintResult } from '../types/sprint.types';

interface UIState {
  // State
  showSprintResult: boolean;
  lastSprintResult: SprintResult | null;
  toastMessage: string | null;
  canShipEarly: boolean;

  // Actions
  showResult: (result: SprintResult) => void;
  dismissResult: () => void;
  toast: (message: string) => void;
  clearToast: () => void;
  setCanShipEarly: (value: boolean) => void;
}

export const useUIStore = create<UIState>()((set) => ({
  showSprintResult: false,
  lastSprintResult: null,
  toastMessage: null,
  canShipEarly: false,

  showResult: (result: SprintResult) =>
    set({
      lastSprintResult: result,
      showSprintResult: true,
      canShipEarly: false,
    }),

  dismissResult: () =>
    set({ showSprintResult: false }),

  toast: (message: string) =>
    set({ toastMessage: message }),

  clearToast: () =>
    set({ toastMessage: null }),

  setCanShipEarly: (value: boolean) =>
    set({ canShipEarly: value }),
}));

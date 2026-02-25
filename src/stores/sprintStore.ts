import { create } from 'zustand';
import { SprintPhase, Contract } from '../types/sprint.types';
import { DEFAULT_SPRINT_DAYS, STARTING_CASH } from '../constants/game.constants';

interface SprintState {
  // State
  phase: SprintPhase;
  currentDay: number;
  totalDays: number;
  cashOnHand: number;
  currentContract: Contract | null;
  sprintNumber: number;

  // Actions
  startSprint: (contract: Contract) => void;
  advanceDay: () => void;
  endSprint: () => void;
  collectPayout: (amount: number) => void;
  spendCash: (amount: number) => void;
  reset: () => void;
}

const initialState = {
  phase: 'idle' as SprintPhase,
  currentDay: 0,
  totalDays: DEFAULT_SPRINT_DAYS,
  cashOnHand: STARTING_CASH,
  currentContract: null as Contract | null,
  sprintNumber: 0,
};

export const useSprintStore = create<SprintState>()((set) => ({
  ...initialState,

  startSprint: (contract: Contract) =>
    set((state) => ({
      phase: 'active' as SprintPhase,
      currentDay: 1,
      totalDays: contract.sprintDays,
      currentContract: contract,
      sprintNumber: state.sprintNumber + 1,
    })),

  advanceDay: () =>
    set((state) => ({
      currentDay: state.currentDay + 1,
    })),

  endSprint: () =>
    set({
      phase: 'review',
    }),

  collectPayout: (amount: number) =>
    set((state) => ({
      cashOnHand: state.cashOnHand + amount,
      phase: 'idle',
      currentContract: null,
      currentDay: 0,
    })),

  spendCash: (amount: number) =>
    set((state) => ({
      cashOnHand: Math.max(0, state.cashOnHand - amount),
    })),

  reset: () => set(initialState),
}));

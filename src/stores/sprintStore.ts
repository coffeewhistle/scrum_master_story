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
  /** Total sprints played across all contracts (for display) */
  sprintNumber: number;

  // Actions
  /** Begin planning phase for a new contract */
  acceptContract: (contract: Contract) => void;
  /** Transition from planning → active (called when planning day ends) */
  startActivePhase: () => void;
  advanceDay: () => void;
  endSprint: () => void;
  /** Advance to next sprint within the same contract (planning → planning) */
  advanceContractSprint: () => void;
  /** Close the contract and bank payout */
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

  acceptContract: (contract: Contract) =>
    set((state) => ({
      phase: 'planning',
      currentDay: 1,
      totalDays: contract.sprintDays,
      currentContract: contract,
      sprintNumber: state.sprintNumber + 1,
    })),

  startActivePhase: () =>
    set({ phase: 'active' }),

  advanceDay: () =>
    set((state) => ({
      currentDay: state.currentDay + 1,
    })),

  endSprint: () =>
    set({ phase: 'review' }),

  advanceContractSprint: () =>
    set((state) => {
      if (!state.currentContract) return state;
      return {
        phase: 'planning',
        currentDay: 1,
        currentContract: {
          ...state.currentContract,
          currentSprint: state.currentContract.currentSprint + 1,
        },
        sprintNumber: state.sprintNumber + 1,
      };
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

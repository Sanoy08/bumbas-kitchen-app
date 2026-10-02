// src/shared/store/sessionStore.ts
// Simple in-memory session store (resets on app restart — intentional)
import { create } from 'zustand';

interface SessionState {
  hasOrderedThisSession: boolean;
  setHasOrdered: () => void;
}

export const useSessionStore = create<SessionState>((set) => ({
  hasOrderedThisSession: false,
  setHasOrdered: () => set({ hasOrderedThisSession: true }),
}));

// src/store/tabBarStore.ts
import { create } from 'zustand';

interface TabBarState {
  isVisible: boolean;
  setVisibility: (visible: boolean) => void;
}

export const useTabBarStore = create<TabBarState>((set) => ({
  isVisible: true,
  setVisibility: (visible) => set({ isVisible: visible }),
}));
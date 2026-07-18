import { create } from 'zustand';

interface NotificationState {
  hasUnread: boolean;
  setHasUnread: (value: boolean) => void;
}

export const useNotificationStore = create<NotificationState>((set) => ({
  hasUnread: false,
  setHasUnread: (value) => set({ hasUnread: value }),
}));

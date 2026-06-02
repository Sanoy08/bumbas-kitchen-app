import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

export type User = {
  id: string;
  name: string;
  email: string;
  role: string;
  phone?: string;
  address?: string;
  picture?: string;
  wallet?: any;
  dob?: string;
  anniversary?: string;
};

interface AuthState {
  user: User | null;
  token: string | null;
  isInitialized: boolean;
  login: (userData: User, token?: string) => Promise<void>;
  logout: () => Promise<void>;
  initAuth: () => Promise<void>;
}

const TOKEN_KEY = 'auth_token';

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isInitialized: false,

      // লগিন: ইউজার ডেটা Zustand-এ এবং টোকেন Secure Store-এ সেভ হবে
      login: async (userData, token) => {
        if (token) {
          await SecureStore.setItemAsync(TOKEN_KEY, token);
        }
        set({ user: userData, token });
      },

      // লগআউট: টোকেন ডিলিট করে স্টেট ক্লিয়ার করা হবে
      logout: async () => {
        await SecureStore.deleteItemAsync(TOKEN_KEY);
        set({ user: null, token: null });
      },

      // অ্যাপ ওপেন হওয়ার সাথে সাথে টোকেন চেক করার ফাংশন
      initAuth: async () => {
        try {
          const token = await SecureStore.getItemAsync(TOKEN_KEY);
          set({ token, isInitialized: true });
        } catch (error) {
          set({ token: null, isInitialized: true });
        }
      },
    }),
    {
      name: 'bumbas_user_cache',
      storage: createJSONStorage(() => AsyncStorage),
      // AsyncStorage-এ শুধুমাত্র ইউজার ডেটা সেভ থাকবে (জিরো-সেকেন্ড লোডের জন্য), টোকেন নয়
      partialize: (state) => ({ user: state.user }), 
    }
  )
);
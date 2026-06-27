// src/store/authStore.ts

import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { useCartStore } from './cartStore'; // ★ Cart Store ইমপোর্ট করা হলো

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
  savedAddresses?: any[];
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
    (set, get) => ({
      user: null,
      token: null,
      isInitialized: false,

      // লগইন: ইউজার ডেটা Zustand-এ এবং টোকেন Secure Store-এ সেভ হবে
      login: async (userData, token) => {
        if (token) {
          await SecureStore.setItemAsync(TOKEN_KEY, token);
        }
        set({ user: userData, token });

        // ★ লগইন হওয়ার পর Cart ডাটা ব্যাকএন্ড থেকে ফেচ করা হবে
        useCartStore.getState().fetchCartFromDB();
      },

      // লগআউট: টোকেন ডিলিট করে স্টেট ক্লিয়ার করা হবে
      logout: async () => {
        await SecureStore.deleteItemAsync(TOKEN_KEY);
        set({ user: null, token: null });

        // ★ লগআউট হওয়ার পর Cart ক্লিয়ার করে দেওয়া হবে
        useCartStore.getState().clearCart();
      },

      // অ্যাপ ওপেন হওয়ার সাথে সাথে টোকেন চেক করার ফাংশন
      initAuth: async () => {
        try {
          const token = await SecureStore.getItemAsync(TOKEN_KEY);
          set({ token, isInitialized: true });

          // ★ অ্যাপ ওপেন হলে টোকেন থাকলে Cart ডাটা ফেচ হবে
          if (token) {
            useCartStore.getState().fetchCartFromDB();
          }
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
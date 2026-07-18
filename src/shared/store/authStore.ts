// src/store/authStore.ts

import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { useCartStore } from '@/shared/store/cartStore'; // ★ Cart Store ইমপোর্ট করা হলো

export type User = {
  id: string;
  name: string;
  email: string;
  role: string;
  phone?: string;
  firstName?: string;
  lastName?: string;
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
  updateUser: (data: Partial<User>) => void;
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
        set((state) => ({ 
          user: userData, 
          token: token !== undefined ? token : state.token 
        }));

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
        const API_URL = process.env.EXPO_PUBLIC_API_URL || 'https://www.bumbaskitchen.app/api';
        try {
          const token = await SecureStore.getItemAsync(TOKEN_KEY);
          console.log('[Auth] initAuth — token found:', !!token);
          if (!token) {
            set({ token: null, isInitialized: true });
            return;
          }

          // Token ache — /api/auth/me theke fresh user data fetch koro
          try {
            console.log('[Auth] Fetching user from /auth/me...');
            const res = await fetch(`${API_URL}/auth/me`, {
              headers: { 'Authorization': `Bearer ${token}` },
            });
            const data = await res.json();
            if (data.success && data.user) {
              console.log('[Auth] ✅ User loaded:', data.user.name);
              set({ token, user: data.user, isInitialized: true });
            } else {
              console.log('[Auth] ❌ Token invalid/expired — logging out');
              await SecureStore.deleteItemAsync(TOKEN_KEY);
              set({ token: null, user: null, isInitialized: true });
              return;
            }
          } catch (e) {
            console.log('[Auth] ⚠️ Network error — using cached user');
            set({ token, isInitialized: true });
          }

          useCartStore.getState().fetchCartFromDB();
        } catch (error) {
          set({ token: null, isInitialized: true });
        }
      },

      // Update user details partially without requiring full login
      updateUser: (data) => {
        set((state) => ({
          user: state.user ? { ...state.user, ...data } : null,
        }));
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
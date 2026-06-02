// src/store/cartStore.ts

import type { CartItem, Product } from '@/lib/types';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Pusher from 'pusher-js';
import { Alert } from 'react-native';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { useAuthStore } from './authStore'; // Auth Store থেকে ইউজার ডেটা নেওয়ার জন্য

// API URL Setup
const API_URL = process.env.EXPO_PUBLIC_API_URL || 'https://your-backend.vercel.app/api';

type CheckoutState = {
  couponCode: string;
  couponDiscount: number;
  useCoins: boolean;
};

interface CartState {
  items: CartItem[];
  checkoutState: CheckoutState;
  isSyncing: boolean;
  isDirty: boolean;
  
  // Actions
  addItem: (product: Product, quantity?: number, showToast?: boolean) => void;
  removeItem: (id: string) => void;
  updateQuantity: (id: string, quantity: number) => void;
  clearCart: () => void;
  setCheckoutData: (data: Partial<CheckoutState>) => void;
  setCartItems: (items: CartItem[]) => void;
  
  // Sync logic
  syncToDatabase: () => Promise<void>;
  initPusher: () => void;
  
  // Getters
  getItemCount: () => number;
  getTotalPrice: () => number;
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      checkoutState: { couponCode: '', couponDiscount: 0, useCoins: false },
      isSyncing: false,
      isDirty: false,

      // ★ Add Item
      addItem: (product, quantity = 1, showToast = true) => {
        const { items } = get();
        const existingItem = items.find((item) => item.id === product.id);
        const maxStock = product.stock || 100;
        const currentQty = existingItem ? existingItem.quantity : 0;

        if (currentQty + quantity > maxStock) {
          Alert.alert('Stock Limit', `Only ${maxStock} items available.`);
          return;
        }

        let newItems;
        if (existingItem) {
          newItems = items.map((item) =>
            item.id === product.id ? { ...item, quantity: item.quantity + quantity } : item
          );
        } else {
          const newItem: CartItem = {
            id: product.id,
            slug: product.slug,
            name: product.name,
            price: product.price,
            image: product.images && product.images.length > 0 ? product.images : { id: 'def', url: '', alt: product.name },
            quantity: quantity,
          };
          newItems = [...items, newItem];
        }

        set({ items: newItems, isDirty: true });
        // React Native-এ toast.success এর বদলে আপাতত আমরা কিছু দিচ্ছি না, 
        // আপনি চাইলে 'react-native-toast-message' লাইব্রেরি ব্যবহার করতে পারেন।
      },

      // ★ Remove Item
      removeItem: (id) => {
        set((state) => ({
          items: state.items.filter((item) => item.id !== id),
          isDirty: true,
        }));
      },

      // ★ Update Quantity
      updateQuantity: (id, quantity) => {
        if (quantity <= 0) {
          get().removeItem(id);
          return;
        }
        set((state) => ({
          items: state.items.map((item) => (item.id === id ? { ...item, quantity } : item)),
          isDirty: true,
        }));
      },

      // ★ Clear Cart
      clearCart: () => {
        set({ items: [], checkoutState: { couponCode: '', couponDiscount: 0, useCoins: false }, isDirty: true });
        const user = useAuthStore.getState().user;
        if (user) {
          get().syncToDatabase();
        }
      },

      setCheckoutData: (data) => {
        set((state) => ({ checkoutState: { ...state.checkoutState, ...data } }));
      },

      setCartItems: (items) => {
        set({ items, isDirty: false });
      },

      // ★ Sync to Database (Vercel Backend)
      syncToDatabase: async () => {
        const { items } = get();
        const user = useAuthStore.getState().user;
        
        if (!user) return;
        
        set({ isSyncing: true });
        try {
          await fetch(`${API_URL}/cart`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ items }),
          });
          set({ isDirty: false, isSyncing: false });
        } catch (error) {
          console.error("Cart Sync failed", error);
          set({ isSyncing: false });
        }
      },

      // ★ Pusher Real-time Init
      initPusher: () => {
        const user = useAuthStore.getState().user;
        if (!user) return;

        const pusher = new Pusher(process.env.EXPO_PUBLIC_PUSHER_KEY!, {
          cluster: process.env.EXPO_PUBLIC_PUSHER_CLUSTER!,
        });

        const channel = pusher.subscribe(`user-${user.id}`);
        
        channel.bind('cart-updated', (data: { items: CartItem[] }) => {
          const { isSyncing } = get();
          // যদি অ্যাপ নিজে সিঙ্ক না করে থাকে, তবেই পুশার থেকে ডেটা নেবে
          if (!isSyncing) {
            set({ items: data.items, isDirty: false });
          }
        });

        return () => {
          pusher.unsubscribe(`user-${user.id}`);
        };
      },

      // ★ Getters
      getItemCount: () => get().items.reduce((count, item) => count + item.quantity, 0),
      getTotalPrice: () => get().items.reduce((total, item) => total + item.price * item.quantity, 0),
    }),
    {
      name: 'bumbas-kitchen-cart',
      storage: createJSONStorage(() => AsyncStorage),
      // শুধুমাত্র items এবং checkoutState লোকালি সেভ হবে
      partialize: (state) => ({ items: state.items, checkoutState: state.checkoutState }),
    }
  )
);
import type { CartItem, Product } from '@/lib/types';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Pusher from 'pusher-js';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { useAuthStore } from './authStore';

// Toast use korar jonno (jodi react-native-toast-message use koren)
// import Toast from 'react-native-toast-message';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'https://www.bumbaskitchen.app/api';

type CheckoutState = {
  couponCode: string;
  couponDiscount: number;
  useCoins: boolean;coinDiscount?: number;
};

interface CartState {
  items: CartItem[];
  checkoutState: CheckoutState;
  isSyncing: boolean;
  isDirty: boolean;
  isInitialized: boolean;
  syncIntervalId: NodeJS.Timeout | null;

  // Actions
  addItem: (product: Product, quantity?: number, showToast?: boolean) => void;
  removeItem: (id: string) => void;
  updateQuantity: (id: string, quantity: number) => void;
  clearCart: () => void;
  setCheckoutData: (data: Partial<CheckoutState>) => void;
  setCartItems: (items: CartItem[]) => void;
  setIsInitialized: (val: boolean) => void;

  // Sync logic
  fetchCartFromDB: () => Promise<void>;
  syncToDatabase: () => Promise<void>;
  initPusher: () => void;
  startAutoSync: () => void; // ★ Notun: 30s Interval Sync
  stopAutoSync: () => void;

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
      isInitialized: false,
      syncIntervalId: null,

      setIsInitialized: (val) => set({ isInitialized: val }),

      // ★ Next.js er moto App khullar por Initial Fetch
      fetchCartFromDB: async () => {
        const token = useAuthStore.getState().token;
        if (!token) {
            set({ isInitialized: true });
            return;
        }

        try {
          const res = await fetch(`${API_URL}/cart`, {
            method: 'GET',
            headers: { 
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}` 
            }
          });
          const data = await res.json();
          if (data.success && data.items) {
            set({ items: data.items, isDirty: false });
          } else {
             // DB theke fail korle kintu local storage e thakle dirty true kora (Next.js behavior)
             if (get().items.length > 0) {
                 set({ isDirty: true });
             }
          }
        } catch (error) {
          console.error("Cart Fetch failed", error);
        } finally {
            set({ isInitialized: true });
        }
      },

      // ★ Add Item (Next.js image logic and Toast setup)
      addItem: (product, quantity = 1, showToast = true) => {
        const { items } = get();
        const existingItem = items.find((item) => item.id === product.id);
        const maxStock = product.stock || 100;
        const currentQty = existingItem ? existingItem.quantity : 0;

        if (currentQty + quantity > maxStock) {
          // Toast.show({ type: 'error', text1: `Only ${maxStock} items available.` });
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
            // ★ FIX: Next.js er moto Array er poriborte Index 0 theke neoya hocche
            image: product.images && product.images.length > 0 ? product.images[0] : { id: 'def', url: '', alt: product.name },
            quantity: quantity,
          };
          newItems = [...items, newItem];
        }

        set({ items: newItems, isDirty: true });

        if (showToast) {
           // Toast.show({ type: 'success', text1: `Added "${product.name}" to cart` });
        }
      },

      // ★ Remove Item
      removeItem: (id) => {
        set((state) => ({
          items: state.items.filter((item) => item.id !== id),
          isDirty: true,
        }));
        // Toast.show({ type: 'info', text1: "Item removed" });
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
        if (useAuthStore.getState().token) {
          // Empty pathanor jonno database e sathei sathei sync korbe
          get().syncToDatabase();
        }
      },

      setCheckoutData: (data) => {
        set((state) => ({ checkoutState: { ...state.checkoutState, ...data } }));
      },

      setCartItems: (items) => {
        set({ items, isDirty: false });
      },

      // ★ Database e POST Request (Direct call kora jabe na, 30s interval e hobe)
      syncToDatabase: async () => {
        const { items } = get();
        const token = useAuthStore.getState().token; 
        
        if (!token) return;
        
        set({ isSyncing: true });
        try {
          await fetch(`${API_URL}/cart`, {
            method: 'POST',
            headers: { 
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}` 
            },
            body: JSON.stringify({ items }),
          });
          set({ isDirty: false, isSyncing: false });
        } catch (error) {
          console.error("Cart Sync failed", error);
          set({ isSyncing: false });
        }
      },

      // ★ 30-Second Auto Sync Interval (Exact Next.js Logic)
      startAutoSync: () => {
         // Clear any existing intervals
         get().stopAutoSync();
         
         const interval = setInterval(() => {
            const { isDirty, isSyncing } = get();
            const token = useAuthStore.getState().token;
            if (token && isDirty && !isSyncing) {
               get().syncToDatabase();
            }
         }, 30000);
         
         set({ syncIntervalId: interval });
      },

      stopAutoSync: () => {
         const { syncIntervalId } = get();
         if (syncIntervalId) {
            clearInterval(syncIntervalId);
            set({ syncIntervalId: null });
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
          if (!isSyncing) {
            set({ items: data.items, isDirty: false });
          }
        });

        return () => {
          pusher.unsubscribe(`user-${user.id}`);
          pusher.disconnect();
        };
      },

      // ★ Getters
      getItemCount: () => get().items.reduce((count, item) => count + item.quantity, 0),
      getTotalPrice: () => get().items.reduce((total, item) => total + item.price * item.quantity, 0),
    }),
    {
      name: 'bumbas-kitchen-cart',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({ items: state.items, checkoutState: state.checkoutState }),
    }
  )
);
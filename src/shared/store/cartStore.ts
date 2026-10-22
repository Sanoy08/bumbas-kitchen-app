import type { CartItem, Product } from '@/shared/types/types';
import { createMMKV } from 'react-native-mmkv';
import { AppState, type NativeEventSubscription } from 'react-native';
import Pusher from 'pusher-js';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { useAuthStore } from '@/shared/store/authStore';

import { toast } from 'sonner-native';
import { isSameDish } from '@/shared/utils/utils';
import { showGlobalAlert } from '@/shared/components/ui/CustomAlert';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'https://www.bumbaskitchen.app/api';

// --- MMKV Storage Setup ---
const storage = createMMKV();
const zustandStorage = {
  setItem: (name: string, value: string) => {
    return storage.set(name, value);
  },
  getItem: (name: string) => {
    const value = storage.getString(name);
    return value ?? null;
  },
  removeItem: (name: string) => {
    return storage.remove(name);
  },
};

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
  syncIntervalId: ReturnType<typeof setTimeout> | null;
  appStateSubscription: NativeEventSubscription | null;
  
  // Conflict Resolution
  pendingConflictProduct: Product | null;
  pendingConflictQuantity: number;
  conflictType: 'special_offer_clash' | 'regular_qty_under_3' | 'existing_regular_under_3' | null;
  setPendingConflict: (product: Product | null, quantity?: number, conflictType?: 'special_offer_clash' | 'regular_qty_under_3' | 'existing_regular_under_3' | null) => void;
  resolveConflict: (action: boolean | 'clear_and_add' | 'bump_quantity_and_add') => void;

  // Actions
  addItem: (product: Product, quantity?: number, showToast?: boolean) => void;
  removeItem: (id: string) => void;
  updateQuantity: (id: string, quantity: number) => void;
  clearCart: () => void;
  setCheckoutData: (data: Partial<CheckoutState>) => void;
  setCartItems: (items: CartItem[]) => void;
  setIsInitialized: (val: boolean) => void;
  validateSpecialOffers: (activeOffers: any[]) => string[];

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
      appStateSubscription: null,
      pendingConflictProduct: null,
      pendingConflictQuantity: 1,
      conflictType: null,

      setPendingConflict: (product, quantity = 1, conflictType = null) => 
        set({ pendingConflictProduct: product, pendingConflictQuantity: quantity, conflictType }),

      resolveConflict: (action) => {
        const { pendingConflictProduct, pendingConflictQuantity, conflictType, items, removeItem, addItem, updateQuantity } = get();
        if (!pendingConflictProduct || action === false) {
          set({ pendingConflictProduct: null, pendingConflictQuantity: 1, conflictType: null });
          return;
        }

        if (action === true || action === 'clear_and_add') {
          // Remove ALL items because they cannot be mixed
          items.forEach(item => {
            removeItem(item.id);
          });
          
          setTimeout(() => {
            get().addItem(pendingConflictProduct, pendingConflictQuantity, true);
          }, 50);
        } else if (action === 'bump_quantity_and_add') {
          if (conflictType === 'regular_qty_under_3') {
            // Add regular item with minimum 3 servings
            get().addItem(pendingConflictProduct, Math.max(3, pendingConflictQuantity), true);
          } else if (conflictType === 'existing_regular_under_3') {
            // Bump all regular items in cart to quantity 3, then add Today's Special
            items.forEach(item => {
              if (!item.isSpecialOffer && !item.isDailySpecial && item.quantity < 3) {
                updateQuantity(item.id, 3);
              }
            });
            setTimeout(() => {
              get().addItem(pendingConflictProduct, pendingConflictQuantity, true);
            }, 50);
          }
        }
        set({ pendingConflictProduct: null, pendingConflictQuantity: 1, conflictType: null });
      },

      setIsInitialized: (val) => set({ isInitialized: val }),

      // ★ Smart Initial Fetch: If local cart has unsynced changes (isDirty === true), push to DB instead of overwriting!
      fetchCartFromDB: async () => {
        const token = useAuthStore.getState().token;
        if (!token) {
            set({ isInitialized: true });
            return;
        }

        const { isDirty, items } = get();

        // ★ CRITICAL FIX: If user added items before killing the app, local cart has unsynced items.
        // DO NOT overwrite with outdated DB cart! Instead, push local cart to DB.
        if (isDirty) {
          console.log(`[Cart] Local cart has unsynced changes (${items.length} items). Pushing to DB on startup...`);
          await get().syncToDatabase();
          set({ isInitialized: true });
          return;
        }

        try {
          const res = await fetch(`${API_URL}/cart`, {
            method: 'GET',
            headers: { 
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`,
            }
          });
          const data = await res.json();
          if (data.success && data.items) {
            const currentItems = get().items;

            let cachedSpecials: any[] = [];
            try {
              const cached = await AsyncStorage.getItem('bumbas_home_data');
              if (cached) {
                const parsed = JSON.parse(cached);
                cachedSpecials = parsed.todaysSpecials || [];
              }
            } catch {}

            const enrichedItems = data.items.map((dbItem: CartItem) => {
              const matchedLocal = currentItems.find(local => isSameDish(local, dbItem));
              const specialMatch = cachedSpecials.find(s => isSameDish(s, dbItem));
              const isSpecial = Boolean(
                dbItem.isDailySpecial || 
                matchedLocal?.isDailySpecial || 
                specialMatch || 
                (!dbItem.isSpecialOffer && (dbItem.deliveryDate || (dbItem.mealType && dbItem.mealType !== 'all')))
              );

              return {
                ...dbItem,
                dishId: dbItem.dishId || matchedLocal?.dishId || specialMatch?.dishId || specialMatch?.id,
                isDailySpecial: isSpecial,
                deliveryDate: dbItem.deliveryDate || matchedLocal?.deliveryDate || specialMatch?.deliveryDate || specialMatch?.date,
                mealType: dbItem.mealType || matchedLocal?.mealType || specialMatch?.mealType,
              };
            });

            set({ items: enrichedItems, isDirty: false });
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

        // Match existing item using isSameDish (matches by id, dishId, slug, or name)
        const existingItem = items.find((item) => isSameDish(item, product));

        // --- Conflict Check ---
        if (items.length > 0) {
          const hasSpecialOffer = items.some(i => i.isSpecialOffer);
          const isProductSpecialOffer = !!product.isSpecialOffer;

          // 1. Special Offer Clash (Festivals / Campaigns)
          if (hasSpecialOffer !== isProductSpecialOffer) {
            set({ 
              pendingConflictProduct: product, 
              pendingConflictQuantity: quantity,
              conflictType: 'special_offer_clash'
            });
            return;
          }

          // 2. Today's Special vs OTHER Regular Dishes Rule:
          // Notice: Exclude existingItem if it is the SAME dish (same dish merges smoothly!)
          const otherItems = items.filter(i => !isSameDish(i, product));

          const hasOtherDailySpecial = otherItems.some(i => i.isDailySpecial);
          const isIncomingDailySpecial = Boolean(product.isDailySpecial || existingItem?.isDailySpecial);
          const isIncomingRegularOnly = !product.isSpecialOffer && !product.isDailySpecial && !existingItem?.isDailySpecial;

          // If cart has Today's Special among OTHER items, and user is adding a strictly regular dish:
          if (hasOtherDailySpecial && isIncomingRegularOnly) {
            const existingRegularQty = (existingItem?.quantity || 0) + quantity;
            if (existingRegularQty < 3) {
              set({
                pendingConflictProduct: product,
                pendingConflictQuantity: quantity,
                conflictType: 'regular_qty_under_3'
              });
              return;
            }
          }

          // If incoming dish is or becomes Today's Special, check if any OTHER regular dish in cart has quantity < 3:
          if (isIncomingDailySpecial && otherItems.length > 0) {
            const anyOtherRegularUnder3 = otherItems.some(i => !i.isSpecialOffer && !i.isDailySpecial && i.quantity < 3);
            if (anyOtherRegularUnder3) {
              set({
                pendingConflictProduct: product,
                pendingConflictQuantity: quantity,
                conflictType: 'existing_regular_under_3'
              });
              return;
            }
          }
        }

        const maxStock = product.stock || 100;
        const currentQty = existingItem ? existingItem.quantity : 0;

        if (currentQty + quantity > maxStock) {
          // Toast.show({ type: 'error', text1: `Only ${maxStock} items available.` });
          return;
        }

        const deliveryDateVal = product.deliveryDate || (product as any).date;

        let newItems;
        if (existingItem) {
          // ★ MERGE: Same dish exists in cart! Merge quantities & promote to Today's Special if applicable
          const isMergedSpecial = Boolean(existingItem.isDailySpecial || product.isDailySpecial);
          const mergedDeliveryDate = deliveryDateVal || existingItem.deliveryDate;
          const mergedMealType = (product.mealType && product.mealType !== 'both' ? product.mealType : existingItem.mealType) || product.mealType || existingItem.mealType;
          const mergedDishId = product.dishId || existingItem.dishId || product.id || existingItem.id;

          newItems = items.map((item) =>
            isSameDish(item, product) ? { 
                ...item, 
                quantity: item.quantity + quantity,
                dishId: mergedDishId,
                isSpecialOffer: product.isSpecialOffer !== undefined ? product.isSpecialOffer : item.isSpecialOffer,
                deliveryDate: mergedDeliveryDate,
                orderCutoffTime: product.orderCutoffTime !== undefined ? product.orderCutoffTime : item.orderCutoffTime,
                mealType: mergedMealType,
                isDailySpecial: isMergedSpecial
            } : item
          );
        } else {
          const newItem: CartItem = {
            id: product.id,
            dishId: product.dishId || product.id,
            slug: product.slug,
            name: product.name,
            price: product.price,
            image: product.images && product.images.length > 0 ? product.images[0] : { id: 'def', url: '', alt: product.name },
            quantity: quantity,
            isSpecialOffer: product.isSpecialOffer,
            deliveryDate: deliveryDateVal,
            orderCutoffTime: product.orderCutoffTime,
            mealType: product.mealType,
            isDailySpecial: product.isDailySpecial
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
          items: state.items.filter((item) => item.id !== id && (!item.dishId || item.dishId !== id)),
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

        const { items } = get();
        const hasDailySpecial = items.some(i => Boolean(i.isDailySpecial || (!i.isSpecialOffer && (i.deliveryDate || (i.mealType && i.mealType !== 'all')))));
        const targetItem = items.find(i => i.id === id || (i.dishId && i.dishId === id) || isSameDish(i, { id } as any));
        const isTargetDailySpecial = targetItem ? Boolean(targetItem.isDailySpecial || (!targetItem.isSpecialOffer && (targetItem.deliveryDate || (targetItem.mealType && targetItem.mealType !== 'all')))) : false;

        if (hasDailySpecial && targetItem && !targetItem.isSpecialOffer && !isTargetDailySpecial) {
          if (quantity < 3) {
            showGlobalAlert({
              title: 'কমপক্ষে ৩টি কোয়ান্টিটি প্রয়োজন',
              message: "Today's Special ডিশ কার্টে থাকলে সাধারণ মেনুর যেকোনো খাবারের সর্বনিম্ন ৩টি কোয়ান্টিটি (ক্যাটারিং সাইজ) থাকতে হবে।",
              confirmText: 'OK',
              cancelText: '',
            });
            return;
          }
        }

        set((state) => ({
          items: state.items.map((item) => ((item.id === id || (item.dishId && item.dishId === id) || isSameDish(item, { id } as any)) ? { ...item, quantity } : item)),
          isDirty: true,
        }));
      },

      // ★ Clear Cart
      clearCart: () => {
        set({ items: [], checkoutState: { couponCode: '', couponDiscount: 0, useCoins: false }, isDirty: true });
        if (useAuthStore.getState().token) {
          get().syncToDatabase();
        }
      },

      setCheckoutData: (data) => {
        set((state) => ({ checkoutState: { ...state.checkoutState, ...data } }));
      },

      setCartItems: (items) => {
        set({ items, isDirty: false });
      },

      validateSpecialOffers: (activeOffers) => {
        const { items, removeItem } = get();
        const removedItemNames: string[] = [];
        
        items.forEach((item) => {
          if (item.isSpecialOffer) {
            // Check if it exists in the active offers list
            const activeOffer = activeOffers.find((offer) => offer.id === item.id);
            
            // It's invalid if not found, OR if its orderCutoffTime has passed
            const isMissing = !activeOffer;
            const isExpired = activeOffer?.orderCutoffTime && new Date() > new Date(activeOffer.orderCutoffTime);
            const isItemExpired = item.orderCutoffTime && new Date() > new Date(item.orderCutoffTime);
            
            if (isMissing || isExpired || isItemExpired) {
              // Note: removeItem internally sets isDirty to true
              removeItem(item.id);
              removedItemNames.push(item.name);
            }
          }
        });
        
        if (removedItemNames.length > 0 && useAuthStore.getState().token) {
          get().syncToDatabase();
        }
        
        return removedItemNames;
      },

      // ★ Database e POST Request
      syncToDatabase: async () => {
        const { items } = get();
        const token = useAuthStore.getState().token; 
        
        if (!token) {
          console.log('[Cart Sync] ❌ Skipped sync — no token');
          return;
        }
        
        set({ isSyncing: true });
        try {
          console.log(`[Cart Sync] 📤 Sending ${items.length} items to DB...`);
          await fetch(`${API_URL}/cart`, {
            method: 'POST',
            headers: { 
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify({ items }),
          });
          console.log('[Cart Sync] ✅ Sync successful!');
          set({ isDirty: false, isSyncing: false });
        } catch (error) {
          console.error("Cart Sync failed", error);
          set({ isSyncing: false });
        }
      },

      // ★ 30-Second Auto Sync Interval with AppState Battery Drain Fix
      startAutoSync: () => {
         get().stopAutoSync();
         
         // Start interval immediately if app is active
         const startInterval = () => {
           if (!get().syncIntervalId) {
             const interval = setInterval(() => {
                const { isDirty, isSyncing } = get();
                const token = useAuthStore.getState().token;
                console.log(`[Cart Sync] Tick — isDirty: ${isDirty}, hasToken: ${!!token}`);
                if (token && isDirty && !isSyncing) {
                   console.log('[Cart Sync] ✅ Syncing to database...');
                   get().syncToDatabase();
                }
             }, 30000);
             set({ syncIntervalId: interval });
           }
         };

         const stopInterval = () => {
           const { syncIntervalId } = get();
           if (syncIntervalId) {
             clearInterval(syncIntervalId);
             set({ syncIntervalId: null });
           }
         };

         // Listen to AppState to pause sync when in background, and flush any unsynced changes immediately
         const subscription = AppState.addEventListener('change', (nextAppState) => {
           if (nextAppState === 'active') {
             startInterval();
           } else {
             stopInterval();
             // User swiped up, minimized or exited app -> flush sync immediately to DB!
             const { isDirty, isSyncing } = get();
             const token = useAuthStore.getState().token;
             if (token && isDirty && !isSyncing) {
               console.log('[Cart Sync] 📱 App minimized or exiting with unsynced changes. Flushing sync to DB...');
               get().syncToDatabase();
             }
           }
         });

         set({ appStateSubscription: subscription });
         startInterval();
      },

      stopAutoSync: () => {
         const { syncIntervalId, appStateSubscription } = get();
         if (syncIntervalId) {
            clearInterval(syncIntervalId);
         }
         if (appStateSubscription) {
            appStateSubscription.remove();
         }
         set({ syncIntervalId: null, appStateSubscription: null });
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
          const { isSyncing, items: currentItems } = get();
          if (!isSyncing) {
            const enriched = data.items.map(dbItem => {
              const matchedLocal = currentItems.find(local => isSameDish(local, dbItem));
              const isSpecial = Boolean(
                dbItem.isDailySpecial || 
                matchedLocal?.isDailySpecial || 
                (!dbItem.isSpecialOffer && (dbItem.deliveryDate || (dbItem.mealType && dbItem.mealType !== 'all')))
              );
              return {
                ...dbItem,
                dishId: dbItem.dishId || matchedLocal?.dishId,
                isDailySpecial: isSpecial,
                deliveryDate: dbItem.deliveryDate || matchedLocal?.deliveryDate,
                mealType: dbItem.mealType || matchedLocal?.mealType,
              };
            });
            set({ items: enriched, isDirty: false });
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
      storage: createJSONStorage(() => zustandStorage),
      partialize: (state) => ({ 
        items: state.items, 
        checkoutState: state.checkoutState,
        isDirty: state.isDirty 
      }),
    }
  )
);
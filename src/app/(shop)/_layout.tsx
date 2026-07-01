// src/app/(shop)/_layout.tsx

import { Tabs, usePathname } from 'expo-router';
import { Home, ShoppingCart, User } from 'lucide-react-native';
import { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { useCartStore } from '@/store/cartStore';
import { useTabBarStore } from '@/store/tabBarStore'; // 🟢 নতুন স্টোর ইম্পোর্ট করা হলো

export default function ShopLayout() {
  const pathname = usePathname();
  
  // ★ কার্টের আইটেম সংখ্যা ট্র্যাক করুন
  const items = useCartStore((state) => state.items);
  const itemCount = items.length; 
  const isCartNotEmpty = itemCount > 0;

  // 🟢 Tab Bar ভিজিবিলিটি স্টেট এবং অ্যানিমেটেড ভ্যালু
  const isTabBarVisible = useTabBarStore((state) => state.isVisible);
  const translateY = useRef(new Animated.Value(0)).current;

  // =========================================================================
  // 🟢 নির্দিষ্ট পেজে (যেমন: checkout, menus, search) ট্যাব বার লুকানোর লজিক
  // =========================================================================
  const shouldHideTabBar = 
    pathname.includes('/checkout') || // 🔴 Checkout Summary পেজের জন্য
    pathname.includes('/menus/') || 
    pathname.includes('/search') ||
    (pathname === '/cart' && isCartNotEmpty); 

  // 🟢 স্লাইড আপ/ডাউন অ্যানিমেশন লজিক
  useEffect(() => {
    // যদি নির্দিষ্ট পেজ হয় অথবা ইউজার স্ক্রোল ডাউন করে, তবে ট্যাব বার নিচে স্লাইড হয়ে যাবে (hide)
    const toValue = shouldHideTabBar || !isTabBarVisible ? 100 : 0; // 100 দিলে পুরোটাই স্ক্রিনের নিচে চলে যাবে

    Animated.timing(translateY, {
      toValue: toValue,
      duration: 300, // 300ms ধরে স্মুথ অ্যানিমেশন হবে
      useNativeDriver: true,
    }).start();
  }, [shouldHideTabBar, isTabBarVisible]);

  return (
    <Tabs
      backBehavior="history"
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: true,
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
          marginBottom: 4,
        },
        tabBarStyle: [
          styles.tabBar,
          { transform: [{ translateY }] }, // 🔴 Animated Transform অ্যাপ্লাই করা হলো
          // shouldHideTabBar && { display: 'none' } // এটি মুছে ফেলা হলো কারণ আমরা অ্যানিমেশন ব্যবহার করছি
        ],
        tabBarActiveTintColor: '#e11d48',
        tabBarInactiveTintColor: '#9ca3af',
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, focused }) => (
            <Home color={color} size={22} strokeWidth={focused ? 2.5 : 2} />
          ),
        }}
      />

      <Tabs.Screen
        name="cart"
        options={{
          title: 'Cart',
          tabBarButton: (props) => {
            const isActive = pathname === '/cart';
            return (
              <TouchableOpacity
                style={styles.floatingButtonContainer}
                onPress={props.onPress}
                activeOpacity={0.8}
              >
                <View style={styles.floatingButton}>
                  <ShoppingCart color="#fff" size={22} strokeWidth={2.5} style={{ marginTop: 10 }} />
                  
                  {itemCount > 0 && (
                    <View style={styles.badgeContainer}>
                      <Text style={styles.badgeText}>
                        {itemCount > 9 ? '9+' : itemCount}
                      </Text>
                    </View>
                  )}
                </View>
                <Text style={[styles.floatingButtonText, { color: isActive ? '#e11d48' : '#9ca3af' }]}>
                  Cart
                </Text>
              </TouchableOpacity>
            );
          },
        }}
      />

      <Tabs.Screen
        name="account"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, focused }) => (
            <User color={color} size={22} strokeWidth={focused ? 2.5 : 2} />
          ),
        }}
      />

      <Tabs.Screen name="checkout/summary" options={{ href: null }} />
      <Tabs.Screen name="checkout/final" options={{ href: null }} />
      <Tabs.Screen name="account/orders" options={{ href: null }} />
      <Tabs.Screen name="account/addresses" options={{ href: null }} />
      <Tabs.Screen name="account/wallet/index" options={{ href: null }} />
      <Tabs.Screen name="menus/[slug]" options={{ href: null }} />
      <Tabs.Screen name="search" options={{ href: null }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    position: 'absolute',
    bottom: 0,
    height: 55,
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderTopWidth: 0,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    paddingBottom: 0, 
  },
  floatingButtonContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  floatingButton: {
    position: 'absolute',
    top: -15,
    width: 50,
    height: 50, 
    borderRadius: 25,
    backgroundColor: '#e11d48',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#e11d48',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    borderWidth: 3,
    borderColor: '#fff',
  },
  floatingButtonText: {
    position: 'absolute',
    bottom: 4, 
    fontSize: 11,
    fontWeight: '600',
  },
  badgeContainer: {
    position: 'absolute',
    top: -2,              
    alignSelf: 'center',   
    backgroundColor: '#ffffff',
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#e11d48',
    paddingHorizontal: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 3,
  },
  badgeText: {
    color: '#e11d48',
    fontSize: 10,
    fontWeight: '900',
    fontFamily: 'sans-serif',
  },
});
// src/app/(shop)/_layout.tsx

import { Tabs, usePathname } from 'expo-router';
import { Home, ShoppingCart, User } from 'lucide-react-native';
import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import LottieView from 'lottie-react-native';

import { useCartStore } from '@/shared/store/cartStore';
import { useTabBarStore } from '@/shared/store/tabBarStore';
import { CartConflictModal } from '@/shared/components/ui/CartConflictModal';

export default function ShopLayout() {
  const pathname = usePathname();
  
  const items = useCartStore((state) => state.items);
  const itemCount = items.length; 
  const totalQuantity = items.reduce((sum, item) => sum + item.quantity, 0);
  const [displayItemCount, setDisplayItemCount] = useState(itemCount);
  const isCartNotEmpty = displayItemCount > 0;

  const isTabBarVisible = useTabBarStore((state) => state.isVisible);
  const setTabBarVisible = useTabBarStore((state) => state.setVisibility);
  const translateY = useRef(new Animated.Value(0)).current;

  const prevQuantity = useRef(totalQuantity);
  const [animationKey, setAnimationKey] = useState(0);
  const cartLottieRef = useRef<LottieView>(null);

  const shouldHideTabBar = 
    pathname.includes('/checkout') || 
    pathname.includes('/menus/') || 
    pathname.includes('/search') ||
    (pathname === '/cart' && isCartNotEmpty); 

  useEffect(() => {
    const toValue = shouldHideTabBar || !isTabBarVisible ? 100 : 0;
    Animated.timing(translateY, {
      toValue: toValue,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [shouldHideTabBar, isTabBarVisible]);

  useEffect(() => {
    if (totalQuantity > prevQuantity.current) {
      setTabBarVisible(true);
      
      // Force remount of Lottie view to play animation reliably
      setAnimationKey(prev => prev + 1);
      
      setDisplayItemCount(itemCount);
    } else {
      setDisplayItemCount(itemCount);
    }
    prevQuantity.current = totalQuantity;
  }, [totalQuantity, itemCount]);

  return (
    <>
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
          { transform: [{ translateY }] },
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
                <Animated.View style={[styles.floatingButton]}>
                  <LottieView
                    ref={cartLottieRef}
                    key={`cart-anim-${animationKey}`}
                    source={require('../../../assets/animations/cart.json')}
                    loop={false}
                    autoPlay={animationKey > 0}
                    onAnimationFinish={() => {
                      cartLottieRef.current?.reset();
                    }}
                    style={{ width: 55, height: 55, position: 'absolute' }}
                  />
                  {displayItemCount > 0 && (
                    <View style={[styles.badgeContainer, { zIndex: 20, elevation: 10, top: -8 }]}>
                      <Text style={styles.badgeText}>
                        {displayItemCount > 9 ? '9+' : displayItemCount}
                      </Text>
                    </View>
                  )}
                </Animated.View>
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

      {/* ─── Hidden Screens ─── */}
      <Tabs.Screen name="account/orders" options={{ href: null }} />
      <Tabs.Screen name="account/addresses" options={{ href: null }} />
      <Tabs.Screen name="account/wallet/index" options={{ href: null }} />
      <Tabs.Screen name="account/coupons/index" options={{ href: null }} />
      <Tabs.Screen name="account/favorites/index" options={{ href: null }} />
      <Tabs.Screen name="menus/[slug]" options={{ href: null }} />
      <Tabs.Screen name="search" options={{ href: null }} />
      <Tabs.Screen name="notifications" options={{ href: null }} />
    </Tabs>
    <CartConflictModal />
    </>
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
    backgroundColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
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
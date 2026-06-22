// src/app/(shop)/_layout.tsx

import { Tabs, usePathname } from 'expo-router';
import { Home, ShoppingCart, User } from 'lucide-react-native';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function ShopLayout() {
  const pathname = usePathname();
  
  // প্রোডাক্ট ডিটেইল পেজে গেলে ট্যাব বার লুকানোর লজিক
  const hideTabBar = pathname.includes('/menus/');

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: true,
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
          marginBottom: 4, // iOS কন্ডিশন সরানো হয়েছে
        },
        tabBarStyle: [
          styles.tabBar,
          hideTabBar && { display: 'none' }
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

      {/* মাঝখানের ফ্লোটিং Cart বাটন (টেক্সট সহ) */}
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
                  <ShoppingCart color="#fff" size={22} strokeWidth={2.5} />
                </View>
                {/* Cart-এর টেক্সট */}
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

      {/* যেসব পেজ ট্যাব বারে দেখাতে চান না */}
      <Tabs.Screen name="account/orders" options={{ href: null }} />
      <Tabs.Screen name="account/addresses" options={{ href: null }} />
      <Tabs.Screen name="account/wallet/index" options={{ href: null }} />
      <Tabs.Screen name="menus/[slug]" options={{ href: null }} />
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
    paddingBottom: 0, // iOS কন্ডিশন সরানো হয়েছে
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
    bottom: 4, // iOS কন্ডিশন সরানো হয়েছে
    fontSize: 11,
    fontWeight: '600',
  },
});
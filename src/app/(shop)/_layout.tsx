// src/app/(shop)/_layout.tsx

import { Tabs } from 'expo-router';
import { Home, ShoppingCart, User } from 'lucide-react-native';

export default function ShopLayout() {
  return (
    <Tabs screenOptions={{
      headerShown: false,
      tabBarStyle: { height: 55, paddingBottom: 5 },
      tabBarActiveTintColor: '#e11d48',
    }}>
      {/* ট্যাব বারে দেখাবে */}
      <Tabs.Screen 
        name="index" 
        options={{ title: 'Home', tabBarIcon: ({color}) => <Home color={color} size={24} /> }} 
      />
      <Tabs.Screen 
        name="cart" 
        options={{ title: 'Cart', tabBarIcon: ({color}) => <ShoppingCart color={color} size={24} /> }} 
      />
      <Tabs.Screen 
        name="account" 
        options={{ title: 'Profile', tabBarIcon: ({color}) => <User color={color} size={24} /> }} 
      />

      {/* যেসব পেজ ট্যাব বারে দেখাতে চান না – href: null দিয়ে বাটন সরান */}
      <Tabs.Screen name="account/orders" options={{ href: null }} />
      <Tabs.Screen name="account/addresses" options={{ href: null }} />
      <Tabs.Screen name="account/wallet/index" options={{ href: null }} />

      {/* ★★★ প্রোডাক্ট ডিটেইল পেজ – বাটন সরান + ট্যাব বার লুকান ★★★ */}
      <Tabs.Screen 
        name="menus/[slug]" 
        options={{ 
          href: null,                        // ট্যাব বারে বাটন দেখাবে না
          tabBarStyle: { display: 'none' }  // পেজে গেলে পুরো বার আড়াল করবে
        }} 
      />
    </Tabs>
  );
}
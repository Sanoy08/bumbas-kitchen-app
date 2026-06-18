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
      {/* --- এই ৩টি পেজ নিচে ট্যাব বারে দেখাবে --- */}
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

      {/* --- যেসব পেজ আপনি Tab Bar-এ দেখাতে চান না, সেগুলোকে নিচে এভাবে href: null করে দিতে হবে --- */}
      <Tabs.Screen name="account/orders" options={{ href: null }} />
      <Tabs.Screen name="account/addresses" options={{ href: null }} />
      <Tabs.Screen name="account/wallet/index" options={{ href: null }} />
    </Tabs>
  );
}
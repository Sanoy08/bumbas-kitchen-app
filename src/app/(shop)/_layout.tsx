import { Tabs } from 'expo-router';
import { Home, ShoppingCart, User, Utensils } from 'lucide-react-native';

export default function ShopLayout() {
  return (
    <Tabs screenOptions={{
      headerShown: false,
      tabBarStyle: { height: 60, paddingBottom: 5 },
      tabBarActiveTintColor: '#e11d48',
    }}>
      <Tabs.Screen name="index" options={{ title: 'Home', tabBarIcon: ({color}) => <Home color={color} size={24} /> }} />
      <Tabs.Screen name="menus" options={{ title: 'Menu', tabBarIcon: ({color}) => <Utensils color={color} size={24} /> }} />
      <Tabs.Screen name="cart" options={{ title: 'Cart', tabBarIcon: ({color}) => <ShoppingCart color={color} size={24} /> }} />
      <Tabs.Screen name="account" options={{ title: 'Account', tabBarIcon: ({color}) => <User color={color} size={24} /> }} />
    </Tabs>
  );
}
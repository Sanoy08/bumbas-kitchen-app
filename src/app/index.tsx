// src\app\index.tsx

import { useAuthStore } from '@/store/authStore';
import { Redirect } from 'expo-router';

export default function Index() {
  const user = useAuthStore((state) => state.user);
  const isInitialized = useAuthStore((state) => state.isInitialized);

  // Wait until auth is initialized
  if (!isInitialized) return null;

  // If user is logged in, send everyone to the shop/homepage
  if (user) {
    // ✅ Removed role-based redirect – both admin and customer go to same home
    return <Redirect href="/" />;
  }

  // Not logged in → login page
  return <Redirect href="/(auth)/login" />;
}
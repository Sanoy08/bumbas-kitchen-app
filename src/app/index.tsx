// src/app/index.tsx
import { useAuthStore } from '@/store/authStore';
import { Redirect } from 'expo-router';

export default function Index() {
  const user = useAuthStore((state) => state.user);
  const isInitialized = useAuthStore((state) => state.isInitialized);

  if (!isInitialized) return null;

  if (user) {
    // '/' er bodole '/(shop)' din
    return <Redirect href="/(shop)" />; 
  }

  return <Redirect href="/(auth)/login" />;
}
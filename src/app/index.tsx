// src\app\index.tsx

import { Redirect } from 'expo-router';
import { useAuthStore } from '@/store/authStore';

export default function Index() {
  const user = useAuthStore((state) => state.user);
  const isInitialized = useAuthStore((state) => state.isInitialized);

  // Auth স্টেট ইনিশিয়ালাইজ না হওয়া পর্যন্ত অপেক্ষা করবে (লেআউটের লোডার কাজ করবে)
  if (!isInitialized) return null;

  // ইউজার লগিন করা থাকলে তাকে তার রোল অনুযায়ী রিডাইরেক্ট করবে
  if (user) {
    if (user.role === 'admin') {
      return <Redirect href="/admin" />;
    }
    return <Redirect href="/(shop)" />;
  }

  // লগিন করা না থাকলে লগিন পেজে পাঠাবে
  return <Redirect href="/(auth)/login" />;
}

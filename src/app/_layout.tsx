import { useAuthStore } from '@/store/authStore';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import "../../global.css";

export default function RootLayout() {
  const initAuth = useAuthStore((state) => state.initAuth);
  const isInitialized = useAuthStore((state) => state.isInitialized);

  // অ্যাপ স্টার্ট হলে SecureStore থেকে টোকেন ইনিশিয়ালাইজ করবে
  useEffect(() => {
    initAuth();
  }, [initAuth]);

  // Auth স্টেট চেক না হওয়া পর্যন্ত একটি লোডার দেখাবে (পরবর্তীতে এখানে Lottie Splash দিতে পারেন)
  if (!isInitialized) {
    return (
      <View className="flex-1 items-center justify-center bg-background">
        <ActivityIndicator size="large" color="#e11d48" />
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      
      {/* Pure Native Stack Navigation */}
      <Stack screenOptions={{ headerShown: false }}>
        {/* আমরা পরবর্তীতে স্ক্রিনগুলোর নাম এখানে দেব, 
            আপাতত এক্সপো রাউটার অটোমেটিক্যালি ফাইল ফোল্ডার অনুযায়ী রাউট তৈরি করে নেবে */}
      </Stack>
    </SafeAreaProvider>
  );
}
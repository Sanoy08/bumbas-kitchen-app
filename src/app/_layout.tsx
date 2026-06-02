import { useAuthStore } from '@/store/authStore';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import "../../global.css";

// ★ Font Imports
import {
  Poppins_400Regular,
  Poppins_500Medium,
  Poppins_600SemiBold,
  Poppins_700Bold,
  useFonts
} from '@expo-google-fonts/poppins';
import * as SplashScreen from 'expo-splash-screen';

// ফন্ট লোড হওয়ার আগে স্প্ল্যাশ স্ক্রিন যাতে অটো-হাইড না হয়
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const initAuth = useAuthStore((state) => state.initAuth);
  const isInitialized = useAuthStore((state) => state.isInitialized);

  // ★ Load Fonts
  const [fontsLoaded, fontError] = useFonts({
    Poppins_400Regular,
    Poppins_500Medium,
    Poppins_600SemiBold,
    Poppins_700Bold,
  });

  // Auth ইনিশিয়ালাইজেশন
  useEffect(() => {
    initAuth();
  }, [initAuth]);

  // ফন্ট লোড হয়ে গেলে স্প্ল্যাশ স্ক্রিন হাইড করবে
  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  // Auth স্টেট বা ফন্ট চেক না হওয়া পর্যন্ত লোডার দেখাবে
  if (!isInitialized || (!fontsLoaded && !fontError)) {
    return (
      <View className="flex-1 items-center justify-center bg-background">
        <ActivityIndicator size="large" color="#e11d48" />
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false }} />
    </SafeAreaProvider>
  );
}
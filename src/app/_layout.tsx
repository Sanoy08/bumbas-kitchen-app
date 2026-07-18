// src/app/_layout.tsx

import { AlertProvider } from '@/shared/components/ui';
import { useAuthStore } from '@/shared/store/authStore';
import { useCartStore } from '@/shared/store/cartStore'; // ★ CartStore import kora holo
import { Poppins_400Regular, Poppins_500Medium, Poppins_600SemiBold, Poppins_700Bold, useFonts } from '@expo-google-fonts/poppins';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Stack, useRouter } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import LottieView from 'lottie-react-native';
import { useEffect, useRef, useState } from 'react';
import { Animated, Dimensions, Text, TouchableOpacity, View, FlatList, NativeSyntheticEvent, NativeScrollEvent, DeviceEventEmitter } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { Toaster } from 'sonner-native';
import "../../global.css";

import { AppUpdater, Onboarding, NoInternetScreen } from '@/shared/components/common';
import { usePushNotification } from '@/shared/hooks/usePushNotification';
import { useNetworkStatus } from '@/shared/hooks/useNetworkStatus';

const originalFetch = fetch;
if (!(global as any).isFetchIntercepted) {
  (global as any).isFetchIntercepted = true;
  (global as any).apiCallCount = 0;
  global.fetch = async (...args) => {
    const url = args[0];
    if (typeof url === 'string' && url.includes('api')) {
      (global as any).apiCallCount++;
      console.log(`[API CALL #${(global as any).apiCallCount}]`, url);
    }
    return originalFetch(...args);
  };
}

SplashScreen.preventAutoHideAsync();
const { width } = Dimensions.get('window');

export default function RootLayout() {
  const router = useRouter();
  const initAuth = useAuthStore((state) => state.initAuth);
  const isInitialized = useAuthStore((state) => state.isInitialized);

  // ★ গ্লোবাল পুশ নোটিফিকেশন অ্যাক্টিভেশন
  usePushNotification();

  // ★ Network Connectivity
  const { isConnected, checkConnection } = useNetworkStatus();

  const [fontsLoaded, fontError] = useFonts({
    Poppins_400Regular, Poppins_500Medium, Poppins_600SemiBold, Poppins_700Bold,
  });

  const [isFirstRun, setIsFirstRun] = useState<boolean | null>(null);
  const [showSplash, setShowSplash] = useState(true);
  const fadeAnim = useRef(new Animated.Value(1)).current;

  // ★ App load howar sathe sathe auto-sync chalu korar jonno
  useEffect(() => {
    const startSync = useCartStore.getState().startAutoSync;
    const stopSync = useCartStore.getState().stopAutoSync;

    console.log("[App Layout] Starting Cart Auto Sync Interval");
    startSync(); // Interval start holo

    return () => {
      console.log("[App Layout] Stopping Cart Auto Sync Interval");
      stopSync(); // Unmount e interval clear holo
    };
  }, []);

  useEffect(() => {
    initAuth();
    
    // Listen for network restoration to re-authenticate if it failed initially
    const networkSubscription = DeviceEventEmitter.addListener('network_restored', () => {
      console.log('Network restored, re-initializing auth...');
      initAuth();
    });
    
    const checkFirstRun = async () => {
      const firstRun = await AsyncStorage.getItem('isFirstRun');
      if (firstRun === null) {
        setIsFirstRun(true);
        setShowSplash(false); 
      } else {
        setIsFirstRun(false);
      }
    };
    checkFirstRun();

    return () => {
      networkSubscription.remove();
    };
  }, [initAuth]);

  useEffect(() => {
    if ((fontsLoaded || fontError) && isFirstRun !== null) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError, isFirstRun]);

  useEffect(() => {
    if (!isFirstRun && isInitialized && fontsLoaded) {
      setTimeout(() => {
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 400,
          useNativeDriver: true,
        }).start(() => setShowSplash(false));
      }, 1500); 
    }
  }, [isFirstRun, isInitialized, fontsLoaded]);

  const finishOnboarding = async () => {
    await AsyncStorage.setItem('isFirstRun', 'false');
    setIsFirstRun(false);
    DeviceEventEmitter.emit('onboarding_finished');
  };



  if (isFirstRun === null || (!fontsLoaded && !fontError)) {
    return null;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
  <AlertProvider>
    <StatusBar style="dark" />
    
    {/* ★ গ্লোবাল বটম সেফ এরিয়া: সমস্ত পেজ নেভিগেশন বারের উপরে থাকবে */}
    <SafeAreaView style={{ flex: 1 }} edges={['bottom']}>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="addressModal" options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
      </Stack>
    </SafeAreaView>
    
    {isFirstRun && <Onboarding onFinish={finishOnboarding} />}

          {!isFirstRun && showSplash && (
            <Animated.View style={{ opacity: fadeAnim, position: 'absolute', inset: 0, zIndex: 999, backgroundColor: '#F8F9FA', elevation: 15, justifyContent: 'center', alignItems: 'center' }}>
              <LottieView source={require('../../assets/animations/splash.json')} autoPlay loop style={{ width: width * 1.2, height: width * 1.2 }} resizeMode="cover" />
            </Animated.View>
          )}

          {!isConnected && (
            <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 1000, backgroundColor: 'white' }}>
              <NoInternetScreen onRetry={checkConnection} />
            </View>
          )}

          <AppUpdater />

          <Toaster position="bottom-center" theme="light" toastOptions={{ style: { backgroundColor: '#FFFFFF', borderColor: '#E5E7EB' }, titleStyle: { color: '#111827', fontWeight: 'regular' } }} />
        </AlertProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
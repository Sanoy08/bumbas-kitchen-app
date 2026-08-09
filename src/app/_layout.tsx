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
import { Animated, DeviceEventEmitter, Dimensions, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { Toaster } from 'sonner-native';
import "../../global.css";

import { AppUpdater, NoInternetScreen, Onboarding } from '@/shared/components/common';
import { useNetworkStatus } from '@/shared/hooks/useNetworkStatus';
import { usePushNotification } from '@/shared/hooks/usePushNotification';

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
    const response = await originalFetch(...args);
    
    // Global 401 Unauthorized handler
    if (response.status === 401) {
      console.log('[API Interceptor] 401 Unauthorized detected. Logging out...');
      useAuthStore.getState().logout();
    }
    
    return response;
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
  const [isHomeLoaded, setIsHomeLoaded] = useState(false);
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
    if (isFirstRun !== null) {
      // Hide native red splash immediately so custom Lottie splash shows up
      SplashScreen.hideAsync();
    }
  }, [isFirstRun]);

  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    const listener = DeviceEventEmitter.addListener('home_data_loaded', () => {
      setIsHomeLoaded(true);
      clearTimeout(timeoutId);
    });

    const refreshListener = DeviceEventEmitter.addListener('trigger_refresh_splash', () => {
      setShowSplash(true);
      setIsHomeLoaded(false);
      fadeAnim.setValue(1);
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => setIsHomeLoaded(true), 3000);
    });

    // Fallback: if home doesn't load in 3 seconds, dismiss splash anyway
    timeoutId = setTimeout(() => setIsHomeLoaded(true), 3000);

    return () => {
      listener.remove();
      refreshListener.remove();
      clearTimeout(timeoutId);
    };
  }, []);

  useEffect(() => {
    if (!isFirstRun && isInitialized && fontsLoaded && isHomeLoaded) {
      setTimeout(() => {
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 400,
          useNativeDriver: true,
        }).start(() => setShowSplash(false));
      }, 300);
    }
  }, [isFirstRun, isInitialized, fontsLoaded, isHomeLoaded]);

  const finishOnboarding = async () => {
    await AsyncStorage.setItem('isFirstRun', 'false');
    setIsFirstRun(false);
    DeviceEventEmitter.emit('onboarding_finished');
  };



  if (isFirstRun === null || (!fontsLoaded && !fontError)) {
    return null;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: '#ffffff' }}>
      <SafeAreaProvider>
        <AlertProvider>
          <StatusBar style="dark" />

          {/* ★ গ্লোবাল বটম সেফ এরিয়া: সমস্ত পেজ নেভিগেশন বারের উপরে থাকবে */}
          <SafeAreaView style={{ flex: 1, backgroundColor: '#ffffff' }} edges={['bottom']}>
            <Stack screenOptions={{ headerShown: false, animation: 'simple_push', contentStyle: { backgroundColor: '#ffffff' } }}>
              <Stack.Screen name="addressModal" options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
            </Stack>
          </SafeAreaView>

          {isFirstRun && <Onboarding onFinish={finishOnboarding} />}

          {!isFirstRun && showSplash && (
            <Animated.View style={{ opacity: fadeAnim, position: 'absolute', inset: 0, zIndex: 999, backgroundColor: '#e11d48', elevation: 15, justifyContent: 'center', alignItems: 'center' }}>
              <LottieView source={require('../../assets/animations/Cooking.json')} autoPlay loop style={{ width: width, height: width }} resizeMode="contain" />
            </Animated.View>
          )}

          {!isConnected && (
            <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 1000, backgroundColor: 'white' }}>
              <NoInternetScreen onRetry={checkConnection} />
            </View>
          )}

          <AppUpdater />

          <Toaster duration={1000} visibleToasts={1} position="bottom-center" theme="light" toastOptions={{ style: { backgroundColor: '#FFFFFF', borderColor: '#E5E7EB' }, titleStyle: { color: '#111827', fontWeight: 'regular' } }} />
        </AlertProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
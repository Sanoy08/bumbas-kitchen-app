// src/app/_layout.tsx

import { AlertProvider } from '@/components/ui/CustomAlert';
import { useAuthStore } from '@/store/authStore';
import { Poppins_400Regular, Poppins_500Medium, Poppins_600SemiBold, Poppins_700Bold, useFonts } from '@expo-google-fonts/poppins';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Stack, useRouter } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import LottieView from 'lottie-react-native';
import { useEffect, useRef, useState } from 'react';
import { Animated, Dimensions, Text, TouchableOpacity, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Toaster } from 'sonner-native';
import "../../global.css";

import { AppUpdater } from '@/components/AppUpdater';
import { usePushNotification } from '@/hooks/usePushNotification'; // ★ হুক ইমপোর্ট

SplashScreen.preventAutoHideAsync();
const { width } = Dimensions.get('window');

const ONBOARDING_STEPS = [
  { animation: require('../../assets/animations/onboard_order.json'), title: "Order Your Favorites", desc: "Choose from a wide variety of authentic Bengali dishes right from your phone.", btnText: "Continue" },
  { animation: require('../../assets/animations/onboard_rider.json'), title: "Fast & Trackable", desc: "Track your food in real-time on the map while our rider is on the way.", btnText: "Next" },
  { animation: require('../../assets/animations/onboard_delivery.json'), title: "Delivered to Doorstep", desc: "Hot and fresh food delivered safely to you. Enjoy your meal!", btnText: "Get Started" }
];

export default function RootLayout() {
  const router = useRouter();
  const initAuth = useAuthStore((state) => state.initAuth);
  const isInitialized = useAuthStore((state) => state.isInitialized);

  // ★ গ্লোবাল পুশ নোটিফিকেশন অ্যাক্টিভেশন
  usePushNotification();

  const [fontsLoaded, fontError] = useFonts({
    Poppins_400Regular, Poppins_500Medium, Poppins_600SemiBold, Poppins_700Bold,
  });

  const [isFirstRun, setIsFirstRun] = useState<boolean | null>(null);
  const [showSplash, setShowSplash] = useState(true);
  const [onboardStep, setOnboardStep] = useState(0);
  
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const contentFadeAnim = useRef(new Animated.Value(1)).current;
  const contentTranslateY = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    initAuth();
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
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 400,
      useNativeDriver: true,
    }).start(() => {
      setIsFirstRun(false);
      router.replace('/(auth)/login');
    });
  };

  const handleNextStep = () => {
    if (onboardStep < 2) {
      Animated.parallel([
        Animated.timing(contentFadeAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
        Animated.timing(contentTranslateY, { toValue: -20, duration: 200, useNativeDriver: true })
      ]).start(() => {
        setOnboardStep(prev => prev + 1);
        contentTranslateY.setValue(20);
        Animated.parallel([
          Animated.timing(contentFadeAnim, { toValue: 1, duration: 250, useNativeDriver: true }),
          Animated.timing(contentTranslateY, { toValue: 0, duration: 250, useNativeDriver: true })
        ]).start();
      });
    } else {
      finishOnboarding();
    }
  };

  if (isFirstRun === null || (!fontsLoaded && !fontError)) {
    return null;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <AlertProvider>
          <StatusBar style="dark" />
          <Stack screenOptions={{ headerShown: false }} />

          {isFirstRun && (
            <Animated.View style={{ opacity: fadeAnim, position: 'absolute', inset: 0, zIndex: 999, backgroundColor: '#FFFFFF', elevation: 15 }}>
              <TouchableOpacity onPress={finishOnboarding} className="absolute top-14 right-6 p-4 z-50">
                <Text className="text-slate-400 font-bold text-lg font-sans">Skip</Text>
              </TouchableOpacity>
              <View className="flex-1 justify-center items-center pb-20">
                <Animated.View style={{ opacity: contentFadeAnim, transform: [{ translateY: contentTranslateY }], alignItems: 'center', width: '100%' }}>
                  <LottieView source={ONBOARDING_STEPS[onboardStep].animation} autoPlay loop style={{ width: width * 1.1, height: width * 1.1, marginBottom: -30 }} resizeMode="cover" />
                  <Text className="text-[28px] font-bold text-slate-900 mt-2 px-8 text-center font-sans leading-tight">{ONBOARDING_STEPS[onboardStep].title}</Text>
                  <Text className="text-[17px] text-slate-500 font-medium text-center mt-3 px-10 leading-relaxed font-sans">{ONBOARDING_STEPS[onboardStep].desc}</Text>
                </Animated.View>
              </View>
              <View className="absolute bottom-12 w-full px-8">
                <TouchableOpacity activeOpacity={0.8} onPress={handleNextStep} className="w-full h-14 rounded-full items-center justify-center shadow-lg" style={{ backgroundColor: '#6a9c27', elevation: 10, shadowColor: '#6a9c27', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8 }}>
                  <Text className="text-white font-bold text-lg font-sans">{ONBOARDING_STEPS[onboardStep].btnText}</Text>
                </TouchableOpacity>
              </View>
            </Animated.View>
          )}

          {!isFirstRun && showSplash && (
            <Animated.View style={{ opacity: fadeAnim, position: 'absolute', inset: 0, zIndex: 999, backgroundColor: '#F8F9FA', elevation: 15, justifyContent: 'center', alignItems: 'center' }}>
              <LottieView source={require('../../assets/animations/splash.json')} autoPlay loop style={{ width: width * 1.2, height: width * 1.2 }} resizeMode="cover" />
            </Animated.View>
          )}

          <AppUpdater />

          <Toaster position="bottom-center" theme="light" toastOptions={{ style: { backgroundColor: '#FFFFFF', borderColor: '#E5E7EB' }, titleStyle: { color: '#111827', fontWeight: 'regular' } }} />
        </AlertProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
// src/components/shop/NotificationPrompt.tsx

import { usePushNotification } from '@/shared/hooks/usePushNotification';
import { useAuthStore } from '@/shared/store/authStore';
import * as Notifications from 'expo-notifications';
import { Bell } from 'lucide-react-native';
import { useEffect, useState, useRef } from 'react';
import { Modal, Text, TouchableOpacity, View, Animated, Dimensions, Easing, StyleSheet, Linking, AppState } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
const { height } = Dimensions.get('window');

export default function NotificationPrompt() {
  const insets = useSafeAreaInsets();
  const { user } = useAuthStore();
  const { subscribeToPush } = usePushNotification();
  const [isOpen, setIsOpen] = useState(false);
  const slideAnim = useRef(new Animated.Value(height)).current;
  const appState = useRef(AppState.currentState);

  const checkPermission = async () => {
    if (!user) {
      setIsOpen(false);
      return;
    }

    const { status } = await Notifications.getPermissionsAsync();
    
    if (status !== 'granted') {
      if ((global as any).isSplashHidden) {
        setIsOpen(true);
      } else {
        const { DeviceEventEmitter } = require('react-native');
        const sub = DeviceEventEmitter.addListener('splash_hidden', () => {
          setIsOpen(true);
          sub.remove();
        });
      }
    } else {
      setIsOpen(false);
    }
  };

  useEffect(() => {
    checkPermission();

    const subscription = AppState.addEventListener('change', nextAppState => {
      if (appState.current.match(/inactive|background/) && nextAppState === 'active') {
        // App has come to the foreground, recheck permissions!
        checkPermission();
      }
      appState.current = nextAppState;
    });

    return () => {
      subscription.remove();
    };
  }, [user]);

  useEffect(() => {
    if (isOpen) {
      slideAnim.setValue(height);
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 350,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start();
    }
  }, [isOpen, slideAnim]);

  const handleAllow = async () => {
    // Attempt to subscribe (which will request permission natively if possible)
    await subscribeToPush();
    
    // Check if permission was granted
    const { status, canAskAgain } = await Notifications.getPermissionsAsync();
    if (status === 'granted') {
      setIsOpen(false);
    } else if (!canAskAgain) {
      // User has permanently denied, redirect to settings
      Linking.openSettings().catch(console.error);
    }
  };

  return (
    <Modal visible={isOpen} transparent animationType="fade">
      <View style={StyleSheet.absoluteFill} className="bg-black/80 justify-end">
        {/* Intentionally removed Pressable backdrop to force interaction */}
        
        <Animated.View 
          className="w-full justify-end"
          style={{ transform: [{ translateY: slideAnim }] }}
        >
          <View className="bg-white rounded-t-[32px] pt-8 px-6 items-center shadow-2xl" style={{ paddingBottom: insets.bottom + 24 }}>
          <View className="h-16 w-16 bg-primary/10 rounded-full items-center justify-center mb-4">
            <Bell size={28} color="#e11d48" />
          </View>

          <Text className="text-xl font-bold text-gray-900 text-center font-sans mb-2">
            Allow Notifications
          </Text>
          
          <Text className="text-sm text-gray-500 text-center font-medium font-sans px-4 mb-8 leading-5">
            You must enable notifications to use Bumba's Kitchen. Get instant updates on your <Text className="font-bold text-gray-800">Order Status</Text> directly on your screen.
          </Text>

          <View className="flex-row gap-4 w-full">
            <TouchableOpacity 
              onPress={handleAllow}
              className="flex-1 h-14 bg-primary rounded-2xl items-center justify-center shadow-md"
              style={{ shadowColor: '#e11d48', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 5 }}
            >
              <Text className="text-white font-bold font-sans text-base">Enable Notifications</Text>
            </TouchableOpacity>
          </View>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}
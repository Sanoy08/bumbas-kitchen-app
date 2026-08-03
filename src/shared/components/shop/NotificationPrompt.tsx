// src/components/shop/NotificationPrompt.tsx

import { usePushNotification } from '@/shared/hooks/usePushNotification';
import { useAuthStore } from '@/shared/store/authStore';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { Bell, X } from 'lucide-react-native';
import { useEffect, useState, useRef } from 'react';
import { Modal, Text, TouchableOpacity, View, Animated, Dimensions, Pressable, Easing, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
const { height } = Dimensions.get('window');

export default function NotificationPrompt() {
  const insets = useSafeAreaInsets();
  const { user } = useAuthStore();
  const { subscribeToPush } = usePushNotification();
  const [isOpen, setIsOpen] = useState(false);
  const slideAnim = useRef(new Animated.Value(height)).current;

  useEffect(() => {
    const checkPermission = async () => {
      if (!user) return;

      const hasRejected = await AsyncStorage.getItem('notification-rejected');
      if (hasRejected === 'true') return;

      const { status } = await Notifications.getPermissionsAsync();
      
      if (status !== 'granted') {
        const timer = setTimeout(() => setIsOpen(true), 3500);
        return () => clearTimeout(timer);
      }
    };

    checkPermission();
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

  const closeWithAnimation = (action: () => Promise<void> | void) => {
    Animated.timing(slideAnim, {
      toValue: height,
      duration: 250,
      useNativeDriver: true,
    }).start(async () => {
      await action();
    });
  };

  const handleAllow = () => {
    closeWithAnimation(async () => {
      setIsOpen(false);
      await subscribeToPush();
    });
  };

  const handleReject = () => {
    closeWithAnimation(async () => {
      await AsyncStorage.setItem('notification-rejected', 'true');
      setIsOpen(false);
    });
  };

  return (
    <Modal visible={isOpen} transparent animationType="fade" onRequestClose={handleReject}>
      <View style={StyleSheet.absoluteFill} className="bg-black/60 justify-end">
        <Pressable style={StyleSheet.absoluteFill} onPress={handleReject} />
        
        <Animated.View 
          className="w-full flex-1 justify-end"
          style={{ transform: [{ translateY: slideAnim }] }}
        >
          {/* Floating Close Button exactly outside the top */}
          <View className="items-center mb-4">
            <TouchableOpacity 
              onPress={handleReject} 
              activeOpacity={0.7}
              style={{ backgroundColor: '#000000', width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center' }}
              className="shadow-2xl border-2 border-white/20"
            >
              <X size={28} color="white" />
            </TouchableOpacity>
          </View>

          <View className="bg-white rounded-t-[32px] pt-6 px-6 items-center shadow-2xl" style={{ paddingBottom: Math.max(insets.bottom, 40) }}>
          <View className="h-16 w-16 bg-primary/10 rounded-full items-center justify-center mb-4">
            <Bell size={28} color="#e11d48" />
          </View>

          <Text className="text-xl font-bold text-gray-900 text-center font-sans mb-2">
            Allow Notifications?
          </Text>
          
          <Text className="text-sm text-gray-500 text-center font-medium font-sans px-6 mb-6 leading-5">
            Get instant updates on your <Text className="font-bold text-gray-800">Order Status</Text> & special <Text className="font-bold text-gray-800">Discounts</Text> directly on your screen.
          </Text>

          <View className="flex-row gap-4 w-full">
            <TouchableOpacity 
              onPress={handleReject}
              className="flex-1 h-12 bg-gray-100 rounded-2xl items-center justify-center"
            >
              <Text className="text-gray-600 font-bold font-sans">Later</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              onPress={handleAllow}
              className="flex-1 h-12 bg-primary rounded-2xl items-center justify-center shadow-md"
              style={{ shadowColor: '#e11d48', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 5 }}
            >
              <Text className="text-white font-bold font-sans">Allow</Text>
            </TouchableOpacity>
          </View>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}
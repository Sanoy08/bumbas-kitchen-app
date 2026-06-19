// src/components/shop/NotificationPrompt.tsx

import { usePushNotification } from '@/hooks/usePushNotification';
import { useAuthStore } from '@/store/authStore';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { Bell } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { Modal, Text, TouchableOpacity, View } from 'react-native';

export default function NotificationPrompt() {
  const { user } = useAuthStore();
  const { subscribeToPush } = usePushNotification();
  const [isOpen, setIsOpen] = useState(false);

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

  const handleAllow = async () => {
    setIsOpen(false);
    await subscribeToPush();
  };

  const handleReject = async () => {
    await AsyncStorage.setItem('notification-rejected', 'true');
    setIsOpen(false);
  };

  return (
    <Modal visible={isOpen} transparent animationType="slide">
      <View className="flex-1 justify-end bg-black/50">
        <View className="bg-white w-full rounded-t-[32px] p-6 pb-10 items-center">
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
      </View>
    </Modal>
  );
}
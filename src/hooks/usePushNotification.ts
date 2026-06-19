// src/hooks/usePushNotification.ts

import { useEffect, useRef, useState } from 'react';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuthStore } from '@/store/authStore';
import { toast } from 'sonner-native';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'https://your-backend.vercel.app/api';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export const usePushNotification = () => {
  const router = useRouter();
  const { user } = useAuthStore();
  const [isSubscribed, setIsSubscribed] = useState(false);
  const syncedTokenRef = useRef<string | null>(null);

  const notificationListener = useRef<any>();
  const responseListener = useRef<any>();

  const handleNavigation = (url: string) => {
    if (!url) return;
    try {
      router.push(url as any);
    } catch (e) {
      console.error('Navigation error:', e);
    }
  };

  const subscribeToPush = async () => {
    if (!Device.isDevice) {
      console.log('Must use physical device for Push Notifications');
      return;
    }

    try {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        toast.error('Permission denied for notifications.');
        return;
      }

      // ★ FIX: Get RAW FCM Device Token instead of Expo Push Token
      const tokenData = await Notifications.getDevicePushTokenAsync();

      const token = tokenData.data;
      setIsSubscribed(true);

      if (syncedTokenRef.current === token) return;

      const currentAppId = 'com.bumbaskitchen.app';

      // টোকেন ডাটাবেসে সিঙ্ক করা
      await fetch(`${API_URL}/notifications/subscribe`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: token,
          appId: currentAppId,
        }),
      });

      syncedTokenRef.current = token;
      console.log('FCM Device Token synced successfully:', token);
    } catch (error) {
      console.error('Push registration failed:', error);
    }
  };

  useEffect(() => {
    if (Platform.OS === 'android') {
      Notifications.setNotificationChannelAsync('user_notifications', {
        name: 'User Alerts',
        description: 'General notifications for users',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern:[0, 250, 250, 250],
        lightColor: '#f97316',
      });
    }

    if (user) {
      subscribeToPush();
    }

    notificationListener.current = Notifications.addNotificationReceivedListener(
      (notification) => {
        console.log('Notification Received in foreground:', notification);
      }
    );

    responseListener.current = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        const data = response.notification.request.content.data;
        if (data?.url && typeof handleNavigation === 'function') {
          handleNavigation(data.url);
        }
      }
    );

    return () => {
      notificationListener.current?.remove();
      responseListener.current?.remove();
    };
  }, [user]);

  return {
    isSubscribed,
    subscribeToPush,
  };
};
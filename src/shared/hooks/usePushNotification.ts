// src/hooks/usePushNotification.ts

import { useAuthStore } from '@/shared/store/authStore';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';
import { toast } from 'sonner-native';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'https://www.bumbaskitchen.app/api';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export const usePushNotification = () => {
  const router = useRouter();
  const { user } = useAuthStore();
  const [isSubscribed, setIsSubscribed] = useState(false);
  const syncedTokenRef = useRef<string | null>(null);

  const notificationListener = useRef<any>(null);
  const responseListener = useRef<any>(null);

  const handleNavigation = (url: string) => {
    if (!url) return;
    try {
      router.push(url as any);
    } catch (e) {
      console.error('Navigation error:', e);
    }
  };

  const subscribeToPush = async (requestPermissionIfMissing = true) => {
    if (!Device.isDevice) {
      console.log('Must use physical device for Push Notifications');
      return;
    }

    try {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        if (!requestPermissionIfMissing) return; // Silent exit without prompting

        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        if (requestPermissionIfMissing) {
          toast.error('Permission denied for notifications.');
        }
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
      console.log('Push registration failed:', error);
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
      subscribeToPush(false); // Only sync token if already granted, do not ask for permission
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
          handleNavigation(data.url as string);
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
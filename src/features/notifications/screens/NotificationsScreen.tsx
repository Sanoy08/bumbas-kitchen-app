import { useRouter } from 'expo-router';
import { ArrowLeft, Bell, BellRing, Clock, Gift, ShoppingBag, Wallet, CheckCheck, Trash2, X } from 'lucide-react-native';
import LottieView from 'lottie-react-native';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useAuthStore } from '@/shared/store/authStore';
import { useNotificationStore } from '@/shared/store/notificationStore';
const API_URL = process.env.EXPO_PUBLIC_API_URL || 'https://www.bumbaskitchen.app/api';

interface NotificationItem {
  _id: string;
  title: string;
  body: string;
  createdAt: string;
  isRead: boolean;
}

export default function NotificationsScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const { setHasUnread } = useNotificationStore();
  
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchNotifications = async (showRefresh = false) => {
    if (!user) {
      setIsLoading(false);
      return;
    }
    
    if (showRefresh) setIsRefreshing(true);
    
    try {
      // Note: We removed auto-mark from the backend API.
      const res = await fetch(`${API_URL}/notifications/history`);
      const data = await res.json();
      
      if (data.success) {
        setNotifications(data.notifications || []);
        // Determine if there are still unread notifications
        const unreadExists = data.notifications?.some((n: NotificationItem) => !n.isRead);
        setHasUnread(!!unreadExists);
      }
    } catch (error) {
      console.log('Error fetching notifications:', error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  const formatDate = (dateString: string) => {
    const d = new Date(dateString);
    return d.toLocaleDateString('en-IN', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  const markAllRead = async () => {
    try {
      const res = await fetch(`${API_URL}/notifications/mark-read`, { method: 'PATCH' });
      if (res.ok) {
        setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
        setHasUnread(false);
      }
    } catch (e) {
      console.log('Error marking all read', e);
    }
  };

  const clearAllNotifications = async () => {
    try {
      const res = await fetch(`${API_URL}/notifications/delete`, { 
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clearAll: true })
      });
      if (res.ok) {
        setNotifications([]);
        setHasUnread(false);
      }
    } catch (e) {
      console.log('Error clearing notifications', e);
    }
  };

  const deleteNotification = async (id: string) => {
    // Optimistic UI update
    setNotifications(prev => prev.filter(n => n._id !== id));
    try {
      await fetch(`${API_URL}/notifications/delete`, { 
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notificationId: id })
      });
    } catch (e) {
      console.log('Error deleting notification', e);
      // Revert if needed, but keeping it simple for now
    }
  };

  const getNotificationIcon = (title: string, isRead: boolean) => {
    const t = title.toLowerCase();
    const color = isRead ? '#6b7280' : '#e11d48';
    if (t.includes('order')) return <ShoppingBag size={20} color={color} />;
    if (t.includes('offer') || t.includes('discount') || t.includes('coupon')) return <Gift size={20} color={color} />;
    if (t.includes('wallet') || t.includes('coin')) return <Wallet size={20} color={color} />;
    return <BellRing size={20} color={color} />;
  };

  const renderItem = ({ item, index }: { item: NotificationItem; index: number }) => (
    <Animated.View 
      entering={FadeInDown.delay(index * 100).springify().damping(14)}
      className={`p-4 mb-3 rounded-3xl border ${item.isRead ? 'bg-white border-gray-100' : 'bg-white border-red-100'} shadow-sm`}
    >
      <View className="flex-row items-start">
        <View className={`h-12 w-12 rounded-full items-center justify-center mr-3 ${item.isRead ? 'bg-gray-50' : 'bg-red-50'}`}>
          {getNotificationIcon(item.title, item.isRead)}
        </View>
        <View className="flex-1">
          <View className="flex-row items-start justify-between">
            <Text className={`flex-1 font-extrabold font-sans text-[15px] mb-1 mr-2 ${item.isRead ? 'text-gray-800' : 'text-gray-900'}`}>
              {item.title}
            </Text>
            <View className="flex-row items-center">
              {!item.isRead && (
                <View className="h-2 w-2 rounded-full bg-[#ef4444] mt-0.5 mr-3" />
              )}
              <TouchableOpacity onPress={() => deleteNotification(item._id)} className="p-1 -mt-1 -mr-1">
                <X size={16} color="#9ca3af" />
              </TouchableOpacity>
            </View>
          </View>
          <Text className="text-gray-500 font-sans text-sm leading-5 mb-2.5 pr-2">
            {item.body || (item as any).message}
          </Text>
          <View className="flex-row items-center">
            <Clock size={12} color="#9ca3af" />
            <Text className="text-gray-400 text-xs font-sans ml-1.5 font-medium tracking-wide">
              {formatDate(item.createdAt)}
            </Text>
          </View>
        </View>
      </View>
    </Animated.View>
  );

  return (
    <SafeAreaView className="flex-1 bg-white" edges={['top']}>
      <View className="flex-1 bg-gray-50">
        {/* Header */}
      <View className="flex-row items-center justify-between px-4 py-3 bg-white border-b border-gray-100">
        <View className="flex-row items-center">
          <TouchableOpacity 
            onPress={() => router.back()} 
            className="h-10 w-10 items-center justify-center rounded-full bg-gray-50 mr-2"
          >
            <ArrowLeft size={22} color="#111827" />
          </TouchableOpacity>
          <Text className="text-lg font-bold text-gray-900 font-sans">Notifications</Text>
        </View>
        
        {notifications.length > 0 && (
          <View className="flex-row items-center gap-1">
            <TouchableOpacity onPress={markAllRead} className="h-10 w-10 items-center justify-center rounded-full bg-blue-50">
              <CheckCheck size={20} color="#3b82f6" />
            </TouchableOpacity>
            <TouchableOpacity onPress={clearAllNotifications} className="h-10 w-10 items-center justify-center rounded-full bg-red-50">
              <Trash2 size={20} color="#ef4444" />
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Content */}
      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#e11d48" />
        </View>
      ) : !user ? (
        <View className="flex-1 items-center justify-center px-6">
          <View className="h-24 w-24 bg-red-50 rounded-full items-center justify-center mb-6">
            <Bell size={40} color="#e11d48" />
          </View>
          <Text className="text-xl font-bold text-gray-900 font-sans mb-2 text-center">Login Required</Text>
          <Text className="text-gray-500 font-sans text-center mb-6 leading-relaxed">
            Please log in to view your notifications and stay updated with your orders.
          </Text>
          <TouchableOpacity 
            onPress={() => router.push('/(auth)/login')}
            className="w-full bg-primary h-14 rounded-2xl items-center justify-center"
          >
            <Text className="text-white font-bold text-lg font-sans">Login Now</Text>
          </TouchableOpacity>
        </View>
      ) : notifications.length === 0 ? (
        <Animated.View entering={FadeInDown.springify()} className="flex-1 items-center justify-center px-8 -mt-24">
          <LottieView
            source={require('../../../../assets/animations/No-Item-Found.json')}
            autoPlay
            loop
            style={{ width: 350, height: 350 }}
            resizeMode="contain"
          />
          <Text className="text-2xl font-extrabold text-gray-900 font-sans mt-2 mb-3 text-center">All caught up!</Text>
          <Text className="text-gray-500 font-sans text-center leading-relaxed text-[15px]">
            You don't have any notifications right now. When you get updates on your orders or special offers, you'll find them here.
          </Text>
        </Animated.View>
      ) : (
        <FlatList
          data={notifications}
          renderItem={renderItem}
          keyExtractor={(item) => item._id}
          contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={() => fetchNotifications(true)}
              tintColor="#e11d48"
              colors={['#e11d48']}
            />
          }
        />
      )}
      </View>
    </SafeAreaView>
  );
}

// src\app\(shop)\account\orders\index.tsx

// src/app/(shop)/account/orders/index.tsx
import { format } from 'date-fns';
import { Image } from 'expo-image';
import { useRouter, useFocusEffect, useLocalSearchParams } from 'expo-router';
import {
    Calendar,
    CheckCircle2,
    ChevronRight, Clock,
    Download,
    MapPin,
    Package,
    ShoppingBag,
    Utensils,
    X
} from 'lucide-react-native';
import { useState, useCallback, useRef, useEffect } from 'react';
import { ActivityIndicator, Alert, Modal, ScrollView, Text, TouchableOpacity, View, Animated, Easing, PanResponder, Dimensions, Pressable, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';


import { optimizeImageUrl } from '@/shared/utils/imageUtils';
import { formatPrice } from '@/shared/utils/utils';
import { useAuthStore } from '@/shared/store/authStore';

// ★ নতুন ইনভয়েস জেনারেটর ইমপোর্ট করা হলো
import { generateInvoice } from '@/shared/utils/invoiceGenerator';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'https://www.bumbaskitchen.app/api';

type Order = {
  _id: string;
  OrderNumber: string;
  Timestamp: string;
  Status: string;
  FinalPrice: number;
  Subtotal: number;
  Discount: number;
  ReceivedAmount?: number;
  Items: any[];
  OrderType: string;
  Address: string;
  DeliveryAddress?: string;
  MealTime: string;
  PreferredDate: string;
  Name: string; 
  Phone: string; 
};

export function OrdersScreen() {
  const router = useRouter();
  const { user, isInitialized } = useAuthStore();
  const insets = useSafeAreaInsets();
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  
  const [totalOrders, setTotalOrders] = useState(0);
  const [completedOrders, setCompletedOrders] = useState(0);

  // Modal State
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false); // ★ লোডিং স্টেট

  const { orderId } = useLocalSearchParams<{ orderId?: string }>();

  const { height } = Dimensions.get('window');
  const slideAnim = useRef(new Animated.Value(height)).current;

  useFocusEffect(
    useCallback(() => {
      if (isInitialized && !user) {
        router.replace('/(auth)/login');
        return;
      }

      let isActive = true;

      const fetchOrders = async () => {
        setIsLoading(true);
        try {
          const res = await fetch(`${API_URL}/user/orders?page=1&limit=10`);
          const data = await res.json();
          
          if (data.success && isActive) {
            setOrders(data.orders);
            setTotalOrders(data.totalOrders ?? data.orders.length);
            setCompletedOrders(data.completedOrders ?? data.orders.filter((o: any) => o.Status === 'Delivered').length);
            setPage(1);
            setHasMore(data.orders.length === 10);
            
            if (orderId) {
              console.log('🔗 Auto-opening order modal for orderId:', orderId);
              const targetOrder = data.orders.find((o: Order) => o._id === orderId || o.OrderNumber === orderId);
              if (targetOrder) {
                console.log('✅ Found matching order! Opening modal...');
                setTimeout(() => {
                  setSelectedOrder(targetOrder);
                  setIsModalOpen(true);
                }, 400); // Wait for screen transition
              }
            }
          } else if (!data.success && isActive) {
            console.log("Failed:", data.error);
          }
        } catch (e) {
          console.log(e);
          if (isActive) Alert.alert("Error", "Could not load order history.");
        } finally {
          if (isActive) setIsLoading(false);
        }
      };

      if (isInitialized && user) {
        fetchOrders();
      }

      return () => {
        isActive = false;
      };
    }, [isInitialized, user])
  );

  useEffect(() => {
    if (isModalOpen) {
      slideAnim.setValue(height);
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 350,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start();
    }
  }, [isModalOpen, slideAnim, height]);

  const loadMoreOrders = async () => {
    if (isLoadingMore || !hasMore) return;
    setIsLoadingMore(true);
    try {
      const nextPage = page + 1;
      const res = await fetch(`${API_URL}/user/orders?page=${nextPage}&limit=10`);
      const data = await res.json();
      
      if (data.success) {
        setOrders(prev => [...prev, ...data.orders]);
        setPage(nextPage);
        setHasMore(data.orders.length === 10);
      }
    } catch (e) {
      console.log(e);
    } finally {
      setIsLoadingMore(false);
    }
  };

  const handleOrderClick = (order: Order) => {
    setSelectedOrder(order);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    Animated.timing(slideAnim, {
      toValue: height,
      duration: 300,
      easing: Easing.in(Easing.ease),
      useNativeDriver: true,
    }).start(() => {
      setIsModalOpen(false);
      setSelectedOrder(null);
      slideAnim.setValue(height);
    });
  };



  const getStatusStyle = (status: string) => {
    const s = status?.toLowerCase() || '';
    if (s === 'delivered') return { bg: 'bg-green-100', text: 'text-green-700' };
    if (s === 'cancelled') return { bg: 'bg-red-100', text: 'text-red-700' };
    if (s === 'cooking' || s === 'processing') return { bg: 'bg-orange-100', text: 'text-orange-700' };
    if (s === 'out for delivery') return { bg: 'bg-blue-100', text: 'text-blue-700' };
    return { bg: 'bg-gray-100', text: 'text-gray-700' };
  };

  // ★ নতুন ডাউনলোড লজিক
  const handleDownloadInvoice = async (order: Order) => {
    setIsDownloading(true);
    try {
      await generateInvoice(order);
    } catch (e) {
      Alert.alert("Error", "Failed to generate invoice");
    } finally {
      setIsDownloading(false);
    }
  };

  if (!isInitialized || isLoading) {
    return (
      <View className="flex-1 justify-center items-center bg-gray-50">
        <ActivityIndicator size="large" color="#e11d48" />
      </View>
    );
  }


  return (
    <View className="flex-1 bg-white" style={{ paddingTop: insets.top }}>
      <View className="flex-1 bg-gray-50">
      <ScrollView className="flex-1 px-4 pt-4" showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 80 }}>
        
        <Text className="text-2xl font-bold font-sans text-gray-900 mb-6">My Orders</Text>

        {/* --- 1. Stats Header --- */}
        <View className="flex-row gap-4 mb-8">
          <View className="flex-1 bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex-row items-center">
            <View className="h-12 w-12 rounded-full bg-primary/10 items-center justify-center mr-3">
              <ShoppingBag size={24} color="#e11d48" />
            </View>
            <View>
              <Text className="text-2xl font-bold text-gray-900 font-sans">{totalOrders}</Text>
              <Text className="text-xs text-gray-500 font-medium font-sans mt-0.5">Total Orders</Text>
            </View>
          </View>

          <View className="flex-1 bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex-row items-center">
            <View className="h-12 w-12 rounded-full bg-green-100 items-center justify-center mr-3">
              <CheckCircle2 size={24} color="#16a34a" />
            </View>
            <View>
              <Text className="text-2xl font-bold text-gray-900 font-sans">{completedOrders}</Text>
              <Text className="text-xs text-gray-500 font-medium font-sans mt-0.5">Completed</Text>
            </View>
          </View>
        </View>

        {/* --- 2. Orders List --- */}
        <View className="mb-4">
          <Text className="text-lg font-bold font-sans text-gray-900 mb-4 pl-1">Recent Orders</Text>
          
          {orders.length === 0 ? (
            <View className="items-center py-16 bg-white rounded-3xl border border-dashed border-gray-200">
              <Package size={64} color="#e5e7eb" className="mb-4" />
              <Text className="text-lg font-bold text-gray-700 font-sans">No orders yet</Text>
              <Text className="text-sm text-gray-500 font-medium mt-1 font-sans">Place your first order to see it here!</Text>
              <TouchableOpacity onPress={() => router.push('/explore')} className="mt-4 bg-primary/10 px-6 py-2.5 rounded-full">
                <Text className="text-primary font-bold font-sans">Browse Menu</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View className="gap-y-4">
              {orders.map((order) => {
                const statusStyle = getStatusStyle(order.Status);
                const itemCount = Array.isArray(order.Items) ? order.Items.reduce((acc, item) => acc + item.quantity, 0) : 0;

                return (
                  <TouchableOpacity 
                    key={order._id}
                    onPress={() => handleOrderClick(order)}
                    activeOpacity={0.7}
                    className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100"
                  >
                    <View className="flex-row justify-between items-start mb-4">
                      <View>
                        <Text className="font-bold text-lg text-gray-800 font-sans mb-1">#{order.OrderNumber}</Text>
                        <View className="flex-row items-center">
                          <Calendar size={14} color="#9ca3af" />
                          <Text className="text-xs text-gray-500 font-medium ml-1.5 font-sans">
                            {format(new Date(order.Timestamp), 'dd MMM, yyyy')}
                          </Text>
                        </View>
                      </View>
                      <View className={`${statusStyle.bg} px-2.5 py-1 rounded-md`}>
                        <Text className={`${statusStyle.text} text-[10px] font-bold uppercase font-sans`}>{order.Status}</Text>
                      </View>
                    </View>

                    <View className="h-[1px] bg-gray-50 w-full mb-4" />

                    <View className="flex-row justify-between items-center">
                      <View className="flex-row items-center">
                        <Utensils size={14} color="#9ca3af" />
                        <Text className="text-xs text-gray-500 font-medium ml-1.5 font-sans">{itemCount} Items</Text>
                      </View>
                      <View className="flex-row items-center">
                        <View className="mr-3 items-end">
                          <Text className="text-[10px] text-gray-400 font-bold uppercase font-sans mb-0.5">Total</Text>
                          <Text className="text-base font-bold text-primary font-sans">{formatPrice(order.FinalPrice)}</Text>
                        </View>
                        <ChevronRight size={20} color="#d1d5db" />
                      </View>
                    </View>
                  </TouchableOpacity>
                );
              })}
              {hasMore && orders.length > 0 && (
                <TouchableOpacity 
                  onPress={loadMoreOrders} 
                  disabled={isLoadingMore}
                  className="mt-4 bg-gray-100 py-3 rounded-full items-center justify-center border border-gray-200"
                >
                  {isLoadingMore ? (
                    <ActivityIndicator size="small" color="#6b7280" />
                  ) : (
                    <Text className="text-gray-600 font-bold">Load More</Text>
                  )}
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>
      </ScrollView>

      {/* --- 3. Order Details Modal --- */}
      <Modal visible={isModalOpen} animationType="fade" transparent={true} onRequestClose={closeModal}>
        <View style={StyleSheet.absoluteFill} className="bg-black/60 justify-end">
          <Pressable style={StyleSheet.absoluteFill} onPress={closeModal} />
          
          <Animated.View 
            className="w-full flex-1 justify-end"
            style={{ transform: [{ translateY: slideAnim }], maxHeight: height * 0.88 }}
          >
            {/* Floating Close Button exactly outside the top */}
            <View className="items-center mb-4">
              <TouchableOpacity 
                onPress={closeModal} 
                activeOpacity={0.7}
                style={{ backgroundColor: '#000000', width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center' }}
                className="shadow-2xl border-2 border-white/20"
              >
                <X size={28} color="white" />
              </TouchableOpacity>
            </View>

            <View className="bg-white rounded-t-[32px] pt-6 px-6 shadow-2xl flex-shrink" style={{ paddingBottom: Math.max(insets.bottom, 16) }}>

              <View className="flex-row items-center justify-between mb-4">
                <View>
                  <View className="flex-row items-center gap-3 mb-1">
                    <Text className="text-xl font-bold text-gray-900 font-sans">Order Details</Text>
                    {selectedOrder && (
                      <View className={`${getStatusStyle(selectedOrder.Status).bg} px-2 py-0.5 rounded`}>
                        <Text className={`${getStatusStyle(selectedOrder.Status).text} text-[10px] font-bold uppercase font-sans`}>
                          {selectedOrder.Status}
                        </Text>
                      </View>
                    )}
                  </View>
                  <Text className="text-xs text-gray-500 font-medium font-sans">#{selectedOrder?.OrderNumber}</Text>
                </View>
              </View>

              <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 20 }}>
                {selectedOrder && (
                <View className="space-y-6">
                  
                  <View>
                    <Text className="text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-3 font-sans">Items Ordered</Text>
                    <View className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm">
                      {Array.isArray(selectedOrder.Items) && selectedOrder.Items.map((item: any, idx: number) => {
                        const isLast = idx === selectedOrder.Items.length - 1;
                        
                        return (
                          <View key={idx} className={`flex-row justify-between items-center ${!isLast ? 'pb-3 mb-3 border-b border-dashed border-gray-200' : ''}`}>
                            <View className="flex-row items-center flex-1">
                              <View className="flex-1 pr-2">
                                <Text className="text-sm font-bold text-gray-800 font-sans" numberOfLines={2}>{item.name}</Text>
                                <Text className="text-xs text-gray-500 font-medium font-sans mt-0.5">
                                  {item.quantity}x {formatPrice(item.price)}
                                </Text>
                              </View>
                            </View>
                            <Text className="text-sm font-bold text-gray-700 font-sans">{formatPrice(item.price * item.quantity)}</Text>
                          </View>
                        );
                      })}
                    </View>
                  </View>

                  <View className="bg-gray-50 p-4 rounded-2xl border border-gray-100">
                    <Text className="text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-4 font-sans">Delivery Info</Text>
                    
                    <View className="flex-row items-start mb-4">
                      <MapPin size={18} color="#e11d48" className="mt-0.5 mr-3" />
                      <View className="flex-1">
                        <Text className="font-bold text-sm text-gray-800 font-sans">Address</Text>
                        <Text className="text-xs text-gray-500 font-medium mt-1 font-sans leading-tight">
                          {selectedOrder.DeliveryAddress || selectedOrder.Address}
                        </Text>
                      </View>
                    </View>
                    
                    <View className="flex-row items-start">
                      <Clock size={18} color="#e11d48" className="mt-0.5 mr-3" />
                      <View className="flex-1">
                        <Text className="font-bold text-sm text-gray-800 font-sans">Preferred Time</Text>
                        <Text className="text-xs text-gray-500 font-medium mt-1 capitalize font-sans">
                          {selectedOrder.PreferredDate ? format(new Date(selectedOrder.PreferredDate), 'dd MMM, yyyy') : 'N/A'} • {selectedOrder.MealTime || 'N/A'}
                        </Text>
                      </View>
                    </View>
                  </View>

                  <View className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm mb-4">
                    <View className="flex-row justify-between mb-2">
                      <Text className="text-sm text-gray-500 font-medium font-sans">Subtotal</Text>
                      <Text className="text-sm text-gray-700 font-bold font-sans">{formatPrice(selectedOrder.Subtotal || selectedOrder.FinalPrice)}</Text>
                    </View>
                    {selectedOrder.Discount > 0 && (
                      <View className="flex-row justify-between mb-2">
                        <Text className="text-sm text-green-600 font-medium font-sans">Discount</Text>
                        <Text className="text-sm text-green-600 font-bold font-sans">- {formatPrice(selectedOrder.Discount)}</Text>
                      </View>
                    )}
                    <View className="h-[1px] bg-gray-200 w-full my-2" />
                    <View className="flex-row justify-between items-center">
                      <Text className="text-base font-bold text-gray-900 font-sans">Grand Total</Text>
                      <Text className="text-xl font-bold text-primary font-sans">{formatPrice(selectedOrder.FinalPrice)}</Text>
                    </View>
                  </View>

                  <TouchableOpacity 
                    onPress={() => handleDownloadInvoice(selectedOrder)}
                    disabled={isDownloading}
                    activeOpacity={0.8}
                    className={`w-full h-14 rounded-xl flex-row items-center justify-center shadow-md ${isDownloading ? 'bg-gray-700' : 'bg-gray-900'}`}
                  >
                    {isDownloading ? (
                      <ActivityIndicator color="#ffffff" />
                    ) : (
                      <>
                        <Download size={18} color="#ffffff" className="mr-2" />
                        <Text className="text-white font-bold text-base font-sans">Download Invoice</Text>
                      </>
                    )}
                  </TouchableOpacity>

                </View>
              )}
            </ScrollView>
          </View>
          </Animated.View>
        </View>
      </Modal>
      </View>
    </View>
  );
}

// src\components\ui\CustomAlert.tsx

// src/components/ui/CustomAlert.tsx
import React, { createContext, useContext, useState, useRef } from 'react';
import { Modal, Text, TouchableOpacity, View, ActivityIndicator, Animated, Easing, Dimensions, Pressable, StyleSheet } from 'react-native';
import * as Haptics from 'expo-haptics';
import LottieView from 'lottie-react-native';
import { X } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useEffect } from 'react';

const { height } = Dimensions.get('window');

type AlertOptions = {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm?: () => void;
  onCancel?: () => void;
  confirmButtonStyle?: 'default' | 'destructive';
  loading?: boolean;
  lottieSource?: any;
};

type AlertContextType = {
  showAlert: (options: AlertOptions) => void;
  hideAlert: () => void;
};

const AlertContext = createContext<AlertContextType | undefined>(undefined);

export const AlertProvider = ({ children }: { children: React.ReactNode }) => {
  const insets = useSafeAreaInsets();
  const [visible, setVisible] = useState(false);
  const [options, setOptions] = useState<AlertOptions>({
    title: '',
    message: '',
    confirmText: 'OK',
    cancelText: 'Cancel',
    confirmButtonStyle: 'default',
  });
  const [loading, setLoading] = useState(false);
  const onConfirmRef = useRef<(() => void) | undefined>(undefined);
  const onCancelRef = useRef<(() => void) | undefined>(undefined);

  const showAlert = (opts: AlertOptions) => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
    setOptions({
      confirmText: 'OK',
      cancelText: 'Cancel',
      confirmButtonStyle: 'default',
      ...opts,
    });
    setLoading(opts.loading || false);
    onConfirmRef.current = opts.onConfirm;
    onCancelRef.current = opts.onCancel;
    setVisible(true);
  };

  const hideAlert = () => {
    setVisible(false);
    setLoading(false);
    onConfirmRef.current = undefined;
    onCancelRef.current = undefined;
  };

  const slideAnim = useRef(new Animated.Value(height)).current;

  useEffect(() => {
    if (visible) {
      slideAnim.setValue(height);
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 350,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start();
    }
  }, [visible, slideAnim]);

  const closeWithAnimation = (action: () => void) => {
    Animated.timing(slideAnim, {
      toValue: height,
      duration: 250,
      useNativeDriver: true,
    }).start(() => {
      action();
    });
  };

  const handleConfirm = async () => {
    if (onConfirmRef.current) {
      onConfirmRef.current();
    }
    closeWithAnimation(hideAlert);
  };

  const handleCancel = () => {
    if (onCancelRef.current) {
      onCancelRef.current();
    }
    closeWithAnimation(hideAlert);
  };

  return (
    <AlertContext.Provider value={{ showAlert, hideAlert }}>
      {children}
      <Modal transparent visible={visible} animationType="fade" onRequestClose={handleCancel}>
        <View style={StyleSheet.absoluteFill} className="bg-black/60 justify-end">
          <Pressable style={StyleSheet.absoluteFill} onPress={handleCancel} />
          
          <Animated.View 
            className="w-full flex-1 justify-end"
            style={{ transform: [{ translateY: slideAnim }] }}
          >
            {/* Floating Close Button exactly outside the top */}
            <View className="items-center mb-4">
              <TouchableOpacity 
                onPress={handleCancel} 
                activeOpacity={0.7}
                style={{ backgroundColor: '#000000', width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center' }}
                className="shadow-2xl border-2 border-white/20"
              >
                <X size={28} color="white" />
              </TouchableOpacity>
            </View>

            <View className="bg-white w-full rounded-t-[32px] pt-6 shadow-2xl flex-shrink" style={{ paddingBottom: Math.max(insets.bottom, 24) }}>
              {/* Optional Lottie Animation */}
              {options.lottieSource && (
                <View className="items-center pb-4">
                  <LottieView
                    source={options.lottieSource}
                    autoPlay
                    loop
                    style={{ width: 120, height: 120 }}
                  />
                </View>
              )}
              
              {/* Title */}
              <View className="px-6 pb-2">
                <Text className="text-xl font-bold text-gray-900 text-center font-sans">
                  {options.title}
                </Text>
              </View>
              {/* Message */}
              <View className="px-6 pb-8">
                <Text className="text-sm text-gray-500 text-center leading-5 font-sans">
                  {options.message}
                </Text>
              </View>
              {/* Buttons */}
              <View className="flex-row px-6 gap-3">
                {options.cancelText && (
                  <TouchableOpacity
                    onPress={handleCancel}
                    className="flex-1 py-4 bg-gray-100 rounded-2xl items-center justify-center border border-gray-200"
                  >
                    <Text className="text-gray-700 font-bold font-sans">
                      {options.cancelText}
                    </Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  onPress={handleConfirm}
                  disabled={loading}
                  className={`flex-1 py-4 rounded-2xl items-center justify-center ${options.confirmButtonStyle === 'destructive' ? 'bg-red-500 shadow-md shadow-red-500/20' : 'bg-primary shadow-md shadow-primary/20'}`}
                >
                  {loading ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text className="font-bold font-sans text-white">
                      {options.confirmText}
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </Animated.View>
        </View>
      </Modal>
    </AlertContext.Provider>
  );
};

export const useAlert = () => {
  const context = useContext(AlertContext);
  if (!context) {
    throw new Error('useAlert must be used within an AlertProvider');
  }
  return context;
};

// src/components/ui/CustomAlert.tsx
import React, { createContext, useContext, useState, useRef } from 'react';
import { Modal, Text, TouchableOpacity, View, ActivityIndicator } from 'react-native';

type AlertOptions = {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm?: () => void;
  onCancel?: () => void;
  confirmButtonStyle?: 'default' | 'destructive';
  loading?: boolean;
};

type AlertContextType = {
  showAlert: (options: AlertOptions) => void;
  hideAlert: () => void;
};

const AlertContext = createContext<AlertContextType | undefined>(undefined);

export const AlertProvider = ({ children }: { children: React.ReactNode }) => {
  const [visible, setVisible] = useState(false);
  const [options, setOptions] = useState<AlertOptions>({
    title: '',
    message: '',
    confirmText: 'OK',
    cancelText: 'Cancel',
    confirmButtonStyle: 'default',
  });
  const [loading, setLoading] = useState(false);
  const onConfirmRef = useRef<(() => void) | undefined>();
  const onCancelRef = useRef<(() => void) | undefined>();

  const showAlert = (opts: AlertOptions) => {
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

  const handleConfirm = async () => {
    if (onConfirmRef.current) {
      onConfirmRef.current();
    }
    hideAlert();
  };

  const handleCancel = () => {
    if (onCancelRef.current) {
      onCancelRef.current();
    }
    hideAlert();
  };

  return (
    <AlertContext.Provider value={{ showAlert, hideAlert }}>
      {children}
      <Modal transparent visible={visible} animationType="fade">
        <View className="flex-1 justify-center items-center bg-black/50 px-6">
          <View className="bg-white w-full rounded-2xl overflow-hidden shadow-xl">
            {/* Title */}
            <View className="px-5 pt-5 pb-2">
              <Text className="text-lg font-bold text-gray-900 text-center font-sans">
                {options.title}
              </Text>
            </View>
            {/* Message */}
            <View className="px-5 pb-5">
              <Text className="text-sm text-gray-600 text-center leading-5 font-sans">
                {options.message}
              </Text>
            </View>
            {/* Buttons */}
            <View className="flex-row border-t border-gray-100">
              {options.cancelText && (
                <TouchableOpacity
                  onPress={handleCancel}
                  className="flex-1 py-4 items-center border-r border-gray-100"
                >
                  <Text className="text-gray-500 font-semibold font-sans">
                    {options.cancelText}
                  </Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                onPress={handleConfirm}
                disabled={loading}
                className={`flex-1 py-4 items-center ${options.confirmButtonStyle === 'destructive' ? 'bg-red-50' : ''}`}
              >
                {loading ? (
                  <ActivityIndicator size="small" color="#e11d48" />
                ) : (
                  <Text
                    className={`font-bold font-sans ${
                      options.confirmButtonStyle === 'destructive'
                        ? 'text-red-600'
                        : 'text-primary'
                    }`}
                  >
                    {options.confirmText}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
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
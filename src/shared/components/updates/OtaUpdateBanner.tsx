import React, { useEffect, useState } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  DeviceEventEmitter,
} from 'react-native';
import LottieView from 'lottie-react-native';
import * as Haptics from 'expo-haptics';

import { useOtaUpdates } from '@/shared/hooks/useOtaUpdates';

interface OtaUpdateBannerProps {
  isSplashHidden?: boolean;
}

export function OtaUpdateBanner({ isSplashHidden: propSplashHidden }: OtaUpdateBannerProps = {}) {
  const { isUpdatePending, reloadApp } = useOtaUpdates();
  const [isRestarting, setIsRestarting] = useState(false);
  const [eventSplashHidden, setEventSplashHidden] = useState(false);

  const isSplashHidden = propSplashHidden ?? eventSplashHidden;

  useEffect(() => {
    const sub = DeviceEventEmitter.addListener('splash_hidden', () => {
      setEventSplashHidden(true);
    });
    return () => sub.remove();
  }, []);

  // Download happens silently without any banner.
  // Only show the forced update modal when the update is downloaded, ready AND splash screen is hidden!
  if (!isUpdatePending || !isSplashHidden) {
    return null;
  }

  const handleRestart = async () => {
    if (isRestarting) return;
    try {
      setIsRestarting(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => {});
      await reloadApp();
    } catch {
      setIsRestarting(false);
    }
  };

  return (
    <Modal
      visible={isUpdatePending && isSplashHidden}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={() => {
        // Disallow back button dismissal - user must update
      }}
    >
      <View className="flex-1 justify-center items-center bg-black/60 px-4">
        <View className="bg-white rounded-[32px] p-6 w-[88%] max-w-[340px] items-center shadow-2xl">
          <LottieView
            source={require('../../../../assets/animations/Maintenance web.json')}
            autoPlay
            loop
            style={{ width: 220, height: 220 }}
          />
          <Text className="text-2xl font-extrabold tracking-tight text-gray-900 mb-2 mt-2 text-center font-sans">
            Update Required
          </Text>
          <Text className="text-[13px] leading-5 text-gray-500 mb-6 text-center px-2 font-sans">
            A new update is available. Please update to continue using Bumba's Kitchen smoothly.
          </Text>

          <View className="w-full">
            <TouchableOpacity
              onPress={handleRestart}
              disabled={isRestarting}
              className="w-full bg-primary py-3.5 rounded-2xl flex-row justify-center items-center active:opacity-80"
            >
              {isRestarting ? (
                <View className="flex-row items-center justify-center">
                  <ActivityIndicator size="small" color="#ffffff" style={{ marginRight: 8 }} />
                  <Text className="text-white font-bold text-lg font-sans">Updating...</Text>
                </View>
              ) : (
                <Text className="text-white font-bold text-lg font-sans">Update Now</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

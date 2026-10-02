// src/components/AppUpdater.tsx
import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, Modal, Linking } from 'react-native';
import * as Application from 'expo-application';
import LottieView from 'lottie-react-native';
import { useAlert } from '../ui/CustomAlert';

export function AppUpdater() {
  const [showUpdate, setShowUpdate] = useState(false);
  const [updateInfo, setUpdateInfo] = useState({ latestVersion: '', apkUrl: '' });
  
  const { showAlert } = useAlert();

  useEffect(() => {
    const checkUpdate = async () => {
      try {
        const currentVersion = Application.nativeApplicationVersion || '1.0.0';

        const res = await fetch(`https://www.bumbaskitchen.app/api/app-version?t=${new Date().getTime()}`);
        const data = await res.json();

        if (data.success && data.latestVersion && data.apkUrl) {
          if (isNewerVersion(currentVersion, data.latestVersion)) {
            setUpdateInfo({ 
                latestVersion: data.latestVersion, 
                apkUrl: data.apkUrl 
            });
            setShowUpdate(true);
          }
        }
      } catch (error) {
        console.log("Update check failed", error);
      }
    };

    checkUpdate();
  }, []);

  const isNewerVersion = (oldVer: string, newVer: string) => {
    const oldParts = oldVer.split('.').map(Number);
    const newParts = newVer.split('.').map(Number);
    for (let i = 0; i < Math.max(oldParts.length, newParts.length); i++) {
        const o = oldParts[i] || 0;
        const n = newParts[i] || 0;
        if (n > o) return true;
        if (n < o) return false;
    }
    return false;
  };

  const handleUpdate = async () => {
    if (!updateInfo.apkUrl) {
      showAlert({
        title: "Link Broken",
        message: "Error: Update link is broken!",
        confirmText: "OK",
      });
      return;
    }

    try {
      await Linking.openURL(updateInfo.apkUrl);
    } catch (e: any) {
      console.error("Open Link Error:", e);
      showAlert({
        title: "Error",
        message: "Could not open the update link.",
        confirmText: "OK",
      }); 
    }
  };

  return (
    <Modal visible={showUpdate} transparent animationType="fade" onRequestClose={() => {}}>
      <View className="flex-1 justify-center items-center bg-black/60 px-4">
        <View className="bg-white rounded-[32px] p-6 w-[88%] max-w-[340px] items-center shadow-2xl">
          <LottieView
            source={require('../../../../assets/animations/Maintenance web.json')}
            autoPlay
            loop
            style={{ width: 220, height: 220 }}
          />
          <Text className="text-2xl font-extrabold tracking-tight text-gray-900 mb-2 mt-2">
            Update Required
          </Text>
          <Text className="text-[13px] leading-5 text-gray-500 mb-6 text-center px-2">
            Version {updateInfo.latestVersion} is now available. Please update to continue using Bumba's Kitchen smoothly.
          </Text>

          <View className="w-full">
            <TouchableOpacity 
              onPress={handleUpdate} 
              className="w-full bg-primary py-3.5 rounded-2xl flex-row justify-center items-center active:opacity-80"
            >
              <Text className="text-white font-bold text-lg">Update Now</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}
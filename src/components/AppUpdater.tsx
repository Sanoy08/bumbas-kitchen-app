// src/components/AppUpdater.tsx
import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, Modal } from 'react-native';
import * as FileSystem from 'expo-file-system';
import * as IntentLauncher from 'expo-intent-launcher';
import Constants from 'expo-constants';

export function AppUpdater() {
  const [showUpdate, setShowUpdate] = useState(false);
  const [updateInfo, setUpdateInfo] = useState({ latestVersion: '', apkUrl: '' });
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [downloadedUri, setDownloadedUri] = useState<string | null>(null);

  useEffect(() => {
    const checkUpdate = async () => {
      try {
        // App.json theke current version nilam (e.g., "1.0.0")
        const currentVersion = Constants.expoConfig?.version || '1.0.0';

        // Apnar API theke latest data check korchi
        const res = await fetch(`https://www.bumbaskitchen.app/api/app-version?t=${new Date().getTime()}`);
        const data = await res.json();

        if (data.success && data.latestVersion) {
          if (isNewerVersion(currentVersion, data.latestVersion)) {
            setUpdateInfo({ 
                latestVersion: data.latestVersion, 
                apkUrl: data.apkUrl 
            });
            setShowUpdate(true);
          }
        }
      } catch (error) {
        console.error("Update check failed", error);
      }
    };

    checkUpdate();
  }, []);

  // Version match korar chotto logic
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

  const handleDownloadAndInstall = async () => {
    if (downloadedUri) {
      installUpdate(downloadedUri);
      return;
    }

    setIsDownloading(true);
    const fileUri = FileSystem.documentDirectory + 'bumbas-kitchen-update.apk';

    const downloadResumable = FileSystem.createDownloadResumable(
      updateInfo.apkUrl,
      fileUri,
      {},
      (downloadInfo) => {
        const progress = downloadInfo.totalBytesWritten / downloadInfo.totalBytesExpectedToWrite;
        setDownloadProgress(progress);
      }
    );

    try {
      const result = await downloadResumable.downloadAsync();
      if (result?.uri) {
        setDownloadedUri(result.uri);
        installUpdate(result.uri);
      }
    } catch (e) {
      console.error(e);
      alert('Download failed! Please check your internet connection.');
    } finally {
      setIsDownloading(false);
    }
  };

  const installUpdate = async (uri: string) => {
    try {
      const contentUri = await FileSystem.getContentUriAsync(uri);
      await IntentLauncher.startActivityAsync('android.intent.action.VIEW', {
        data: contentUri,
        flags: 1, 
        type: 'application/vnd.android.package-archive',
      });
    } catch (error) {
      console.error("Installation Error:", error);
      alert('Install korte somossa hocche.');
    }
  };

  return (
    <Modal visible={showUpdate} transparent animationType="fade">
      <View className="flex-1 justify-center items-center bg-black/60 px-4">
        <View className="bg-white rounded-3xl p-6 sm:p-8 w-full max-w-sm items-center shadow-2xl">
          <Text className="bg-red-50 text-red-500 text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-widest mt-2 mb-4">
            Action Required
          </Text>

          <Text className="text-2xl font-bold tracking-tight text-gray-900 mb-1">
            New Update
          </Text>
          <Text className="text-sm text-gray-500 mb-6 text-center">
            Version {updateInfo.latestVersion} is required to continue using Bumba's Kitchen.
          </Text>

          <View className="w-full">
            {isDownloading ? (
              <View className="w-full space-y-2">
                <View className="flex-row justify-between px-1 mb-2">
                  <Text className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Downloading</Text>
                  <Text className="text-[11px] font-bold text-red-500 uppercase">{Math.round(downloadProgress * 100)}%</Text>
                </View>
                <View className="w-full h-2.5 bg-red-100 rounded-full overflow-hidden">
                  <View 
                    className="h-full bg-red-500" 
                    style={{ width: `${downloadProgress * 100}%` }} 
                  />
                </View>
              </View>
            ) : (
              <TouchableOpacity 
                onPress={handleDownloadAndInstall} 
                className="w-full h-12 bg-red-500 rounded-2xl items-center justify-center shadow-lg"
              >
                <Text className="text-white font-bold text-lg">{downloadedUri ? "Install Now" : "Update Now"}</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
}
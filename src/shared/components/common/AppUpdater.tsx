// src/components/AppUpdater.tsx
import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, Modal } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import * as IntentLauncher from 'expo-intent-launcher';
import * as Application from 'expo-application';
import LottieView from 'lottie-react-native';
import { toast } from 'sonner-native';
import { useAlert } from '../ui/CustomAlert';

export function AppUpdater() {
  const [showUpdate, setShowUpdate] = useState(false);
  const [updateInfo, setUpdateInfo] = useState({ latestVersion: '', apkUrl: '' });
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [downloadedUri, setDownloadedUri] = useState<string | null>(null);
  const [downloadedMB, setDownloadedMB] = useState(0); // File size na pele MB dekhabar jonno
  
  const { showAlert } = useAlert();

  useEffect(() => {
    const checkUpdate = async () => {
      try {
        const currentVersion = Application.nativeApplicationVersion || '1.0.0';

        const res = await fetch(`https://www.bumbaskitchen.app/api/app-version?t=${new Date().getTime()}`);
        const data = await res.json();

        if (data.success && data.latestVersion && data.apkUrl) {
          
          // ★ FIX 1: URL absolute (https://...) kora holo
          let finalApkUrl = data.apkUrl;
          if (finalApkUrl.startsWith('/')) {
            finalApkUrl = `https://www.bumbaskitchen.app${finalApkUrl}`;
          }

          if (isNewerVersion(currentVersion, data.latestVersion)) {
            setUpdateInfo({ 
                latestVersion: data.latestVersion, 
                apkUrl: finalApkUrl 
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

  const handleDownloadAndInstall = async () => {
    if (downloadedUri) {
      installUpdate(downloadedUri);
      return;
    }

    if (!updateInfo.apkUrl) {
      showAlert({
        title: "Link Broken",
        message: "Error: Update link is broken!",
        confirmText: "OK",
      });
      return;
    }

    setIsDownloading(true);
    setDownloadProgress(0);
    setDownloadedMB(0);

    const fileUri = (FileSystem as any).documentDirectory + 'bumbas-kitchen-update.apk';

    try {
      const fileInfo = await FileSystem.getInfoAsync(fileUri);
      if (fileInfo.exists) {
        await FileSystem.deleteAsync(fileUri);
      }
    } catch(e: any) {}

    try {
      const downloadResumable = FileSystem.createDownloadResumable(
        updateInfo.apkUrl,
        fileUri,
        {},
        (downloadInfo) => {
          if (downloadInfo.totalBytesExpectedToWrite > 0) {
            const progress = downloadInfo.totalBytesWritten / downloadInfo.totalBytesExpectedToWrite;
            setDownloadProgress(progress);
          } else {
            const mb = downloadInfo.totalBytesWritten / (1024 * 1024);
            setDownloadedMB(mb);
            setDownloadProgress((prev) => (prev < 0.95 ? prev + 0.01 : 0.95)); 
          }
        }
      );

      const result = await downloadResumable.downloadAsync();
      
      if (result?.uri) {
        setDownloadProgress(1);
        setDownloadedUri(result.uri);
        installUpdate(result.uri);
      }
    } catch (e: any) {
      console.error("Download Error:", e);
      showAlert({
        title: "Download Failed",
        message: `Error: ${e?.message}`,
        confirmText: "OK",
      }); 
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
    } catch (error: any) {
      console.error("Installation Error:", error);
      showAlert({
        title: "Install Error",
        message: "Please check \"Install Unknown Apps\" permission in your phone settings.",
        confirmText: "OK",
      });
    }
  };

  return (
    <Modal visible={showUpdate} transparent animationType="fade">
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
            {isDownloading ? (
              <View className="w-full space-y-2">
                <View className="flex-row justify-between px-1 mb-2">
                  <Text className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                    {downloadedMB > 0 ? `Downloading... ${downloadedMB.toFixed(1)} MB` : 'Downloading'}
                  </Text>
                  <Text className="text-[11px] font-bold text-primary uppercase">
                    {downloadedMB > 0 ? '' : `${Math.round(downloadProgress * 100)}%`}
                  </Text>
                </View>
                <View className="w-full h-2.5 bg-rose-100 rounded-full overflow-hidden">
                  <View 
                    className="h-full bg-primary rounded-full" 
                    style={{ width: `${Math.max(5, downloadProgress * 100)}%` }} 
                  />
                </View>
              </View>
            ) : (
              <TouchableOpacity 
                onPress={handleDownloadAndInstall} 
                className="w-full bg-primary py-3.5 rounded-2xl flex-row justify-center items-center active:opacity-80"
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
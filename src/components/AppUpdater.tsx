// src/components/AppUpdater.tsx
import { useAlert } from '@/components/ui/CustomAlert'; // ★ Custom Alert Import Kora Holo
import * as Application from 'expo-application';
import * as FileSystem from 'expo-file-system';
import * as IntentLauncher from 'expo-intent-launcher';
import { useEffect, useState } from 'react';
import { Modal, Text, TouchableOpacity, View } from 'react-native';

export function AppUpdater() {
  const [showUpdate, setShowUpdate] = useState(false);
  const [updateInfo, setUpdateInfo] = useState({ latestVersion: '', apkUrl: '' });
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [downloadedUri, setDownloadedUri] = useState<string | null>(null);
  const [downloadedMB, setDownloadedMB] = useState(0);

  const { showAlert } = useAlert(); // ★ Alert Hook Init

  useEffect(() => {
    const checkUpdate = async () => {
      try {
        const currentVersion = Application.nativeApplicationVersion || '1.0.0';

        const res = await fetch(`https://www.bumbaskitchen.app/api/app-version?t=${new Date().getTime()}`);
        
        if (!res.ok) {
           throw new Error(`Server returned status: ${res.status}`);
        }

        const data = await res.json();

        if (data.success && data.latestVersion && data.apkUrl) {
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
      } catch (error: any) {
        // ★ API Call Fail hole Alert
        showAlert({
          title: "Update API Error",
          message: `Failed to check for updates.\nReason: ${error.message}`,
          confirmText: "Close",
        });
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
        message: "The update URL is missing or invalid. Please check MongoDB.",
        confirmText: "Okay",
        confirmButtonStyle: "destructive"
      });
      return;
    }

    setIsDownloading(true);
    setDownloadProgress(0);
    setDownloadedMB(0);

    const fileUri = FileSystem.documentDirectory + `bumbas-kitchen-v${updateInfo.latestVersion}.apk`;

    try {
      const fileInfo = await FileSystem.getInfoAsync(fileUri);
      if (fileInfo.exists) {
        await FileSystem.deleteAsync(fileUri);
      }
    } catch(e) {}

    // ★ FIX: Headers add kora holo jate Vercel/Browser er moto treat kore
    const downloadResumable = FileSystem.createDownloadResumable(
      updateInfo.apkUrl,
      fileUri,
      {
        headers: {
          'User-Agent': 'BumbasKitchenApp/Android', // ★ Server ke bojhanor jonno
          'Accept': 'application/vnd.android.package-archive',
          'Cache-Control': 'no-cache'
        }
      },
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

    try {
      const result = await downloadResumable.downloadAsync();
      
      // ★ DEBUGGER: Jodi File download hoy kintu block kora thake (eg: 404, 403, 500)
      if (result && result.status !== 200) {
        showAlert({
          title: "Download Blocked!",
          message: `Server rejected the download.\nStatus Code: ${result.status}\nURL: ${updateInfo.apkUrl}`,
          confirmText: "Close",
          confirmButtonStyle: "destructive"
        });
        setIsDownloading(false);
        return;
      }

      if (result?.uri) {
        setDownloadProgress(1);
        setDownloadedUri(result.uri);
        installUpdate(result.uri);
      }
    } catch (error: any) {
      // ★ DEBUGGER: Internet/Network/CORS cras error
      showAlert({
        title: "Download Crashed!",
        message: `Network or Server Error occurred.\nReason: ${error.message}\nURL tried: ${updateInfo.apkUrl}`,
        confirmText: "Okay",
        confirmButtonStyle: "destructive"
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
      // ★ DEBUGGER: Install failed error
      showAlert({
        title: "Installation Failed",
        message: `Reason: ${error.message}\n\nPlease enable "Install Unknown Apps" for Bumba's Kitchen in phone settings.`,
        confirmText: "Close",
        confirmButtonStyle: "destructive"
      });
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
                  <Text className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                    {downloadedMB > 0 ? `Downloading... ${downloadedMB.toFixed(1)} MB` : 'Downloading'}
                  </Text>
                  <Text className="text-[11px] font-bold text-red-500 uppercase">
                    {downloadedMB > 0 ? '' : `${Math.round(downloadProgress * 100)}%`}
                  </Text>
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
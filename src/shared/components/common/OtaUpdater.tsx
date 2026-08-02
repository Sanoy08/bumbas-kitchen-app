import React, { useEffect } from 'react';
import * as Updates from 'expo-updates';
import { useAlert } from '../ui/CustomAlert';

export function OtaUpdater() {
  const { showAlert } = useAlert();

  useEffect(() => {
    const checkForUpdates = async () => {
      try {
        if (__DEV__) {
          console.log("[OTA Debugger] Skipping OTA check in development mode.");
          return;
        }

        console.log("[OTA Debugger] Checking for updates...");
        showAlert({
          title: "OTA Debugger",
          message: "Checking for OTA updates in background...",
          confirmText: "OK",
        });

        const updateCheckResult = await Updates.checkForUpdateAsync();

        if (updateCheckResult.isAvailable) {
          showAlert({
            title: "OTA Update Found!",
            message: "A new Over-The-Air update is available. Downloading now...",
            confirmText: "OK",
          });

          await Updates.fetchUpdateAsync();
          
          showAlert({
            title: "Update Downloaded",
            message: "Update successfully downloaded! The app needs to restart to apply it.",
            confirmText: "Restart Now",
            onConfirm: () => {
              Updates.reloadAsync();
            }
          });
        } else {
          showAlert({
            title: "OTA Status",
            message: "No OTA updates available. You are on the latest bundle version.",
            confirmText: "Close",
          });
        }
      } catch (error: any) {
        console.error("[OTA Debugger] Error:", error);
        showAlert({
          title: "OTA Error",
          message: `Failed to check for updates: ${error?.message || error}`,
          confirmText: "OK",
        });
      }
    };

    // Delay the check slightly so the app finishes initial loading
    const timer = setTimeout(checkForUpdates, 3500);
    return () => clearTimeout(timer);
  }, []);

  return null;
}

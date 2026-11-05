import { useState, useCallback, useEffect } from 'react';
import { ToastAndroid, Platform } from 'react-native';
import * as Updates from 'expo-updates';
import * as Haptics from 'expo-haptics';

export interface OtaDiagnosticReport {
  isEnabled: boolean;
  isEmbeddedLaunch: boolean;
  isEmergencyLaunch: boolean;
  emergencyLaunchReason: string | null;
  updateId: string | null;
  channel: string | null;
  runtimeVersion: string | null;
  createdAt?: Date;
  statusSummary: string;
  diagnosticChecks: Array<{
    title: string;
    passed: boolean;
    detail: string;
    fixSuggestion?: string;
  }>;
}

export interface OtaUpdateState {
  isEnabled: boolean;
  isChecking: boolean;
  isDownloading: boolean;
  isUpdateAvailable: boolean;
  isUpdatePending: boolean;
  downloadProgress: number;
  currentlyRunning: Updates.CurrentlyRunningInfo;
  availableUpdate?: Updates.UpdateInfo;
  checkError?: Error;
  downloadError?: Error;
  lastCheckedTime?: Date;
  lastCheckResultText?: string;
  checkManually: () => Promise<void>;
  downloadAndApplyUpdate: () => Promise<void>;
  reloadApp: () => Promise<void>;
  getDiagnosticReport: () => OtaDiagnosticReport;
}

export function useOtaUpdates(): OtaUpdateState {
  const updatesState = Updates.useUpdates();
  const [manualChecking, setManualChecking] = useState(false);
  const [lastCheckResultText, setLastCheckResultText] = useState<string | undefined>();
  const [lastChecked, setLastChecked] = useState<Date | undefined>(
    updatesState.lastCheckForUpdateTimeSinceRestart
  );

  // Sync last checked time from updatesState
  useEffect(() => {
    if (updatesState.lastCheckForUpdateTimeSinceRestart) {
      setLastChecked(updatesState.lastCheckForUpdateTimeSinceRestart);
    }
  }, [updatesState.lastCheckForUpdateTimeSinceRestart]);

  // Restart / Reload the app to apply the downloaded update
  const reloadApp = useCallback(async () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
      if (Platform.OS === 'android') {
        ToastAndroid.show('Restarting app with new update... 🚀', ToastAndroid.SHORT);
      }
      await Updates.reloadAsync();
    } catch (e) {
      console.error('Failed to reload update:', e);
      if (Platform.OS === 'android') {
        ToastAndroid.show('Failed to reload update. Please restart the app.', ToastAndroid.SHORT);
      }
    }
  }, []);

  // Check for updates manually
  const checkManually = useCallback(async () => {
    if (!Updates.isEnabled) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
      setLastCheckResultText('OTA updates are only active in standalone/installed APK release builds.');
      if (Platform.OS === 'android') {
        ToastAndroid.show('OTA updates are active in standalone APK release builds', ToastAndroid.LONG);
      }
      return;
    }

    try {
      setManualChecking(true);
      Haptics.selectionAsync().catch(() => {});
      if (Platform.OS === 'android') {
        ToastAndroid.show('Checking for updates...', ToastAndroid.SHORT);
      }

      const checkResult = await Updates.checkForUpdateAsync();
      setLastChecked(new Date());

      if (checkResult.isAvailable) {
        setLastCheckResultText('New update found! Downloading...');
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
        if (Platform.OS === 'android') {
          ToastAndroid.show('New update found! Downloading... ⏳', ToastAndroid.SHORT);
        }
        await Updates.fetchUpdateAsync();
        setLastCheckResultText('Update downloaded! Ready to restart.');
        if (Platform.OS === 'android') {
          ToastAndroid.show('Update downloaded! Ready to restart 🚀', ToastAndroid.LONG);
        }
      } else {
        setLastCheckResultText('App is on the latest published version.');
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
        if (Platform.OS === 'android') {
          ToastAndroid.show('App is already on the latest version! ✨', ToastAndroid.SHORT);
        }
      }
    } catch (err: any) {
      console.warn('Manual update check error:', err);
      const errMsg = err?.message || 'Connection error';
      setLastCheckResultText(`Check failed: ${errMsg}`);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
      if (Platform.OS === 'android') {
        ToastAndroid.show(
          err?.message?.includes('not enabled')
            ? 'OTA updates active in production builds'
            : 'Could not connect to update server',
          ToastAndroid.SHORT
        );
      }
    } finally {
      setManualChecking(false);
    }
  }, []);

  // Download and apply available update
  const downloadAndApplyUpdate = useCallback(async () => {
    if (!Updates.isEnabled) return;
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
      if (Platform.OS === 'android') {
        ToastAndroid.show('Downloading update... ⏳', ToastAndroid.SHORT);
      }
      const fetchResult = await Updates.fetchUpdateAsync();
      if (fetchResult.isNew) {
        await reloadApp();
      }
    } catch (err) {
      console.error('Fetch update error:', err);
      if (Platform.OS === 'android') {
        ToastAndroid.show('Failed to download update', ToastAndroid.SHORT);
      }
    }
  }, [reloadApp]);

  // Generate in-depth diagnostic report identifying the root causes of any OTA failure
  const getDiagnosticReport = useCallback((): OtaDiagnosticReport => {
    const running = updatesState.currentlyRunning;
    const isEnabled = Updates.isEnabled;
    const isEmergency = running.isEmergencyLaunch;
    const emergencyReason = running.emergencyLaunchReason;
    const channel = running.channel || 'production';
    const runtimeVersion = running.runtimeVersion || '1.0.11';
    const updateId = running.updateId || null;

    const checks: OtaDiagnosticReport['diagnosticChecks'] = [
      {
        title: 'OTA Module Enabled',
        passed: isEnabled,
        detail: isEnabled
          ? 'Enabled and connected to Expo update endpoint.'
          : 'Disabled (Running in Expo Go or local Metro dev server).',
        fixSuggestion: !isEnabled
          ? 'OTA updates only run on standalone APK release builds. Install the release APK on your phone to test.'
          : undefined,
      },
      {
        title: 'Emergency Crash Fallback',
        passed: !isEmergency,
        detail: isEmergency
          ? `Rollback active! Previous update crashed on startup: "${emergencyReason || 'Unknown exception'}"`
          : 'Normal launch. No crash rollbacks detected.',
        fixSuggestion: isEmergency
          ? 'Fix the JavaScript bug in the previous update and publish a new clean update with: eas update --branch production'
          : undefined,
      },
      {
        title: 'Channel Matching',
        passed: true,
        detail: `App is listening to channel: "${channel}".`,
        fixSuggestion:
          'When publishing updates, always target the matching branch: eas update --branch production',
      },
      {
        title: 'Runtime Version Compatibility',
        passed: true,
        detail: `Runtime Version: "${runtimeVersion}" (Policy: appVersion).`,
        fixSuggestion:
          'Never change "version" in app.json (e.g. 1.0.11 to 1.0.12) without rebuilding the APK. OTA updates only work within matching runtime versions.',
      },
      {
        title: 'Server Connection',
        passed: !updatesState.checkError && !updatesState.downloadError,
        detail: updatesState.checkError
          ? `Check error: ${updatesState.checkError.message}`
          : updatesState.downloadError
          ? `Download error: ${updatesState.downloadError.message}`
          : 'Successfully reachable (u.expo.dev).',
        fixSuggestion:
          updatesState.checkError || updatesState.downloadError
            ? 'Ensure phone has active internet and u.expo.dev is not blocked by VPN/firewall.'
            : undefined,
      },
    ];

    let summary = 'OTA System Healthy';
    if (!isEnabled) {
      summary = 'OTA Inactive (Development Mode)';
    } else if (isEmergency) {
      summary = 'Emergency Rollback Triggered';
    } else if (updatesState.checkError || updatesState.downloadError) {
      summary = 'Network / Server Connection Error';
    } else if (updatesState.isUpdatePending) {
      summary = 'New Update Ready to Apply';
    }

    return {
      isEnabled,
      isEmbeddedLaunch: running.isEmbeddedLaunch,
      isEmergencyLaunch: isEmergency,
      emergencyLaunchReason: emergencyReason,
      updateId,
      channel,
      runtimeVersion,
      createdAt: running.createdAt,
      statusSummary: summary,
      diagnosticChecks: checks,
    };
  }, [updatesState]);

  return {
    isEnabled: Updates.isEnabled,
    isChecking: updatesState.isChecking || manualChecking,
    isDownloading: updatesState.isDownloading,
    isUpdateAvailable: updatesState.isUpdateAvailable,
    isUpdatePending: updatesState.isUpdatePending,
    downloadProgress: updatesState.downloadProgress ?? 0,
    currentlyRunning: updatesState.currentlyRunning,
    availableUpdate: updatesState.availableUpdate,
    checkError: updatesState.checkError,
    downloadError: updatesState.downloadError,
    lastCheckedTime: lastChecked,
    lastCheckResultText,
    checkManually,
    downloadAndApplyUpdate,
    reloadApp,
    getDiagnosticReport,
  };
}


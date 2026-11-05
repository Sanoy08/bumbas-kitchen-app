import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Sparkles, RotateCw, X } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';

import { useOtaUpdates } from '@/shared/hooks/useOtaUpdates';

export function OtaUpdateBanner() {
  const insets = useSafeAreaInsets();
  const {
    isDownloading,
    isUpdatePending,
    downloadProgress,
    reloadApp,
  } = useOtaUpdates();

  const [isDismissed, setIsDismissed] = useState(false);

  // If user dismissed it or there's nothing active, don't show
  if (isDismissed || (!isUpdatePending && !isDownloading)) {
    return null;
  }

  return (
    <View
      style={[
        styles.container,
        {
          bottom: Math.max(insets.bottom, 12) + 65, // Above bottom navigation
        },
      ]}
      pointerEvents="box-none"
    >
      <LinearGradient
        colors={['#1F191E', '#181216']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.bannerCard}
      >
        {isDownloading ? (
          // Downloading state
          <View style={styles.downloadingRow}>
            <ActivityIndicator size="small" color="#e11d48" style={{ marginRight: 10 }} />
            <View style={{ flex: 1 }}>
              <Text style={styles.titleText}>Downloading App Update...</Text>
              <Text style={styles.subtitleText}>
                {downloadProgress > 0
                  ? `${Math.round(downloadProgress * 100)}% completed`
                  : 'Fetching new features & improvements'}
              </Text>
            </View>
          </View>
        ) : (
          // Update Ready (Pending restart) state
          <View style={styles.readyWrap}>
            <View style={styles.headerRow}>
              <View style={styles.iconBadge}>
                <Sparkles size={18} color="#FFD166" />
              </View>
              <View style={{ flex: 1, marginLeft: 10 }}>
                <Text style={styles.titleText}>New Update Ready! 🚀</Text>
                <Text style={styles.subtitleText}>
                  A fresh update is ready. Restart now to apply changes.
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => {
                  Haptics.selectionAsync().catch(() => {});
                  setIsDismissed(true);
                }}
                style={styles.closeBtn}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <X size={18} color="#9CA3AF" />
              </TouchableOpacity>
            </View>

            <View style={styles.actionsRow}>
              <TouchableOpacity
                onPress={() => {
                  Haptics.selectionAsync().catch(() => {});
                  setIsDismissed(true);
                }}
                style={styles.laterBtn}
                activeOpacity={0.7}
              >
                <Text style={styles.laterBtnText}>Later</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={reloadApp}
                style={styles.restartBtn}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={['#e11d48', '#be123c']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.restartGradient}
                >
                  <RotateCw size={14} color="#FFF" style={{ marginRight: 6 }} />
                  <Text style={styles.restartBtnText}>Restart Now</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 16,
    right: 16,
    zIndex: 9999,
    elevation: 20,
    shadowColor: '#000',
    shadowOpacity: 0.35,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 12,
  },
  bannerCard: {
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(225, 29, 72, 0.4)',
    overflow: 'hidden',
  },
  downloadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  readyWrap: {
    gap: 12,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 209, 102, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '700',
    fontFamily: 'Poppins_600SemiBold',
  },
  subtitleText: {
    color: '#9CA3AF',
    fontSize: 12,
    marginTop: 2,
    fontFamily: 'Poppins_400Regular',
  },
  closeBtn: {
    padding: 4,
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 2,
  },
  laterBtn: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  laterBtnText: {
    color: '#D1D5DB',
    fontSize: 12,
    fontWeight: '600',
    fontFamily: 'Poppins_500Medium',
  },
  restartBtn: {
    borderRadius: 10,
    overflow: 'hidden',
  },
  restartGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
  },
  restartBtnText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '700',
    fontFamily: 'Poppins_600SemiBold',
  },
});


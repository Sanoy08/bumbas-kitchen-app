import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Share,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  CheckCircle2,
  AlertTriangle,
  XCircle,
  RotateCw,
  RefreshCw,
  X,
  ShieldCheck,
  Share2,
  Info,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';

import { useOtaUpdates, OtaDiagnosticReport } from '@/shared/hooks/useOtaUpdates';

interface OtaDiagnosticsModalProps {
  visible: boolean;
  onClose: () => void;
}

export function OtaDiagnosticsModal({ visible, onClose }: OtaDiagnosticsModalProps) {
  const insets = useSafeAreaInsets();
  const {
    isChecking,
    isDownloading,
    isUpdatePending,
    checkError,
    downloadError,
    checkManually,
    reloadApp,
    getDiagnosticReport,
  } = useOtaUpdates();

  const [refreshKey, setRefreshKey] = useState(0);

  const report: OtaDiagnosticReport = useMemo(() => {
    return getDiagnosticReport();
  }, [getDiagnosticReport, refreshKey, isChecking, isDownloading, isUpdatePending]);

  const isHealthy =
    report.isEnabled &&
    !report.isEmergencyLaunch &&
    report.diagnosticChecks.every((c) => c.passed);

  const handleShareLog = async () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
      const text =
        `=== BUMBA'S KITCHEN CUSTOMER APP OTA DIAGNOSTIC LOG ===\n` +
        `Summary: ${report.statusSummary}\n` +
        `OTA Enabled: ${report.isEnabled ? 'YES' : 'NO'}\n` +
        `Running Mode: ${report.isEmbeddedLaunch ? 'Embedded Native' : `OTA Update (${report.updateId || 'Active'})`}\n` +
        `Channel: ${report.channel || 'production'}\n` +
        `Runtime Version: ${report.runtimeVersion || '1.0.11'}\n` +
        `Emergency Rollback: ${report.isEmergencyLaunch ? `YES (${report.emergencyLaunchReason})` : 'NO'}\n` +
        `Check Error: ${checkError?.message || 'None'}\n` +
        `Download Error: ${downloadError?.message || 'None'}\n\n` +
        `Diagnostic Checks:\n` +
        report.diagnosticChecks
          .map((c) => `[${c.passed ? 'PASS' : 'FAIL'}] ${c.title}: ${c.detail}${c.fixSuggestion ? ` (Fix: ${c.fixSuggestion})` : ''}`)
          .join('\n');

      await Share.share({
        title: 'OTA Diagnostics Log',
        message: text,
      });
    } catch (e) {
      console.warn('Share error:', e);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        <View style={[styles.modalCard, { paddingBottom: Math.max(insets.bottom, 20) }]}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.titleWrap}>
              <ShieldCheck size={22} color="#e11d48" style={{ marginRight: 8 }} />
              <View>
                <Text style={styles.headerTitle}>OTA Diagnostics & Health 🔍</Text>
                <Text style={styles.headerSubtitle}>Real-time over-the-air update troubleshooter</Text>
              </View>
            </View>
            <TouchableOpacity
              onPress={() => {
                Haptics.selectionAsync().catch(() => {});
                onClose();
              }}
              style={styles.closeBtn}
            >
              <X size={20} color="#6B7280" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>
            {/* Status Overview Hero Card */}
            <View
              style={[
                styles.statusBox,
                {
                  backgroundColor: isHealthy
                    ? 'rgba(16, 185, 129, 0.08)'
                    : report.isEmergencyLaunch
                    ? 'rgba(239, 68, 68, 0.08)'
                    : 'rgba(245, 158, 11, 0.08)',
                  borderColor: isHealthy
                    ? 'rgba(16, 185, 129, 0.3)'
                    : report.isEmergencyLaunch
                    ? 'rgba(239, 68, 68, 0.3)'
                    : 'rgba(245, 158, 11, 0.3)',
                },
              ]}
            >
              <View style={styles.statusTopRow}>
                <View
                  style={[
                    styles.statusBadgeIcon,
                    {
                      backgroundColor: isHealthy
                        ? '#10B981'
                        : report.isEmergencyLaunch
                        ? '#EF4444'
                        : '#F59E0B',
                    },
                  ]}
                >
                  {isHealthy ? (
                    <CheckCircle2 size={18} color="#FFF" />
                  ) : report.isEmergencyLaunch ? (
                    <AlertTriangle size={18} color="#FFF" />
                  ) : (
                    <Info size={18} color="#FFF" />
                  )}
                </View>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={styles.statusLabel}>OVERALL OTA HEALTH</Text>
                  <Text style={styles.statusVal}>{report.statusSummary}</Text>
                  <Text style={styles.statusSub}>
                    {report.isEmergencyLaunch
                      ? 'Crash rollback active! App safely fell back to embedded native code.'
                      : report.isEnabled
                      ? 'Connected to EAS Update endpoint (u.expo.dev).'
                      : 'Active only in standalone release APKs / AABs. In Expo Go/dev, Metro handles code.'}
                  </Text>
                </View>
              </View>

              <View style={styles.metaRow}>
                <View style={styles.metaBadge}>
                  <Text style={styles.metaBadgeLabel}>Channel</Text>
                  <Text style={styles.metaBadgeVal}>{report.channel || 'production'}</Text>
                </View>
                <View style={styles.metaBadge}>
                  <Text style={styles.metaBadgeLabel}>Runtime</Text>
                  <Text style={styles.metaBadgeVal}>{report.runtimeVersion || '1.0.11'}</Text>
                </View>
                <View style={styles.metaBadge}>
                  <Text style={styles.metaBadgeLabel}>Running Code</Text>
                  <Text style={styles.metaBadgeVal}>
                    {report.isEmbeddedLaunch ? 'Embedded' : 'OTA Bundle'}
                  </Text>
                </View>
              </View>

              {report.updateId && (
                <Text style={styles.updateIdText} numberOfLines={1}>
                  Active Update ID: {report.updateId}
                </Text>
              )}
            </View>

            {/* Prominent Error Banner if any check or download failed */}
            {(Boolean(checkError || downloadError || report.emergencyLaunchReason)) && (
              <View style={styles.errorAlertBox}>
                <XCircle size={18} color="#EF4444" style={{ marginRight: 8, marginTop: 2 }} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.errorAlertTitle}>Active Issue Detected</Text>
                  <Text style={styles.errorAlertDesc}>
                    {report.emergencyLaunchReason ||
                      checkError?.message ||
                      downloadError?.message ||
                      'Connection issue detected'}
                  </Text>
                </View>
              </View>
            )}

            {/* Diagnostic Checklist */}
            <Text style={styles.sectionTitle}>Deep System Health Checks</Text>
            {report.diagnosticChecks.map((chk, idx) => (
              <View key={idx} style={styles.checkCard}>
                <View style={styles.checkHeader}>
                  {chk.passed ? (
                    <CheckCircle2 size={18} color="#10B981" style={{ marginRight: 8 }} />
                  ) : (
                    <XCircle size={18} color="#EF4444" style={{ marginRight: 8 }} />
                  )}
                  <Text style={[styles.checkTitle, { color: chk.passed ? '#111827' : '#EF4444' }]}>
                    {chk.title}
                  </Text>
                </View>
                <Text style={styles.checkDetail}>{chk.detail}</Text>
                {chk.fixSuggestion && (
                  <View style={styles.suggestionBox}>
                    <AlertTriangle size={14} color="#B45309" style={{ marginRight: 6 }} />
                    <Text style={styles.suggestionText}>{chk.fixSuggestion}</Text>
                  </View>
                )}
              </View>
            ))}
          </ScrollView>

          {/* Action Buttons */}
          <View style={styles.footerActions}>
            <View style={styles.primaryActionRow}>
              <TouchableOpacity
                onPress={async () => {
                  await checkManually();
                  setRefreshKey((k) => k + 1);
                }}
                disabled={isChecking || isDownloading}
                style={[styles.checkBtn, (isChecking || isDownloading) && styles.btnDisabled]}
                activeOpacity={0.8}
              >
                {isChecking ? (
                  <ActivityIndicator size="small" color="#FFF" style={{ marginRight: 8 }} />
                ) : (
                  <RefreshCw size={16} color="#FFF" style={{ marginRight: 8 }} />
                )}
                <Text style={styles.checkBtnText}>
                  {isChecking ? 'Checking...' : isDownloading ? 'Downloading...' : 'Check For Updates'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleShareLog}
                style={styles.shareBtn}
                activeOpacity={0.8}
              >
                <Share2 size={18} color="#374151" />
              </TouchableOpacity>
            </View>

            {isUpdatePending && (
              <TouchableOpacity
                onPress={reloadApp}
                style={styles.restartActionBtn}
                activeOpacity={0.8}
              >
                <RotateCw size={16} color="#FFF" style={{ marginRight: 8 }} />
                <Text style={styles.checkBtnText}>Apply & Restart App Now</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingTop: 20,
    paddingHorizontal: 20,
    maxHeight: '85%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  titleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#111827',
    fontFamily: 'Poppins_600SemiBold',
  },
  headerSubtitle: {
    fontSize: 11,
    color: '#6B7280',
    fontFamily: 'Poppins_400Regular',
  },
  closeBtn: {
    padding: 6,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
  },
  body: {
    marginVertical: 14,
  },
  statusBox: {
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    marginBottom: 14,
  },
  statusTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  statusBadgeIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  statusLabel: {
    fontSize: 10,
    color: '#6B7280',
    fontWeight: '700',
    letterSpacing: 0.5,
    fontFamily: 'Poppins_600SemiBold',
  },
  statusVal: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    marginTop: 2,
    fontFamily: 'Poppins_600SemiBold',
  },
  statusSub: {
    fontSize: 11,
    color: '#4B5563',
    marginTop: 4,
    lineHeight: 16,
    fontFamily: 'Poppins_400Regular',
  },
  metaRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  metaBadge: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  metaBadgeLabel: {
    fontSize: 9,
    color: '#6B7280',
    textTransform: 'uppercase',
    fontWeight: '600',
    fontFamily: 'Poppins_500Medium',
  },
  metaBadgeVal: {
    fontSize: 12,
    fontWeight: '700',
    color: '#111827',
    marginTop: 2,
    fontFamily: 'Poppins_600SemiBold',
  },
  updateIdText: {
    fontSize: 10,
    color: '#9CA3AF',
    marginTop: 10,
    fontFamily: 'Poppins_400Regular',
  },
  errorAlertBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FCA5A5',
    borderRadius: 12,
    padding: 12,
    marginBottom: 14,
  },
  errorAlertTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#B91C1C',
    fontFamily: 'Poppins_600SemiBold',
  },
  errorAlertDesc: {
    fontSize: 11,
    color: '#7F1D1D',
    marginTop: 2,
    lineHeight: 16,
    fontFamily: 'Poppins_400Regular',
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#374151',
    marginBottom: 10,
    fontFamily: 'Poppins_600SemiBold',
  },
  checkCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: 10,
  },
  checkHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  checkTitle: {
    fontSize: 13,
    fontWeight: '600',
    fontFamily: 'Poppins_600SemiBold',
  },
  checkDetail: {
    fontSize: 12,
    color: '#4B5563',
    lineHeight: 18,
    fontFamily: 'Poppins_400Regular',
  },
  suggestionBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    borderRadius: 8,
    padding: 8,
    marginTop: 8,
  },
  suggestionText: {
    fontSize: 11,
    color: '#92400E',
    flex: 1,
    fontFamily: 'Poppins_400Regular',
  },
  footerActions: {
    gap: 10,
    paddingTop: 10,
  },
  primaryActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  checkBtn: {
    flex: 1,
    backgroundColor: '#e11d48',
    borderRadius: 14,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnDisabled: {
    opacity: 0.6,
  },
  shareBtn: {
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 14,
    padding: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  restartActionBtn: {
    backgroundColor: '#10B981',
    borderRadius: 14,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
    fontFamily: 'Poppins_600SemiBold',
  },
});

import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CheckCircle2, AlertTriangle, XCircle, RotateCw, RefreshCw, X, ShieldCheck } from 'lucide-react-native';
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
    checkManually,
    reloadApp,
    getDiagnosticReport,
  } = useOtaUpdates();

  const [refreshKey, setRefreshKey] = useState(0);

  const report: OtaDiagnosticReport = useMemo(() => {
    return getDiagnosticReport();
  }, [getDiagnosticReport, refreshKey, isChecking, isDownloading, isUpdatePending]);

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
              <Text style={styles.headerTitle}>OTA Update Diagnostics</Text>
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
            {/* Status Overview Card */}
            <View style={styles.statusBox}>
              <Text style={styles.statusLabel}>OVERALL STATUS</Text>
              <Text style={styles.statusVal}>{report.statusSummary}</Text>
              <View style={styles.metaRow}>
                <Text style={styles.metaText}>Channel: {report.channel || 'production'}</Text>
                <Text style={styles.metaText}>Runtime: {report.runtimeVersion || '1.0.11'}</Text>
              </View>
              {report.updateId && (
                <Text style={styles.updateIdText} numberOfLines={1}>
                  Update ID: {report.updateId}
                </Text>
              )}
            </View>

            {/* Diagnostic Checklist */}
            <Text style={styles.sectionTitle}>System Health Checks</Text>
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
                    <AlertTriangle size={14} color="#F59E0B" style={{ marginRight: 6 }} />
                    <Text style={styles.suggestionText}>{chk.fixSuggestion}</Text>
                  </View>
                )}
              </View>
            ))}
          </ScrollView>

          {/* Action Buttons */}
          <View style={styles.footerActions}>
            <TouchableOpacity
              onPress={async () => {
                await checkManually();
                setRefreshKey((k) => k + 1);
              }}
              disabled={isChecking || isDownloading}
              style={styles.checkBtn}
              activeOpacity={0.8}
            >
              {isChecking ? (
                <ActivityIndicator size="small" color="#FFF" style={{ marginRight: 8 }} />
              ) : (
                <RefreshCw size={16} color="#FFF" style={{ marginRight: 8 }} />
              )}
              <Text style={styles.checkBtnText}>
                {isChecking ? 'Checking...' : 'Check For Updates'}
              </Text>
            </TouchableOpacity>

            {isUpdatePending && (
              <TouchableOpacity
                onPress={reloadApp}
                style={styles.restartActionBtn}
                activeOpacity={0.8}
              >
                <RotateCw size={16} color="#FFF" style={{ marginRight: 8 }} />
                <Text style={styles.checkBtnText}>Apply & Restart</Text>
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
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    fontFamily: 'Poppins_600SemiBold',
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
    backgroundColor: '#F9FAFB',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: 16,
  },
  statusLabel: {
    fontSize: 11,
    color: '#6B7280',
    fontWeight: '600',
    letterSpacing: 0.5,
    fontFamily: 'Poppins_500Medium',
  },
  statusVal: {
    fontSize: 17,
    fontWeight: '700',
    color: '#111827',
    marginVertical: 4,
    fontFamily: 'Poppins_600SemiBold',
  },
  metaRow: {
    flexDirection: 'row',
    gap: 14,
    marginTop: 6,
  },
  metaText: {
    fontSize: 12,
    color: '#4B5563',
    fontFamily: 'Poppins_400Regular',
  },
  updateIdText: {
    fontSize: 11,
    color: '#9CA3AF',
    marginTop: 6,
    fontFamily: 'Poppins_400Regular',
  },
  sectionTitle: {
    fontSize: 14,
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
    borderColor: '#F3F4F6',
    marginBottom: 10,
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 6,
    elevation: 1,
  },
  checkHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  checkTitle: {
    fontSize: 14,
    fontWeight: '600',
    fontFamily: 'Poppins_600SemiBold',
  },
  checkDetail: {
    fontSize: 12,
    color: '#6B7280',
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
  checkBtn: {
    backgroundColor: '#e11d48',
    borderRadius: 14,
    paddingVertical: 14,
    flexDirection: 'row',
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


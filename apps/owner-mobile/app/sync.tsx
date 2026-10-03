/**
 * GymDeck Owner Mobile - Live Cloud Synchronization Dashboard
 *
 * Gate 5 — Cloud Synchronization Architecture
 *
 * Provides real-time visibility into the bidirectional synchronization engine:
 * - Real-time state: SYNCED, PENDING SYNC, SYNCING, OFFLINE, AUTH ERROR
 * - Transactional outbox status counts (Pending, In-Flight, Acknowledged, Failures)
 * - Durable incremental pull sequence cursor
 * - Manual on-demand synchronization trigger
 * - Secure diagnostic telemetry (zero leaked tokens or secrets)
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTheme } from '../src/theme';
import { useAuthStore } from '../src/store/authStore';
import { syncManager, SyncDiagnostics } from '../src/services/sync';
import {
  ArrowLeft,
  RefreshCw,
  Building2,
  Server,
  Cloud,
  Database,
  ArrowDownUp,
  CheckCircle2,
  AlertTriangle,
  Clock,
  HardDrive,
  ShieldCheck,
  Zap,
} from 'lucide-react-native';

export default function SyncStatusScreen() {
  const router = useRouter();
  const { colors, typography, radii } = useTheme();
  const user = useAuthStore((state) => state.user);

  const [diagnostics, setDiagnostics] = useState<SyncDiagnostics | null>(null);
  const [isSyncingManual, setIsSyncingManual] = useState(false);

  useEffect(() => {
    // 1. Initial diagnostics load
    syncManager.getDiagnostics().then(setDiagnostics).catch(() => {});

    // 2. Subscribe to real-time sync state updates
    const unsubscribe = syncManager.onSyncStateChange((diag) => {
      setDiagnostics(diag);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  const handleSyncNow = async () => {
    setIsSyncingManual(true);
    try {
      const result = await syncManager.synchronize('user_manual_trigger');
      setDiagnostics(result);
    } catch {
      // Handled in syncManager
    } finally {
      setIsSyncingManual(false);
    }
  };

  // Determine visual badge properties
  const getStatusBadge = () => {
    if (!diagnostics) {
      return {
        label: 'INITIALIZING',
        color: colors.textMuted,
        bg: colors.surfaceSubtle,
        border: colors.borderSubtle,
      };
    }

    if (diagnostics.syncState === 'SYNCING' || isSyncingManual) {
      return {
        label: 'SYNCING NOW',
        color: colors.primary,
        bg: colors.primarySoft,
        border: colors.primaryBorder,
      };
    }

    if (diagnostics.syncState === 'OFFLINE') {
      return {
        label: 'OFFLINE MODE',
        color: colors.warningText,
        bg: colors.warningBg,
        border: colors.warningBorder,
      };
    }

    if (diagnostics.syncState === 'AUTH_ERROR') {
      return {
        label: 'AUTH EXPIRED',
        color: colors.dangerText,
        bg: colors.dangerBg,
        border: colors.dangerBorder,
      };
    }

    if (diagnostics.syncState === 'ERROR') {
      return {
        label: 'SYNC ERROR',
        color: colors.dangerText,
        bg: colors.dangerBg,
        border: colors.dangerBorder,
      };
    }

    if (diagnostics.pendingOutboxCount > 0) {
      return {
        label: `${diagnostics.pendingOutboxCount} PENDING MUTATIONS`,
        color: colors.warningText,
        bg: colors.warningBg,
        border: colors.warningBorder,
      };
    }

    return {
      label: 'FULLY SYNCHRONIZED',
      color: colors.successText,
      bg: colors.successBg,
      border: colors.successBorder,
    };
  };

  const statusBadge = getStatusBadge();

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      {/* Top Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={[
            styles.backBtn,
            { backgroundColor: colors.surfaceSubtle, borderColor: colors.borderSubtle },
          ]}
          onPress={() => router.back()}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel="Go back to More"
        >
          <ArrowLeft size={16} color={colors.textPrimary} />
        </TouchableOpacity>
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={[typography.screenTitle, { color: colors.textPrimary }]}>Cloud Synchronization</Text>
          <Text style={[typography.caption, { color: colors.textSecondary }]}>
            Gate 5: Bidirectional Outbox & Pull Engine
          </Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        showsHorizontalScrollIndicator={false}
      >
        {/* HERO STATUS CARD */}
        <View style={styles.heroSection}>
          <View
            style={[
              styles.statusPill,
              { backgroundColor: statusBadge.bg, borderColor: statusBadge.border },
            ]}
          >
            <View style={[styles.liveDot, { backgroundColor: statusBadge.color }]} />
            <Text style={[typography.captionBold, { color: statusBadge.color, fontSize: 11 }]}>
              {statusBadge.label}
            </Text>
          </View>

          <Text style={[typography.sectionTitle, { color: colors.textPrimary, marginTop: 12 }]}>
            Local SQLCipher ↔ GymDeck Cloud
          </Text>
          <Text style={[typography.bodySecondary, { color: colors.textSecondary, marginTop: 4 }]}>
            Mutations are committed immediately to local encrypted SQLite storage and synchronized safely with Cloud PostgreSQL when online.
          </Text>

          <View style={styles.actionRow}>
            <TouchableOpacity
              style={[
                styles.refreshBtn,
                {
                  backgroundColor: colors.primary,
                  borderRadius: radii.full,
                },
              ]}
              onPress={handleSyncNow}
              disabled={isSyncingManual || diagnostics?.syncState === 'SYNCING'}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel="Synchronize now"
            >
              {isSyncingManual || diagnostics?.syncState === 'SYNCING' ? (
                <>
                  <ActivityIndicator size="small" color={colors.textOnPrimary} style={{ marginRight: 6 }} />
                  <Text style={[typography.button, { color: colors.textOnPrimary, fontSize: 13 }]}>
                    Synchronizing...
                  </Text>
                </>
              ) : (
                <>
                  <RefreshCw size={14} color={colors.textOnPrimary} style={{ marginRight: 6 }} />
                  <Text style={[typography.button, { color: colors.textOnPrimary, fontSize: 13 }]}>
                    Sync Now
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* SECTION 1: TRANSACTIONAL OUTBOX STATUS */}
        <Text style={[typography.formLabel, { color: colors.textSecondary, marginTop: 24, marginBottom: 8, paddingHorizontal: 16 }]}>
          OUTBOX MUTATION QUEUE
        </Text>
        <View style={[styles.groupedList, { backgroundColor: colors.surface, borderColor: colors.borderSubtle }]}>
          {/* Pending */}
          <View style={styles.row}>
            <View style={styles.iconLabelRow}>
              <Clock size={16} color={colors.warning} style={{ marginRight: 10 }} />
              <Text style={[typography.bodySecondary, { color: colors.textSecondary }]}>Pending Outbox</Text>
            </View>
            <Text style={[typography.bodyBold, { color: colors.textPrimary }]}>
              {diagnostics?.pendingOutboxCount ?? 0} events
            </Text>
          </View>

          <View style={[styles.divider, { backgroundColor: colors.borderSubtle }]} />

          {/* In Flight */}
          <View style={styles.row}>
            <View style={styles.iconLabelRow}>
              <Zap size={16} color={colors.primary} style={{ marginRight: 10 }} />
              <Text style={[typography.bodySecondary, { color: colors.textSecondary }]}>In-Flight Batches</Text>
            </View>
            <Text style={[typography.bodyBold, { color: colors.textPrimary }]}>
              {diagnostics?.inFlightCount ?? 0} events
            </Text>
          </View>

          <View style={[styles.divider, { backgroundColor: colors.borderSubtle }]} />

          {/* Acknowledged */}
          <View style={styles.row}>
            <View style={styles.iconLabelRow}>
              <CheckCircle2 size={16} color={colors.success} style={{ marginRight: 10 }} />
              <Text style={[typography.bodySecondary, { color: colors.textSecondary }]}>Acknowledged by Cloud</Text>
            </View>
            <Text style={[typography.bodyBold, { color: colors.textPrimary }]}>
              {diagnostics?.acknowledgedCount ?? 0} events
            </Text>
          </View>

          <View style={[styles.divider, { backgroundColor: colors.borderSubtle }]} />

          {/* Failures */}
          <View style={styles.row}>
            <View style={styles.iconLabelRow}>
              <AlertTriangle size={16} color={colors.danger} style={{ marginRight: 10 }} />
              <Text style={[typography.bodySecondary, { color: colors.textSecondary }]}>Retries / Failures</Text>
            </View>
            <Text style={[typography.captionBold, { color: diagnostics?.retryableFailureCount ? colors.warningText : colors.textSecondary }]}>
              {diagnostics?.retryableFailureCount ?? 0} retryable • {diagnostics?.permanentFailureCount ?? 0} permanent
            </Text>
          </View>
        </View>

        {/* SECTION 2: CLOUD PULL & SERVER CURSOR */}
        <Text style={[typography.formLabel, { color: colors.textSecondary, marginTop: 24, marginBottom: 8, paddingHorizontal: 16 }]}>
          INCREMENTAL PULL & CURSOR
        </Text>
        <View style={[styles.groupedList, { backgroundColor: colors.surface, borderColor: colors.borderSubtle }]}>
          {/* Cursor */}
          <View style={styles.row}>
            <View style={styles.iconLabelRow}>
              <ArrowDownUp size={16} color={colors.primary} style={{ marginRight: 10 }} />
              <Text style={[typography.bodySecondary, { color: colors.textSecondary }]}>Durable Sequence Cursor</Text>
            </View>
            <Text style={[typography.bodyBold, { color: colors.textPrimary }]}>
              Sequence #{diagnostics?.currentCursor ?? 0}
            </Text>
          </View>

          <View style={[styles.divider, { backgroundColor: colors.borderSubtle }]} />

          {/* Last Push */}
          <View style={styles.row}>
            <Text style={[typography.bodySecondary, { color: colors.textSecondary }]}>Last Push Completed</Text>
            <Text style={[typography.caption, { color: colors.textSecondary }]}>
              {diagnostics?.lastSuccessfulPushAt ? new Date(diagnostics.lastSuccessfulPushAt).toLocaleTimeString() : 'Never'}
            </Text>
          </View>

          <View style={[styles.divider, { backgroundColor: colors.borderSubtle }]} />

          {/* Last Pull */}
          <View style={styles.row}>
            <Text style={[typography.bodySecondary, { color: colors.textSecondary }]}>Last Pull Completed</Text>
            <Text style={[typography.caption, { color: colors.textSecondary }]}>
              {diagnostics?.lastSuccessfulPullAt ? new Date(diagnostics.lastSuccessfulPullAt).toLocaleTimeString() : 'Never'}
            </Text>
          </View>
        </View>

        {/* SECTION 3: HARDWARE IDENTITY & TENANT */}
        <Text style={[typography.formLabel, { color: colors.textSecondary, marginTop: 24, marginBottom: 8, paddingHorizontal: 16 }]}>
          IDENTITY & SECURITY PARAMETERS
        </Text>
        <View style={[styles.groupedList, { backgroundColor: colors.surface, borderColor: colors.borderSubtle }]}>
          {/* Tenant */}
          <View style={styles.row}>
            <View style={styles.iconLabelRow}>
              <Building2 size={16} color={colors.primary} style={{ marginRight: 10 }} />
              <Text style={[typography.bodySecondary, { color: colors.textSecondary }]}>Tenant Branch</Text>
            </View>
            <Text style={[typography.bodyBold, { color: colors.textPrimary }]}>
              {user?.gymName || 'Local Vault'} ({user?.gymCode || 'GD-DEV'})
            </Text>
          </View>

          <View style={[styles.divider, { backgroundColor: colors.borderSubtle }]} />

          {/* Device ID */}
          <View style={styles.row}>
            <View style={styles.iconLabelRow}>
              <HardDrive size={16} color={colors.primary} style={{ marginRight: 10 }} />
              <Text style={[typography.bodySecondary, { color: colors.textSecondary }]}>Device Identifier</Text>
            </View>
            <Text style={[typography.caption, { color: colors.textSecondary }]}>
              {diagnostics?.activeDeviceId ? `${diagnostics.activeDeviceId.slice(0, 16)}...` : 'Generating...'}
            </Text>
          </View>

          <View style={[styles.divider, { backgroundColor: colors.borderSubtle }]} />

          {/* Protocol & Encryption */}
          <View style={styles.row}>
            <View style={styles.iconLabelRow}>
              <ShieldCheck size={16} color={colors.success} style={{ marginRight: 10 }} />
              <Text style={[typography.bodySecondary, { color: colors.textSecondary }]}>Security & Encryption</Text>
            </View>
            <Text style={[typography.captionBold, { color: colors.success }]}>
              SQLCipher 256-bit AES • HTTPS
            </Text>
          </View>
        </View>

        {/* Conflict Boundary Notice */}
        <View
          style={[
            styles.noticeBox,
            { backgroundColor: colors.surfaceSubtle, borderColor: colors.borderSubtle, borderRadius: radii.md },
          ]}
        >
          <Text style={[typography.caption, { color: colors.textSecondary }]}>
            Gate 5 Synchronization Engine: Events are synced idempotently by UUID. Pending local drafts remain preserved; final semantic conflict resolution is governed by Gate 6.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 14,
  },
  backBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    paddingBottom: 110,
  },
  heroSection: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 8,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    borderWidth: 1,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
  },
  actionRow: {
    marginTop: 16,
    flexDirection: 'row',
  },
  refreshBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18,
    height: 38,
  },
  groupedList: {
    borderTopWidth: 1,
    borderBottomWidth: 1,
    paddingHorizontal: 16,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    minHeight: 48,
  },
  iconLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  divider: {
    height: 1,
    marginLeft: 26,
  },
  noticeBox: {
    marginHorizontal: 16,
    marginTop: 20,
    padding: 12,
    borderWidth: 1,
  },
});

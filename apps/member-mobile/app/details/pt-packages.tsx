/**
 * GymDeck Member Mobile - PT Packages & Sessions Screen
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  TouchableOpacity,
} from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft, UserCheck, Calendar, Clock, CheckCircle2, AlertCircle } from 'lucide-react-native';
import { useTheme } from '../../src/theme';
import { usePTPackage, usePTSessions } from '../../src/hooks';
import { SkeletonLoader, EmptyState } from '../../src/components';

export default function PTPackagesScreen() {
  const { colors, radii, spacing } = useTheme();
  const router = useRouter();
  const { data: ptPkg, isLoading: pkgLoading } = usePTPackage();
  const { data: sessions, isLoading: sessionsLoading } = usePTSessions();

  if (pkgLoading && !ptPkg) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={{ padding: spacing.lg }}>
          <SkeletonLoader height={36} width={160} style={{ marginBottom: 20 }} />
          <SkeletonLoader height={160} borderRadius={20} style={{ marginBottom: 16 }} />
          <SkeletonLoader height={120} borderRadius={16} />
        </View>
      </SafeAreaView>
    );
  }

  const sessionList = sessions || [];
  const progressRatio = ptPkg ? ptPkg.usedSessions / ptPkg.totalSessions : 0;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View
        style={[
          styles.topBar,
          {
            backgroundColor: colors.surface,
            borderBottomColor: colors.border,
            paddingHorizontal: spacing.lg,
          },
        ]}
      >
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backBtn}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <ArrowLeft size={20} color={colors.textPrimary} />
        </TouchableOpacity>

        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>
          Personal Training Package
        </Text>
      </View>

      <ScrollView
        contentContainerStyle={[styles.scrollContent, { padding: spacing.lg }]}
        showsVerticalScrollIndicator={false}
      >
        {/* PT Package Status Card */}
        {ptPkg && (
          <View
            style={[
              styles.pkgCard,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
                borderRadius: radii.xl,
                padding: spacing.xl,
              },
            ]}
          >
            <View style={styles.pkgTopRow}>
              <View>
                <Text style={[styles.pkgLabel, { color: colors.textSecondary }]}>ACTIVE PACKAGE</Text>
                <Text style={[styles.pkgName, { color: colors.textPrimary }]}>
                  {ptPkg.packageName}
                </Text>
                <Text style={[styles.trainerSub, { color: colors.brand.secondary }]}>
                  Coach: {ptPkg.trainerName}
                </Text>
              </View>

              <View
                style={[
                  styles.statusPill,
                  { backgroundColor: colors.status.successBg },
                ]}
              >
                <Text style={[styles.statusText, { color: colors.status.success }]}>
                  {ptPkg.status}
                </Text>
              </View>
            </View>

            <View style={styles.sessionsCountRow}>
              <View>
                <Text style={[styles.bigRemaining, { color: colors.brand.primary }]}>
                  {ptPkg.remainingSessions}
                </Text>
                <Text style={[styles.countLabel, { color: colors.textMuted }]}>
                  Remaining Sessions
                </Text>
              </View>

              <View style={{ alignItems: 'flex-end' }}>
                <Text style={[styles.usedCount, { color: colors.textPrimary }]}>
                  {ptPkg.usedSessions} / {ptPkg.totalSessions}
                </Text>
                <Text style={[styles.countLabel, { color: colors.textMuted }]}>
                  Completed Sessions
                </Text>
              </View>
            </View>

            {/* Progress Bar */}
            <View style={[styles.progressBarBg, { backgroundColor: colors.surfaceSubtle }]}>
              <View
                style={[
                  styles.progressBarFill,
                  {
                    backgroundColor: colors.brand.primary,
                    width: `${progressRatio * 100}%`,
                  },
                ]}
              />
            </View>
          </View>
        )}

        {/* PT Sessions Log */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
            Training Session History
          </Text>

          {sessionList.length === 0 ? (
            <EmptyState
              icon={<UserCheck size={32} color={colors.brand.primary} />}
              title="No PT Sessions"
              description="No personal training session logs recorded yet."
            />
          ) : (
            <View style={[styles.sessionsList, { gap: spacing.md }]}>
              {sessionList.map((sess) => {
                const isScheduled = sess.status === 'SCHEDULED';

                return (
                  <View
                    key={sess.id}
                    style={[
                      styles.sessionCard,
                      {
                        backgroundColor: colors.surface,
                        borderColor: isScheduled ? colors.brand.primary : colors.border,
                        borderRadius: radii.lg,
                        padding: spacing.lg,
                      },
                    ]}
                  >
                    <View style={styles.sessionHeaderRow}>
                      <Text style={[styles.focusTitle, { color: colors.textPrimary }]}>
                        {sess.focusArea}
                      </Text>
                      <View
                        style={[
                          styles.sessBadge,
                          {
                            backgroundColor: isScheduled
                              ? colors.brand.primary
                              : colors.status.successBg,
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.sessBadgeText,
                            {
                              color: isScheduled ? '#FFFFFF' : colors.status.success,
                            },
                          ]}
                        >
                          {sess.status}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.sessionMeta}>
                      <View style={styles.metaItem}>
                        <Calendar size={13} color={colors.textMuted} />
                        <Text style={[styles.metaText, { color: colors.textMuted }]}>
                          {sess.date}
                        </Text>
                      </View>

                      <View style={styles.metaItem}>
                        <Clock size={13} color={colors.textMuted} />
                        <Text style={[styles.metaText, { color: colors.textMuted }]}>
                          {sess.startTime} ({sess.durationMinutes}m)
                        </Text>
                      </View>
                    </View>

                    {sess.notes && (
                      <View
                        style={[
                          styles.notesBox,
                          { backgroundColor: colors.surfaceSubtle, borderRadius: radii.sm },
                        ]}
                      >
                        <Text style={[styles.notesText, { color: colors.textSecondary }]}>
                          Note: {sess.notes}
                        </Text>
                      </View>
                    )}
                  </View>
                );
              })}
            </View>
          )}
        </View>

        <View style={{ height: spacing.xl }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  backBtn: {
    padding: 6,
    marginRight: 10,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
  },
  scrollContent: {
    flexGrow: 1,
  },
  pkgCard: {
    width: '100%',
    borderWidth: 1,
    marginBottom: 24,
  },
  pkgTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  pkgLabel: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
  },
  pkgName: {
    fontSize: 18,
    fontWeight: '800',
    marginTop: 2,
  },
  trainerSub: {
    fontSize: 13,
    fontWeight: '600',
    marginTop: 2,
  },
  statusPill: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  sessionsCountRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginBottom: 12,
  },
  bigRemaining: {
    fontSize: 32,
    fontWeight: '800',
  },
  usedCount: {
    fontSize: 18,
    fontWeight: '700',
  },
  countLabel: {
    fontSize: 11,
    fontWeight: '600',
  },
  progressBarBg: {
    width: '100%',
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 12,
  },
  sessionsList: {
    width: '100%',
  },
  sessionCard: {
    width: '100%',
    borderWidth: 1,
  },
  sessionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  focusTitle: {
    fontSize: 15,
    fontWeight: '700',
    flex: 1,
  },
  sessBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  sessBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  sessionMeta: {
    flexDirection: 'row',
    gap: 14,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 12,
  },
  notesBox: {
    marginTop: 10,
    padding: 8,
  },
  notesText: {
    fontSize: 12,
    fontStyle: 'italic',
  },
});

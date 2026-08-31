/**
 * GymDeck Member Mobile - Document Vault Screen
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  TouchableOpacity,
  Alert,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import {
  ArrowLeft,
  FileText,
  Download,
  ShieldCheck,
  Calendar,
  ExternalLink,
} from 'lucide-react-native';
import { useTheme } from '../../src/theme';
import { useDocuments, useGetDocumentSecureUrl } from '../../src/hooks';
import { SkeletonLoader, EmptyState } from '../../src/components';
import { MemberDocument } from '../../src/types';

export default function DocumentsScreen() {
  const { colors, radii, spacing } = useTheme();
  const router = useRouter();
  const { data: documents, isLoading, refetch, isRefetching } = useDocuments();
  const getSecureUrlMutation = useGetDocumentSecureUrl();
  const [openingDocId, setOpeningDocId] = useState<string | null>(null);

  const handleOpenDocument = async (doc: MemberDocument) => {
    setOpeningDocId(doc.id);
    try {
      const { signedUrl } = await getSecureUrlMutation.mutateAsync(doc.id);
      Alert.alert(
        'Authorized Document Access',
        `Secure viewing session generated for:\n"${doc.title}"\n\nAccess expires in 10 minutes.`,
        [{ text: 'Close', style: 'cancel' }]
      );
    } catch (err) {
      Alert.alert('Error', 'Unable to retrieve document authorization from server.');
    } finally {
      setOpeningDocId(null);
    }
  };

  if (isLoading && !documents) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={{ padding: spacing.lg }}>
          <SkeletonLoader height={36} width={160} style={{ marginBottom: 20 }} />
          <SkeletonLoader height={90} borderRadius={16} style={{ marginBottom: 14 }} />
          <SkeletonLoader height={90} borderRadius={16} />
        </View>
      </SafeAreaView>
    );
  }

  const docList = documents || [];

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
          Document Vault
        </Text>
      </View>

      <ScrollView
        contentContainerStyle={[styles.scrollContent, { padding: spacing.lg }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={refetch}
            tintColor={colors.brand.primary}
            colors={[colors.brand.primary]}
          />
        }
      >
        <View style={[styles.vaultNotice, { backgroundColor: colors.surfaceSubtle, borderRadius: radii.md }]}>
          <ShieldCheck size={16} color={colors.status.success} />
          <Text style={[styles.vaultNoticeText, { color: colors.textSecondary }]}>
            All membership contracts, tax invoices, and waivers are encrypted and authorized by your gym.
          </Text>
        </View>

        {docList.length === 0 ? (
          <EmptyState
            icon={<FileText size={32} color={colors.brand.primary} />}
            title="No Documents Available"
            description="You currently have no issued documents or agreements in your vault."
          />
        ) : (
          <View style={[styles.docsList, { gap: spacing.md }]}>
            {docList.map((doc) => {
              const formattedDate = new Date(doc.createdAt).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              });

              return (
                <View
                  key={doc.id}
                  style={[
                    styles.docCard,
                    {
                      backgroundColor: colors.surface,
                      borderColor: colors.border,
                      borderRadius: radii.lg,
                      padding: spacing.lg,
                    },
                  ]}
                >
                  <View style={styles.docTopRow}>
                    <View style={[styles.docIconPill, { backgroundColor: colors.surfaceSubtle }]}>
                      <FileText size={20} color={colors.brand.primary} />
                    </View>

                    <View style={styles.docMainInfo}>
                      <Text style={[styles.docTitle, { color: colors.textPrimary }]}>
                        {doc.title}
                      </Text>
                      <View style={styles.docMetaRow}>
                        <View
                          style={[
                            styles.typeBadge,
                            { backgroundColor: colors.surfaceSubtle, borderRadius: radii.sm },
                          ]}
                        >
                          <Text style={[styles.typeText, { color: colors.brand.secondary }]}>
                            {doc.documentType}
                          </Text>
                        </View>
                        <Text style={[styles.metaText, { color: colors.textMuted }]}>
                          {doc.fileSizeText} · {formattedDate}
                        </Text>
                      </View>
                    </View>
                  </View>

                  <TouchableOpacity
                    onPress={() => handleOpenDocument(doc)}
                    style={[
                      styles.viewBtn,
                      {
                        backgroundColor: colors.surfaceSubtle,
                        borderColor: colors.border,
                        borderRadius: radii.md,
                      },
                    ]}
                    accessibilityRole="button"
                    accessibilityLabel={`View document: ${doc.title}`}
                  >
                    <ExternalLink size={15} color={colors.brand.primary} />
                    <Text style={[styles.viewBtnText, { color: colors.brand.primary }]}>
                      {openingDocId === doc.id ? 'Authorizing...' : 'View Secure File'}
                    </Text>
                  </TouchableOpacity>
                </View>
              );
            })}
          </View>
        )}

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
  vaultNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    gap: 8,
    marginBottom: 16,
  },
  vaultNoticeText: {
    fontSize: 12,
    lineHeight: 16,
    flex: 1,
  },
  docsList: {
    width: '100%',
  },
  docCard: {
    width: '100%',
    borderWidth: 1,
  },
  docTopRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 14,
  },
  docIconPill: {
    width: 42,
    height: 42,
    borderRadius: 21,
    justifyContent: 'center',
    alignItems: 'center',
  },
  docMainInfo: {
    flex: 1,
  },
  docTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 4,
  },
  docMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  typeBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  typeText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  metaText: {
    fontSize: 11,
  },
  viewBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderWidth: 1,
    gap: 6,
  },
  viewBtnText: {
    fontSize: 13,
    fontWeight: '700',
  },
});

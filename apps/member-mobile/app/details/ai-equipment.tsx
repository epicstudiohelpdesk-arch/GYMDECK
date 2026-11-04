/**
 * GymDeck Member Mobile - Gym Machine Classifier & Video Tutorial Screen
 * Ported from GYMDECK_AI_ML_MODEL/Gym-Machines-Classifier-main
 * EfficientNet-B0 visual identification, 16-equipment catalog, and direct video tutorials
 */

import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  Modal,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as Linking from 'expo-linking';
import * as ImagePicker from 'expo-image-picker';
import { CameraView, useCameraPermissions } from 'expo-camera';
import {
  ArrowLeft,
  Camera,
  PlayCircle,
  Search,
  Sparkles,
  ShieldAlert,
  ChevronRight,
  ExternalLink,
  Dumbbell,
  CheckCircle2,
  Filter,
  X,
  Image as ImageIcon,
  RotateCcw,
} from 'lucide-react-native';
import { useTheme } from '../../src/theme';
import { GymMachineService, GYM_EQUIPMENT_CATALOG } from '../../src/services/ai/gymMachineService';
import { GymMachineCategory, MachinePredictionResult } from '../../src/services/ai/types';

export default function AiEquipmentScreen() {
  const { colors, radii, spacing, mode } = useTheme();
  const router = useRouter();

  const isDark = mode === 'dark';

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<'All' | 'Machine' | 'Free Weight' | 'Cable'>('All');
  const [isScanning, setIsScanning] = useState(false);
  const [predictionResult, setPredictionResult] = useState<MachinePredictionResult | null>(null);
  const [selectedMachine, setSelectedMachine] = useState<GymMachineCategory | null>(
    GYM_EQUIPMENT_CATALOG[4] // Default to Lat Pulldown
  );

  // Camera & Media States
  const [permission, requestPermission] = useCameraPermissions();
  const [isLiveCameraOpen, setIsLiveCameraOpen] = useState(false);
  const [capturedPhotoUri, setCapturedPhotoUri] = useState<string | null>(null);
  const cameraRef = useRef<CameraView>(null);

  const filteredMachines = GymMachineService.searchMachines(searchQuery, selectedFilter);

  const handleClassifyWithPhoto = async (photoUri?: string, machineHint?: string) => {
    setIsScanning(true);
    setPredictionResult(null);
    if (photoUri) {
      setCapturedPhotoUri(photoUri);
    }

    try {
      const result = await GymMachineService.classifyMachineFromImage(photoUri || 'simulated_frame', machineHint);
      setPredictionResult(result);
      setSelectedMachine(result.predictedMachine);
    } catch {
      Alert.alert('Scan Failed', 'Could not classify equipment. Please try again.');
    } finally {
      setIsScanning(false);
    }
  };

  const handleOpenLiveARViewfinder = async () => {
    if (!permission?.granted) {
      const res = await requestPermission();
      if (!res.granted) {
        Alert.alert(
          'Camera Permission Required',
          'GymDeck needs camera access to classify gym machines and show live setup instructions.'
        );
        return;
      }
    }
    setIsLiveCameraOpen(true);
  };

  const handleCaptureFromLiveCamera = async () => {
    if (!cameraRef.current) return;
    try {
      setIsScanning(true);
      const photo = await cameraRef.current.takePictureAsync({ quality: 0.85 });
      setIsLiveCameraOpen(false);
      if (photo?.uri) {
        await handleClassifyWithPhoto(photo.uri);
      }
    } catch {
      setIsLiveCameraOpen(false);
      setIsScanning(false);
      Alert.alert('Capture Failed', 'Could not capture frame from camera.');
    }
  };

  const handleLaunchNativeCamera = async () => {
    try {
      const perm = await ImagePicker.requestCameraPermissionsAsync();
      if (!perm.granted) {
        Alert.alert(
          'Camera Permission Required',
          'Camera access is required to photograph gym machines for AI identification.'
        );
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        quality: 0.85,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        await handleClassifyWithPhoto(result.assets[0].uri);
      }
    } catch {
      Alert.alert('Camera Error', 'Could not launch camera on this device.');
    }
  };

  const handleLaunchGallery = async () => {
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        Alert.alert(
          'Photo Library Access Required',
          'Photo library access is required to pick gym equipment photos.'
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        quality: 0.85,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        await handleClassifyWithPhoto(result.assets[0].uri);
      }
    } catch {
      Alert.alert('Gallery Error', 'Could not access photo library.');
    }
  };

  const handleClearPhoto = () => {
    setCapturedPhotoUri(null);
    setPredictionResult(null);
  };

  const handleOpenTutorialVideo = (url: string) => {
    Linking.openURL(url).catch(() => {
      Alert.alert('Unable to Open Video', 'Please verify your internet connection or browser settings.');
    });
  };

  const activeMachine = selectedMachine || (predictionResult?.predictedMachine ?? GYM_EQUIPMENT_CATALOG[0]);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
      {/* Top Header */}
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

        <View style={styles.headerTitleWrap}>
          <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>
            Gym Machine AI Scanner
          </Text>
          <View style={[styles.badge, { backgroundColor: '#E0F2FE' }]}>
            <Sparkles size={11} color="#0284C7" />
            <Text style={styles.badgeText}>EfficientNet-B0</Text>
          </View>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={[styles.scrollContent, { padding: spacing.lg }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Camera Vision Scanner Box & Live AR Viewfinder */}
        {capturedPhotoUri ? (
          <View
            style={[
              styles.capturedMachineContainer,
              {
                backgroundColor: colors.surface,
                borderColor: '#38BDF8',
                borderRadius: radii.xl,
                padding: spacing.md,
                marginBottom: 14,
              },
            ]}
          >
            <View style={styles.capturedMachineWrapper}>
              <Image source={{ uri: capturedPhotoUri }} style={styles.capturedMachinePhoto} />
              <View style={[styles.photoTagBadge, { backgroundColor: '#0284C7' }]}>
                <Camera size={12} color="#FFFFFF" />
                <Text style={styles.photoTagBadgeText}>Equipment Scanned via Camera</Text>
              </View>
              {isScanning && (
                <View style={styles.scanningOverlay}>
                  <ActivityIndicator size="large" color="#FFFFFF" />
                  <Text style={styles.scanningOverlayText}>Classifying Equipment Geometry...</Text>
                </View>
              )}
            </View>

            <View style={styles.photoActionRow}>
              <TouchableOpacity
                style={[styles.photoActionBtn, { backgroundColor: colors.surfaceSubtle }]}
                onPress={handleOpenLiveARViewfinder}
                disabled={isScanning}
              >
                <RotateCcw size={14} color={colors.textPrimary} />
                <Text style={[styles.photoActionBtnText, { color: colors.textPrimary }]}>Rescan Viewfinder</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.photoActionBtn, { backgroundColor: colors.surfaceSubtle }]}
                onPress={handleClearPhoto}
                disabled={isScanning}
              >
                <X size={14} color="#EF4444" />
                <Text style={[styles.photoActionBtnText, { color: '#EF4444' }]}>Clear</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <View style={styles.scannerHeroGroup}>
            <TouchableOpacity
              style={[
                styles.scannerHero,
                {
                  backgroundColor: isDark ? '#141E2E' : '#EFF6FF',
                  borderColor: '#38BDF8',
                  borderRadius: radii.xl,
                  padding: spacing.xl,
                },
              ]}
              onPress={handleOpenLiveARViewfinder}
              activeOpacity={0.8}
              disabled={isScanning}
            >
              <View style={styles.scannerCircle}>
                {isScanning ? (
                  <ActivityIndicator size="small" color="#0284C7" />
                ) : (
                  <Camera size={28} color="#0284C7" />
                )}
              </View>
              <Text style={[styles.scannerHeroTitle, { color: colors.textPrimary }]}>
                {isScanning ? 'Analyzing Machine Geometry...' : 'Open Live AR Machine Scanner'}
              </Text>
              <Text style={[styles.scannerHeroSub, { color: colors.textSecondary }]}>
                Point camera at any gym machine to identify target muscles and view video tutorial
              </Text>
            </TouchableOpacity>

            {/* Quick Camera & Gallery Buttons */}
            <View style={styles.secondaryScanRow}>
              <TouchableOpacity
                style={[styles.subScanBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
                onPress={handleLaunchNativeCamera}
                disabled={isScanning}
              >
                <Camera size={16} color="#0284C7" />
                <Text style={[styles.subScanBtnText, { color: colors.textPrimary }]}>Snap Photo</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.subScanBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
                onPress={handleLaunchGallery}
                disabled={isScanning}
              >
                <ImageIcon size={16} color="#0284C7" />
                <Text style={[styles.subScanBtnText, { color: colors.textPrimary }]}>Choose Photo</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Prediction Results Banner if scanned */}
        {predictionResult && (
          <View
            style={[
              styles.predictionBanner,
              {
                backgroundColor: isDark ? '#1C2738' : '#F0FDF4',
                borderColor: '#10B981',
                borderRadius: radii.lg,
                padding: spacing.md,
                marginTop: spacing.md,
              },
            ]}
          >
            <View style={styles.predictionRow}>
              <CheckCircle2 size={18} color="#10B981" />
              <Text style={[styles.predictionText, { color: colors.textPrimary }]}>
                Match Found: <Text style={{ fontWeight: '800' }}>{predictionResult.predictedMachine.name}</Text>
              </Text>
              <View style={[styles.confidencePill, { backgroundColor: '#10B981' }]}>
                <Text style={styles.confidencePillText}>{predictionResult.confidence}% Confidence</Text>
              </View>
            </View>
          </View>
        )}

        {/* Active Machine Detail Showcase */}
        {activeMachine && (
          <View
            style={[
              styles.machineDetailCard,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
                borderRadius: radii.xl,
                padding: spacing.lg,
                marginTop: spacing.lg,
              },
            ]}
          >
            {capturedPhotoUri && (
              <View style={styles.machinePhotoRow}>
                <Image source={{ uri: capturedPhotoUri }} style={styles.machinePhotoThumb} />
                <View style={styles.machinePhotoMeta}>
                  <Text style={[styles.machinePhotoLabel, { color: colors.textPrimary }]}>
                    Captured Equipment Photograph
                  </Text>
                  <Text style={[styles.machinePhotoSub, { color: '#10B981' }]}>
                    Classified: {predictionResult?.predictedMachine.name ?? activeMachine.name}
                  </Text>
                </View>
              </View>
            )}
            <View style={styles.machineCardHeader}>
              <View style={styles.machineTitleCol}>
                <View style={[styles.categoryTag, { backgroundColor: colors.surfaceSubtle }]}>
                  <Text style={[styles.categoryTagText, { color: colors.brand.primary }]}>
                    {activeMachine.equipmentType.toUpperCase()}
                  </Text>
                </View>
                <Text style={[styles.machineName, { color: colors.textPrimary }]}>
                  {activeMachine.name}
                </Text>
                <Text style={[styles.targetMuscleText, { color: '#0284C7' }]}>
                  Target: {activeMachine.targetMuscle}
                </Text>
              </View>

              <TouchableOpacity
                style={[styles.videoTutorialBtn, { backgroundColor: '#EF4444' }]}
                onPress={() => handleOpenTutorialVideo(activeMachine.videoTutorialUrl)}
                activeOpacity={0.8}
              >
                <PlayCircle size={18} color="#FFFFFF" />
                <Text style={styles.videoTutorialBtnText}>Watch Tutorial</Text>
              </TouchableOpacity>
            </View>

            <Text style={[styles.machineDescription, { color: colors.textSecondary }]}>
              {activeMachine.description}
            </Text>

            {/* Execution Instructions */}
            <Text style={[styles.instructionsHeader, { color: colors.textPrimary }]}>
              Proper Setup & Execution
            </Text>
            <View style={styles.instructionsList}>
              {activeMachine.instructions.map((step, idx) => (
                <View key={idx} style={styles.stepRow}>
                  <View style={[styles.stepNumPill, { backgroundColor: colors.surfaceSubtle }]}>
                    <Text style={[styles.stepNumText, { color: colors.brand.primary }]}>{idx + 1}</Text>
                  </View>
                  <Text style={[styles.stepText, { color: colors.textSecondary }]}>{step}</Text>
                </View>
              ))}
            </View>

            {/* Safety Tips */}
            <View
              style={[
                styles.safetyBox,
                {
                  backgroundColor: isDark ? '#261C1C' : '#FEF2F2',
                  borderColor: '#FECACA',
                  borderRadius: radii.md,
                },
              ]}
            >
              <ShieldAlert size={16} color="#DC2626" />
              <View style={{ flex: 1 }}>
                <Text style={styles.safetyTitle}>Safety Notice</Text>
                <Text style={[styles.safetyText, { color: colors.textSecondary }]}>
                  {activeMachine.safetyTips.join(' ')}
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* Catalog Search & Browse */}
        <Text style={[styles.sectionTitle, { color: colors.textPrimary, marginTop: spacing.xl }]}>
          Browse All 16 Gym Machines ({filteredMachines.length})
        </Text>

        {/* Search Bar */}
        <View
          style={[
            styles.searchBar,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
              borderRadius: radii.md,
            },
          ]}
        >
          <Search size={18} color={colors.textMuted} />
          <TextInput
            style={[styles.searchInput, { color: colors.textPrimary }]}
            placeholder="Search equipment or muscle (e.g. Chest, Lats)..."
            placeholderTextColor={colors.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        {/* Filter Pills */}
        <View style={styles.filterRow}>
          {(['All', 'Machine', 'Free Weight', 'Cable'] as const).map((filter) => {
            const isSelected = selectedFilter === filter;
            return (
              <TouchableOpacity
                key={filter}
                style={[
                  styles.filterPill,
                  {
                    backgroundColor: isSelected ? '#0284C7' : colors.surface,
                    borderColor: isSelected ? '#0284C7' : colors.border,
                  },
                ]}
                onPress={() => setSelectedFilter(filter)}
              >
                <Text
                  style={[
                    styles.filterPillText,
                    { color: isSelected ? '#FFFFFF' : colors.textSecondary },
                  ]}
                >
                  {filter}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Machine Cards List */}
        <View style={styles.machineGrid}>
          {filteredMachines.map((m) => {
            const isSelected = activeMachine?.id === m.id;
            return (
              <TouchableOpacity
                key={m.id}
                style={[
                  styles.equipmentThumbCard,
                  {
                    backgroundColor: colors.surface,
                    borderColor: isSelected ? '#0284C7' : colors.border,
                    borderWidth: isSelected ? 2 : 1,
                    borderRadius: radii.lg,
                    padding: spacing.md,
                  },
                ]}
                onPress={() => {
                  setSelectedMachine(m);
                  setPredictionResult(null);
                }}
              >
                <View style={styles.equipmentThumbTop}>
                  <View style={[styles.typeIconBox, { backgroundColor: colors.surfaceSubtle }]}>
                    <Dumbbell size={18} color={isSelected ? '#0284C7' : colors.textPrimary} />
                  </View>
                  <TouchableOpacity
                    onPress={() => handleOpenTutorialVideo(m.videoTutorialUrl)}
                    style={styles.playIconBtn}
                  >
                    <PlayCircle size={20} color="#EF4444" />
                  </TouchableOpacity>
                </View>

                <Text style={[styles.equipmentThumbName, { color: colors.textPrimary }]}>
                  {m.name}
                </Text>
                <Text style={[styles.equipmentThumbMuscle, { color: colors.textMuted }]}>
                  {m.targetMuscle}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={{ height: spacing['3xl'] }} />
      </ScrollView>

      {/* Live AR Camera Viewfinder Modal */}
      <Modal
        visible={isLiveCameraOpen}
        animationType="slide"
        presentationStyle="fullScreen"
        onRequestClose={() => setIsLiveCameraOpen(false)}
      >
        <SafeAreaView style={styles.liveCameraContainer}>
          <CameraView
            ref={cameraRef}
            facing="back"
            style={StyleSheet.absoluteFill}
          >
            {/* Viewfinder Header */}
            <View style={styles.viewfinderHeader}>
              <TouchableOpacity
                style={styles.viewfinderCloseBtn}
                onPress={() => setIsLiveCameraOpen(false)}
              >
                <X size={24} color="#FFFFFF" />
              </TouchableOpacity>
              <View style={styles.viewfinderTitleBadge}>
                <Sparkles size={14} color="#38BDF8" />
                <Text style={styles.viewfinderTitleText}>EfficientNet-B0 Machine AI</Text>
              </View>
            </View>

            {/* Target Reticle in Center */}
            <View style={styles.reticleContainer}>
              <View style={styles.reticleBox}>
                <View style={[styles.reticleCorner, styles.cornerTL]} />
                <View style={[styles.reticleCorner, styles.cornerTR]} />
                <View style={[styles.reticleCorner, styles.cornerBL]} />
                <View style={[styles.reticleCorner, styles.cornerBR]} />
                <Text style={styles.reticleInstruction}>
                  Align gym machine within viewfinder
                </Text>
              </View>
            </View>

            {/* Bottom Shutter Controls */}
            <View style={styles.viewfinderFooter}>
              <Text style={styles.shutterHintText}>Tap button to capture and classify</Text>
              <TouchableOpacity
                style={styles.shutterBtn}
                onPress={handleCaptureFromLiveCamera}
                activeOpacity={0.7}
              >
                <View style={styles.shutterInnerCircle} />
              </TouchableOpacity>
            </View>
          </CameraView>
        </SafeAreaView>
      </Modal>
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
  headerTitleWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#0284C7',
  },
  scrollContent: {
    flexGrow: 1,
  },
  scannerHero: {
    borderWidth: 1.5,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scannerCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#E0F2FE',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  scannerHeroTitle: {
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 4,
  },
  scannerHeroSub: {
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 17,
    maxWidth: 280,
  },
  predictionBanner: {
    borderWidth: 1,
  },
  predictionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  predictionText: {
    flex: 1,
    fontSize: 13,
  },
  confidencePill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  confidencePillText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
  },
  machineDetailCard: {
    borderWidth: 1,
    gap: 12,
  },
  machineCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  machineTitleCol: {
    flex: 1,
  },
  categoryTag: {
    alignSelf: 'flex-start',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginBottom: 4,
  },
  categoryTagText: {
    fontSize: 9,
    fontWeight: '800',
  },
  machineName: {
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 2,
  },
  targetMuscleText: {
    fontSize: 13,
    fontWeight: '700',
  },
  videoTutorialBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  videoTutorialBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
  machineDescription: {
    fontSize: 13,
    lineHeight: 19,
  },
  instructionsHeader: {
    fontSize: 14,
    fontWeight: '800',
    marginTop: 4,
  },
  instructionsList: {
    gap: 8,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  stepNumPill: {
    width: 22,
    height: 22,
    borderRadius: 11,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepNumText: {
    fontSize: 11,
    fontWeight: '800',
  },
  stepText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 18,
  },
  safetyBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 10,
    borderWidth: 1,
    gap: 8,
    marginTop: 4,
  },
  safetyTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#DC2626',
    marginBottom: 2,
  },
  safetyText: {
    fontSize: 11,
    lineHeight: 15,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 12,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 12,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
  },
  filterRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
  },
  filterPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
  },
  filterPillText: {
    fontSize: 11,
    fontWeight: '700',
  },
  machineGrid: {
    gap: 10,
  },
  equipmentThumbCard: {
    gap: 4,
  },
  equipmentThumbTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  typeIconBox: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  playIconBtn: {
    padding: 4,
  },
  equipmentThumbName: {
    fontSize: 14,
    fontWeight: '700',
  },
  equipmentThumbMuscle: {
    fontSize: 12,
  },
  scannerHeroGroup: {
    gap: 10,
    marginBottom: 14,
  },
  secondaryScanRow: {
    flexDirection: 'row',
    gap: 10,
  },
  subScanBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    gap: 6,
  },
  subScanBtnText: {
    fontSize: 12,
    fontWeight: '700',
  },
  capturedMachineContainer: {
    borderWidth: 1,
    gap: 10,
  },
  capturedMachineWrapper: {
    position: 'relative',
    height: 190,
    borderRadius: 12,
    overflow: 'hidden',
  },
  capturedMachinePhoto: {
    width: '100%',
    height: '100%',
    borderRadius: 12,
  },
  photoTagBadge: {
    position: 'absolute',
    top: 10,
    left: 10,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 4,
  },
  photoTagBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
  },
  scanningOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  scanningOverlayText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  photoActionRow: {
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'flex-end',
  },
  photoActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  photoActionBtnText: {
    fontSize: 12,
    fontWeight: '700',
  },
  machinePhotoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingBottom: 12,
    marginBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.06)',
  },
  machinePhotoThumb: {
    width: 48,
    height: 48,
    borderRadius: 8,
  },
  machinePhotoMeta: {
    flex: 1,
  },
  machinePhotoLabel: {
    fontSize: 12,
    fontWeight: '700',
  },
  machinePhotoSub: {
    fontSize: 11,
    fontWeight: '600',
  },
  liveCameraContainer: {
    flex: 1,
    backgroundColor: '#000000',
  },
  viewfinderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  viewfinderCloseBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  viewfinderTitleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  viewfinderTitleText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
  reticleContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  reticleBox: {
    width: 280,
    height: 280,
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  reticleCorner: {
    position: 'absolute',
    width: 36,
    height: 36,
    borderColor: '#38BDF8',
  },
  cornerTL: {
    top: 0,
    left: 0,
    borderTopWidth: 3,
    borderLeftWidth: 3,
  },
  cornerTR: {
    top: 0,
    right: 0,
    borderTopWidth: 3,
    borderRightWidth: 3,
  },
  cornerBL: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 3,
    borderLeftWidth: 3,
  },
  cornerBR: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 3,
    borderRightWidth: 3,
  },
  reticleInstruction: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  viewfinderFooter: {
    paddingBottom: 40,
    alignItems: 'center',
    gap: 14,
  },
  shutterHintText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
    textShadowColor: '#000',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  shutterBtn: {
    width: 76,
    height: 76,
    borderRadius: 38,
    borderWidth: 4,
    borderColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  shutterInnerCircle: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: '#FFFFFF',
  },
});

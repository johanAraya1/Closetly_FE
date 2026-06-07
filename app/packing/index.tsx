/**
 * Smart Packing List Screen
 * Pantalla para generar listas de empaque inteligentes con IA
 * Estado 1: Formulario de datos del viaje
 * Estado 2: Resultados con outfits sugeridos por día
 */

import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from '@/hooks/useTranslation';
import { COLORS, SPACING } from '@/lib/constants';
import { usePackingStore } from '@/store/packingStore';
import { useGarmentsStore } from '@/store/garmentsStore';
import type { PackingFormData } from '@/types';

const PURPOSE_OPTIONS = ['vacation', 'business', 'beach', 'city', 'adventure'] as const;

export default function PackingScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { packingList, isLoading, error, generatePackingList, clearPackingList } = usePackingStore();
  const garments = useGarmentsStore((s) => s.garments);

  // Form state
  const [days, setDays] = useState(3);
  const [destination, setDestination] = useState('');
  const [purpose, setPurpose] = useState<string>('');
  const [showForm, setShowForm] = useState(true);

  const hasGarments = garments.length > 0;

  const handleGenerate = () => {
    if (!hasGarments) return;

    const data: PackingFormData = { days };
    if (destination.trim()) data.destination = destination.trim();
    if (purpose) data.purpose = purpose;

    generatePackingList(data);
    setShowForm(false);
  };

  const handleRegenerate = () => {
    setShowForm(true);
    clearPackingList();
  };

  const handleGoToCloset = () => {
    router.push('/(tabs)/closet');
  };

  const incrementDays = () => setDays((d) => Math.min(d + 1, 30));
  const decrementDays = () => setDays((d) => Math.max(d - 1, 1));

  const garmentMap = useMemo(() => {
    const map = new Map<string, { imageUrl: string; name: string }>();
    if (packingList?.garments) {
      for (const g of packingList.garments) {
        map.set(g.id, { imageUrl: g.imageUrl, name: g.name });
      }
    }
    return map;
  }, [packingList?.garments]);

  // ───────────────────────────────────────
  // Form View
  // ───────────────────────────────────────
  if (showForm && !isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={COLORS.gray[700]} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{t('packing.title')}</Text>
          <View style={styles.headerRight} />
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.formScrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* Empty state — no garments */}
          {!hasGarments && (
            <View style={styles.emptyCard}>
              <Ionicons name="shirt-outline" size={48} color={COLORS.gray[300]} />
              <Text style={styles.emptyTitle}>{t('packing.noGarments')}</Text>
              <Text style={styles.emptyHint}>{t('packing.noGarmentsHint')}</Text>
              <TouchableOpacity onPress={handleGoToCloset} style={styles.primaryButton}>
                <Ionicons name="shirt-outline" size={18} color={COLORS.white} />
                <Text style={styles.primaryButtonText}>{t('packing.goToCloset')}</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Form */}
          {hasGarments && (
            <>
              {/* Hero */}
              <View style={styles.heroCard}>
                <Ionicons name="briefcase-outline" size={40} color={COLORS.primary} />
                <Text style={styles.heroTitle}>{t('packing.emptyState')}</Text>
                <Text style={styles.heroHint}>{t('packing.emptyStateHint')}</Text>
              </View>

              {/* Days input */}
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>{t('packing.days')}</Text>
                <View style={styles.stepperRow}>
                  <TouchableOpacity
                    onPress={decrementDays}
                    style={[styles.stepperButton, days <= 1 && styles.stepperDisabled]}
                    disabled={days <= 1}
                  >
                    <Ionicons name="remove" size={20} color={days <= 1 ? COLORS.gray[300] : COLORS.gray[700]} />
                  </TouchableOpacity>
                  <View style={styles.stepperValue}>
                    <Text style={styles.stepperValueText}>{days}</Text>
                  </View>
                  <TouchableOpacity
                    onPress={incrementDays}
                    style={[styles.stepperButton, days >= 30 && styles.stepperDisabled]}
                    disabled={days >= 30}
                  >
                    <Ionicons name="add" size={20} color={days >= 30 ? COLORS.gray[300] : COLORS.gray[700]} />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Destination input */}
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>{t('packing.destination')}</Text>
                <TextInput
                  style={styles.textInput}
                  value={destination}
                  onChangeText={setDestination}
                  placeholder="e.g., Paris, France"
                  placeholderTextColor={COLORS.gray[400]}
                  autoCapitalize="words"
                />
              </View>

              {/* Purpose chips */}
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>{t('packing.purpose')}</Text>
                <View style={styles.chipsRow}>
                  {PURPOSE_OPTIONS.map((opt) => {
                    const selected = purpose === opt;
                    return (
                      <TouchableOpacity
                        key={opt}
                        onPress={() => setPurpose(selected ? '' : opt)}
                        style={[
                          styles.chip,
                          selected && { backgroundColor: COLORS.primary + '20', borderColor: COLORS.primary },
                        ]}
                      >
                        <Text
                          style={[
                            styles.chipText,
                            selected && { color: COLORS.primary, fontWeight: '600' },
                          ]}
                        >
                          {t(`packing.purposeOptions_${opt}`)}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {/* Generate button */}
              <TouchableOpacity onPress={handleGenerate} style={styles.primaryButton}>
                <Ionicons name="sparkles-outline" size={20} color={COLORS.white} />
                <Text style={styles.primaryButtonText}>{t('packing.generate')}</Text>
              </TouchableOpacity>
            </>
          )}
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ───────────────────────────────────────
  // Loading State
  // ───────────────────────────────────────
  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={handleRegenerate} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={COLORS.gray[700]} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{t('packing.title')}</Text>
          <View style={styles.headerRight} />
        </View>
        <View style={styles.loadingContainer}>
          <View style={styles.loadingAnimation}>
            <Ionicons name="airplane-outline" size={48} color={COLORS.primary} />
            <Text style={styles.loadingText}>{t('packing.loading')}</Text>
          </View>
          {Array.from({ length: 2 }).map((_, i) => (
            <View key={i} style={styles.daySkeleton}>
              <View style={styles.skeletonDayHeader} />
              <View style={styles.skeletonRow}>
                {Array.from({ length: 3 }).map((_, j) => (
                  <View key={j} style={styles.skeletonThumb} />
                ))}
              </View>
            </View>
          ))}
        </View>
      </SafeAreaView>
    );
  }

  // ───────────────────────────────────────
  // Error State
  // ───────────────────────────────────────
  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={handleRegenerate} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={COLORS.gray[700]} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{t('packing.title')}</Text>
          <View style={styles.headerRight} />
        </View>
        <View style={styles.centerContainer}>
          <Ionicons name="cloud-offline-outline" size={48} color={COLORS.gray[300]} />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity onPress={handleRegenerate} style={styles.primaryButton}>
            <Ionicons name="refresh" size={18} color={COLORS.white} />
            <Text style={styles.primaryButtonText}>{t('common.retry')}</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // ───────────────────────────────────────
  // Results View
  // ───────────────────────────────────────
  if (!packingList) return null;

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={COLORS.gray[700]} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('packing.title')}</Text>
        <View style={styles.headerRight} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.resultsScrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Weather summary */}
        {packingList.weather && (
          <View style={styles.weatherCard}>
            <Ionicons name="partly-sunny-outline" size={20} color="#F59E0B" />
            <Text style={styles.weatherText}>
              {t('packing.weatherAtDestination')}: {Math.round(packingList.weather.temp)}°C — {packingList.weather.description}
            </Text>
          </View>
        )}

        {/* Trip info */}
        <View style={styles.tripInfoCard}>
          <Ionicons name="map-outline" size={20} color={COLORS.secondary} />
          <Text style={styles.tripInfoText}>
            {packingList.days.length} {t('packing.days').toLowerCase()}
            {destination ? ` · ${destination}` : ''}
            {purpose ? ` · ${t(`packing.purposeOptions_${purpose}`).toLowerCase()}` : ''}
          </Text>
        </View>

        {/* Per-day cards */}
        {packingList.days.map((day) => (
          <View key={day.day} style={styles.dayCard}>
            {/* Day header */}
            <View style={styles.dayHeader}>
              <View style={styles.dayBadge}>
                <Text style={styles.dayBadgeText}>{t('packing.dayLabel', { number: day.day })}</Text>
              </View>
              <Text style={styles.dayOutfitName} numberOfLines={1}>
                {day.outfitName}
              </Text>
            </View>

            {/* Garment images */}
            {day.garments.length > 0 && (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.dayGarmentsScroll}
              >
                {day.garments.map((g) => {
                  const garmentInfo = garmentMap.get(g.id);
                  return (
                    <View key={g.id} style={styles.dayGarmentItem}>
                      {garmentInfo ? (
                        <Image
                          source={{ uri: garmentInfo.imageUrl }}
                          style={styles.dayGarmentImage}
                          resizeMode="cover"
                        />
                      ) : (
                        <View style={[styles.dayGarmentImage, styles.dayGarmentPlaceholder]}>
                          <Ionicons name="shirt-outline" size={20} color={COLORS.gray[300]} />
                        </View>
                      )}
                      <Text style={styles.dayGarmentName} numberOfLines={1}>
                        {g.name}
                      </Text>
                    </View>
                  );
                })}
              </ScrollView>
            )}

            {/* Notes */}
            {day.notes && (
              <View style={styles.dayNotes}>
                <Ionicons name="information-circle-outline" size={14} color={COLORS.gray[400]} />
                <Text style={styles.dayNotesText}>{day.notes}</Text>
              </View>
            )}
          </View>
        ))}

        {/* Action buttons */}
        <View style={styles.actionRow}>
          <TouchableOpacity onPress={handleRegenerate} style={styles.secondaryButton}>
            <Ionicons name="refresh" size={18} color={COLORS.primary} />
            <Text style={styles.secondaryButtonText}>{t('packing.regenerate')}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.primaryButton}>
            <Ionicons name="bookmark-outline" size={18} color={COLORS.white} />
            <Text style={styles.primaryButtonText}>{t('packing.save')}</Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: SPACING.xxl }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F4F5F7',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray[100],
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.gray[900],
  },
  headerRight: {
    width: 36,
  },
  scrollView: {
    flex: 1,
  },
  formScrollContent: {
    padding: 16,
    gap: 16,
  },
  resultsScrollContent: {
    padding: 16,
    gap: 14,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
    gap: 16,
  },
  errorText: {
    fontSize: 15,
    color: COLORS.error,
    textAlign: 'center',
  },

  // ─── FORM ───

  // Hero
  heroCard: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 28,
    alignItems: 'center',
    gap: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  heroTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.gray[900],
  },
  heroHint: {
    fontSize: 14,
    color: COLORS.gray[500],
    textAlign: 'center',
    lineHeight: 20,
  },

  // Empty (no garments)
  emptyCard: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    gap: 10,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.gray[800],
  },
  emptyHint: {
    fontSize: 14,
    color: COLORS.gray[500],
    textAlign: 'center',
    lineHeight: 20,
  },

  // Form groups
  formGroup: {
    gap: 8,
  },
  formLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.gray[700],
  },
  textInput: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: COLORS.gray[900],
    borderWidth: 1,
    borderColor: COLORS.gray[200],
  },

  // Stepper
  stepperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.gray[200],
    overflow: 'hidden',
  },
  stepperButton: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.gray[50],
  },
  stepperDisabled: {
    opacity: 0.5,
  },
  stepperValue: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    height: 48,
  },
  stepperValueText: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.gray[900],
  },

  // Chips
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.gray[200],
    backgroundColor: COLORS.white,
  },
  chipText: {
    fontSize: 14,
    color: COLORS.gray[600],
    fontWeight: '500',
  },

  // Buttons
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingVertical: 16,
    marginTop: 4,
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.white,
  },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: COLORS.white,
    borderRadius: 12,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  secondaryButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.primary,
  },

  // ─── LOADING ───
  loadingContainer: {
    flex: 1,
    padding: 16,
    gap: 16,
  },
  loadingAnimation: {
    alignItems: 'center',
    gap: 12,
    paddingVertical: 24,
  },
  loadingText: {
    fontSize: 15,
    color: COLORS.gray[500],
    textAlign: 'center',
  },
  daySkeleton: {
    backgroundColor: COLORS.white,
    borderRadius: 14,
    padding: 16,
    gap: 12,
  },
  skeletonDayHeader: {
    height: 20,
    width: '40%',
    backgroundColor: COLORS.gray[100],
    borderRadius: 6,
  },
  skeletonRow: {
    flexDirection: 'row',
    gap: 10,
  },
  skeletonThumb: {
    width: 60,
    height: 60,
    backgroundColor: COLORS.gray[100],
    borderRadius: 10,
  },

  // ─── RESULTS ───
  weatherCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FFFBEB',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  weatherText: {
    fontSize: 13,
    color: '#92400E',
    flex: 1,
  },

  tripInfoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 12,
  },
  tripInfoText: {
    fontSize: 14,
    color: COLORS.gray[700],
    fontWeight: '500',
    flex: 1,
  },

  // Day card
  dayCard: {
    backgroundColor: COLORS.white,
    borderRadius: 14,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  dayHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray[50],
  },
  dayBadge: {
    backgroundColor: COLORS.primary + '20',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  dayBadgeText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.primary,
  },
  dayOutfitName: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.gray[800],
    flex: 1,
  },
  dayGarmentsScroll: {
    padding: 14,
    gap: 10,
  },
  dayGarmentItem: {
    width: 70,
    gap: 6,
    alignItems: 'center',
  },
  dayGarmentImage: {
    width: 60,
    height: 60,
    borderRadius: 10,
    backgroundColor: COLORS.gray[100],
  },
  dayGarmentPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayGarmentName: {
    fontSize: 10,
    color: COLORS.gray[600],
    textAlign: 'center',
    width: 70,
  },
  dayNotes: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    paddingHorizontal: 14,
    paddingBottom: 14,
  },
  dayNotesText: {
    fontSize: 12,
    color: COLORS.gray[500],
    flex: 1,
    lineHeight: 16,
  },

  // Action buttons row
  actionRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
});

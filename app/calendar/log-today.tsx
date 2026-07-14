/**
 * Log Today Screen
 * Selector de outfits para registrar en una fecha específica del calendario
 */

import React, { useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  TextInput,
  Image,
  ActivityIndicator,
  Alert,
  useWindowDimensions,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useOutfits } from '@/hooks/useOutfits';
import { useCalendar } from '@/hooks/useCalendar';
import { useCalendarStore } from '@/store/calendarStore';
import { useTranslation } from '@/hooks/useTranslation';
import { COLORS, FONT_SIZES, SEASONS } from '@/lib/constants';
import { EmptyState, Loading, withScreenErrorBoundary } from '@/components';
import { getLocalDateString, addDays } from '@/utils/date';
import type { Outfit } from '@/types';

const SEASONS_FILTERS = [
  { value: 'all', labelKey: 'collections.allSeasons' },
  ...SEASONS.map((s) => ({ value: s.value, labelKey: `garments.season.${s.value}` })),
];

export default function LogTodayScreen() {
  const router = useRouter();
  const { date } = useLocalSearchParams<{ date: string }>();
  const targetDate = date || getLocalDateString();
  const { t } = useTranslation();
  const { width: screenWidth } = useWindowDimensions();
  const { outfits, isLoading: loadingOutfits } = useOutfits(true);
  const { entries, isLoading: calendarLoading, logOutfit, loadMonth, clearError } = useCalendar();

  const [selectedOutfitId, setSelectedOutfitId] = useState<string | null>(null);
  const [isLogging, setIsLogging] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [seasonFilter, setSeasonFilter] = useState('all');

  const numColumns = useMemo(() => (screenWidth > 600 ? 3 : 2), [screenWidth]);

  const filteredOutfits = useMemo(() => {
    let result = outfits;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (o) =>
          o.name?.toLowerCase().includes(q) ||
          o.garments?.some((g: { name?: string }) => g.name?.toLowerCase().includes(q)),
      );
    }
    if (seasonFilter !== 'all') {
      result = result.filter(
        (o) => o.garments?.some((g: { season?: string }) => g.season === seasonFilter),
      );
    }
    return result;
  }, [outfits, searchQuery, seasonFilter]);

  // Formatear fecha para display
  const formattedDate = useMemo(() => {
    const d = new Date(targetDate + 'T00:00:00');
    return d.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  }, [targetDate]);

  // Season filter label
  const getSeasonLabel = useCallback(
    (value: string) => {
      if (value === 'all') return t('collections.allSeasons');
      return t(`garments.season.${value}`);
    },
    [t],
  );

  // Handle log
  const handleLog = useCallback(async () => {
    if (!selectedOutfitId) return;
    setIsLogging(true);
    clearError();
    try {
      // Asegurar que las entries del mes correcto están cargadas
      const targetDateObj = new Date(targetDate + 'T00:00:00');
      const targetMonth = targetDateObj.getMonth() + 1;
      const targetYear = targetDateObj.getFullYear();
      const state = useCalendarStore.getState();
      if (state.selectedMonth !== targetMonth || state.selectedYear !== targetYear || state.entries.length === 0) {
        await loadMonth(targetMonth, targetYear);
      }

      // 1. Check if date already has an outfit logged
      const freshEntries = useCalendarStore.getState().entries;
      const existingEntry = freshEntries.find((e) => e.date === targetDate);
      if (existingEntry) {
        const replace = await new Promise<boolean>((resolve) => {
          Alert.alert(
            t('calendar.existingOutfitTitle'),
            t('calendar.existingOutfitMessage', {
              name: existingEntry.outfit.name,
              date: formattedDate,
            }),
            [
              { text: t('common.cancel'), style: 'cancel', onPress: () => resolve(false) },
              { text: t('calendar.existingOutfitAction'), onPress: () => resolve(true) },
            ],
          );
        });
        if (!replace) {
          return;
        }
      }

      // 2. Warn if same outfit was logged on nearby dates (optional — user can still proceed)
      const targetMs = new Date(targetDate + 'T00:00:00').getTime();
      const sameOutfitEntries = freshEntries.filter(
        (e) => e.outfit.id === selectedOutfitId,
      );
      const nearbyEntries = sameOutfitEntries.filter((e) => {
        const entryMs = new Date(e.date + 'T00:00:00').getTime();
        const diffDays = Math.abs((targetMs - entryMs) / 86400000);
        return diffDays <= 3 && diffDays > 0;
      });

      if (nearbyEntries.length > 0) {
        const datesStr = nearbyEntries
          .map((e) => {
            const d = new Date(e.date + 'T00:00:00');
            return d.toLocaleDateString('en-US', {
              weekday: 'short',
              month: 'short',
              day: 'numeric',
            });
          })
          .join(', ');

        const proceed = await new Promise<boolean>((resolve) => {
          Alert.alert(
            t('calendar.repeatTitle'),
            t('calendar.repeatMessage', {
              dates: datesStr,
              date: formattedDate,
            }),
            [
              { text: t('common.cancel'), style: 'cancel', onPress: () => resolve(false) },
              { text: t('planner.useAgain'), onPress: () => resolve(true) },
            ],
          );
        });
        if (!proceed) {
          return;
        }
      }

      // 3. Log it
      const success = await logOutfit(selectedOutfitId, targetDate);
      if (success) {
        Alert.alert(
          t('common.success'),
          t('calendar.loggedSuccess', { date: formattedDate }),
          [
            {
              text: t('common.ok'),
              onPress: () => router.replace(`/calendar?date=${targetDate}`),
            },
          ],
        );
      } else {
        const freshError = useCalendarStore.getState().error || t('common.error');
        Alert.alert(t('common.error'), freshError);
      }
    } catch (err) {
      console.error('[LogToday] Error in handleLog:', err);
      Alert.alert(t('common.error'), t('common.error'));
    } finally {
      setIsLogging(false);
    }
  }, [selectedOutfitId, targetDate, logOutfit, loadMonth, t, router, clearError, formattedDate]);

  // Render outfit item
  const renderOutfitItem = useCallback(
    ({ item }: { item: Outfit }) => {
      const isSelected = item.id === selectedOutfitId;
      const garments = item.garments || [];

      return (
        <TouchableOpacity
          style={[
            styles.outfitCard,
            isSelected && styles.outfitCardSelected,
            { width: `${100 / numColumns}%` },
          ]}
          activeOpacity={0.8}
          onPress={() => setSelectedOutfitId(item.id)}
        >
          {/* Garment previews */}
          <View style={styles.outfitImages}>
            {garments.slice(0, 3).map((g) => (
              <View key={g.id} style={styles.outfitImageThumb}>
                <Image
                  source={{ uri: g.imageUrl }}
                  style={styles.outfitImage}
                  resizeMode="cover"
                />
              </View>
            ))}
            {garments.length === 0 && (
              <View style={styles.outfitImagePlaceholder}>
                <Ionicons
                  name="shirt-outline"
                  size={24}
                  color={COLORS.gray[300]}
                />
              </View>
            )}
            {garments.length > 3 && (
              <View style={[styles.outfitImageThumb, styles.moreThumb]}>
                <Text style={styles.moreText}>+{garments.length - 3}</Text>
              </View>
            )}
          </View>

          {/* Outfit name */}
          <Text style={styles.outfitName} numberOfLines={2}>
            {item.name}
          </Text>

          {/* Occasion badge */}
          {item.occasion && (
            <Text style={styles.outfitOccasion} numberOfLines={1}>
              {item.occasion}
            </Text>
          )}

          {/* Selected checkmark */}
          {isSelected && (
            <View style={styles.selectedBadge}>
              <Ionicons name="checkmark-circle" size={24} color={COLORS.primary} />
            </View>
          )}
        </TouchableOpacity>
      );
    },
    [selectedOutfitId, numColumns],
  );

  // List header component
  const listHeader = useMemo(
    () => (
      <View>
        {/* Search input */}
        <View style={styles.searchContainer}>
          <Ionicons name="search-outline" size={20} color={COLORS.gray[400]} />
          <TextInput
            style={styles.searchInput}
            placeholder={t('outfits.searchPlaceholder')}
            placeholderTextColor={COLORS.gray[400]}
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoCorrect={false}
            autoCapitalize="none"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={20} color={COLORS.gray[400]} />
            </TouchableOpacity>
          )}
        </View>

        {/* Season filter chips */}
        <View style={styles.chipsContainer}>
          {SEASONS_FILTERS.map((season) => {
            const isActive = seasonFilter === season.value;
            return (
              <TouchableOpacity
                key={season.value}
                style={[styles.chip, isActive && styles.chipActive]}
                onPress={() => setSeasonFilter(season.value)}
              >
                <Text
                  style={[styles.chipText, isActive && styles.chipTextActive]}
                >
                  {getSeasonLabel(season.value)}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    ),
    [searchQuery, seasonFilter, t, getSeasonLabel],
  );

  // List empty component
  const listEmpty = useMemo(() => {
    if (loadingOutfits) return null;

    if (outfits.length === 0) {
      return (
        <EmptyState
          icon="shirt-outline"
          title={t('outfits.noOutfitsYet')}
          message={t('outfits.emptyMessage')}
          actionLabel={t('outfits.createOutfit')}
          onAction={() => router.push('/outfits/create')}
        />
      );
    }

    return (
      <EmptyState
        icon="search-outline"
        title={t('outfits.noOutfitsFilter')}
        message={t('collections.tryDifferentFilter')}
      />
    );
  }, [loadingOutfits, outfits.length, t, router]);

  // Loading state
  if (loadingOutfits) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.headerButton}
          >
            <Ionicons name="chevron-back" size={24} color={COLORS.gray[700]} />
          </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('calendar.selectOutfit')}</Text>
        <View style={{ width: 40 }} />
      </View>
      <Loading message={t('outfits.loading')} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* ===== Header ===== */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.headerButton}
        >
          <Ionicons name="chevron-back" size={24} color={COLORS.gray[700]} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('calendar.selectOutfit')}</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* ===== Date navigation ===== */}
      <View style={styles.dateNav}>
        <TouchableOpacity
          onPress={() => {
            const prev = addDays(targetDate, -1);
            router.setParams({ date: prev });
          }}
          style={styles.dateArrow}
        >
          <Ionicons name="chevron-back" size={20} color={COLORS.gray[600]} />
        </TouchableOpacity>

        <View style={styles.dateCenter}>
          <Ionicons name="calendar-outline" size={16} color={COLORS.gray[600]} />
          <TextInput
            style={styles.dateInput}
            value={targetDate}
            onChangeText={(val) => router.setParams({ date: val })}
            keyboardType="numbers-and-punctuation"
            autoCorrect={false}
          />
        </View>

        <TouchableOpacity
          onPress={() => {
            const next = addDays(targetDate, 1);
            router.setParams({ date: next });
          }}
          style={styles.dateArrow}
        >
          <Ionicons name="chevron-forward" size={20} color={COLORS.gray[600]} />
        </TouchableOpacity>
      </View>

      {/* ===== Outfit grid ===== */}
      <FlatList
        data={filteredOutfits}
        keyExtractor={(item) => item.id}
        numColumns={numColumns}
        ListHeaderComponent={listHeader}
        ListEmptyComponent={listEmpty}
        contentContainerStyle={styles.listContent}
        columnWrapperStyle={numColumns > 1 ? styles.columnWrapper : undefined}
        renderItem={renderOutfitItem}
        showsVerticalScrollIndicator={false}
      />

      {/* ===== Sticky bottom action ===== */}
      <View style={styles.bottomBar}>
        <TouchableOpacity
          style={[
            styles.logButton,
            !selectedOutfitId && styles.logButtonDisabled,
          ]}
          onPress={handleLog}
          disabled={!selectedOutfitId || isLogging}
        >
          {isLogging ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <>
              <Ionicons name="calendar" size={20} color="#FFFFFF" />
              <Text style={styles.logButtonText}>
                {t('calendar.logOutfit')}
              </Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F4F5F7',
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray[100],
  },
  headerButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.gray[50],
  },
  headerTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '700',
    color: COLORS.gray[900],
  },

  // Date navigation
  dateNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray[100],
    gap: 8,
  },
  dateArrow: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.gray[50],
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.gray[200],
  },
  dateCenter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minWidth: 140,
    justifyContent: 'center',
  },
  dateInput: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
    color: COLORS.gray[700],
    textAlign: 'center',
    minWidth: 100,
    paddingVertical: 4,
  },

  // Search
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.gray[200],
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: FONT_SIZES.sm,
    color: COLORS.gray[800],
  },

  // Season chips
  chipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: COLORS.gray[100],
    borderWidth: 1,
    borderColor: COLORS.gray[200],
  },
  chipActive: {
    backgroundColor: COLORS.primary + '20',
    borderColor: COLORS.primary,
  },
  chipText: {
    fontSize: FONT_SIZES.xs,
    fontWeight: '500',
    color: COLORS.gray[600],
  },
  chipTextActive: {
    color: COLORS.primary,
    fontWeight: '600',
  },

  // List
  listContent: {
    paddingHorizontal: 12,
    paddingBottom: 100,
  },
  columnWrapper: {
    gap: 8,
    marginBottom: 8,
  },

  // Outfit card (grid)
  outfitCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 10,
    borderWidth: 2,
    borderColor: 'transparent',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 2,
    marginBottom: 8,
  },
  outfitCardSelected: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primary + '08',
  },
  outfitImages: {
    flexDirection: 'row',
    gap: 4,
    marginBottom: 8,
  },
  outfitImageThumb: {
    flex: 1,
    aspectRatio: 1,
    borderRadius: 8,
    backgroundColor: COLORS.gray[100],
    overflow: 'hidden',
  },
  outfitImage: {
    width: '100%',
    height: '100%',
  },
  outfitImagePlaceholder: {
    flex: 1,
    aspectRatio: 1,
    borderRadius: 8,
    backgroundColor: COLORS.gray[50],
    alignItems: 'center',
    justifyContent: 'center',
  },
  moreThumb: {
    backgroundColor: COLORS.gray[200],
    alignItems: 'center',
    justifyContent: 'center',
  },
  moreText: {
    fontSize: FONT_SIZES.xs,
    fontWeight: '600',
    color: COLORS.gray[600],
  },
  outfitName: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
    color: COLORS.gray[800],
  },
  outfitOccasion: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.gray[400],
    marginTop: 2,
  },
  selectedBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
  },

  // Bottom bar
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingBottom: 28,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: COLORS.gray[100],
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 8,
  },
  logButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: COLORS.primary,
    paddingVertical: 14,
    borderRadius: 12,
  },
  logButtonDisabled: {
    opacity: 0.4,
  },
  logButtonText: {
    fontSize: FONT_SIZES.md,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});

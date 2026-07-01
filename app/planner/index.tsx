/**
 * Weekly Planner Screen
 * Planificador semanal donde el usuario asigna outfits a cada día (Lun-Dom)
 */

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  Image,
  Modal,
  FlatList,
  Alert,
  useWindowDimensions,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { usePlannerStore } from '@/store/plannerStore';
import { useOutfitsStore } from '@/store/outfitsStore';
import { useAuth } from '@/hooks/useAuth';
import { useTranslation } from '@/hooks/useTranslation';
import { COLORS, SPACING, FONT_SIZES } from '@/lib/constants';
import { EmptyState, Loading, SkeletonCard, withScreenErrorBoundary } from '@/components';
import { getLocalDateString, parseLocalDate } from '@/utils/date';
import type { Outfit } from '@/types';

const DAY_KEYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] as const;

function PlannerScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { user } = useAuth();
  const { width: screenWidth } = useWindowDimensions();
  const isLargeScreen = screenWidth >= 768;

  const {
    plan,
    weekStart,
    isLoading,
    isSaving,
    error,
    loadPlan,
    assignOutfit,
    removeOutfit,
    goToNextWeek,
    goToPrevWeek,
    goToCurrentWeek,
  } = usePlannerStore();

  const {
    outfits,
    isLoading: outfitsLoading,
    loadOutfits,
  } = useOutfitsStore();

  const [refreshing, setRefreshing] = useState(false);
  const [pickerVisible, setPickerVisible] = useState(false);
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [previewOutfit, setPreviewOutfit] = useState<Outfit | null>(null);

  // Load plan on mount
  useEffect(() => {
    loadPlan();
  }, []);

  // Load outfits on mount so the picker has data without visiting outfits tab first
  useEffect(() => {
    if (user && outfits.length === 0 && !outfitsLoading) {
      loadOutfits(user.id);
    }
  }, [user, outfits.length, outfitsLoading, loadOutfits]);

  // Pull-to-refresh
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadPlan();
    setRefreshing(false);
  }, [loadPlan]);

  // Format week range for display
  const weekLabel = useCallback(() => {
    const start = parseLocalDate(weekStart);
    const end = parseLocalDate(weekStart);
    end.setDate(end.getDate() + 6);

    const fmt = (d: Date) =>
      d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const year = start.getFullYear();
    return `${fmt(start)} - ${fmt(end)}, ${year}`;
  }, [weekStart]);

  // Check if viewing current week
  const isCurrentWeek = useCallback(() => {
    const today = new Date();
    const monday = parseLocalDate(weekStart);
    const day = today.getDay();
    const diff = today.getDate() - day + (day === 0 ? -6 : 1);
    const currentMonday = new Date(today);
    currentMonday.setDate(diff);
    return getLocalDateString(monday) === getLocalDateString(currentMonday);
  }, [weekStart]);

  const handleDayPress = (dayOfWeek: number) => {
    setSelectedDay(dayOfWeek);
    // Load outfits if not loaded
    if (user && outfits.length === 0) {
      loadOutfits(user.id);
    }
    setPickerVisible(true);
  };

  const handleSelectOutfit = async (outfitId: string | null) => {
    if (selectedDay === null) return;
    if (outfitId) {
      await assignOutfit(selectedDay, outfitId);
    } else {
      await removeOutfit(selectedDay);
    }
    setPickerVisible(false);
    setSelectedDay(null);
  };

  const handleLongPress = (dayOfWeek: number) => {
    const day = plan.find((d) => d.dayOfWeek === dayOfWeek);
    if (!day?.outfit) return;
    Alert.alert(
      day.outfit.name,
      t('planner.removeOutfit'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('planner.clearDay'),
          style: 'destructive',
          onPress: () => removeOutfit(dayOfWeek),
        },
      ]
    );
  };

  // Get the date number for each day of week
  const getDayDate = (dayOfWeek: number): number => {
    const d = parseLocalDate(weekStart);
    d.setDate(d.getDate() + dayOfWeek);
    return d.getDate();
  };

  // Day card component
  const renderDayCard = (dayOfWeek: number) => {
    const day = plan.find((d) => d.dayOfWeek === dayOfWeek);
    const outfit = day?.outfit;
    const dateNum = getDayDate(dayOfWeek);

    return (
      <TouchableOpacity
        key={dayOfWeek}
        style={styles.dayCard}
        activeOpacity={0.8}
        onPress={() => handleDayPress(dayOfWeek)}
        onLongPress={() => handleLongPress(dayOfWeek)}
      >
        {/* Day header */}
        <View style={styles.dayHeader}>
          <Text style={styles.dayName}>{t(`planner.${DAY_KEYS[dayOfWeek]}`)}</Text>
          <Text style={styles.dayDate}>{dateNum}</Text>
        </View>

        {/* Outfit content */}
        {outfit ? (
          <View style={styles.dayContent}>
            {/* Garment preview mini-grid */}
            {outfit.garments.length > 0 && (
              <View style={styles.miniGrid}>
                {outfit.garments.slice(0, 3).map((g) => (
                  <View key={g.id} style={styles.miniThumb}>
                    <Image
                      source={{ uri: g.imageUrl }}
                      style={styles.miniThumbImage}
                      resizeMode="cover"
                    />
                  </View>
                ))}
                {outfit.garments.length > 3 && (
                  <View style={[styles.miniThumb, styles.miniMoreThumb]}>
                    <Text style={styles.miniMoreText}>+{outfit.garments.length - 3}</Text>
                  </View>
                )}
              </View>
            )}
            {!outfit.imageUrl && outfit.garments.length === 0 && (
              <View style={styles.noGarmentsPlaceholder}>
                <Ionicons name="shirt-outline" size={24} color={COLORS.gray[300]} />
              </View>
            )}
            <View style={styles.outfitNameRow}>
              <Text style={styles.outfitName} numberOfLines={1}>
                {outfit.name}
              </Text>
              <TouchableOpacity
                onPress={() => setPreviewOutfit(outfit)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons name="expand-outline" size={16} color={COLORS.gray[400]} />
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <View style={styles.emptyDay}>
            <Ionicons name="add-circle-outline" size={28} color={COLORS.primary} />
            <Text style={styles.addOutfitText}>{t('planner.addOutfit')}</Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  // Determine which outfits are already assigned to other days this week
  const assignedOutfitIds = useMemo(() => {
    const ids = new Set<string>();
    if (selectedDay === null) return ids;
    for (const day of plan) {
      if (day.dayOfWeek !== selectedDay && day.outfit) {
        ids.add(day.outfit.id);
      }
    }
    return ids;
  }, [plan, selectedDay]);

  const enforceNoRepeat = outfits.length >= 7;

  // Find which day an outfit is already assigned to (for display)
  const getDayForOutfit = (outfitId: string): string | null => {
    const day = plan.find(
      (d) => d.dayOfWeek !== selectedDay && d.outfit?.id === outfitId,
    );
    if (!day) return null;
    return t(`planner.${DAY_KEYS[day.dayOfWeek]}`);
  };

  // Outfit picker modal
  const renderPickerModal = () => (
    <Modal
      visible={pickerVisible}
      transparent
      animationType="slide"
      onRequestClose={() => {
        setPickerVisible(false);
        setSelectedDay(null);
      }}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          {/* Modal header */}
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>
              {selectedDay !== null
                ? `${t(`planner.${DAY_KEYS[selectedDay]}`)} — ${t('planner.pickOutfit')}`
                : t('planner.pickOutfit')}
            </Text>
            <TouchableOpacity
              onPress={() => {
                setPickerVisible(false);
                setSelectedDay(null);
              }}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="close" size={24} color={COLORS.gray[500]} />
            </TouchableOpacity>
          </View>

          {/* "None" option to clear */}
          {selectedDay !== null && plan.find((d) => d.dayOfWeek === selectedDay)?.outfit && (
            <TouchableOpacity
              style={styles.clearDayButton}
              onPress={() => handleSelectOutfit(null)}
            >
              <Ionicons name="close-circle-outline" size={20} color={COLORS.error} />
              <Text style={styles.clearDayText}>{t('planner.clearDay')}</Text>
            </TouchableOpacity>
          )}

          {/* Outfit list */}
          {outfitsLoading ? (
            <View style={styles.modalLoading}>
              <ActivityIndicator size="large" color={COLORS.primary} />
            </View>
          ) : outfits.length === 0 ? (
            <View style={styles.modalEmpty}>
              <EmptyState
                icon="shirt-outline"
                title={t('planner.noOutfits')}
                message={t('planner.noOutfitsHint')}
                actionLabel={t('planner.createOutfit')}
                onAction={() => {
                  setPickerVisible(false);
                  setSelectedDay(null);
                  router.push('/outfits/create');
                }}
              />
            </View>
          ) : (
            <FlatList
              data={outfits}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.outfitList}
              renderItem={({ item }: { item: Outfit }) => {
                const isUsedElsewhere = enforceNoRepeat && assignedOutfitIds.has(item.id);
                const usedDay = isUsedElsewhere ? getDayForOutfit(item.id) : null;

                return (
                  <TouchableOpacity
                    style={[
                      styles.outfitItem,
                      isUsedElsewhere && styles.outfitItemUsed,
                    ]}
                    activeOpacity={0.7}
                    onPress={() => {
                      if (isUsedElsewhere) {
                        Alert.alert(
                          t('planner.repeatTitle') || 'Outfit already used',
                          t('planner.repeatMessage') || `This outfit is already planned for ${usedDay}. Do you want to use it again?`,
                          [
                            { text: t('common.cancel'), style: 'cancel' },
                            {
                              text: t('planner.useAgain') || 'Use anyway',
                              onPress: () => handleSelectOutfit(item.id),
                            },
                          ],
                        );
                      } else {
                        handleSelectOutfit(item.id);
                      }
                    }}
                  >
                    {/* Garment mini preview */}
                    <View style={styles.outfitItemPreviews}>
                      {(item.garments ?? []).slice(0, 3).map((g) => (
                        <View key={g.id} style={styles.outfitItemThumb}>
                          <Image
                            source={{ uri: g.imageUrl }}
                            style={styles.outfitItemThumbImage}
                            resizeMode="cover"
                          />
                        </View>
                      ))}
                      {(!item.garments || item.garments.length === 0) && (
                        <View style={[styles.outfitItemThumb, styles.outfitItemThumbEmpty]}>
                          <Ionicons name="shirt-outline" size={18} color={COLORS.gray[300]} />
                        </View>
                      )}
                    </View>
                    <View style={styles.outfitItemInfo}>
                      <Text style={styles.outfitItemName} numberOfLines={1}>
                        {item.name}
                      </Text>
                      {item.occasion && (
                        <Text style={styles.outfitItemOccasion} numberOfLines={1}>
                          {item.occasion}
                        </Text>
                      )}
                      {isUsedElsewhere && usedDay && (
                        <Text style={styles.outfitItemUsedLabel}>
                          {t('planner.alreadyInDay') || `Already in ${usedDay}`}
                        </Text>
                      )}
                    </View>
                    <Ionicons name="chevron-forward" size={20} color={COLORS.gray[400]} />
                  </TouchableOpacity>
                );
              }}
            />
          )}
        </View>
      </View>
    </Modal>
  );

  // Loading skeleton
  if (isLoading && plan.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <View style={{ width: 40 }} />
            <Text style={styles.headerTitle}>{t('planner.title')}</Text>
            <View style={{ width: 40 }} />
          </View>
          <View style={styles.weekNav}>
            <SkeletonCard width={36} height={36} borderRadius={18} />
            <SkeletonCard width={180} height={18} />
            <SkeletonCard width={36} height={36} borderRadius={18} />
          </View>
        </View>
        <View style={styles.gridContainer}>
          {Array.from({ length: 7 }).map((_, i) => (
            <View key={i} style={styles.dayCard}>
              <SkeletonCard height={140} borderRadius={12} />
            </View>
          ))}
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[COLORS.primary]}
            tintColor={COLORS.primary}
          />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <TouchableOpacity
              onPress={() => router.back()}
              style={styles.backButton}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="chevron-back" size={24} color={COLORS.gray[700]} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>{t('planner.title')}</Text>
            <View style={{ width: 40 }} />
          </View>

          {/* Week navigation */}
          <View style={styles.weekNav}>
            <TouchableOpacity onPress={goToPrevWeek} style={styles.weekArrow}>
              <Ionicons name="chevron-back" size={22} color={COLORS.gray[700]} />
            </TouchableOpacity>

            <Text style={styles.weekLabel}>{weekLabel()}</Text>

            <TouchableOpacity onPress={goToNextWeek} style={styles.weekArrow}>
              <Ionicons name="chevron-forward" size={22} color={COLORS.gray[700]} />
            </TouchableOpacity>
          </View>

          {/* Today button */}
          {!isCurrentWeek() && (
            <TouchableOpacity onPress={goToCurrentWeek} style={styles.todayButton}>
              <Ionicons name="today-outline" size={16} color={COLORS.primary} />
              <Text style={styles.todayButtonText}>{t('planner.today')}</Text>
            </TouchableOpacity>
          )}

          {/* Saving indicator */}
          {isSaving && (
            <View style={styles.savingBadge}>
              <ActivityIndicator size="small" color={COLORS.primary} />
              <Text style={styles.savingText}>{t('planner.saving')}</Text>
            </View>
          )}
        </View>

        {/* Error banner */}
        {error && (
          <View style={styles.errorBanner}>
            <Ionicons name="alert-circle" size={16} color={COLORS.error} />
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity onPress={() => loadPlan()} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Text style={styles.retryText}>{t('common.retry')}</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Days grid */}
        <View
          style={[
            styles.gridContainer,
            isLargeScreen && styles.gridContainerLarge,
          ]}
        >
          {[0, 1, 2, 3, 4, 5, 6].map((dayOfWeek) => renderDayCard(dayOfWeek))}
        </View>
      </ScrollView>

      {/* Outfit picker modal */}
      {renderPickerModal()}

      {/* Outfit preview modal */}
      <Modal
        visible={previewOutfit !== null}
        transparent
        animationType="slide"
        onRequestClose={() => setPreviewOutfit(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.previewContainer}>
            <View style={styles.previewHeader}>
              <Text style={styles.previewTitle} numberOfLines={1}>
                {previewOutfit?.name}
              </Text>
              <TouchableOpacity onPress={() => setPreviewOutfit(null)}>
                <Ionicons name="close" size={24} color={COLORS.gray[500]} />
              </TouchableOpacity>
            </View>
            {previewOutfit && (
              <ScrollView contentContainerStyle={styles.previewContent}>
                {/* Garments grid */}
                <Text style={styles.previewSectionTitle}>Prendas</Text>
                <View style={styles.previewGarmentsGrid}>
                  {(previewOutfit.garments ?? []).length > 0 ? (
                    previewOutfit.garments.map((g) => (
                      <View key={g.id} style={styles.previewGarmentCard}>
                        <Image
                          source={{ uri: g.imageUrl }}
                          style={styles.previewGarmentImage}
                          resizeMode="contain"
                        />
                        <Text style={styles.previewGarmentName} numberOfLines={1}>
                          {g.name}
                        </Text>
                      </View>
                    ))
                  ) : (
                    <Text style={styles.previewEmptyText}>Sin prendas asignadas</Text>
                  )}
                </View>

                {/* Details */}
                <Text style={styles.previewSectionTitle}>Detalles</Text>
                <View style={styles.previewDetailsList}>
                  {previewOutfit.occasion && (
                    <View style={styles.previewDetailRow}>
                      <Ionicons name="calendar-outline" size={16} color={COLORS.gray[500]} />
                      <Text style={styles.previewDetailText}>{previewOutfit.occasion}</Text>
                    </View>
                  )}
                  {previewOutfit.season && (
                    <View style={styles.previewDetailRow}>
                      <Ionicons name="thermometer-outline" size={16} color={COLORS.gray[500]} />
                      <Text style={styles.previewDetailText}>{previewOutfit.season}</Text>
                    </View>
                  )}
                  {previewOutfit.style && previewOutfit.style.length > 0 && (
                    <View style={styles.previewDetailRow}>
                      <Ionicons name="color-palette-outline" size={16} color={COLORS.gray[500]} />
                      <Text style={styles.previewDetailText}>
                        {(Array.isArray(previewOutfit.style) ? previewOutfit.style : [previewOutfit.style]).join(', ')}
                      </Text>
                    </View>
                  )}
                </View>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F4F5F7',
  },
  scrollView: {
    flex: 1,
  },

  // Header
  header: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray[100],
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.gray[50],
  },
  headerTitle: {
    fontSize: FONT_SIZES.xl,
    fontWeight: '700',
    color: COLORS.gray[900],
  },

  // Week navigation
  weekNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
    gap: 16,
  },
  weekArrow: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.gray[50],
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.gray[200],
  },
  weekLabel: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
    color: COLORS.gray[700],
    minWidth: 200,
    textAlign: 'center',
  },
  todayButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginTop: 12,
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: COLORS.primary + '15',
    gap: 6,
  },
  todayButtonText: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
    color: COLORS.primary,
  },
  savingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    gap: 6,
  },
  savingText: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.gray[500],
  },

  // Error banner
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 20,
    marginTop: 12,
    padding: 12,
    backgroundColor: '#FEF2F2',
    borderRadius: 10,
    gap: 8,
  },
  errorText: {
    flex: 1,
    fontSize: FONT_SIZES.sm,
    color: COLORS.error,
  },
  retryText: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
    color: COLORS.error,
  },

  // Grid
  gridContainer: {
    padding: 20,
    gap: 12,
  },
  gridContainerLarge: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },

  // Day card
  dayCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
    minHeight: 120,
    width: '100%',
  },
  dayHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 6,
    backgroundColor: COLORS.gray[50],
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray[100],
  },
  dayName: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '700',
    color: COLORS.gray[700],
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  dayDate: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
    color: COLORS.gray[400],
  },
  dayContent: {
    padding: 12,
    gap: 8,
  },
  emptyDay: {
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  addOutfitText: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '500',
    color: COLORS.primary,
  },

  // Mini garment grid in day card
  miniGrid: {
    flexDirection: 'row',
    gap: 6,
  },
  miniThumb: {
    width: 48,
    height: 48,
    borderRadius: 8,
    backgroundColor: COLORS.gray[100],
    overflow: 'hidden',
  },
  miniThumbImage: {
    width: '100%',
    height: '100%',
  },
  miniMoreThumb: {
    backgroundColor: COLORS.gray[200],
    alignItems: 'center',
    justifyContent: 'center',
  },
  miniMoreText: {
    fontSize: FONT_SIZES.xs,
    fontWeight: '600',
    color: COLORS.gray[600],
  },
  noGarmentsPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 8,
    backgroundColor: COLORS.gray[100],
    alignItems: 'center',
    justifyContent: 'center',
  },
  outfitName: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
    color: COLORS.gray[800],
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
    minHeight: 300,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray[100],
  },
  modalTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '700',
    color: COLORS.gray[900],
  },
  modalLoading: {
    padding: 40,
    alignItems: 'center',
  },
  modalEmpty: {
    padding: 20,
  },
  clearDayButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    marginHorizontal: 20,
    marginTop: 12,
    borderRadius: 10,
    backgroundColor: '#FEF2F2',
    gap: 8,
  },
  clearDayText: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
    color: COLORS.error,
  },
  outfitList: {
    padding: 16,
    gap: 8,
  },
  outfitItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: COLORS.gray[50],
    borderRadius: 12,
    gap: 12,
  },
  outfitItemPreviews: {
    flexDirection: 'row',
    gap: 4,
  },
  outfitItemThumb: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: COLORS.gray[200],
    overflow: 'hidden',
  },
  outfitItemThumbImage: {
    width: '100%',
    height: '100%',
  },
  outfitItemThumbEmpty: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  outfitItemInfo: {
    flex: 1,
    gap: 2,
  },
  outfitItemName: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
    color: COLORS.gray[800],
  },
  outfitItemOccasion: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.gray[500],
  },
  outfitItemUsed: {
    opacity: 0.65,
  },
  outfitItemUsedLabel: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.warning,
    marginTop: 2,
  },

  // Outfit name row in day card
  outfitNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 4,
  },

  // Preview modal
  previewContainer: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '85%',
    minHeight: 300,
  },
  previewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray[100],
  },
  previewTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '700',
    color: COLORS.gray[900],
    flex: 1,
    marginRight: 12,
  },
  previewContent: {
    padding: 20,
    gap: 20,
  },
  previewSectionTitle: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '700',
    color: COLORS.gray[600],
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  previewGarmentsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  previewGarmentCard: {
    width: 100,
    gap: 6,
  },
  previewGarmentImage: {
    width: 100,
    height: 120,
    borderRadius: 10,
    backgroundColor: COLORS.gray[100],
  },
  previewGarmentName: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.gray[700],
    fontWeight: '500',
    textAlign: 'center',
  },
  previewEmptyText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.gray[400],
    fontStyle: 'italic',
  },
  previewDetailsList: {
    gap: 10,
  },
  previewDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  previewDetailText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.gray[700],
  },
});

export default withScreenErrorBoundary(PlannerScreen);

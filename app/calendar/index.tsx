/**
 * Calendar Screen
 * Calendario mensual de outfits con marcadores, detalle diario y navegación entre meses
 */

import React, { useEffect, useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { CalendarList } from 'react-native-calendars';
import { useCalendar } from '@/hooks/useCalendar';
import { useTranslation } from '@/hooks/useTranslation';
import { COLORS, FONT_SIZES } from '@/lib/constants';
import { EmptyState, Loading, withScreenErrorBoundary } from '@/components';
import { OutfitShareCard } from '@/components/OutfitShareCard';

export default function CalendarScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const {
    entries,
    isLoading,
    error,
    selectedMonth,
    selectedYear,
    loadMonth,
    deleteLog,
    navigateMonth,
    clearError,
  } = useCalendar();

  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  // Load initial month on mount
  useEffect(() => {
    loadMonth(selectedMonth, selectedYear);
  }, []);

  // Build marked dates from entries
  const markedDates = useMemo(() => {
    const marks: Record<string, any> = {};

    entries.forEach((entry) => {
      marks[entry.date] = {
        selected: entry.date === selectedDate,
        selectedColor: entry.date === selectedDate ? COLORS.primary : undefined,
        marked: true,
        dotColor: COLORS.primary,
      };
    });

    // Ensure selected date is visible (with or without dot)
    if (selectedDate) {
      if (marks[selectedDate]) {
        marks[selectedDate] = {
          ...marks[selectedDate],
          selected: true,
          selectedColor: COLORS.primary,
        };
      } else {
        marks[selectedDate] = {
          selected: true,
          selectedColor: '#E5E7EB',
          marked: false,
        };
      }
    }

    return marks;
  }, [entries, selectedDate]);

  // Current selected entry (if any)
  const selectedEntry = useMemo(() => {
    if (!selectedDate) return null;
    return entries.find((e) => e.date === selectedDate) || null;
  }, [entries, selectedDate]);

  // Format month label
  const monthLabel = useMemo(() => {
    const date = new Date(selectedYear, selectedMonth - 1, 1);
    return date.toLocaleDateString('en-US', {
      month: 'long',
      year: 'numeric',
    });
  }, [selectedMonth, selectedYear]);

  // Day press handler
  const handleDayPress = useCallback((day: { dateString: string }) => {
    setSelectedDate(day.dateString);
  }, []);

  // Month change from swipe
  const handleMonthChange = useCallback(
    (monthData: { month: number; year: number }) => {
      loadMonth(monthData.month, monthData.year);
    },
    [loadMonth],
  );

  // Pull-to-refresh
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadMonth(selectedMonth, selectedYear);
    setRefreshing(false);
  }, [loadMonth, selectedMonth, selectedYear]);

  // Delete confirmation
  const handleDelete = useCallback(
    (entry: { id: string; date: string }) => {
      Alert.alert(
        t('calendar.removeConfirm', { date: entry.date }),
        '',
        [
          { text: t('common.cancel'), style: 'cancel' },
          {
            text: t('common.delete'),
            style: 'destructive',
            onPress: async () => {
              const success = await deleteLog(entry.id);
              if (success) {
                setSelectedDate(null);
              }
            },
          },
        ],
      );
    },
    [t, deleteLog],
  );

  // Format date for display
  const formatDate = useCallback((dateStr: string) => {
    const date = new Date(dateStr + 'T00:00:00');
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  }, []);

  // ---- Loading state ----
  if (isLoading && entries.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.headerButton}
          >
            <Ionicons name="chevron-back" size={24} color={COLORS.gray[700]} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{t('calendar.title')}</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.loadingContainer}>
          <Loading message={t('calendar.loadingMonth')} />
        </View>
      </SafeAreaView>
    );
  }

  // ---- Error state ----
  if (error && entries.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.headerButton}
          >
            <Ionicons name="chevron-back" size={24} color={COLORS.gray[700]} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{t('calendar.title')}</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={64} color={COLORS.error} />
          <Text style={styles.errorText}>{error || t('calendar.errorLoad')}</Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={() => loadMonth(selectedMonth, selectedYear)}
          >
            <Text style={styles.retryText}>{t('common.retry')}</Text>
          </TouchableOpacity>
        </View>
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
        <Text style={styles.headerTitle}>{t('calendar.title')}</Text>
        <TouchableOpacity
          onPress={() => router.push('/calendar/log-today')}
          style={styles.headerButton}
        >
          <Ionicons name="add" size={28} color={COLORS.primary} />
        </TouchableOpacity>
      </View>

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
        {/* ===== Month navigation ===== */}
        <View style={styles.monthNav}>
          <TouchableOpacity
            onPress={() => navigateMonth(-1)}
            style={styles.monthArrow}
          >
            <Ionicons name="chevron-back" size={22} color={COLORS.gray[700]} />
          </TouchableOpacity>
          <Text style={styles.monthLabel}>{monthLabel}</Text>
          <TouchableOpacity
            onPress={() => navigateMonth(1)}
            style={styles.monthArrow}
          >
            <Ionicons name="chevron-forward" size={22} color={COLORS.gray[700]} />
          </TouchableOpacity>
        </View>

        {/* ===== Calendar Grid ===== */}
        <CalendarList
          current={`${selectedYear}-${String(selectedMonth).padStart(2, '0')}-01`}
          markedDates={markedDates}
          onDayPress={handleDayPress}
          onMonthChange={handleMonthChange}
          firstDay={1}
          pastScrollRange={12}
          futureScrollRange={12}
          scrollEnabled={true}
          showScrollIndicator={false}
          hideArrows={true}
          theme={{
            backgroundColor: '#FFFFFF',
            calendarBackground: '#FFFFFF',
            todayTextColor: COLORS.primary,
            todayBackgroundColor: COLORS.primary + '18',
            dayTextColor: COLORS.gray[800],
            textDisabledColor: COLORS.gray[300],
            selectedDayBackgroundColor: COLORS.primary,
            selectedDayTextColor: '#FFFFFF',
            arrowColor: COLORS.primary,
            monthTextColor: COLORS.gray[800],
            textMonthFontWeight: '700',
            textMonthFontSize: 16,
            textDayHeaderFontWeight: '600',
            textDayHeaderFontSize: 12,
            textDayHeaderColor: COLORS.gray[500],
            'stylesheet.calendar.header': {
              week: {
                flexDirection: 'row',
                justifyContent: 'space-around',
                paddingVertical: 8,
                borderBottomWidth: 1,
                borderBottomColor: COLORS.gray[100],
              },
            },
            'stylesheet.calendar.main': {
              week: {
                flexDirection: 'row',
                justifyContent: 'space-around',
                paddingVertical: 3,
              },
            },
          }}
          style={styles.calendar}
        />

        {/* Loading overlay while switching months */}
        {isLoading && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="small" color={COLORS.primary} />
          </View>
        )}

        {/* ===== Error banner ===== */}
        {error && (
          <View style={styles.errorBanner}>
            <Ionicons name="alert-circle" size={16} color={COLORS.error} />
            <Text style={styles.errorBannerText}>{error}</Text>
            <TouchableOpacity
              onPress={() => loadMonth(selectedMonth, selectedYear)}
            >
              <Text style={styles.retrySmallText}>{t('common.retry')}</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ===== Empty month state ===== */}
        {!isLoading && entries.length === 0 && !selectedDate && (
          <EmptyState
            icon="calendar-outline"
            title={t('calendar.emptyMonth')}
            message={t('calendar.emptyMonthHint')}
            actionLabel={t('calendar.logOutfit')}
            onAction={() => router.push('/calendar/log-today')}
          />
        )}

        {/* ===== Selected day detail ===== */}
        {selectedDate && (
          <View style={styles.dayDetail}>
            {/* Detail header */}
            <View style={styles.dayDetailHeader}>
              <Ionicons
                name="calendar"
                size={18}
                color={COLORS.gray[600]}
              />
              <Text style={styles.dayDetailTitle}>
                {formatDate(selectedDate)}
              </Text>
              <TouchableOpacity
                onPress={() => setSelectedDate(null)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons name="close" size={22} color={COLORS.gray[500]} />
              </TouchableOpacity>
            </View>

            {selectedEntry ? (
              <View style={styles.dayDetailContent}>
                {/* Outfit card */}
                <View style={styles.shareCardContainer}>
                  <OutfitShareCard
                    outfit={selectedEntry.outfit}
                    garments={selectedEntry.outfit.garments || []}
                  />
                </View>

                {/* Action buttons */}
                <View style={styles.dayActions}>
                  <TouchableOpacity
                    style={styles.viewOutfitButton}
                    onPress={() =>
                      router.push(`/outfits/${selectedEntry.outfit.id}`)
                    }
                  >
                    <Ionicons
                      name="eye-outline"
                      size={20}
                      color={COLORS.white}
                    />
                    <Text style={styles.viewOutfitText}>
                      {t('outfits.detailTitle')}
                    </Text>
                  </TouchableOpacity>

                  {selectedEntry.outfit && (
                    <TouchableOpacity
                      style={styles.removeButton}
                      onPress={() => handleDelete(selectedEntry)}
                    >
                      <Ionicons
                        name="trash-outline"
                        size={20}
                        color={COLORS.error}
                      />
                      <Text style={styles.removeButtonText}>
                        {t('planner.removeOutfit')}
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            ) : (
              /* No outfit for this day */
              <View style={styles.noOutfitDay}>
                <Ionicons
                  name="calendar-outline"
                  size={48}
                  color={COLORS.gray[300]}
                />
                <Text style={styles.noOutfitText}>
                  {t('calendar.noOutfitsForDay')}
                </Text>
                <TouchableOpacity
                  style={styles.logOutfitCta}
                  onPress={() =>
                    router.push(
                      `/calendar/log-today?date=${selectedDate}`,
                    )
                  }
                >
                  <Ionicons
                    name="add-circle-outline"
                    size={20}
                    color={COLORS.white}
                  />
                  <Text style={styles.logOutfitCtaText}>
                    {t('calendar.logOutfit')}
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  scrollView: {
    flex: 1,
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

  // Month navigation
  monthNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    gap: 16,
  },
  monthArrow: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.gray[50],
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.gray[200],
  },
  monthLabel: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
    color: COLORS.gray[700],
    minWidth: 200,
    textAlign: 'center',
  },

  // Calendar
  calendar: {
    marginBottom: 8,
  },
  loadingOverlay: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 20,
    marginVertical: 8,
    padding: 12,
    backgroundColor: '#FEF2F2',
    borderRadius: 10,
    gap: 8,
  },
  errorBannerText: {
    flex: 1,
    fontSize: FONT_SIZES.sm,
    color: COLORS.error,
  },
  retrySmallText: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
    color: COLORS.error,
  },

  // Loading / Error full states
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  errorText: {
    fontSize: FONT_SIZES.md,
    color: COLORS.gray[600],
    textAlign: 'center',
    marginTop: 16,
    marginBottom: 24,
  },
  retryButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryText: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
    color: '#FFFFFF',
  },

  // Day detail section
  dayDetail: {
    marginTop: 8,
    marginHorizontal: 16,
    marginBottom: 32,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.gray[100],
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
    overflow: 'hidden',
  },
  dayDetailHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray[100],
    gap: 8,
  },
  dayDetailTitle: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
    color: COLORS.gray[700],
    flex: 1,
  },
  dayDetailContent: {
    padding: 16,
    gap: 16,
  },
  shareCardContainer: {
    alignItems: 'center',
  },

  // Day action buttons
  dayActions: {
    flexDirection: 'row',
    gap: 12,
  },
  viewOutfitButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: COLORS.primary,
    paddingVertical: 12,
    borderRadius: 10,
  },
  viewOutfitText: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  removeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.error,
  },
  removeButtonText: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
    color: COLORS.error,
  },

  // No outfit day state
  noOutfitDay: {
    alignItems: 'center',
    paddingVertical: 32,
    paddingHorizontal: 24,
    gap: 12,
  },
  noOutfitText: {
    fontSize: FONT_SIZES.md,
    color: COLORS.gray[500],
    textAlign: 'center',
  },
  logOutfitCta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: COLORS.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 10,
  },
  logOutfitCtaText: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});

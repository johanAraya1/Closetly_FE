/**
 * Calendar Screen
 * Calendario mensual de outfits con marcadores de color y navegación directa al outfit
 */

import React, { useEffect, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  RefreshControl,
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
import type { CalendarLogEntry } from '@/types';

// Map common color names to hex values for calendar markers
const COLOR_MAP: Record<string, string> = {
  red: '#DC2626',
  rojo: '#DC2626',
  blue: '#2563EB',
  azul: '#2563EB',
  green: '#16A34A',
  verde: '#16A34A',
  yellow: '#EAB308',
  amarillo: '#EAB308',
  black: '#111827',
  negro: '#111827',
  white: '#FFFFFF',
  blanco: '#FFFFFF',
  gray: '#6B7280',
  gris: '#6B7280',
  grey: '#6B7280',
  brown: '#92400E',
  marrón: '#92400E',
  marron: '#92400E',
  pink: '#EC4899',
  rosa: '#EC4899',
  purple: '#8B5CF6',
  morado: '#8B5CF6',
  orange: '#F97316',
  naranja: '#F97316',
  beige: '#D4A574',
  navy: '#1E3A5F',
  marino: '#1E3A5F',
  teal: '#0D9488',
  mint: '#A7F3D0',
};

function getOutfitColor(entry: CalendarLogEntry): string {
  const garments = entry.outfit?.garments || [];
  if (garments.length === 0) return COLORS.primary;
  const colorText = garments[0].color?.toLowerCase().trim() || '';
  return COLOR_MAP[colorText] || COLORS.primary;
}

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
    navigateMonth,
    clearError,
  } = useCalendar();

  const [refreshing, setRefreshing] = React.useState(false);

  // Load initial month on mount
  useEffect(() => {
    loadMonth(selectedMonth, selectedYear);
  }, []);

  // Build entry map for quick lookup + color map
  const entryByDate = useMemo(() => {
    const map: Record<string, CalendarLogEntry> = {};
    entries.forEach((entry) => {
      map[entry.date] = entry;
    });
    return map;
  }, [entries]);

  // Build marked dates with garment colors
  const markedDates = useMemo(() => {
    const marks: Record<string, any> = {};
    const today = new Date().toISOString().split('T')[0];

    entries.forEach((entry) => {
      const color = getOutfitColor(entry);
      marks[entry.date] = {
        selected: true,
        selectedColor: color,
        marked: true,
        dotColor: color,
      };
    });

    // Ensure today is visually distinct
    if (marks[today]) {
      marks[today] = {
        ...marks[today],
        selected: true,
        selectedColor: marks[today].selectedColor,
      };
    } else {
      marks[today] = {
        selected: true,
        selectedColor: COLORS.primary + '20',
        marked: false,
      };
    }

    return marks;
  }, [entries]);

  // Format month label
  const monthLabel = useMemo(() => {
    const date = new Date(selectedYear, selectedMonth - 1, 1);
    return date.toLocaleDateString('en-US', {
      month: 'long',
      year: 'numeric',
    });
  }, [selectedMonth, selectedYear]);

  // Day press — navigate to outfit detail if logged
  const handleDayPress = useCallback(
    (day: { dateString: string }) => {
      const entry = entryByDate[day.dateString];
      if (entry) {
        router.push(`/outfits/${entry.outfit.id}`);
      }
    },
    [entryByDate, router],
  );

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

      {/* ===== Legend ===== */}
      {entries.length > 0 && (
        <View style={styles.legend}>
          <View style={styles.legendDot} />
          <Text style={styles.legendText}>{t('calendar.tapToViewOutfit')}</Text>
        </View>
      )}

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
        {!isLoading && entries.length === 0 && (
          <EmptyState
            icon="calendar-outline"
            title={t('calendar.emptyMonth')}
            message={t('calendar.emptyMonthHint')}
            actionLabel={t('calendar.logOutfit')}
            onAction={() => router.push('/calendar/log-today')}
          />
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

  // Legend
  legend: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 6,
    marginHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray[100],
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.primary,
  },
  legendText: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.gray[500],
  },
});

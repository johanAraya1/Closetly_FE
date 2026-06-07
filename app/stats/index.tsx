/**
 * Closet Statistics Screen
 * Pantalla de estadísticas del closet con distribución por categorías,
 * temporadas, estilos, marcas, colores y agregados recientes
 */

import React, { useEffect, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from '@/hooks/useTranslation';
import { COLORS, SPACING } from '@/lib/constants';
import { useStatsStore } from '@/store/statsStore';

const BAR_COLORS = [
  '#62D9C7',
  '#6A4BFF',
  '#F59E0B',
  '#EF4444',
  '#10B981',
  '#8B5CF6',
  '#EC4899',
  '#3B82F6',
];

export default function StatsScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { stats, isLoading, error, fetchStats } = useStatsStore();

  useEffect(() => {
    fetchStats();
  }, []);

  const topCategories = useMemo(() => {
    if (!stats?.byCategoryPercentage) return [];
    return Object.entries(stats.byCategoryPercentage)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5);
  }, [stats?.byCategoryPercentage]);

  const topBrands = useMemo(() => {
    if (!stats?.byBrand) return [];
    return Object.entries(stats.byBrand)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5);
  }, [stats?.byBrand]);

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={COLORS.gray[700]} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{t('stats.title')}</Text>
          <View style={styles.headerRight} />
        </View>
        <View style={styles.loadingContainer}>
          {/* Skeleton cards */}
          {Array.from({ length: 4 }).map((_, i) => (
            <View key={i} style={styles.skeletonCard}>
              <View style={styles.skeletonLineWide} />
              <View style={[styles.skeletonLine, { width: '60%' }]} />
            </View>
          ))}
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={COLORS.gray[700]} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{t('stats.title')}</Text>
          <View style={styles.headerRight} />
        </View>
        <View style={styles.centerContainer}>
          <Ionicons name="bar-chart-outline" size={48} color={COLORS.gray[300]} />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity onPress={fetchStats} style={styles.retryButton}>
            <Ionicons name="refresh" size={18} color={COLORS.white} />
            <Text style={styles.retryText}>{t('common.retry')}</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (!stats) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={COLORS.gray[700]} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{t('stats.title')}</Text>
          <View style={styles.headerRight} />
        </View>
        <View style={styles.centerContainer}>
          <Ionicons name="bar-chart-outline" size={48} color={COLORS.gray[300]} />
          <Text style={styles.emptyText}>{t('stats.noData')}</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={COLORS.gray[700]} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('stats.title')}</Text>
        <TouchableOpacity onPress={fetchStats} style={styles.refreshButton}>
          <Ionicons name="refresh" size={20} color={COLORS.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Summary Cards */}
        <View style={styles.summaryRow}>
          <View style={[styles.summaryCard, { backgroundColor: COLORS.primary + '15' }]}>
            <Ionicons name="shirt-outline" size={24} color={COLORS.primary} />
            <Text style={styles.summaryValue}>{stats.totalGarments}</Text>
            <Text style={styles.summaryLabel}>{t('stats.totalGarments')}</Text>
          </View>
          <View style={[styles.summaryCard, { backgroundColor: COLORS.secondary + '15' }]}>
            <Ionicons name="grid-outline" size={24} color={COLORS.secondary} />
            <Text style={styles.summaryValue}>{stats.totalOutfits}</Text>
            <Text style={styles.summaryLabel}>{t('stats.totalOutfits')}</Text>
          </View>
          <View style={[styles.summaryCard, { backgroundColor: '#10B981' + '15' }]}>
            <Ionicons name="globe-outline" size={24} color="#10B981" />
            <Text style={styles.summaryValue}>{stats.publicCount}</Text>
            <Text style={styles.summaryLabel}>{t('stats.publicItems')}</Text>
          </View>
        </View>

        {/* By Category */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('stats.byCategory')}</Text>
          <View style={styles.sectionCard}>
            {topCategories.length > 0 ? (
              topCategories.map(([category, percentage], index) => (
                <View key={category} style={styles.barRow}>
                  <View style={styles.barLabelContainer}>
                    <Text style={styles.barLabel} numberOfLines={1}>
                      {category}
                    </Text>
                    <Text style={styles.barPercentage}>{Math.round(percentage)}%</Text>
                  </View>
                  <View style={styles.barTrack}>
                    <View
                      style={[
                        styles.barFill,
                        {
                          width: `${percentage}%`,
                          backgroundColor: BAR_COLORS[index % BAR_COLORS.length],
                        },
                      ]}
                    />
                  </View>
                </View>
              ))
            ) : (
              <Text style={styles.noDataText}>{t('stats.noData')}</Text>
            )}
          </View>
        </View>

        {/* By Season */}
        {stats.bySeason && Object.keys(stats.bySeason).length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('stats.bySeason')}</Text>
            <View style={styles.sectionCard}>
              <View style={styles.tagContainer}>
                {Object.entries(stats.bySeason).map(([season, count]) => (
                  <View key={season} style={[styles.tag, { backgroundColor: '#F59E0B' + '15' }]}>
                    <Text style={[styles.tagText, { color: '#B45309' }]}>{season}</Text>
                    <View style={[styles.tagCount, { backgroundColor: '#F59E0B' + '25' }]}>
                      <Text style={[styles.tagCountText, { color: '#B45309' }]}>{count}</Text>
                    </View>
                  </View>
                ))}
              </View>
            </View>
          </View>
        )}

        {/* By Style */}
        {stats.byStyle && Object.keys(stats.byStyle).length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('stats.byStyle')}</Text>
            <View style={styles.sectionCard}>
              <View style={styles.tagContainer}>
                {Object.entries(stats.byStyle).map(([style, count]) => (
                  <View key={style} style={[styles.tag, { backgroundColor: COLORS.secondary + '15' }]}>
                    <Text style={[styles.tagText, { color: COLORS.secondary }]}>{style}</Text>
                    <View style={[styles.tagCount, { backgroundColor: COLORS.secondary + '25' }]}>
                      <Text style={[styles.tagCountText, { color: COLORS.secondary }]}>{count}</Text>
                    </View>
                  </View>
                ))}
              </View>
            </View>
          </View>
        )}

        {/* By Brand */}
        {topBrands.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('stats.byBrand')}</Text>
            <View style={styles.sectionCard}>
              {topBrands.map(([brand, count], index) => (
                <View key={brand} style={styles.brandRow}>
                  <View style={styles.brandRank}>
                    <Text style={styles.brandRankText}>{index + 1}</Text>
                  </View>
                  <Text style={styles.brandName} numberOfLines={1}>{brand}</Text>
                  <View style={styles.brandCountBadge}>
                    <Text style={styles.brandCountText}>{count}</Text>
                  </View>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* By Color */}
        {stats.byColor && Object.keys(stats.byColor).length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('stats.byColor')}</Text>
            <View style={styles.sectionCard}>
              <View style={styles.colorContainer}>
                {Object.entries(stats.byColor).map(([color, count]) => (
                  <View key={color} style={styles.colorItem}>
                    <View
                      style={[
                        styles.colorSwatch,
                        { backgroundColor: color.toLowerCase() },
                      ]}
                    />
                    <Text style={styles.colorName} numberOfLines={1}>{color}</Text>
                    <Text style={styles.colorCount}>{count}</Text>
                  </View>
                ))}
              </View>
            </View>
          </View>
        )}

        {/* Recent Additions */}
        {stats.recentAdditions && stats.recentAdditions.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('stats.recentAdditions')}</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.recentScroll}
            >
              {stats.recentAdditions.map((item) => (
                <TouchableOpacity
                  key={item.id}
                  style={styles.recentCard}
                  activeOpacity={0.8}
                  onPress={() => router.push(`/garments/${item.id}`)}
                >
                  <Image
                    source={{ uri: item.imageUrl }}
                    style={styles.recentImage}
                    resizeMode="cover"
                  />
                  <Text style={styles.recentName} numberOfLines={2}>
                    {item.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

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
  refreshButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.gray[200],
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  loadingContainer: {
    flex: 1,
    padding: 16,
    gap: 12,
  },
  skeletonCard: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 20,
    gap: 12,
  },
  skeletonLineWide: {
    height: 16,
    backgroundColor: COLORS.gray[100],
    borderRadius: 8,
    width: '100%',
  },
  skeletonLine: {
    height: 12,
    backgroundColor: COLORS.gray[100],
    borderRadius: 6,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
    gap: 12,
  },
  errorText: {
    fontSize: 15,
    color: COLORS.error,
    textAlign: 'center',
  },
  emptyText: {
    fontSize: 15,
    color: COLORS.gray[500],
    textAlign: 'center',
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: COLORS.primary,
  },
  retryText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.white,
  },

  // Summary Cards
  summaryRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 20,
  },
  summaryCard: {
    flex: 1,
    borderRadius: 14,
    padding: 14,
    alignItems: 'center',
    gap: 6,
  },
  summaryValue: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.gray[900],
  },
  summaryLabel: {
    fontSize: 11,
    fontWeight: '500',
    color: COLORS.gray[600],
    textAlign: 'center',
  },

  // Sections
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.gray[900],
    marginBottom: 10,
  },
  sectionCard: {
    backgroundColor: COLORS.white,
    borderRadius: 14,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  noDataText: {
    fontSize: 14,
    color: COLORS.gray[400],
    textAlign: 'center',
    paddingVertical: 12,
  },

  // Bar Chart
  barRow: {
    marginBottom: 12,
  },
  barLabelContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  barLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: COLORS.gray[700],
    textTransform: 'capitalize',
    flex: 1,
  },
  barPercentage: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.gray[500],
    marginLeft: 8,
  },
  barTrack: {
    height: 8,
    backgroundColor: COLORS.gray[100],
    borderRadius: 4,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: 4,
  },

  // Tags (Season, Style)
  tagContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    gap: 6,
  },
  tagText: {
    fontSize: 13,
    fontWeight: '500',
    textTransform: 'capitalize',
  },
  tagCount: {
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  tagCountText: {
    fontSize: 12,
    fontWeight: '600',
  },

  // Brand list
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray[50],
    gap: 12,
  },
  brandRank: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: COLORS.gray[100],
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandRankText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.gray[500],
  },
  brandName: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.gray[800],
    textTransform: 'capitalize',
  },
  brandCountBadge: {
    backgroundColor: COLORS.primary + '15',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  brandCountText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.primary,
  },

  // Color swatches
  colorContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  colorItem: {
    alignItems: 'center',
    width: 64,
    gap: 4,
  },
  colorSwatch: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: COLORS.gray[200],
  },
  colorName: {
    fontSize: 11,
    fontWeight: '500',
    color: COLORS.gray[600],
    textTransform: 'capitalize',
    textAlign: 'center',
  },
  colorCount: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.gray[800],
  },

  // Recent additions
  recentScroll: {
    gap: 10,
    paddingRight: 16,
  },
  recentCard: {
    width: 100,
    backgroundColor: COLORS.white,
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  recentImage: {
    width: '100%',
    height: 100,
    backgroundColor: COLORS.gray[100],
  },
  recentName: {
    fontSize: 12,
    fontWeight: '500',
    color: COLORS.gray[800],
    padding: 8,
    textAlign: 'center',
    lineHeight: 16,
  },
});

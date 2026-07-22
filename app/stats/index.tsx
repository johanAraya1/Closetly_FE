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

/**
 * Mapa de nombres de colores comunes en español e inglés → hex.
 * Si el nombre no está en el mapa, se intenta usar como CSS named color
 * y como fallback se devuelve un gris.
 */
const COLOR_HEX_MAP: Record<string, string> = {
  // Básicos
  'black': '#000000',
  'white': '#FFFFFF',
  'gray': '#9CA3AF',
  'grey': '#9CA3AF',
  'beige': '#F5F5DC',
  'cream': '#FFFDD0',
  'ivory': '#FFFFF0',
  // Rojos
  'red': '#EF4444',
  'rojo': '#EF4444',
  'burgundy': '#800020',
  'burdeos': '#800020',
  'wine': '#722F37',
  'vino': '#722F37',
  'maroon': '#800000',
  'carmesi': '#960018',
  'scarlet': '#FF2400',
  'escarlata': '#FF2400',
  'cherry': '#DE3163',
  'cereza': '#DE3163',
  'ruby': '#E0115F',
  // Rosas
  'pink': '#EC4899',
  'rosa': '#EC4899',
  'rose': '#FBBF24',
  'fuchsia': '#FF00FF',
  'magenta': '#FF00FF',
  'salmon': '#FA8072',
  'salmon': '#FA8072',
  'blush': '#DE5D83',
  // Naranjas
  'orange': '#F97316',
  'naranja': '#F97316',
  'peach': '#FFE5B4',
  'durazno': '#FFE5B4',
  'coral': '#FF7F50',
  'apricot': '#FBCEB1',
  'apricot': '#FBCEB1',
  // Amarillos
  'yellow': '#EAB308',
  'amarillo': '#EAB308',
  'gold': '#FFD700',
  'dorado': '#FFD700',
  'mustard': '#FFDB58',
  'mostaza': '#FFDB58',
  'lemon': '#FFF44F',
  'limon': '#FFF44F',
  // Verdes
  'green': '#22C55E',
  'verde': '#22C55E',
  'olive': '#808000',
  'oliva': '#808000',
  'army': '#4B5320',
  'ejercito': '#4B5320',
  'military': '#4B5320',
  'militar': '#4B5320',
  'sage': '#BCB88A',
  'mint': '#98FF98',
  'menta': '#98FF98',
  'emerald': '#50C878',
  'esmeralda': '#50C878',
  'forest': '#228B22',
  'bosque': '#228B22',
  'lime': '#32CD32',
  'turquoise': '#40E0D0',
  'turquesa': '#40E0D0',
  'teal': '#008080',
  'aguamarina': '#7FFFD4',
  'aqua': '#00FFFF',
  // Azules
  'blue': '#3B82F6',
  'azul': '#3B82F6',
  'navy': '#000080',
  'marino': '#000080',
  'royal': '#4169E1',
  'real': '#4169E1',
  'sky': '#87CEEB',
  'celeste': '#87CEEB',
  'baby blue': '#89CFF0',
  'azul claro': '#89CFF0',
  'light blue': '#ADD8E6',
  'cobalt': '#0047AB',
  'cobalto': '#0047AB',
  'denim': '#1560BD',
  'azul marino': '#000080',
  'midnight': '#191970',
  'midnight blue': '#191970',
  'powder blue': '#B0E0E6',
  'steel blue': '#4682B4',
  'acero': '#4682B4',
  // Morados
  'purple': '#8B5CF6',
  'morado': '#8B5CF6',
  'violet': '#8B5CF6',
  'violeta': '#8B5CF6',
  'lavender': '#E6E6FA',
  'lavanda': '#E6E6FA',
  'lilac': '#C8A2C8',
  'lila': '#C8A2C8',
  'plum': '#8E4585',
  'ciruela': '#8E4585',
  'mauve': '#E0B0FF',
  // Marrones
  'brown': '#92400E',
  'marron': '#92400E',
  'marrón': '#92400E',
  'chocolate': '#7B3F00',
  'cacao': '#7B3F00',
  'camel': '#C19A6B',
  'café': '#6F4E37',
  'coffee': '#6F4E37',
  'tan': '#D2B48C',
  'caramelo': '#FFD59A',
  'caramel': '#FFD59A',
  'taupe': '#483C32',
  'sand': '#C2B280',
  'arena': '#C2B280',
  'khaki': '#C3B091',
  'caqui': '#C3B091',
  'honey': '#EB9605',
  'miel': '#EB9605',
  'copper': '#B87333',
  'cobre': '#B87333',
  'bronze': '#CD7F32',
  'bronce': '#CD7F32',
  // Neutros
  'charcoal': '#36454F',
  'carbón': '#36454F',
  'carbon': '#36454F',
  'slate': '#708090',
  'pizarra': '#708090',
  'ash': '#B2BEB5',
  'ceniza': '#B2BEB5',
  'taupe': '#483C32',
  'stone': '#928E85',
  'piedra': '#928E85',
  'pebble': '#BDB9B0',
  'mushroom': '#C4AE85',
  'champagne': '#F7E7CE',
  'champaña': '#F7E7CE',
  // Metalizados
  'silver': '#C0C0C0',
  'plateado': '#C0C0C0',
  'plata': '#C0C0C0',
  'gold': '#FFD700',
  'dorado': '#FFD700',
  'bronze': '#CD7F32',
  'bronce': '#CD7F32',
  // Otros comunes
  'teal': '#008080',
  'coral': '#FF7F50',
  'khaki': '#C3B091',
  'mauve': '#E0B0FF',
  'rust': '#B7410E',
  'óxido': '#B7410E',
  'oxido': '#B7410E',
  'terracotta': '#E2725B',
  'terracota': '#E2725B',
  'nude': '#E3BC9A',
  'desnudo': '#E3BC9A',
  'nude': '#E3BC9A',
  'camel': '#C19A6B',
  'camel': '#C19A6B',
};

function resolveColorHex(colorName: string): string {
  const lower = colorName.toLowerCase().trim();
  if (COLOR_HEX_MAP[lower]) return COLOR_HEX_MAP[lower];
  // Si es un hex válido, devolverlo tal cual
  if (/^#[0-9A-Fa-f]{3,8}$/.test(lower)) return lower;
  // Fallback: gris neutro
  return '#D1D5DB';
}

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
                        { backgroundColor: resolveColorHex(color) },
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

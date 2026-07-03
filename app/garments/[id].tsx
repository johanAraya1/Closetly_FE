/**
 * Garment Detail Screen
 * Pantalla a pantalla completa con todos los datos de la prenda
 * y opción de editar.
 */

import React, { useMemo, useState, useRef, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  Image,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Modal,
  StatusBar,
  Platform,
  FlatList,
  ActivityIndicator,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Loading, withScreenErrorBoundary } from '@/components';
import { useGarments } from '@/hooks/useGarments';
import { useTranslation } from '@/hooks/useTranslation';
import { GARMENT_CATEGORIES, SEASONS, GARMENT_STYLES, COLORS } from '@/lib/constants';
import { formatEnumValue, getColorFromName, getColorHexArray } from '@/utils/format';
import { getGarmentStats } from '@/services/statsService';
import type { GarmentStats } from '@/services/statsService';

const SCREEN_WIDTH = Dimensions.get('window').width;

function GarmentDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useTranslation();
  const { getGarmentById } = useGarments();
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const carouselRef = useRef<FlatList>(null);
  const isMobile = Platform.OS !== 'web';
  const [stats, setStats] = useState<GarmentStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);

  const garment = useMemo(() => {
    if (!id) return null;
    return getGarmentById(id);
  }, [id, getGarmentById]);

  // Load stats
  useEffect(() => {
    if (!id) return;
    setStatsLoading(true);
    getGarmentStats(id)
      .then(setStats)
      .catch(() => setStats(null))
      .finally(() => setStatsLoading(false));
  }, [id]);

  if (!garment) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#111827" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{t('garments.detail.title')}</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.centerContent}>
          <Ionicons name="shirt-outline" size={64} color="#D1D5DB" />
          <Text style={styles.notFoundText}>{t('garments.detail.notFound')}</Text>
        </View>
      </SafeAreaView>
    );
  }

  const imageUrl = (garment as any).image_url || garment.imageUrl || '';
  const images = (garment as any).imageUrls?.length
    ? (garment as any).imageUrls
    : (garment as any).image_urls?.length
    ? (garment as any).image_urls
    : [imageUrl].filter(Boolean);
  const isPublic = (garment as any).is_public ?? garment.isPublic ?? false;
  const seasonValue = Array.isArray(garment.season)
    ? garment.season[0]
    : garment.season || 'all_season';
  const seasonLabel = SEASONS.find(s => s.value === seasonValue)?.label || formatEnumValue(seasonValue);
  const styleLabel = garment.style
    ? (Array.isArray(garment.style)
        ? garment.style.map(s => GARMENT_STYLES.find(st => st.value === s)?.label || formatEnumValue(s)).join(', ')
        : GARMENT_STYLES.find(s => s.value === garment.style)?.label || formatEnumValue(garment.style))
    : null;
  const categoryLabel = GARMENT_CATEGORIES.find(c => c.value === garment.category)?.label || formatEnumValue(garment.category);

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {garment.name}
        </Text>
        <TouchableOpacity
          onPress={() => router.push(`/garments/create?id=${id}`)}
          style={styles.editButton}
        >
          <Ionicons name="pencil" size={20} color={COLORS.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Image Carousel — tap to expand on mobile */}
        <View style={styles.carouselContainer}>
          <FlatList
            ref={carouselRef}
            data={images}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            keyExtractor={(_: string, i: number) => String(i)}
            onMomentumScrollEnd={(e) => {
              const index = Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH);
              setCurrentImageIndex(index);
            }}
            renderItem={({ item }) => (
              <TouchableOpacity
                activeOpacity={isMobile ? 0.8 : 1}
                onPress={() => isMobile && setIsFullscreen(true)}
                disabled={!isMobile}
                style={styles.carouselItem}
              >
                <Image
                  source={{ uri: item }}
                  style={styles.carouselImage}
                  resizeMode="contain"
                />
              </TouchableOpacity>
            )}
            ListEmptyComponent={
              <View style={styles.carouselItem}>
                <View style={styles.imagePlaceholder}>
                  <Ionicons name="shirt-outline" size={64} color="#D1D5DB" />
                </View>
              </View>
            }
          />
          {/* Dots indicator */}
          {images.length > 1 && (
            <View style={styles.dotsContainer}>
              {(images as string[]).map((_: string, i: number) => (
                <View
                  key={i}
                  style={[
                    styles.dot,
                    i === currentImageIndex ? styles.dotActive : styles.dotInactive,
                  ]}
                />
              ))}
            </View>
          )}
        </View>

        {/* Info Card */}
        <View style={styles.infoCard}>
          {/* Name */}
          <Text style={styles.garmentName}>{garment.name}</Text>

          {/* Public/Private badge */}
          <View style={styles.badgeRow}>
            <View style={[styles.badge, isPublic ? styles.badgePublic : styles.badgePrivate]}>
              <Ionicons
                name={isPublic ? 'globe-outline' : 'lock-closed-outline'}
                size={12}
                color={isPublic ? '#059669' : '#9CA3AF'}
              />
              <Text style={[styles.badgeText, isPublic ? styles.badgePublicText : styles.badgePrivateText]}>
                {isPublic ? t('garments.detail.public') : t('garments.detail.private')}
              </Text>
            </View>
          </View>

          {/* Detail rows */}
          <View style={styles.detailsSection}>
            <DetailRow
              icon="grid-outline"
              label={t('garments.create.category')}
              value={categoryLabel}
            />
            {garment.brand && (
              <DetailRow
                icon="pricetag-outline"
                label={t('garments.create.brand')}
                value={garment.brand}
              />
            )}
            {garment.color && (
              <DetailRow
                icon="color-palette-outline"
                label={t('garments.create.color')}
                value={garment.color}
                colorDots={getColorHexArray(garment.color)}
              />
            )}
            <DetailRow
              icon="calendar-outline"
              label={t('garments.create.season')}
              value={seasonLabel}
            />
            {styleLabel && (
              <DetailRow
                icon="sparkles-outline"
                label={t('garments.create.style')}
                value={styleLabel}
              />
            )}
          </View>

          {/* Stats Section */}
          <View style={styles.statsSection}>
            <Text style={styles.statsSectionTitle}>{t('stats.title')}</Text>
            {statsLoading ? (
              <ActivityIndicator size="small" color={COLORS.primary} />
            ) : stats ? (
              <View style={styles.statsGrid}>
                <View style={styles.statCard}>
                  <Text style={styles.statValue}>{stats.totalOutfits}</Text>
                  <Text style={styles.statLabel}>
                    {t('garments.detail.inNOutfits', { count: stats.totalOutfits })}
                  </Text>
                </View>
                <View style={styles.statCard}>
                  <Text style={styles.statValue}>{stats.totalTimesUsed}</Text>
                  <Text style={styles.statLabel}>{t('garments.detail.timesUsed')}</Text>
                </View>
                {stats.totalTimesUsed > 0 && (
                  <>
                    <View style={styles.statCard}>
                      <Text style={styles.statValue}>{stats.timesUsedLast7Days}</Text>
                      <Text style={styles.statLabel}>{t('garments.detail.timesUsedLast7Days')}</Text>
                    </View>
                    <View style={styles.statCard}>
                      <Text style={styles.statValue}>{stats.timesUsedLast15Days}</Text>
                      <Text style={styles.statLabel}>{t('garments.detail.timesUsedLast15Days')}</Text>
                    </View>
                    <View style={styles.statCard}>
                      <Text style={styles.statValue}>{stats.timesUsedLast30Days}</Text>
                      <Text style={styles.statLabel}>{t('garments.detail.timesUsedLast30Days')}</Text>
                    </View>
                  </>
                )}
              </View>
            ) : null}
          </View>

          {/* Notes */}
          {garment.notes && (
            <View style={styles.notesSection}>
              <Text style={styles.notesLabel}>{t('garments.create.notes')}</Text>
              <Text style={styles.notesText}>{garment.notes}</Text>
            </View>
          )}
        </View>

        {/* Edit Button */}
        <TouchableOpacity
          style={styles.editActionButton}
          onPress={() => router.push(`/garments/create?id=${id}`)}
        >
          <Ionicons name="pencil" size={20} color="#FFFFFF" />
          <Text style={styles.editActionText}>{t('garments.detail.editGarment')}</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Fullscreen Image Modal (mobile only) */}
      {isMobile && (
        <Modal
          visible={isFullscreen}
          transparent
          animationType="fade"
          statusBarTranslucent
          onRequestClose={() => setIsFullscreen(false)}
        >
          <StatusBar barStyle="light-content" backgroundColor="#000000" />
          <View style={styles.fullscreenBackdrop}>
            <TouchableOpacity
              style={styles.fullscreenClose}
              onPress={() => setIsFullscreen(false)}
              hitSlop={{ top: 16, bottom: 16, left: 16, right: 16 }}
            >
              <Ionicons name="close" size={32} color="#FFFFFF" />
            </TouchableOpacity>

            {images.length > 0 && (
              <FlatList
                data={images}
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                initialScrollIndex={currentImageIndex}
                getItemLayout={(_, index) => ({
                  length: Dimensions.get('window').width,
                  offset: Dimensions.get('window').width * index,
                  index,
                })}
                onMomentumScrollEnd={(e) => {
                  const index = Math.round(e.nativeEvent.contentOffset.x / Dimensions.get('window').width);
                  setCurrentImageIndex(index);
                }}
                renderItem={({ item }) => (
                  <Image
                    source={{ uri: item }}
                    style={styles.fullscreenImage}
                    resizeMode="contain"
                  />
                )}
              />
            )}

            {/* Dots on fullscreen too */}
            {images.length > 1 && (
              <View style={styles.fullscreenDots}>
                {(images as string[]).map((_: string, i: number) => (
                  <View
                    key={i}
                    style={[
                      styles.fullscreenDot,
                      i === currentImageIndex ? styles.fullscreenDotActive : styles.fullscreenDotInactive,
                    ]}
                  />
                ))}
              </View>
            )}
          </View>
        </Modal>
      )}
    </SafeAreaView>
  );
}

function DetailRow({
  icon,
  label,
  value,
  colorDot,
  colorDots,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  colorDot?: string;
  colorDots?: string[];
}) {
  const dots = colorDots ?? (colorDot ? [colorDot] : []);

  return (
    <View style={styles.detailRow}>
      <View style={styles.detailLabelRow}>
        <Ionicons name={icon} size={16} color="#6B7280" style={styles.detailIcon} />
        <Text style={styles.detailLabel}>{label}</Text>
      </View>
      <View style={styles.detailValueRow}>
        {dots.length > 0 && (
          <View style={styles.colorDotsRow}>
            {dots.map((dot, i) => (
              <View
                key={`${dot}-${i}`}
                style={[
                  styles.colorDot,
                  {
                    backgroundColor: dot,
                    borderColor: dot === '#FFFFFF' ? '#E5E7EB' : 'transparent',
                  },
                ]}
              />
            ))}
          </View>
        )}
        <Text style={styles.detailValue}>{value}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    textAlign: 'center',
  },
  editButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 32,
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  notFoundText: {
    fontSize: 16,
    color: '#9CA3AF',
  },
  carouselContainer: {
    width: SCREEN_WIDTH,
    height: SCREEN_WIDTH,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  carouselItem: {
    width: SCREEN_WIDTH,
    height: SCREEN_WIDTH,
    justifyContent: 'center',
    alignItems: 'center',
  },
  carouselImage: {
    width: '100%',
    height: '100%',
  },
  dotsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'absolute',
    bottom: 12,
    left: 0,
    right: 0,
    gap: 6,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  dotActive: {
    backgroundColor: COLORS.primary,
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  dotInactive: {
    backgroundColor: '#D1D5DB',
  },
  imagePlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
  },
  infoCard: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  garmentName: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 12,
  },
  badgeRow: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  badgePublic: {
    backgroundColor: '#D1FAE5',
  },
  badgePrivate: {
    backgroundColor: '#F3F4F6',
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '500',
  },
  badgePublicText: {
    color: '#059669',
  },
  badgePrivateText: {
    color: '#6B7280',
  },
  detailsSection: {
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    paddingTop: 12,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F9FAFB',
  },
  detailLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  detailIcon: {
    width: 20,
  },
  detailLabel: {
    fontSize: 14,
    color: '#6B7280',
  },
  detailValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  colorDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 1,
  },
  colorDotsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#111827',
    textAlign: 'right',
  },
  notesSection: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  notesLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  notesText: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
  },
  editActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    marginHorizontal: 16,
    marginTop: 20,
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  editActionText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },

  // Stats Section
  statsSection: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  statsSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 12,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  statCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#F9FAFB',
    borderRadius: 10,
    padding: 14,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  statLabel: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 4,
    textAlign: 'center',
  },

  // Fullscreen image
  fullscreenBackdrop: {
    flex: 1,
    backgroundColor: '#000000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullscreenClose: {
    position: 'absolute',
    top: 50,
    right: 20,
    zIndex: 10,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullscreenImage: {
    width: Dimensions.get('window').width,
    height: Dimensions.get('window').height,
  },
  fullscreenDots: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'absolute',
    bottom: 40,
    left: 0,
    right: 0,
    gap: 8,
  },
  fullscreenDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  fullscreenDotActive: {
    backgroundColor: '#FFFFFF',
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  fullscreenDotInactive: {
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
  },
});

export default withScreenErrorBoundary(GarmentDetailScreen);

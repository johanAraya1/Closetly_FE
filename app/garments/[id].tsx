/**
 * Garment Detail Screen
 * Pantalla a pantalla completa con todos los datos de la prenda
 * y opción de editar.
 */

import React, { useMemo } from 'react';
import {
  View,
  Text,
  Image,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Loading, withScreenErrorBoundary } from '@/components';
import { useGarments } from '@/hooks/useGarments';
import { useTranslation } from '@/hooks/useTranslation';
import { GARMENT_CATEGORIES, SEASONS, GARMENT_STYLES, COLORS } from '@/lib/constants';
import { formatEnumValue, getColorFromName } from '@/utils/format';

const SCREEN_WIDTH = Dimensions.get('window').width;

function GarmentDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useTranslation();
  const { getGarmentById } = useGarments();

  const garment = useMemo(() => {
    if (!id) return null;
    return getGarmentById(id);
  }, [id, getGarmentById]);

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
  const isPublic = (garment as any).is_public ?? garment.isPublic ?? false;
  const seasonValue = Array.isArray(garment.season)
    ? garment.season[0]
    : garment.season || 'all_season';
  const seasonLabel = SEASONS.find(s => s.value === seasonValue)?.label || formatEnumValue(seasonValue);
  const styleLabel = garment.style
    ? GARMENT_STYLES.find(s => s.value === garment.style)?.label || formatEnumValue(garment.style)
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
        {/* Full-width Image */}
        <View style={styles.imageContainer}>
          {imageUrl ? (
            <Image
              source={{ uri: imageUrl }}
              style={styles.image}
              resizeMode="contain"
            />
          ) : (
            <View style={styles.imagePlaceholder}>
              <Ionicons name="shirt-outline" size={64} color="#D1D5DB" />
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
                colorDot={getColorFromName(garment.color)}
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
    </SafeAreaView>
  );
}

function DetailRow({
  icon,
  label,
  value,
  colorDot,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  colorDot?: string;
}) {
  return (
    <View style={styles.detailRow}>
      <View style={styles.detailLabelRow}>
        <Ionicons name={icon} size={16} color="#6B7280" style={styles.detailIcon} />
        <Text style={styles.detailLabel}>{label}</Text>
      </View>
      <View style={styles.detailValueRow}>
        {colorDot && (
          <View
            style={[
              styles.colorDot,
              {
                backgroundColor: colorDot,
                borderColor: colorDot === '#FFFFFF' ? '#E5E7EB' : 'transparent',
              },
            ]}
          />
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
  imageContainer: {
    width: SCREEN_WIDTH,
    height: SCREEN_WIDTH,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  image: {
    width: '100%',
    height: '100%',
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
});

export default withScreenErrorBoundary(GarmentDetailScreen);

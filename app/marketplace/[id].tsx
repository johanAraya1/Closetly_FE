/**
 * Marketplace Garment Detail Screen
 * Muestra la información completa de una prenda pública del marketplace
 */

import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Image, RefreshControl, ActivityIndicator } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { ListingTypeBadge, Loading, EmptyState, withScreenErrorBoundary } from '@/components';
import { apiClient } from '@/utils/apiClient';
import { useMarketplaceStore } from '@/store/marketplaceStore';
import { useTranslation } from '@/hooks/useTranslation';
import { COLORS, GARMENT_CATEGORIES, SEASONS, GARMENT_STYLES } from '@/lib/constants';
import type { Garment, PublicProfileResult } from '@/types';

function MarketplaceGarmentDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useTranslation();
  const { garments, isLoading, loadPublicGarments } = useMarketplaceStore();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [notFound, setNotFound] = useState(false);

  // Profile state
  const [profile, setProfile] = useState<PublicProfileResult | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);

  const fetchPublicProfile = useCallback(async (userId: string) => {
    setProfileLoading(true);
    try {
      const res = await apiClient.get<PublicProfileResult>('/users/public/' + userId, { requiresAuth: false });
      if (res.data) {
        setProfile(res.data);
      }
    } catch {
      // Silently fail — fallback shows generic label
    } finally {
      setProfileLoading(false);
    }
  }, []);

  const garment = garments.find((g) => g.id === id);

  useEffect(() => {
    if (!garment && garments.length === 0 && !isLoading) {
      loadPublicGarments();
    }
    if (!garment && garments.length > 0 && !isLoading) {
      setNotFound(true);
    }
  }, [id, garment, garments.length, isLoading]);

  useEffect(() => {
    if (garment) {
      fetchPublicProfile(garment.userId);
    }
  }, [garment, fetchPublicProfile]);

  const onRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await loadPublicGarments();
    setIsRefreshing(false);
  }, [loadPublicGarments]);

  const getCategoryLabel = (category: string): string => {
    const cat = GARMENT_CATEGORIES.find((c) => c.value === category);
    return cat?.label ?? category;
  };

  const getSeasonLabel = (season: string): string => {
    const s = SEASONS.find((s) => s.value === season);
    return s?.label ?? season;
  };

  const getStyleLabel = (style: string): string => {
    const s = GARMENT_STYLES.find((s) => s.value === style);
    return s?.label ?? style;
  };

  const formatSeason = (season: Garment['season']): string => {
    if (!season) return '-';
    if (Array.isArray(season)) {
      return season.map((s) => getSeasonLabel(s)).join(', ');
    }
    return getSeasonLabel(season);
  };

  // Loading state while initial data is being fetched
  if (isLoading && garments.length === 0) {
    return <Loading message={t('common.loading')} />;
  }

  // Not found state — garment with this ID doesn't exist in the marketplace
  if (notFound || (!garment && garments.length > 0)) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#111827" />
          </TouchableOpacity>
        </View>
        <EmptyState
          icon="alert-circle-outline"
          title="Prenda no encontrada"
          message="Esta prenda no está disponible en el marketplace o fue eliminada."
          actionLabel="Volver al Marketplace"
          onAction={() => router.back()}
        />
      </SafeAreaView>
    );
  }

  if (!garment) {
    return <Loading message={t('common.loading')} />;
  }

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
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={onRefresh}
            colors={[COLORS.primary]}
            tintColor={COLORS.primary}
          />
        }
      >
        {/* Garment Image */}
        <View style={styles.imageContainer}>
          {(garment as any).image_url ? (
            <Image
              source={{ uri: (garment as any).image_url }}
              style={styles.image}
              resizeMode="cover"
            />
          ) : (
            <View style={styles.imagePlaceholder}>
              <Ionicons name="shirt-outline" size={64} color={COLORS.gray[300]} />
            </View>
          )}
          {garment.listingType && (
            <View style={styles.badgeOverlay}>
              <ListingTypeBadge type={garment.listingType} />
            </View>
          )}
        </View>

        {/* Garment Info Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Información de la prenda</Text>

          <View style={styles.infoGrid}>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Categoría</Text>
              <Text style={styles.infoValue}>{getCategoryLabel(garment.category)}</Text>
            </View>

            {garment.brand && (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Marca</Text>
                <Text style={styles.infoValue}>{garment.brand}</Text>
              </View>
            )}

            {garment.color && (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Color</Text>
                <Text style={styles.infoValue}>{garment.color}</Text>
              </View>
            )}

            {garment.size && (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Talle</Text>
                <Text style={styles.infoValue}>{garment.size}</Text>
              </View>
            )}

            {garment.season && (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Temporada</Text>
                <Text style={styles.infoValue}>{formatSeason(garment.season)}</Text>
              </View>
            )}

            {garment.style && (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Estilo</Text>
                <Text style={styles.infoValue}>{getStyleLabel(garment.style)}</Text>
              </View>
            )}
          </View>

          {garment.notes && (
            <View style={styles.notesContainer}>
              <Text style={styles.infoLabel}>Notas</Text>
              <Text style={styles.notesText}>{garment.notes}</Text>
            </View>
          )}
        </View>

        {/* User Info Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Publicado por</Text>

          <View style={styles.userCard}>
            <View style={styles.userRow}>
              {profileLoading ? (
                <ActivityIndicator size="small" color={COLORS.primary} />
              ) : profile?.avatarUrl ? (
                <Image source={{ uri: profile.avatarUrl }} style={styles.userAvatar} />
              ) : (
                <Ionicons name="person-circle-outline" size={40} color={COLORS.gray[400]} />
              )}
              <View style={styles.userInfo}>
                {profile ? (
                  <>
                    <Text style={styles.userIdLabel}>
                      @{profile.username || `usuario_${garment.userId.slice(0, 8)}`}
                    </Text>
                    {profile.fullName && (
                      <Text style={styles.userFullName}>{profile.fullName}</Text>
                    )}
                  </>
                ) : (
                  <>
                    <Text style={styles.userIdLabel}>
                      @usuario_{garment.userId.slice(0, 8)}
                    </Text>
                    <Text style={styles.userIdHint}>
                      ID: {garment.userId.slice(0, 12)}...
                    </Text>
                  </>
                )}
              </View>
            </View>

            <TouchableOpacity
              style={styles.profileButton}
              activeOpacity={0.7}
              onPress={() => (router as any).push('/users/' + garment.userId)}
            >
              <Ionicons name="person-outline" size={16} color={COLORS.gray[600]} />
              <Text style={styles.profileButtonText}>Ver perfil</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
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
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backButton: {
    padding: 8,
    marginRight: 8,
  },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  headerSpacer: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 32,
  },
  imageContainer: {
    width: '100%',
    aspectRatio: 1,
    backgroundColor: '#F9FAFB',
    position: 'relative',
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
    backgroundColor: '#F3F4F6',
  },
  badgeOverlay: {
    position: 'absolute',
    top: 12,
    left: 12,
    zIndex: 1,
  },
  section: {
    backgroundColor: '#FFFFFF',
    marginTop: 8,
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 16,
  },
  infoGrid: {
    gap: 12,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  infoLabel: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  infoValue: {
    fontSize: 14,
    color: '#111827',
    fontWeight: '600',
    textAlign: 'right',
    flex: 1,
    marginLeft: 16,
  },
  notesContainer: {
    marginTop: 16,
    padding: 16,
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
  },
  notesText: {
    fontSize: 14,
    color: '#374151',
    marginTop: 8,
    lineHeight: 20,
  },
  userCard: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 16,
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  userInfo: {
    flex: 1,
  },
  userIdLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
  },
  userIdHint: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 2,
  },
  userAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
  },
  userFullName: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 2,
  },
  profileButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 16,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
  },
  profileButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
});

export default withScreenErrorBoundary(MarketplaceGarmentDetailScreen);

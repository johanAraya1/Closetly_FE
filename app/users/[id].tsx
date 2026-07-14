/**
 * Public Profile Screen
 * Muestra el perfil público de un usuario del marketplace
 * Solo accesible para usuarios con is_public = true
 */

import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { Image } from 'expo-image';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { ListingTypeBadge, EmptyState, Loading, withScreenErrorBoundary } from '@/components';
import { apiClient } from '@/utils/apiClient';
import { useTranslation } from '@/hooks/useTranslation';
import { COLORS } from '@/lib/constants';
import { formatDate } from '@/utils/format';
import type { PublicProfileResult, Garment } from '@/types';

function PublicProfileScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useTranslation();

  const [profile, setProfile] = useState<PublicProfileResult | null>(null);
  const [garments, setGarments] = useState<Garment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchProfileData();
  }, [id]);

  const fetchProfileData = async () => {
    if (!id) return;

    setLoading(true);
    setError(null);

    try {
      const [profileRes, garmentsRes] = await Promise.all([
        apiClient.get<PublicProfileResult>('/users/public/' + id, { requiresAuth: false }),
        apiClient.get<Garment[]>('/garments/public/' + id, { requiresAuth: false }),
      ]);

      if (profileRes.error) {
        setError(profileRes.error);
        return;
      }

      if (profileRes.data) {
        setProfile(profileRes.data);
      }

      // Handle garments: response may be flat array or wrapped
      if (garmentsRes.data) {
        if (Array.isArray(garmentsRes.data)) {
          setGarments(garmentsRes.data);
        } else if ((garmentsRes.data as any).data && Array.isArray((garmentsRes.data as any).data)) {
          setGarments((garmentsRes.data as any).data);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar perfil');
    } finally {
      setLoading(false);
    }
  };

  // Full-screen loading
  if (loading) {
    return <Loading message={t('common.loading')} />;
  }

  // Error / not found state
  if (error || !profile) {
    const isNotFound =
      error?.toLowerCase().includes('not found') ||
      error?.toLowerCase().includes('404') ||
      error?.toLowerCase().includes('no encontrado');

    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#111827" />
          </TouchableOpacity>
          <Text style={styles.headerTitle} numberOfLines={1}>
            Perfil público
          </Text>
          <View style={styles.headerSpacer} />
        </View>
        <EmptyState
          icon="person-outline"
          title={isNotFound ? 'Usuario no encontrado' : 'Error'}
          message={
            isNotFound
              ? 'Este usuario no tiene un perfil público o fue eliminado.'
              : error || 'No se pudo cargar el perfil.'
          }
          actionLabel="Volver"
          onAction={() => router.back()}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          Perfil público
        </Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Profile Info Card */}
        <View style={styles.profileCard}>
          {profile.avatarUrl ? (
            <Image
              source={{ uri: profile.avatarUrl }}
              style={styles.avatar}
              contentFit="cover"
              cachePolicy="memory-disk"
            />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Ionicons name="person" size={48} color={COLORS.gray[300]} />
            </View>
          )}

          <Text style={styles.username}>
            @{profile.username || 'desconocido'}
          </Text>

          {profile.fullName && (
            <Text style={styles.fullName}>{profile.fullName}</Text>
          )}

          {profile.bio && (
            <Text style={styles.bio}>{profile.bio}</Text>
          )}

          <View style={styles.memberSinceRow}>
            <Ionicons name="calendar-outline" size={16} color={COLORS.gray[400]} />
            <Text style={styles.memberSinceText}>
              Miembro desde {formatDate(profile.createdAt)}
            </Text>
          </View>
        </View>

        {/* Public Garments Section */}
        <View style={styles.garmentsSection}>
          <Text style={styles.sectionTitle}>Prendas públicas</Text>

          {garments.length === 0 ? (
            <EmptyState
              icon="shirt-outline"
              title="Sin prendas públicas"
              message="Este usuario aún no ha publicado prendas en el marketplace."
            />
          ) : (
            <View style={styles.garmentsGrid}>
              {garments.map((garment) => (
                <TouchableOpacity
                  key={garment.id}
                  style={styles.garmentCard}
                  activeOpacity={0.7}
                  onPress={() => (router as any).push({
                    pathname: '/marketplace/[id]',
                    params: { id: garment.id },
                  })}
                >
                  <View style={styles.garmentImageContainer}>
                    {(() => {
                      const uri = (garment as any).image_url || (garment as any).imageUrl || '';
                      return uri ? (
                        <Image
                          source={{ uri }}
                          style={styles.garmentImage}
                          contentFit="cover"
                          cachePolicy="memory-disk"
                        />
                      ) : (
                        <View style={styles.garmentImagePlaceholder}>
                          <Ionicons name="shirt-outline" size={32} color={COLORS.gray[300]} />
                        </View>
                      );
                    })()}
                    {garment.listingType && (
                      <View style={styles.garmentBadgeOverlay}>
                        <ListingTypeBadge type={garment.listingType} />
                      </View>
                    )}
                  </View>
                  <View style={styles.garmentInfo}>
                    <Text
                      style={styles.garmentName}
                      numberOfLines={2}
                      ellipsizeMode="tail"
                    >
                      {garment.name}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          )}
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

  // --- Profile Card ---
  profileCard: {
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    paddingVertical: 32,
    paddingHorizontal: 24,
    marginBottom: 8,
  },
  avatar: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: '#F3F4F6',
    marginBottom: 16,
  },
  avatarPlaceholder: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  username: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  fullName: {
    fontSize: 16,
    color: '#6B7280',
    fontWeight: '500',
    marginBottom: 12,
  },
  bio: {
    fontSize: 14,
    color: '#374151',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 16,
    paddingHorizontal: 16,
  },
  memberSinceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  memberSinceText: {
    fontSize: 13,
    color: '#9CA3AF',
  },

  // --- Garments Section ---
  garmentsSection: {
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 16,
  },
  garmentsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -6,
  },
  garmentCard: {
    width: '50%',
    paddingHorizontal: 6,
    marginBottom: 12,
  },
  garmentImageContainer: {
    width: '100%',
    aspectRatio: 1,
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  garmentImage: {
    width: '100%',
    height: '100%',
  },
  garmentImagePlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  garmentBadgeOverlay: {
    position: 'absolute',
    top: 8,
    left: 8,
    zIndex: 1,
  },
  garmentInfo: {
    paddingTop: 8,
    paddingHorizontal: 4,
  },
  garmentName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#111827',
    lineHeight: 16,
  },
});

export default withScreenErrorBoundary(PublicProfileScreen);

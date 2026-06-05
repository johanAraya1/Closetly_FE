/**
 * Collection Detail Screen
 * Pantalla que muestra los detalles de una colección y sus outfits
 */

import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { OutfitCard, Loading, EmptyState } from '@/components';
import { useAuth } from '@/hooks/useAuth';
import { useCollections } from '@/hooks/useCollections';
import { COLORS } from '@/lib/constants';
import { useTranslation } from '@/hooks/useTranslation';
import type { Collection } from '@/types';

export default function CollectionDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const { user } = useAuth();
  const { loadCollectionById, currentCollection, isLoading: storeLoading } = useCollections(false);
  const [error, setError] = useState(false);
  const { t } = useTranslation();

  useEffect(() => {
    loadCollection();
  }, [id]);

  const loadCollection = async () => {
    if (!id || typeof id !== 'string' || !user) return;
    
    await loadCollectionById(id, user.id);
    
    if (!currentCollection) {
      setError(true);
    }
  };

  if (storeLoading) {
    return <Loading message={t('collections.loading')} />;
  }

  if (error || !currentCollection) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color="#111827" />
          </TouchableOpacity>
        </View>
        <EmptyState
          icon="alert-circle-outline"
          title={t('collections.notFound')}
          message={t('collections.notFoundMessage')}
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
        <View style={styles.headerActions}>
          {currentCollection.isPublic && (
            <View style={styles.publicBadge}>
              <Ionicons name="globe-outline" size={16} color={COLORS.primary} />
              <Text style={styles.publicText}>{t('collections.public')}</Text>
            </View>
          )}
          <TouchableOpacity style={styles.iconButton}>
            <Ionicons name="ellipsis-horizontal" size={24} color="#6B7280" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Collection Info */}
        <View style={styles.collectionInfo}>
          <Text style={styles.collectionName}>{currentCollection.name}</Text>
          {currentCollection.description && (
            <Text style={styles.collectionDescription}>{currentCollection.description}</Text>
          )}
          <View style={styles.stats}>
            <View style={styles.stat}>
              <Ionicons name="shirt-outline" size={20} color="#6B7280" />
              <Text style={styles.statText}>
                {t('collections.outfitCount', { count: currentCollection.outfits?.length || 0 })}
              </Text>
            </View>
          </View>
        </View>

        {/* Outfits Grid */}
        {currentCollection.outfits && currentCollection.outfits.length > 0 ? (
          <View style={styles.outfitsSection}>
            <Text style={styles.sectionTitle}>{t('collections.outfitsSection')}</Text>
            <View style={styles.outfitsGrid}>
              {currentCollection.outfits.map((outfit) => (
                <View key={outfit.id} style={styles.outfitCardWrapper}>
                  <OutfitCard
                    outfit={outfit}
                    onPress={() => {
                      // Navigate to outfit detail
                      router.push('/outfits');
                    }}
                  />
                </View>
              ))}
            </View>
          </View>
        ) : (
          <EmptyState
            icon="shirt-outline"
            title={t('collections.noOutfits')}
            message={t('collections.addOutfitsMessage')}
            actionLabel={t('collections.addOutfits')}
            onAction={() => {
              // TODO: Navigate to add outfits screen
              Alert.alert(t('collections.addOutfitsComingSoon'), t('collections.addOutfitsComingSoonMessage'));
            }}
          />
        )}
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
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'white',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backButton: {
    padding: 8,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  publicBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#EFF6FF',
    borderRadius: 12,
  },
  publicText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.primary,
  },
  iconButton: {
    padding: 8,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 24,
  },
  collectionInfo: {
    backgroundColor: 'white',
    padding: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  collectionName: {
    fontSize: 28,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
  },
  collectionDescription: {
    fontSize: 16,
    color: '#6B7280',
    lineHeight: 24,
    marginBottom: 16,
  },
  stats: {
    flexDirection: 'row',
    gap: 24,
  },
  stat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statText: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  outfitsSection: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 16,
  },
  outfitsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -8,
  },
  outfitCardWrapper: {
    width: '50%',
    paddingHorizontal: 8,
    marginBottom: 16,
  },
});

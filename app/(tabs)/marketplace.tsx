/**
 * Marketplace Screen
 * FlatList con prendas públicas de todos los usuarios
 * Pull-to-refresh, infinite scroll, empty state, error state
 */

import React, { useCallback, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, RefreshControl, ActivityIndicator, StyleSheet, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { ListingTypeBadge, EmptyState, Loading, withScreenErrorBoundary } from '@/components';
import { useMarketplaceStore } from '@/store/marketplaceStore';
import { useTranslation } from '@/hooks/useTranslation';
import { COLORS } from '@/lib/constants';
import type { Garment } from '@/types';

function MarketplaceScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const {
    garments,
    isLoading,
    isLoadingMore,
    hasMore,
    error,
    loadPublicGarments,
    loadMorePublicGarments,
  } = useMarketplaceStore();

  useEffect(() => {
    loadPublicGarments();
  }, []);

  const onRefresh = useCallback(async () => {
    await loadPublicGarments();
  }, [loadPublicGarments]);

  const onEndReached = useCallback(() => {
    if (!isLoadingMore && hasMore) {
      loadMorePublicGarments();
    }
  }, [isLoadingMore, hasMore, loadMorePublicGarments]);

  const renderItem = useCallback(({ item }: { item: Garment }) => (
    <TouchableOpacity
      style={styles.card}
      activeOpacity={0.7}
      onPress={() => (router as any).push({
            pathname: '/marketplace/[id]',
            params: { id: item.id },
          })}
    >
      <View style={styles.cardImageContainer}>
        {(item as any).image_url ? (
          <Image
            source={{ uri: (item as any).image_url }}
            style={styles.cardImage}
            resizeMode="cover"
          />
        ) : (
          <View style={styles.imagePlaceholder}>
            <Ionicons name="shirt-outline" size={32} color={COLORS.gray[300]} />
          </View>
        )}
        {item.listingType && (
          <View style={styles.badgeContainer}>
            <ListingTypeBadge type={item.listingType} />
          </View>
        )}
      </View>
      <View style={styles.cardContent}>
        <Text
          style={styles.cardName}
          numberOfLines={2}
          ellipsizeMode="tail"
        >
          {item.name}
        </Text>
        <View style={styles.cardUserRow}>
          <Ionicons name="person-circle-outline" size={14} color="#9CA3AF" />
          <Text style={styles.cardUserText}>
            @usuario_{item.userId.slice(0, 8)}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  ), []);

  const renderFooter = useCallback(() => {
    if (!isLoadingMore) return null;
    return (
      <View style={styles.footer}>
        <ActivityIndicator size="small" color={COLORS.primary} />
        <Text style={styles.footerText}>{t('common.loading')}</Text>
      </View>
    );
  }, [isLoadingMore, t]);

  const renderEmpty = useCallback(() => {
    if (isLoading) return null;

    if (error) {
      return (
        <View style={styles.centerContainer}>
          <Ionicons name="cloud-offline-outline" size={64} color={COLORS.gray[300]} />
          <Text style={styles.errorTitle}>{t('common.error')}</Text>
          <Text style={styles.errorMessage}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={onRefresh}>
            <Text style={styles.retryText}>Reintentar</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <EmptyState
        icon="storefront-outline"
        title="Publicá tu primera prenda"
        message="Compartí tus prendas con la comunidad. Hacé públicas tus prendas desde el closet para que aparezcan acá."
        actionLabel="Ir al Closet"
        onAction={() => router.push('/closet')}
      />
    );
  }, [isLoading, error, t, onRefresh, router]);

  if (isLoading && garments.length === 0 && !error) {
    return <Loading message={t('common.loading')} />;
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Marketplace</Text>
        <Text style={styles.headerSubtitle}>
          {garments.length > 0
            ? `${garments.length} prendas públicas`
            : 'Explorá prendas de la comunidad'}
        </Text>
      </View>

      {/* Public Garments Feed */}
      <FlatList
        data={garments}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        numColumns={2}
        contentContainerStyle={styles.listContent}
        columnWrapperStyle={garments.length > 0 ? styles.columnWrapper : undefined}
        refreshControl={
          <RefreshControl
            refreshing={isLoading && garments.length > 0}
            onRefresh={onRefresh}
            colors={[COLORS.primary]}
            tintColor={COLORS.primary}
          />
        }
        onEndReached={onEndReached}
        onEndReachedThreshold={0.5}
        ListFooterComponent={renderFooter}
        ListEmptyComponent={renderEmpty}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 20,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#111827',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 2,
  },
  listContent: {
    padding: 16,
    paddingBottom: 32,
  },
  columnWrapper: {
    gap: 12,
  },
  card: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardImageContainer: {
    width: '100%',
    aspectRatio: 1,
    backgroundColor: '#F9FAFB',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  cardImage: {
    width: '100%',
    height: '100%',
  },
  imagePlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeContainer: {
    position: 'absolute',
    top: 8,
    left: 8,
    zIndex: 1,
  },
  cardContent: {
    padding: 10,
  },
  cardName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#111827',
    lineHeight: 16,
  },
  cardUserRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 6,
  },
  cardUserText: {
    fontSize: 11,
    color: '#9CA3AF',
    fontWeight: '400',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 20,
    gap: 8,
  },
  footerText: {
    fontSize: 14,
    color: '#6B7280',
  },
  centerContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    paddingVertical: 60,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#111827',
    marginTop: 16,
  },
  errorMessage: {
    fontSize: 15,
    color: '#6B7280',
    marginTop: 8,
    textAlign: 'center',
    lineHeight: 22,
  },
  retryButton: {
    marginTop: 24,
    backgroundColor: COLORS.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 15,
  },
});

export default withScreenErrorBoundary(MarketplaceScreen);

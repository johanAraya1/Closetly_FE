/**
 * Marketplace Screen
 * FlatList con prendas públicas de todos los usuarios
 * Pull-to-refresh, infinite scroll, empty state, error state
 * Búsqueda y filtros por nombre, categoría y tipo de listing
 */

import React, { useCallback, useEffect, useMemo, useState, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  StyleSheet,
  Image,
  TextInput,
  ScrollView,
  Dimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { ListingTypeBadge, EmptyState, Loading, withScreenErrorBoundary } from '@/components';
import { useMarketplaceStore } from '@/store/marketplaceStore';
import { useGarmentsStore } from '@/store/garmentsStore';
import { useAuthStore } from '@/store/authStore';
import { useTranslation } from '@/hooks/useTranslation';
import { useDebounce } from '@/hooks/useDebounce';
import { COLORS, GARMENT_CATEGORIES, LISTING_TYPES } from '@/lib/constants';
import type { Garment } from '@/types';

const SEARCH_DEBOUNCE_MS = 300;
const CARD_WIDTH = (Dimensions.get('window').width - 44) / 2; // (screen - padding*2 - gap) / 2

function ImageCarousel({ images }: { images: string[] }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const listRef = useRef<FlatList>(null);

  if (images.length <= 1) {
    return images[0] ? (
      <Image source={{ uri: images[0] }} style={styles.cardImage} resizeMode="cover" />
    ) : (
      <View style={styles.imagePlaceholder}>
        <Ionicons name="shirt-outline" size={32} color={COLORS.gray[300]} />
      </View>
    );
  }

  return (
    <View style={{ width: CARD_WIDTH, height: CARD_WIDTH }}>
      <FlatList
        ref={listRef}
        data={images}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        keyExtractor={(_: string, i: number) => String(i)}
        onMomentumScrollEnd={(e) => {
          const index = Math.round(e.nativeEvent.contentOffset.x / CARD_WIDTH);
          setCurrentIndex(index);
        }}
        renderItem={({ item }) => (
          <Image source={{ uri: item }} style={{ width: CARD_WIDTH, height: CARD_WIDTH }} resizeMode="cover" />
        )}
      />
      {images.length > 1 && (
        <View style={styles.carouselDots}>
          {images.map((_: string, i: number) => (
            <View
              key={i}
              style={[styles.carouselDot, i === currentIndex ? styles.carouselDotActive : styles.carouselDotInactive]}
            />
          ))}
        </View>
      )}
    </View>
  );
}

function MarketplaceScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const user = useAuthStore((s) => s.user);
  const myGarmentsTotal = useGarmentsStore((s) => s.total);
  const myGarments = useGarmentsStore((s) => s.garments);
  const {
    garments,
    isLoading,
    isLoadingMore,
    hasMore,
    error,
    profilesByUserId,
    loadPublicGarments,
    loadMorePublicGarments,
    loadProfilesForCurrentGarments,
  } = useMarketplaceStore();

  // ── Filter state ──────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState<'all' | 'mine'>('all');
  const [searchText, setSearchText] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedListingType, setSelectedListingType] = useState<string | null>(null);

  const debouncedSearchText = useDebounce(searchText, SEARCH_DEBOUNCE_MS);

  // ── Filtered list (client-side) ──────────────────────────────
  const filteredGarments = useMemo(() => {
    let result = garments;

    // "Todas" tab: excluir las prendas del usuario actual
    if (activeTab === 'all' && user?.id) {
      result = result.filter((g) => g.userId !== user.id);
    }

    // Search by name
    if (debouncedSearchText.trim()) {
      const query = debouncedSearchText.trim().toLowerCase();
      result = result.filter((g) => g.name.toLowerCase().includes(query));
    }

    // Filter by category
    if (selectedCategory) {
      result = result.filter((g) => g.category === selectedCategory);
    }

    // Filter by listing type
    if (selectedListingType) {
      result = result.filter((g) => g.listingType === selectedListingType);
    }

    return result;
  }, [garments, debouncedSearchText, selectedCategory, selectedListingType, activeTab, user?.id]);

  const hasActiveFilters = debouncedSearchText.trim() !== '' || selectedCategory !== null || selectedListingType !== null;

  // Mis prendas públicas (propias, con listing activo)
  const myPublicGarments = useMemo(() => {
    return myGarments.filter(
      (g) => g.isPublic || (g as any).is_public || g.listingType,
    );
  }, [myGarments]);

  // ── Data fetching ─────────────────────────────────────────────
  useEffect(() => {
    loadPublicGarments();
  }, []);

  // Cargar perfiles de los vendedores cuando se actualizan las prendas
  useEffect(() => {
    if (garments.length > 0) {
      loadProfilesForCurrentGarments();
    }
  }, [garments, loadProfilesForCurrentGarments]);

  const onRefresh = useCallback(async () => {
    await loadPublicGarments();
  }, [loadPublicGarments]);

  const onEndReached = useCallback(() => {
    if (!isLoadingMore && hasMore) {
      loadMorePublicGarments();
    }
  }, [isLoadingMore, hasMore, loadMorePublicGarments]);

  // ── Renderers ─────────────────────────────────────────────────
  const renderItem = useCallback(({ item }: { item: Garment }) => {
    const sellerUsername = profilesByUserId[item.userId]?.username || 'desconocido';
    return (
      <TouchableOpacity
        style={styles.card}
        activeOpacity={0.7}
        onPress={() => (router as any).push({
              pathname: '/marketplace/[id]',
              params: { id: item.id },
            })}
      >
        <View style={styles.cardImageContainer}>
          <ImageCarousel images={(item as any).imageUrls || ((item as any).image_url ? [(item as any).image_url] : [])} />
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
              @{sellerUsername}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  }, [profilesByUserId, router]);

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

    // Filters active but no matches
    if (hasActiveFilters) {
      return (
        <View style={styles.centerContainer}>
          <Ionicons name="search-outline" size={64} color={COLORS.gray[300]} />
          <Text style={styles.errorTitle}>{t('marketplace.noResults')}</Text>
          <Text style={styles.errorMessage}>
            {t('closet.noGarmentsMessage')}
          </Text>
        </View>
      );
    }

    // User has garments in their closet but none are public
    const hasMyGarments = myGarmentsTotal > 0 || myGarments.length > 0;
    if (user && hasMyGarments) {
      return (
        <EmptyState
          icon="storefront-outline"
          title="Publicá tus prendas"
          message={`Tenés ${myGarmentsTotal} prendas en tu closet, pero ninguna es pública. Andá a tu closet, editá una prenda y activá "Público" para que aparezca acá.`}
          actionLabel="Ir al Closet"
          onAction={() => router.push('/closet')}
        />
      );
    }

    return (
      <EmptyState
        icon="storefront-outline"
        title="Publicá tu primera prenda"
        message="Compartí tus prendas con la comunidad. Hacé públicas tus prendas desde tu closet para que aparezcan acá."
        actionLabel="Ir al Closet"
        onAction={() => router.push('/closet')}
      />
    );
  }, [isLoading, error, t, hasActiveFilters, onRefresh, router, user, myGarmentsTotal]);

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

      {/* Tabs: Todas / Mis prendas */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'all' && styles.tabActive]}
          onPress={() => setActiveTab('all')}
          activeOpacity={0.7}
        >
          <Text style={[styles.tabText, activeTab === 'all' && styles.tabTextActive]}>
            Todas
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'mine' && styles.tabActive]}
          onPress={() => setActiveTab('mine')}
          activeOpacity={0.7}
        >
          <Text style={[styles.tabText, activeTab === 'mine' && styles.tabTextActive]}>
            Mis prendas {myPublicGarments.length > 0 && `(${myPublicGarments.length})`}
          </Text>
        </TouchableOpacity>
      </View>

      {activeTab === 'all' ? (
        <>
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Ionicons name="search-outline" size={18} color={COLORS.gray[400]} />
          <TextInput
            style={styles.searchInput}
            placeholder={t('marketplace.searchPlaceholder')}
            placeholderTextColor={COLORS.gray[400]}
            value={searchText}
            onChangeText={setSearchText}
            returnKeyType="search"
            autoCorrect={false}
            autoCapitalize="none"
          />
          {searchText.length > 0 && (
            <TouchableOpacity
              onPress={() => setSearchText('')}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="close-circle" size={18} color={COLORS.gray[400]} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Filter Chips */}
      <View style={styles.filtersRow}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipsContainer}
        >
          {/* Category Chips */}
          <TouchableOpacity
            style={[
              styles.chip,
              selectedCategory === null && styles.chipActive,
            ]}
            onPress={() => setSelectedCategory(null)}
          >
            <Text
              style={[
                styles.chipText,
                selectedCategory === null && styles.chipTextActive,
              ]}
            >
              {t('garments.category.all')}
            </Text>
          </TouchableOpacity>
          {GARMENT_CATEGORIES.map((cat) => (
            <TouchableOpacity
              key={cat.value}
              style={[
                styles.chip,
                selectedCategory === cat.value && styles.chipActive,
              ]}
              onPress={() =>
                setSelectedCategory(selectedCategory === cat.value ? null : cat.value)
              }
            >
              <Text
                style={[
                  styles.chipText,
                  selectedCategory === cat.value && styles.chipTextActive,
                ]}
              >
                {cat.label}
              </Text>
            </TouchableOpacity>
          ))}

          {/* Separator between category and listing type */}
          <View style={styles.chipSeparator} />

          {/* Listing Type Chips */}
          <TouchableOpacity
            style={[
              styles.chip,
              selectedListingType === null && styles.chipActive,
            ]}
            onPress={() => setSelectedListingType(null)}
          >
            <Text
              style={[
                styles.chipText,
                selectedListingType === null && styles.chipTextActive,
              ]}
            >
              {t('marketplace.allListingTypes')}
            </Text>
          </TouchableOpacity>
          {LISTING_TYPES.map((lt) => (
            <TouchableOpacity
              key={lt.value}
              style={[
                styles.chip,
                selectedListingType === lt.value && styles.chipActive,
              ]}
              onPress={() =>
                setSelectedListingType(
                  selectedListingType === lt.value ? null : lt.value
                )
              }
            >
              <Text
                style={[
                  styles.chipText,
                  selectedListingType === lt.value && styles.chipTextActive,
                ]}
              >
                {t(lt.labelKey)}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Public Garments Feed */}
      <FlatList
        data={filteredGarments}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        numColumns={2}
        contentContainerStyle={styles.listContent}
        columnWrapperStyle={filteredGarments.length > 0 ? styles.columnWrapper : undefined}
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
        </>
      ) : (
        /* ── Mis Prendas ─────────────────────────────── */
        <ScrollView
          style={styles.list}
          contentContainerStyle={
            myPublicGarments.length === 0 ? styles.emptyContainer : styles.listContent
          }
          showsVerticalScrollIndicator={false}
        >
          {myPublicGarments.length === 0 ? (
            <View style={styles.centerContainer}>
              <Ionicons name="shirt-outline" size={64} color={COLORS.gray[300]} />
              <Text style={styles.errorTitle}>Tus prendas públicas</Text>
              <Text style={styles.errorMessage}>
                {user
                  ? 'Todavía no tenés prendas públicas. Andá a tu closet, editá una prenda y activá "Público" para que aparezca acá.'
                  : 'Iniciá sesión para ver y gestionar tus prendas públicas.'}
              </Text>
              {user ? (
                <TouchableOpacity
                  style={styles.retryButton}
                  onPress={() => router.push('/closet')}
                >
                  <Text style={styles.retryText}>Ir al Closet</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={styles.retryButton}
                  onPress={() => router.push('/(tabs)/profile')}
                >
                  <Text style={styles.retryText}>Iniciar sesión</Text>
                </TouchableOpacity>
              )}
            </View>
          ) : (
            <View style={styles.gridContainer}>
              {myPublicGarments.map((garment) => (
                <View key={garment.id} style={styles.myCard}>
                  <TouchableOpacity
                    style={styles.myCardTouchable}
                    activeOpacity={0.7}
                    onPress={() => (router as any).push({
                      pathname: '/marketplace/[id]',
                      params: { id: garment.id },
                    })}
                  >
                    <View style={styles.cardImageContainer}>
                      {garment.imageUrl ? (
                        <Image
                          source={{ uri: garment.imageUrl }}
                          style={styles.cardImage}
                          resizeMode="cover"
                        />
                      ) : (
                        <View style={styles.imagePlaceholder}>
                          <Ionicons name="shirt-outline" size={32} color={COLORS.gray[300]} />
                        </View>
                      )}
                      {garment.listingType && (
                        <View style={styles.badgeContainer}>
                          <ListingTypeBadge type={garment.listingType} />
                        </View>
                      )}
                    </View>
                    <View style={styles.cardContent}>
                      <Text style={styles.cardName} numberOfLines={2} ellipsizeMode="tail">
                        {garment.name}
                      </Text>
                      <Text style={styles.cardCategory}>
                        {GARMENT_CATEGORIES.find((c) => c.value === garment.category)?.label || garment.category}
                      </Text>
                    </View>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.editButton}
                    onPress={() => router.push(`/garments/create?id=${garment.id}`)}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Ionicons name="pencil" size={16} color={COLORS.primary} />
                    <Text style={styles.editButtonText}>Editar</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}
        </ScrollView>
      )}
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
  searchContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: '#111827',
    padding: 0,
  },
  filtersRow: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    paddingVertical: 10,
  },
  chipsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    gap: 8,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    backgroundColor: '#FFFFFF',
  },
  chipActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  chipText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#6B7280',
  },
  chipTextActive: {
    color: '#FFFFFF',
  },
  chipSeparator: {
    width: 1,
    height: 20,
    backgroundColor: '#E5E7EB',
    marginHorizontal: 4,
  },

  // ── Tab bar ───────────────────────────────────────────
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    paddingHorizontal: 16,
    gap: 0,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: COLORS.primary,
  },
  tabText: {
    fontSize: 15,
    fontWeight: '500',
    color: '#6B7280',
  },
  tabTextActive: {
    color: COLORS.primary,
    fontWeight: '600',
  },

  // ── Mis Prendas ───────────────────────────────────────
  list: {
    flex: 1,
  },
  emptyContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    padding: 16,
  },
  myCard: {
    width: '47%',
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
  myCardTouchable: {
    width: '100%',
  },
  cardCategory: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 2,
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  editButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.primary,
  },
  carouselDots: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'absolute',
    bottom: 6,
    left: 0,
    right: 0,
    gap: 4,
  },
  carouselDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  carouselDotActive: {
    backgroundColor: '#FFFFFF',
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  carouselDotInactive: {
    backgroundColor: 'rgba(255,255,255,0.5)',
  },
});

export default withScreenErrorBoundary(MarketplaceScreen);

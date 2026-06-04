/**
 * Outfits List Screen
 * Pantalla para ver todos los outfits del usuario
 */

import React, { useState, useMemo, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  RefreshControl,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { OutfitCard, EmptyState, Button } from '@/components';
import { useAuth } from '@/hooks/useAuth';
import { useOutfits } from '@/hooks/useOutfits';
import { SEASONS } from '@/lib/constants';
import type { Outfit, GarmentSeason } from '@/types';

const SCREEN_WIDTH = Dimensions.get('window').width;
const SKELETON_CARD_WIDTH = SCREEN_WIDTH < 600 ? (SCREEN_WIDTH - 60) / 2 : (SCREEN_WIDTH - 80) / 3;
const SKELETON_IMAGE_HEIGHT = 180;

type SortOption = 'recent' | 'oldest' | 'name' | 'favorites';
type FilterSeason = GarmentSeason | 'all';

export default function OutfitsScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { outfits, isLoading, error, loadOutfits, deleteOutfit, toggleFavorite } = useOutfits(true);

  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('recent');
  const [filterSeason, setFilterSeason] = useState<FilterSeason>('all');
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Refrescar outfits
  const handleRefresh = useCallback(async () => {
    if (!user?.id) return;
    setRefreshing(true);
    await loadOutfits(user.id);
    setRefreshing(false);
  }, [user?.id]);

  // Filtrar y ordenar outfits
  const filteredAndSortedOutfits = useMemo(() => {
    let filtered = [...outfits];

    // Filtrar por búsqueda
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (outfit) =>
          outfit.name.toLowerCase().includes(query) ||
          outfit.description?.toLowerCase().includes(query) ||
          outfit.occasion?.toLowerCase().includes(query)
      );
    }

    // Filtrar por temporada
    if (filterSeason !== 'all') {
      filtered = filtered.filter((outfit) => outfit.season === filterSeason);
    }

    // Filtrar favoritos
    if (showFavoritesOnly) {
      filtered = filtered.filter((outfit) => outfit.is_favorite);
    }

    // Ordenar
    switch (sortBy) {
      case 'recent':
        filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        break;
      case 'oldest':
        filtered.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
        break;
      case 'name':
        filtered.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case 'favorites':
        filtered.sort((a, b) => (b.is_favorite ? 1 : 0) - (a.is_favorite ? 1 : 0));
        break;
    }

    return filtered;
  }, [outfits, searchQuery, filterSeason, showFavoritesOnly, sortBy]);

  // Manejar toggle de favorito
  const handleToggleFavorite = useCallback(
    async (outfit: Outfit) => {
      if (!user?.id) return;
      try {
        await toggleFavorite(outfit.id, !outfit.is_favorite);
      } catch (err) {
        Alert.alert('Error', 'No se pudo actualizar el favorito');
      }
    },
    [user?.id]
  );

  // Manejar eliminación de outfit
  const handleDeleteOutfit = useCallback(
    (outfit: Outfit) => {
      Alert.alert(
        'Eliminar Outfit',
        `¿Estás seguro de que deseas eliminar "${outfit.name}"?`,
        [
          { text: 'Cancelar', style: 'cancel' },
          {
            text: 'Eliminar',
            style: 'destructive',
            onPress: async () => {
              if (!user?.id) return;
              try {
                await deleteOutfit(outfit.id);
                Alert.alert('Éxito', 'Outfit eliminado correctamente');
              } catch (err) {
                Alert.alert('Error', 'No se pudo eliminar el outfit');
              }
            },
          },
        ]
      );
    },
    [user?.id]
  );

  // Navegar a detalle del outfit
  const handleOutfitPress = useCallback(
    (outfit: Outfit) => {
      // TODO: Crear pantalla de detalle de outfit
      // router.push(`/outfits/${outfit.id}`);
      Alert.alert('Detalle de Outfit', `Ver detalles de "${outfit.name}" (próximamente)`);
    },
    []
  );

  // Navegar a crear outfit
  const handleCreateOutfit = useCallback(() => {
    router.push('/outfits/create');
  }, [router]);

  if (isLoading && outfits.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.titleContainer}>
            <Text style={styles.title}>Mis Outfits</Text>
            <Text style={styles.subtitle}>Cargando...</Text>
          </View>
        </View>

        {/* Search skeleton */}
        <View style={styles.searchContainer}>
          <View style={[styles.skeletonBlock, { height: 44, borderRadius: 12 }]} />
        </View>

        {/* Filters skeleton */}
        <View style={[styles.filtersContainer, { paddingHorizontal: 20, marginBottom: 12 }]}>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <View style={[styles.skeletonBlock, { width: 100, height: 34, borderRadius: 20 }]} />
            <View style={[styles.skeletonBlock, { width: 100, height: 34, borderRadius: 20 }]} />
          </View>
        </View>

        {/* Card skeletons */}
        <View style={[styles.listContent, { padding: 20 }]}>
          <View style={styles.gridContainer}>
            {[1, 2, 3, 4].map((i) => (
              <View key={i} style={[styles.cardSkeleton, { width: SKELETON_CARD_WIDTH }]}>
                <View style={[styles.skeletonBlock, { height: SKELETON_IMAGE_HEIGHT, borderTopLeftRadius: 12, borderTopRightRadius: 12 }]} />
                <View style={{ padding: 12 }}>
                  <View style={[styles.skeletonBlock, { height: 14, width: '80%', marginBottom: 8 }]} />
                  <View style={[styles.skeletonBlock, { height: 11, width: '50%' }]} />
                </View>
              </View>
            ))}
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.titleContainer}>
          <Text style={styles.title}>Mis Outfits</Text>
          <Text style={styles.subtitle}>
            {filteredAndSortedOutfits.length} outfit{filteredAndSortedOutfits.length !== 1 ? 's' : ''}
          </Text>
        </View>
        <TouchableOpacity style={styles.addButton} onPress={handleCreateOutfit}>
          <Ionicons name="add" size={24} color="white" />
        </TouchableOpacity>
      </View>

      {/* Barra de búsqueda */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#9CA3AF" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Buscar por nombre, ocasión..."
          placeholderTextColor="#9CA3AF"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')} style={styles.clearButton}>
            <Ionicons name="close-circle" size={20} color="#9CA3AF" />
          </TouchableOpacity>
        )}
      </View>

      {/* Filtros y ordenamiento */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filtersContainer}
        contentContainerStyle={styles.filtersContent}
      >
        {/* Filtro de favoritos */}
        <TouchableOpacity
          style={[styles.filterChip, showFavoritesOnly && styles.filterChipActive]}
          onPress={() => setShowFavoritesOnly(!showFavoritesOnly)}
        >
          <Ionicons
            name={showFavoritesOnly ? 'heart' : 'heart-outline'}
            size={16}
            color={showFavoritesOnly ? 'white' : '#6B7280'}
          />
          <Text style={[styles.filterChipText, showFavoritesOnly && styles.filterChipTextActive]}>
            Favoritos
          </Text>
        </TouchableOpacity>

        {/* Filtro de temporada */}
        <TouchableOpacity
          style={[styles.filterChip, filterSeason !== 'all' && styles.filterChipActive]}
          onPress={() => {
            const seasons: FilterSeason[] = ['all', 'spring', 'summer', 'fall', 'winter', 'all-season'];
            const currentIndex = seasons.indexOf(filterSeason);
            const nextIndex = (currentIndex + 1) % seasons.length;
            setFilterSeason(seasons[nextIndex]);
          }}
        >
          <Ionicons name="partly-sunny-outline" size={16} color={filterSeason !== 'all' ? 'white' : '#6B7280'} />
          <Text style={[styles.filterChipText, filterSeason !== 'all' && styles.filterChipTextActive]}>
            {filterSeason === 'all'
              ? 'Todas'
              : SEASONS.find((s) => s.value === filterSeason)?.label || filterSeason}
          </Text>
        </TouchableOpacity>

        {/* Ordenamiento */}
        <TouchableOpacity
          style={styles.filterChip}
          onPress={() => {
            const sortOptions: SortOption[] = ['recent', 'oldest', 'name', 'favorites'];
            const currentIndex = sortOptions.indexOf(sortBy);
            const nextIndex = (currentIndex + 1) % sortOptions.length;
            setSortBy(sortOptions[nextIndex]);
          }}
        >
          <Ionicons name="swap-vertical" size={16} color="#6B7280" />
          <Text style={styles.filterChipText}>
            {sortBy === 'recent' && 'Más reciente'}
            {sortBy === 'oldest' && 'Más antiguo'}
            {sortBy === 'name' && 'Nombre'}
            {sortBy === 'favorites' && 'Favoritos primero'}
          </Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Lista de outfits (SIEMPRE el mismo ScrollView para evitar conflictos DOM en web) */}
      <ScrollView
        style={styles.list}
        contentContainerStyle={
          filteredAndSortedOutfits.length === 0 ? styles.emptyContainer : styles.listContent
        }
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
      >
        {filteredAndSortedOutfits.length === 0 ? (
          <EmptyState
            icon="shirt-outline"
            title={searchQuery || filterSeason !== 'all' || showFavoritesOnly ? 'No hay outfits' : 'No tienes outfits'}
            message={
              searchQuery || filterSeason !== 'all' || showFavoritesOnly
                ? 'Intenta cambiar los filtros de búsqueda'
                : 'Crea tu primer outfit combinando tus prendas'
            }
            actionLabel={!searchQuery && filterSeason === 'all' && !showFavoritesOnly ? 'Crear Outfit' : undefined}
            onAction={!searchQuery && filterSeason === 'all' && !showFavoritesOnly ? handleCreateOutfit : undefined}
          />
        ) : (
          <View style={styles.gridContainer}>
            {filteredAndSortedOutfits.map((outfit) => (
              <OutfitCard
                key={outfit.id}
                outfit={outfit}
                onPress={() => handleOutfitPress(outfit)}
                onToggleFavorite={() => handleToggleFavorite(outfit)}
              />
            ))}
          </View>
        )}
      </ScrollView>

      {/* Error */}
      {error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#6B7280',
  },
  skeletonBlock: {
    backgroundColor: '#F3F4F6',
  },
  cardSkeleton: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  titleContainer: {
    flex: 1,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#111827',
  },
  subtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 2,
  },
  addButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#3B82F6',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    marginHorizontal: 20,
    marginTop: 16,
    marginBottom: 12,
    paddingHorizontal: 12,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#111827',
  },
  clearButton: {
    padding: 4,
  },
  filtersContainer: {
    maxHeight: 48,
    marginBottom: 12,
  },
  filtersContent: {
    paddingHorizontal: 20,
    gap: 8,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  filterChipActive: {
    backgroundColor: '#3B82F6',
    borderColor: '#3B82F6',
  },
  filterChipText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
  },
  filterChipTextActive: {
    color: 'white',
  },
  list: {
    flex: 1,
  },
  listContent: {
    padding: 20,
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  errorContainer: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
    backgroundColor: '#FEE2E2',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FCA5A5',
  },
  errorText: {
    color: '#991B1B',
    fontSize: 14,
    textAlign: 'center',
  },
});

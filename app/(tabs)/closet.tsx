/**
 * Closet Screen
 * Pantalla que muestra todas las prendas del usuario
 */

import React, { useState, useMemo, useCallback } from 'react';
import { View, Text, FlatList, ScrollView, TouchableOpacity, StyleSheet, TextInput, ActivityIndicator, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { GarmentCard, Loading, EmptyState, Modal, withScreenErrorBoundary } from '@/components';
import { useGarments } from '@/hooks/useGarments';
import { useTranslation } from '@/hooks/useTranslation';
import { useAuthStore } from '@/store/authStore';
import { GARMENT_CATEGORIES, COLORS } from '@/lib/constants';
import type { GarmentCategory } from '@/types';

function ClosetScreen() {
  const router = useRouter();
  const token = useAuthStore((state) => state.token);
  const user = useAuthStore((state) => state.user);
  const { garments, isLoading, isLoadingMore, hasMore, total, deleteGarment, loadGarments, loadMoreGarments } = useGarments(true);
  const { t } = useTranslation();
  const [selectedCategory, setSelectedCategory] = useState<GarmentCategory | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [garmentToDelete, setGarmentToDelete] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const filteredGarments = useMemo(() => {
    let result = garments;
    
    // Filtrar por categoría
    if (selectedCategory !== 'all') {
      result = result.filter((g) => g.category === selectedCategory);
    }
    
    // Filtrar por búsqueda
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter((g) => 
        g.name.toLowerCase().includes(query) ||
        g.brand?.toLowerCase().includes(query) ||
        g.color?.toLowerCase().includes(query)
      );
    }
    
    return result;
  }, [garments, selectedCategory, searchQuery]);

  const handleCategoryChange = (category: GarmentCategory | 'all') => {
    setSelectedCategory(category);
    // Reseteamos la carga al cambiar categoría (la categoría se filtra client-side por ahora)
  };

  const handleDeletePress = (garmentId: string) => {
    setGarmentToDelete(garmentId);
    setShowDeleteModal(true);
  };

  const handleConfirmDelete = async () => {
    if (garmentToDelete) {
      const success = await deleteGarment(garmentToDelete, token || undefined);
      if (success) {
        setShowDeleteModal(false);
        setGarmentToDelete(null);
      }
    }
  };

  const handleCancelDelete = () => {
    setShowDeleteModal(false);
    setGarmentToDelete(null);
  };

  const onRefresh = useCallback(async () => {
    if (!user) return;
    setRefreshing(true);
    await loadGarments(user.id, token || undefined);
    setRefreshing(false);
  }, [user, token, loadGarments]);

  if (isLoading && !refreshing) {
    return <Loading message={t('common.loading')} />;
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>{t('closet.title')}</Text>
          <Text style={styles.headerSubtitle}>{t('closet.garmentCount', { count: garments.length })}</Text>
        </View>
        <TouchableOpacity
          onPress={() => router.push('/garments/create')}
          style={styles.addButton}
        >
          <Ionicons name="add" size={28} color="white" />
        </TouchableOpacity>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#9CA3AF" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder={t('closet.searchPlaceholder')}
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

      {/* Category Filter */}
      <View style={{ backgroundColor: '#FFFFFF', paddingVertical: 12, alignItems: 'center' }}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 24, gap: 8, flexDirection: 'row', alignItems: 'center' }}
        >
        <TouchableOpacity
          onPress={() => handleCategoryChange('all')}
          style={[
            {
              flexDirection: 'row',
              alignItems: 'center',
              paddingHorizontal: 16,
              paddingVertical: 8,
              borderRadius: 20,
              marginRight: 8,
              backgroundColor: selectedCategory === 'all' ? '#62D9C7' : '#E5E7EB',
              borderWidth: 0,
            }
          ]}
        >
          <Ionicons 
            name="apps" 
            size={14} 
            color={selectedCategory === 'all' ? '#FFFFFF' : '#4B5563'} 
            style={{ marginRight: 6 }}
          />
          <Text style={{
            fontSize: 14,
            color: selectedCategory === 'all' ? '#FFFFFF' : '#374151',
            fontWeight: selectedCategory === 'all' ? '600' : '500',
          }}>
            {t('closet.allCategories')}
          </Text>
        </TouchableOpacity>
        {GARMENT_CATEGORIES.map((cat) => (
          <TouchableOpacity
            key={cat.value}
            onPress={() => handleCategoryChange(cat.value as GarmentCategory)}
            style={[
              {
                flexDirection: 'row',
                alignItems: 'center',
                paddingHorizontal: 16,
                paddingVertical: 8,
                borderRadius: 20,
                marginRight: 8,
                backgroundColor: selectedCategory === cat.value ? '#62D9C7' : '#E5E7EB',
                borderWidth: 0,
              }
            ]}
          >
            <Text style={{
              fontSize: 14,
              color: selectedCategory === cat.value ? '#FFFFFF' : '#374151',
              fontWeight: selectedCategory === cat.value ? '600' : '500',
            }}>
              {cat.label}
            </Text>
          </TouchableOpacity>
        ))}
        </ScrollView>
      </View>

      {/* Garments Grid */}
      <FlatList
        data={filteredGarments}
        keyExtractor={(item) => item.id}
        numColumns={3}
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        columnWrapperStyle={styles.columnWrapper}
        renderItem={({ item }) => (
          <View style={styles.cardWrapper}>
            <GarmentCard
              garment={item}
              onPress={() => router.push(`/garments/${item.id}`)}
              onEdit={() => router.push(`/garments/create?id=${item.id}`)}
              onDelete={() => handleDeletePress(item.id)}
            />
          </View>
        )}
        ListHeaderComponent={
          filteredGarments.length > 0 ? (
            <View style={styles.resultHeader}>
              <Text style={styles.countText}>
                {t('closet.garmentCount', { count: filteredGarments.length })}
              </Text>
              {total > 0 && (
                <Text style={styles.pageText}>
                  {t('closet.loadedCount', { loaded: garments.length, total })}
                </Text>
              )}
            </View>
          ) : null
        }
        ListFooterComponent={
          <>
            {isLoadingMore && (
              <View style={styles.loadingMore}>
                <ActivityIndicator size="small" color={COLORS.primary} />
                <Text style={styles.loadingMoreText}>{t('closet.loadingMore')}</Text>
              </View>
            )}
            {!hasMore && garments.length >= 20 && (
              <View style={styles.endMessage}>
                <Ionicons name="checkmark-circle" size={20} color={COLORS.success} />
                <Text style={styles.endMessageText}>{t('closet.endMessage')}</Text>
              </View>
            )}
          </>
        }
        ListEmptyComponent={
          <EmptyState
            icon="shirt-outline"
            title={searchQuery ? t('closet.noResults') : t('closet.noGarments')}
            message={
              searchQuery 
                ? t('closet.tryDifferentSearch')
                : selectedCategory === 'all'
                  ? t('closet.startAdding')
                  : t('closet.noGarmentsCategory', { category: GARMENT_CATEGORIES.find(c => c.value === selectedCategory)?.label.toLowerCase() })
            }
            actionLabel={t('closet.addYourFirst')}
            onAction={() => router.push('/garments/create')}
          />
        }
        onEndReached={() => {
          if (hasMore && !isLoadingMore && user) {
            loadMoreGarments(user.id, token || undefined);
          }
        }}
        onEndReachedThreshold={0.3}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[COLORS.primary]}
            tintColor={COLORS.primary}
          />
        }
        windowSize={5}
        initialNumToRender={12}
        maxToRenderPerBatch={12}
      />

      {/* Modal de Confirmación de Eliminación */}
      <Modal
        visible={showDeleteModal}
        type="error"
        title={t('closet.deleteTitle')}
        message={t('closet.deleteMessage')}
        actions={[
          {
            text: t('common.cancel'),
            onPress: handleCancelDelete,
            variant: 'secondary',
          },
          {
            text: t('closet.confirmDelete'),
            onPress: handleConfirmDelete,
            variant: 'primary',
          },
        ]}
        onClose={handleCancelDelete}
        closeOnBackdrop={true}
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.05)',
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
  addButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#62D9C7',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 4px 8px rgba(98, 217, 199, 0.3)',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    marginHorizontal: 24,
    marginTop: 16,
    marginBottom: 12,
    paddingHorizontal: 16,
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    boxShadow: '0 1px 4px rgba(0, 0, 0, 0.05)',
  },
  searchIcon: {
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: '#111827',
  },
  clearButton: {
    padding: 4,
  },
  filterContainer: {
    backgroundColor: 'transparent',
    paddingVertical: 4,
  },
  filterContent: {
    paddingHorizontal: 24,
    gap: 6,
  },
  filterChip: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
    backgroundColor: '#E5E7EB',
    borderWidth: 0,
    borderStyle: 'solid' as const,
  },
  filterChipActive: {
    backgroundColor: '#62D9C7',
    borderWidth: 0,
  },
  chipIcon: {
    marginRight: 6,
  },
  filterText: {
    fontSize: 14,
    color: '#374151',
    fontWeight: '500',
  },
  filterTextActive: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 32,
  },
  resultHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  countText: {
    fontSize: 15,
    color: '#374151',
    fontWeight: '600',
  },
  pageText: {
    fontSize: 14,
    color: '#6B7280',
  },
  columnWrapper: {
    gap: 12,
  },
  cardWrapper: {
    flex: 1,
    marginBottom: 12,
  },
  loadingMore: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 20,
    gap: 8,
  },
  loadingMoreText: {
    fontSize: 14,
    color: '#6B7280',
  },
  endMessage: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 20,
    gap: 8,
  },
  endMessageText: {
    fontSize: 14,
    color: '#10B981',
    fontWeight: '500',
  },
});

export default withScreenErrorBoundary(ClosetScreen);

/**
 * Collection Detail Screen
 * Pantalla que muestra los detalles de una colección y sus outfits
 * Permite agregar y quitar outfits
 */

import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert, Image, TextInput, Modal as RNModal } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { OutfitCard, Loading, EmptyState, Button } from '@/components';
import { useAuth } from '@/hooks/useAuth';
import { useOutfits } from '@/hooks/useOutfits';
import { useCollectionsStore } from '@/store/collectionsStore';
import { COLORS, SEASONS } from '@/lib/constants';
import { useTranslation } from '@/hooks/useTranslation';

export default function CollectionDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const { user } = useAuth();
  const {
    currentCollection,
    isLoading: storeLoading,
    loadCollectionById,
    addOutfitToCollection,
    removeOutfitFromCollection,
  } = useCollectionsStore();
  const { outfits: allOutfits, isLoading: loadingOutfits } = useOutfits(true);
  const [error, setError] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedAddOutfits, setSelectedAddOutfits] = useState<string[]>([]);
  const [addSearchQuery, setAddSearchQuery] = useState('');
  const [addOccasionFilter, setAddOccasionFilter] = useState('');
  const [addSeasonFilter, setAddSeasonFilter] = useState<string>('all');
  const [addingOutfits, setAddingOutfits] = useState(false);
  const { t } = useTranslation();

  useEffect(() => {
    if (id && typeof id === 'string' && user) {
      loadCollectionById(id, user.id).then((data) => {
        if (!data) setError(true);
      });
    }
  }, [id, user?.id]);

  const seasonLabels: Record<string, string> = useMemo(() => ({
    spring: t('outfits.create.seasonSpring'),
    summer: t('outfits.create.seasonSummer'),
    fall: t('outfits.create.seasonFall'),
    winter: t('outfits.create.seasonWinter'),
    all_season: t('outfits.create.seasonAll'),
  }), [t]);

  // Outfits not already in this collection
  const availableOutfits = useMemo(() => {
    const collectionOutfitIds = new Set(
      (currentCollection?.outfits || []).map((o) => o.id)
    );
    return allOutfits.filter((o) => !collectionOutfitIds.has(o.id));
  }, [allOutfits, currentCollection?.outfits]);

  // Filter available outfits for the add modal
  const filteredAvailableOutfits = useMemo(() => {
    return availableOutfits.filter((outfit) => {
      if (addSearchQuery && !outfit.name.toLowerCase().includes(addSearchQuery.toLowerCase())) return false;
      if (addOccasionFilter && !(outfit.occasion || '').toLowerCase().includes(addOccasionFilter.toLowerCase())) return false;
      if (addSeasonFilter !== 'all' && outfit.season !== addSeasonFilter) return false;
      return true;
    });
  }, [availableOutfits, addSearchQuery, addOccasionFilter, addSeasonFilter]);

  const toggleAddOutfit = (outfitId: string) => {
    setSelectedAddOutfits((prev) =>
      prev.includes(outfitId)
        ? prev.filter((id) => id !== outfitId)
        : [...prev, outfitId]
    );
  };

  const handleAddOutfits = async () => {
    if (!id || typeof id !== 'string' || selectedAddOutfits.length === 0) return;
    setAddingOutfits(true);
    try {
      let success = true;
      for (const outfitId of selectedAddOutfits) {
        const ok = await addOutfitToCollection(id as string, outfitId);
        if (!ok) success = false;
      }
      if (success) {
        setShowAddModal(false);
        setSelectedAddOutfits([]);
        setAddSearchQuery('');
        setAddOccasionFilter('');
        setAddSeasonFilter('all');
      } else {
        Alert.alert(t('common.error'), t('collections.addOutfitsComingSoonMessage'));
      }
    } finally {
      setAddingOutfits(false);
    }
  };

  const handleRemoveOutfit = useCallback((outfitId: string, outfitName: string) => {
    Alert.alert(
      t('collections.removeOutfit'),
      t('collections.removeOutfitConfirm', { name: outfitName }),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.delete'),
          style: 'destructive',
          onPress: async () => {
            if (id && typeof id === 'string') {
              await removeOutfitFromCollection(id, outfitId);
            }
          },
        },
      ]
    );
  }, [id, removeOutfitFromCollection, t]);

  const isLoading = storeLoading && !currentCollection;

  if (isLoading) {
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
        <Text style={styles.headerTitle} numberOfLines={1}>{currentCollection.name}</Text>
        <View style={styles.headerActions}>
          {currentCollection.isPublic && (
            <View style={styles.publicBadge}>
              <Ionicons name="globe-outline" size={16} color={COLORS.primary} />
            </View>
          )}
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => {
              setSelectedAddOutfits([]);
              setAddSearchQuery('');
              setAddOccasionFilter('');
              setAddSeasonFilter('all');
              setShowAddModal(true);
            }}
          >
            <Ionicons name="add" size={22} color="white" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Collection Info */}
        <View style={styles.collectionInfo}>
          {currentCollection.description && (
            <Text style={styles.collectionDescription}>{currentCollection.description}</Text>
          )}
          <View style={styles.stats}>
            <View style={styles.stat}>
              <Ionicons name="shirt-outline" size={18} color="#6B7280" />
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
                  <View style={styles.outfitCardContainer}>
                    <OutfitCard
                      outfit={outfit}
                      onPress={() => {}}
                    />
                    <TouchableOpacity
                      style={styles.removeButton}
                      onPress={() => handleRemoveOutfit(outfit.id, outfit.name)}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <Ionicons name="close-circle" size={22} color="#EF4444" />
                    </TouchableOpacity>
                  </View>
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
              setSelectedAddOutfits([]);
              setShowAddModal(true);
            }}
          />
        )}
      </ScrollView>

      {/* Add Outfits Modal (bottom sheet style) */}
      <RNModal
        visible={showAddModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowAddModal(false)}
      >
        <TouchableOpacity
          style={styles.modalBackdrop}
          activeOpacity={1}
          onPress={() => setShowAddModal(false)}
        >
          <TouchableOpacity
            style={styles.modalSheet}
            activeOpacity={1}
            onPress={(e) => e.stopPropagation()}
          >
            {/* Handle */}
            <View style={styles.modalHandleContainer}>
              <View style={styles.modalHandle} />
            </View>
            {/* Header */}
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{t('collections.addOutfitsModalTitle')}</Text>
              <TouchableOpacity onPress={() => setShowAddModal(false)}>
                <Ionicons name="close" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>

            {/* Filters */}
            {availableOutfits.length > 0 && (
              <View style={styles.modalFilters}>
                <View style={styles.searchInputWrapper}>
                  <Ionicons name="search-outline" size={18} color="#9CA3AF" style={styles.searchIcon} />
                  <TextInput
                    style={styles.filterInput}
                    placeholder={t('collections.filterByName')}
                    placeholderTextColor="#9CA3AF"
                    value={addSearchQuery}
                    onChangeText={setAddSearchQuery}
                  />
                  {addSearchQuery ? (
                    <TouchableOpacity onPress={() => setAddSearchQuery('')}>
                      <Ionicons name="close-circle" size={18} color="#9CA3AF" />
                    </TouchableOpacity>
                  ) : null}
                </View>
                <View style={styles.searchInputWrapper}>
                  <Ionicons name="calendar-outline" size={18} color="#9CA3AF" style={styles.searchIcon} />
                  <TextInput
                    style={styles.filterInput}
                    placeholder={t('collections.filterByOccasion')}
                    placeholderTextColor="#9CA3AF"
                    value={addOccasionFilter}
                    onChangeText={setAddOccasionFilter}
                  />
                  {addOccasionFilter ? (
                    <TouchableOpacity onPress={() => setAddOccasionFilter('')}>
                      <Ionicons name="close-circle" size={18} color="#9CA3AF" />
                    </TouchableOpacity>
                  ) : null}
                </View>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipsScroll}>
                  <TouchableOpacity
                    style={[styles.chip, addSeasonFilter === 'all' && styles.chipActive]}
                    onPress={() => setAddSeasonFilter('all')}
                  >
                    <Text style={[styles.chipText, addSeasonFilter === 'all' && styles.chipTextActive]}>
                      {t('collections.allSeasons')}
                    </Text>
                  </TouchableOpacity>
                  {SEASONS.map((s) => (
                    <TouchableOpacity
                      key={s.value}
                      style={[styles.chip, addSeasonFilter === s.value && styles.chipActive]}
                      onPress={() => setAddSeasonFilter(addSeasonFilter === s.value ? 'all' : s.value)}
                    >
                      <Text style={[styles.chipText, addSeasonFilter === s.value && styles.chipTextActive]}>
                        {seasonLabels[s.value] || s.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}

            {/* Outfits list */}
            <ScrollView style={styles.modalOutfitList} nestedScrollEnabled>
              {loadingOutfits ? (
                <Loading message={t('collections.create.loadingOutfits')} />
              ) : filteredAvailableOutfits.length === 0 ? (
                <View style={styles.emptyModal}>
                  <Ionicons name="shirt-outline" size={40} color="#D1D5DB" />
                  <Text style={styles.emptyModalText}>
                    {availableOutfits.length === 0
                      ? t('collections.create.noOutfits')
                      : t('collections.emptyFilterResult')}
                  </Text>
                </View>
              ) : (
                filteredAvailableOutfits.map((outfit) => {
                  const isSelected = selectedAddOutfits.includes(outfit.id);
                  const garments = outfit.garments || [];
                  const currentGarment = garments[0];
                  return (
                    <TouchableOpacity
                      key={outfit.id}
                      style={[styles.modalOutfitItem, isSelected && styles.modalOutfitItemSelected]}
                      onPress={() => toggleAddOutfit(outfit.id)}
                    >
                      <View style={styles.modalOutfitCheckbox}>
                        <View style={[styles.checkbox, isSelected && styles.checkboxSelected]}>
                          {isSelected && <Ionicons name="checkmark" size={16} color="white" />}
                        </View>
                      </View>
                      <View style={styles.modalOutfitImageContainer}>
                        {currentGarment?.imageUrl ? (
                          <Image
                            source={{ uri: currentGarment.imageUrl }}
                            style={styles.modalOutfitImage}
                            resizeMode="contain"
                          />
                        ) : (
                          <Ionicons name="shirt-outline" size={24} color="#D1D5DB" />
                        )}
                      </View>
                      <View style={styles.modalOutfitInfo}>
                        <Text style={styles.modalOutfitName} numberOfLines={1}>{outfit.name}</Text>
                        {outfit.occasion ? (
                          <Text style={styles.modalOutfitOccasion}>{outfit.occasion}</Text>
                        ) : null}
                      </View>
                    </TouchableOpacity>
                  );
                })
              )}
            </ScrollView>

            {/* Footer with confirm button */}
            <View style={styles.modalFooter}>
              <Button
                title={t('collections.addOutfitsConfirm', { count: selectedAddOutfits.length })}
                onPress={handleAddOutfits}
                loading={addingOutfits}
                disabled={selectedAddOutfits.length === 0 || addingOutfits}
                fullWidth
              />
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </RNModal>
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
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    flex: 1,
    marginLeft: 12,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  publicBadge: {
    padding: 6,
    backgroundColor: '#EFF6FF',
    borderRadius: 12,
  },
  addButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 24,
  },
  collectionInfo: {
    backgroundColor: 'white',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  collectionDescription: {
    fontSize: 15,
    color: '#6B7280',
    lineHeight: 22,
    marginBottom: 12,
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
  outfitCardContainer: {
    position: 'relative',
  },
  removeButton: {
    position: 'absolute',
    top: -6,
    right: -6,
    zIndex: 10,
    backgroundColor: 'white',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 2,
    elevation: 3,
  },
  // Modal (bottom sheet)
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
    paddingBottom: 24,
  },
  modalHandleContainer: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  modalHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#D1D5DB',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  modalFilters: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  searchInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingHorizontal: 12,
    height: 40,
  },
  searchIcon: {
    marginRight: 8,
  },
  filterInput: {
    flex: 1,
    fontSize: 14,
    color: '#111827',
    paddingVertical: 0,
  },
  chipsScroll: {
    flexGrow: 0,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#F3F4F6',
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  chipActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  chipText: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '500',
  },
  chipTextActive: {
    color: 'white',
  },
  modalOutfitList: {
    maxHeight: 400,
    paddingHorizontal: 20,
  },
  emptyModal: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyModalText: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 8,
  },
  modalOutfitItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  modalOutfitItemSelected: {
    backgroundColor: '#F0F9FF',
    borderRadius: 8,
    paddingHorizontal: 8,
    marginHorizontal: -8,
  },
  modalOutfitCheckbox: {
    marginRight: 12,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#D1D5DB',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'white',
  },
  checkboxSelected: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  modalOutfitImageContainer: {
    width: 48,
    height: 48,
    borderRadius: 8,
    backgroundColor: '#F9FAFB',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    overflow: 'hidden',
  },
  modalOutfitImage: {
    width: '100%',
    height: '100%',
  },
  modalOutfitInfo: {
    flex: 1,
  },
  modalOutfitName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
  },
  modalOutfitOccasion: {
    fontSize: 12,
    color: COLORS.primary,
    fontWeight: '500',
    marginTop: 2,
  },
  modalFooter: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
});

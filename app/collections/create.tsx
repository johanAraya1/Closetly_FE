/**
 * Create Collection Screen
 * Pantalla para crear una nueva colección
 */

import React, { useState, useMemo } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Image, TextInput } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Button, Input, Loading, Modal } from '@/components';
import { useAuth } from '@/hooks/useAuth';
import { useCollections } from '@/hooks/useCollections';
import { useOutfits } from '@/hooks/useOutfits';
import { useCollectionsStore } from '@/store/collectionsStore';
import { COLORS, SEASONS } from '@/lib/constants';
import { validationMessages } from '@/utils/validation';
import { useTranslation } from '@/hooks/useTranslation';

export default function CreateCollectionScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { createCollection, error } = useCollections();
  const { outfits, isLoading: loadingOutfits } = useOutfits(true);
  const { t } = useTranslation();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isPublic, setIsPublic] = useState(false);
  const [selectedOutfits, setSelectedOutfits] = useState<string[]>([]);
  const [carouselIndexes, setCarouselIndexes] = useState<Record<string, number>>({});
  const [errors, setErrors] = useState<{ name?: string }>({});
  const [isLoading, setIsLoading] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [occasionFilter, setOccasionFilter] = useState('');
  const [seasonFilter, setSeasonFilter] = useState<string>('all');

  // Filtros
  const filteredOutfits = useMemo(() => {
    return outfits.filter((outfit) => {
      if (searchQuery && !outfit.name.toLowerCase().includes(searchQuery.toLowerCase())) {
        return false;
      }
      if (occasionFilter && !(outfit.occasion || '').toLowerCase().includes(occasionFilter.toLowerCase())) {
        return false;
      }
      if (seasonFilter !== 'all' && outfit.season !== seasonFilter) {
        return false;
      }
      return true;
    });
  }, [outfits, searchQuery, occasionFilter, seasonFilter]);

  const seasonLabels: Record<string, string> = useMemo(() => ({
    spring: t('outfits.create.seasonSpring'),
    summer: t('outfits.create.seasonSummer'),
    fall: t('outfits.create.seasonFall'),
    winter: t('outfits.create.seasonWinter'),
    all_season: t('outfits.create.seasonAll'),
  }), [t]);

  const toggleOutfit = (outfitId: string) => {
    setSelectedOutfits(prev => 
      prev.includes(outfitId) 
        ? prev.filter(id => id !== outfitId)
        : [...prev, outfitId]
    );
  };

  const goToNextImage = (outfitId: string, maxIndex: number) => {
    setCarouselIndexes(prev => {
      const currentIndex = prev[outfitId] || 0;
      return { ...prev, [outfitId]: (currentIndex + 1) % (maxIndex + 1) };
    });
  };

  const goToPrevImage = (outfitId: string, maxIndex: number) => {
    setCarouselIndexes(prev => {
      const currentIndex = prev[outfitId] || 0;
      return { ...prev, [outfitId]: currentIndex === 0 ? maxIndex : currentIndex - 1 };
    });
  };

  const validate = () => {
    const newErrors: { name?: string } = {};

    if (!name.trim()) {
      newErrors.name = validationMessages.collection.nameRequired;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const isValidForm = name.trim() && selectedOutfits.length >= 2;

  const resetForm = () => {
    setName('');
    setDescription('');
    setIsPublic(false);
    setSelectedOutfits([]);
    setErrors({});
  };

  const handleCreate = async () => {
    if (!validate()) {
      return;
    }
    
    if (!user) {
      return;
    }

    setIsLoading(true);

    const collection = await createCollection(user.id, {
      name: name.trim(),
      description: description.trim() || undefined,
      isPublic: isPublic,
      outfitIds: selectedOutfits,
    });

    setIsLoading(false);

    if (collection) {
      setShowSuccessModal(true);
    } else {
      // Obtener el error actualizado del store
      const currentError = useCollectionsStore.getState().error;
      setErrorMessage(currentError || t('collections.create.errorFallback'));
      setShowErrorModal(true);
    }
  };

  const handleCreateAnother = () => {
    setShowSuccessModal(false);
    resetForm();
  };

  const handleGoToCollections = () => {
    setShowSuccessModal(false);
    router.replace('/(tabs)/collections');
  };

  if (loadingOutfits) {
    return <Loading message={t('collections.create.loadingOutfits')} />;
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={COLORS.gray[900]} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('collections.create.title')}</Text>
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        <Input
          label={t('collections.create.name')}
          value={name}
          onChangeText={setName}
          placeholder={t('collections.create.namePlaceholder')}
          error={errors.name}
        />

        <Input
          label={t('collections.create.description')}
          value={description}
          onChangeText={setDescription}
          placeholder={t('collections.create.descriptionPlaceholder')}
          multiline
          numberOfLines={3}
        />

        <TouchableOpacity
          onPress={() => setIsPublic(!isPublic)}
          style={styles.privacyToggle}
        >
          <View style={styles.privacyContent}>
            <Ionicons
              name={isPublic ? 'globe-outline' : 'lock-closed-outline'}
              size={24}
              color={COLORS.gray[700]}
            />
            <View style={styles.privacyText}>
              <Text style={styles.privacyLabel}>
                {isPublic ? t('collections.public') : t('collections.create.private')}
              </Text>
              <Text style={styles.privacyDescription}>
                {isPublic
                  ? t('collections.create.publicDescription')
                  : t('collections.create.privateDescription')}
              </Text>
            </View>
          </View>
          <View style={[styles.toggleTrack, isPublic && styles.toggleTrackActive]}>
            <View style={[styles.toggleThumb, isPublic && styles.toggleThumbActive]} />
          </View>
        </TouchableOpacity>

        {/* Sección de selección de outfits */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('collections.create.selectOutfits', { count: selectedOutfits.length })}</Text>
          <Text style={styles.sectionSubtitle}>{t('collections.create.selectOutfitsSubtitle')}</Text>

          {/* Filters */}
          {outfits.length > 0 && (
            <View style={styles.filterContainer}>
              <View style={styles.searchRow}>
                <View style={styles.searchInputWrapper}>
                  <Ionicons name="search-outline" size={18} color="#9CA3AF" style={styles.searchIcon} />
                  <TextInput
                    style={styles.filterInput}
                    placeholder={t('collections.filterByName')}
                    placeholderTextColor="#9CA3AF"
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                  />
                  {searchQuery ? (
                    <TouchableOpacity onPress={() => setSearchQuery('')}>
                      <Ionicons name="close-circle" size={18} color="#9CA3AF" />
                    </TouchableOpacity>
                  ) : null}
                </View>
              </View>

              <View style={styles.filterRow}>
                <View style={[styles.searchInputWrapper, { flex: 1 }]}>
                  <Ionicons name="calendar-outline" size={18} color="#9CA3AF" style={styles.searchIcon} />
                  <TextInput
                    style={styles.filterInput}
                    placeholder={t('collections.filterByOccasion')}
                    placeholderTextColor="#9CA3AF"
                    value={occasionFilter}
                    onChangeText={setOccasionFilter}
                  />
                  {occasionFilter ? (
                    <TouchableOpacity onPress={() => setOccasionFilter('')}>
                      <Ionicons name="close-circle" size={18} color="#9CA3AF" />
                    </TouchableOpacity>
                  ) : null}
                </View>
              </View>

              {/* Season chips */}
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipsScroll}>
                <TouchableOpacity
                  style={[styles.chip, seasonFilter === 'all' && styles.chipActive]}
                  onPress={() => setSeasonFilter('all')}
                >
                  <Text style={[styles.chipText, seasonFilter === 'all' && styles.chipTextActive]}>
                    {t('collections.allSeasons')}
                  </Text>
                </TouchableOpacity>
                {SEASONS.map((s) => (
                  <TouchableOpacity
                    key={s.value}
                    style={[styles.chip, seasonFilter === s.value && styles.chipActive]}
                    onPress={() => setSeasonFilter(seasonFilter === s.value ? 'all' : s.value)}
                  >
                    <Text style={[styles.chipText, seasonFilter === s.value && styles.chipTextActive]}>
                      {seasonLabels[s.value] || s.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}
          
          {filteredOutfits.length === 0 ? (
            <View style={styles.emptyOutfits}>
              <Ionicons name="shirt-outline" size={40} color="#D1D5DB" />
              <Text style={styles.emptyText}>{outfits.length === 0 ? t('collections.create.noOutfits') : t('collections.emptyFilterResult')}</Text>
              <Text style={styles.emptySubtext}>{outfits.length === 0 ? t('collections.create.noOutfitsSubtext') : t('collections.tryDifferentFilter')}</Text>
            </View>
          ) : (
            <View style={styles.outfitsGrid}>
              {filteredOutfits.map((outfit) => {
                const isSelected = selectedOutfits.includes(outfit.id);
                const garments = outfit.garments || [];
                const currentIndex = carouselIndexes[outfit.id] || 0;
                const currentGarment = garments[currentIndex];
                const hasMultipleGarments = garments.length > 1;
                
                return (
                  <TouchableOpacity
                    key={outfit.id}
                    onPress={() => toggleOutfit(outfit.id)}
                    style={[styles.outfitItem, isSelected && styles.outfitItemSelected]}
                  >
                    {/* Checkbox */}
                    <View style={styles.checkboxContainer}>
                      <View style={[styles.checkbox, isSelected && styles.checkboxSelected]}>
                        {isSelected && <Ionicons name="checkmark" size={16} color="white" />}
                      </View>
                    </View>

                    {/* Outfit Image with Carousel */}
                    <View style={styles.outfitImageContainer}>
                      {currentGarment?.imageUrl ? (
                        <>
                          <Image
                            source={{ uri: currentGarment.imageUrl }}
                            style={{ width: '100%', height: '100%' }}
                            resizeMode="contain"
                          />
                          
                          {/* Navigation Arrows */}
                          {hasMultipleGarments && (
                            <>
                              <TouchableOpacity
                                style={styles.carouselArrowLeft}
                                onPress={(e) => {
                                  e.stopPropagation();
                                  goToPrevImage(outfit.id, garments.length - 1);
                                }}
                                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                              >
                                <Ionicons name="chevron-back" size={18} color="#FFFFFF" />
                              </TouchableOpacity>
                              
                              <TouchableOpacity
                                style={styles.carouselArrowRight}
                                onPress={(e) => {
                                  e.stopPropagation();
                                  goToNextImage(outfit.id, garments.length - 1);
                                }}
                                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                              >
                                <Ionicons name="chevron-forward" size={18} color="#FFFFFF" />
                              </TouchableOpacity>
                              
                              {/* Pagination Dots */}
                              <View style={styles.carouselDots}>
                                {garments.map((_, index) => (
                                  <View
                                    key={index}
                                    style={[
                                      styles.carouselDot,
                                      index === currentIndex && styles.carouselDotActive,
                                    ]}
                                  />
                                ))}
                              </View>
                            </>
                          )}
                        </>
                      ) : (
                        <View style={styles.outfitPlaceholder}>
                          <Ionicons name="shirt-outline" size={32} color="#D1D5DB" />
                        </View>
                      )}
                    </View>

                    {/* Outfit Info */}
                    <View style={styles.outfitInfo}>
                      <Text style={styles.outfitName} numberOfLines={1}>{outfit.name}</Text>
                      <View style={styles.outfitMetaRow}>
                        <Text style={styles.outfitGarments}>
                          {t('collections.create.garmentCount', { count: outfit.garments?.length || 0 })}
                        </Text>
                        {outfit.occasion ? (
                          <Text style={styles.outfitOccasion}>{outfit.occasion}</Text>
                        ) : null}
                      </View>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </View>

        {selectedOutfits.length < 2 && selectedOutfits.length > 0 && (
          <View style={styles.minOutfitsContainer}>
            <Text style={styles.minOutfitsText}>
              {t('collections.create.minOutfits', { count: selectedOutfits.length })}
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Botón sticky — siempre visible al fondo */}
      <View style={styles.stickyButtonContainer}>
        <Button
          title={t('collections.create.button')}
          onPress={handleCreate}
          loading={isLoading}
          disabled={!isValidForm}
          fullWidth
        />
      </View>

      {/* Success Modal */}
      <Modal
        visible={showSuccessModal}
        type="success"
        title={t('collections.create.successTitle')}
        message={t('collections.create.successMessage')}
        actions={[
          {
            text: t('collections.create.createAnother'),
            onPress: handleCreateAnother,
            variant: 'primary',
          },
          {
            text: t('collections.create.goToCollections'),
            onPress: handleGoToCollections,
            variant: 'secondary',
          },
        ]}
        onClose={handleGoToCollections}
      />

      {/* Error Modal */}
      <Modal
        visible={showErrorModal}
        type="error"
        title={t('common.error')}
        message={errorMessage}
        actions={[
          {
            text: t('common.ok'),
            onPress: () => setShowErrorModal(false),
            variant: 'primary',
          },
        ]}
        onClose={() => setShowErrorModal(false)}
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
    paddingVertical: 16,
    backgroundColor: 'white',
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    marginLeft: 16,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 32,
  },
  privacyToggle: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  privacyContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  privacyText: {
    marginLeft: 12,
  },
  privacyLabel: {
    color: '#111827',
    fontWeight: '500',
    fontSize: 16,
  },
  privacyDescription: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 2,
  },
  toggleTrack: {
    width: 48,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#D1D5DB',
    justifyContent: 'center',
  },
  toggleTrackActive: {
    backgroundColor: COLORS.primary,
  },
  toggleThumb: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'white',
    marginLeft: 2,
  },
  toggleThumbActive: {
    marginLeft: 26,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 16,
  },
  outfitsGrid: {
    gap: 16,
  },
  outfitItem: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  outfitItemSelected: {
    borderColor: COLORS.primary,
    backgroundColor: '#F0F9FF',
    shadowOpacity: 0.15,
  },
  checkboxContainer: {
    marginRight: 16,
  },
  checkbox: {
    width: 28,
    height: 28,
    borderRadius: 8,
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
  outfitImageContainer: {
    width: 80,
    height: 80,
    borderRadius: 12,
    overflow: 'hidden',
    marginRight: 16,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    position: 'relative',
  },
  carouselArrowLeft: {
    position: 'absolute',
    left: 4,
    top: '50%',
    transform: [{ translateY: -12 }],
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2,
  },
  carouselArrowRight: {
    position: 'absolute',
    right: 4,
    top: '50%',
    transform: [{ translateY: -12 }],
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2,
  },
  carouselDots: {
    position: 'absolute',
    bottom: 4,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 3,
    zIndex: 1,
  },
  carouselDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
  },
  carouselDotActive: {
    backgroundColor: '#FFFFFF',
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  outfitImage: {
    width: '100%',
    height: '100%',
  },
  outfitPlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
  },
  outfitInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  outfitName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  outfitGarments: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  emptyOutfits: {
    alignItems: 'center',
    paddingVertical: 40,
    backgroundColor: 'white',
    borderRadius: 12,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6B7280',
    marginTop: 12,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#9CA3AF',
    marginTop: 4,
  },
  filterContainer: {
    marginBottom: 16,
    gap: 8,
  },
  searchRow: {
    flexDirection: 'row',
    gap: 8,
  },
  searchInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingHorizontal: 12,
    height: 40,
    flex: 1,
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
  filterRow: {
    flexDirection: 'row',
    gap: 8,
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
  outfitMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  outfitOccasion: {
    fontSize: 12,
    color: COLORS.primary,
    fontWeight: '500',
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    overflow: 'hidden',
  },
  minOutfitsContainer: {
    paddingHorizontal: 24,
    paddingBottom: 8,
  },
  minOutfitsText: {
    fontSize: 14,
    color: '#EF4444',
    fontWeight: '500',
  },
  stickyButtonContainer: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
  },
});

/**
 * Create Outfit Screen
 * Pantalla para crear un nuevo outfit seleccionando prendas
 */

import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Alert, StyleSheet, TextInput, ActivityIndicator, Modal as RNModal } from 'react-native';
import { Image } from 'expo-image';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Button, Input, EmptyState, Modal, OutfitPreview } from '@/components';
import { useAuth } from '@/hooks/useAuth';
import { useGarments } from '@/hooks/useGarments';
import { useOutfits } from '@/hooks/useOutfits';
import { SEASONS, COLORS, GARMENT_CATEGORIES, OCCASIONS, GARMENT_STYLES } from '@/lib/constants';
import { useTranslation } from '@/hooks/useTranslation';
import { useSuggestionsStore } from '@/store/suggestionsStore';
import { useOutfitsStore } from '@/store/outfitsStore';
import { generateRandomOutfit } from '@/utils';
import type { GarmentSeason, Garment, GarmentStyle } from '@/types';
import type { Occasion } from '@/utils/randomOutfit';

export default function CreateOutfitScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const isEditMode = !!id;
  const { user } = useAuth();
  const { garments } = useGarments(true);
  const { createOutfit, updateOutfit, loadOutfitById, currentOutfit } = useOutfits();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [occasion, setOccasion] = useState('casual');
  const [season, setSeason] = useState<GarmentSeason>('all_season');
  const [selectedGarments, setSelectedGarments] = useState<Garment[]>([]);
  const [errors, setErrors] = useState<{ name?: string; garments?: string }>({});
  const [isLoading, setIsLoading] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [isLoadingEdit, setIsLoadingEdit] = useState(() => {
    if (!isEditMode) return false;
    const store = useOutfitsStore.getState();
    // No mostrar loading si el outfit ya está cargado en caché
    if (store.currentOutfit?.id === id) return false;
    if (store.outfits.some((o) => o.id === id)) return false;
    return true;
  });
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [hasGenerated, setHasGenerated] = useState(false);
  const [showStyleModal, setShowStyleModal] = useState(false);
  const [selectedRandomStyles, setSelectedRandomStyles] = useState<GarmentStyle[]>([]);

  // Pre-fill form in edit mode
  useEffect(() => {
    if (!isEditMode || !id) return;

    const outfit = currentOutfit?.id === id ? currentOutfit : null;
    if (outfit) {
      // Already loaded (e.g. from detail screen), pre-fill immediately
      setName(outfit.name || '');
      setDescription(outfit.description || '');
      setOccasion(outfit.occasion || 'casual');
      setSeason(outfit.season || 'all_season');
      if (outfit.garments) {
        setSelectedGarments(outfit.garments);
      }
      setIsLoadingEdit(false);
      return;
    }

    // Not loaded yet — show spinner and load
    (async () => {
      setIsLoadingEdit(true);
      await loadOutfitById(id);
      const loaded = useOutfitsStore.getState().currentOutfit;
      if (loaded && loaded.id === id) {
        setName(loaded.name || '');
        setDescription(loaded.description || '');
        setOccasion(loaded.occasion || 'casual');
        setSeason(loaded.season || 'all_season');
        if (loaded.garments) {
          setSelectedGarments(loaded.garments);
        }
      }
      setIsLoadingEdit(false);
    })();
  }, [isEditMode, id]); // only on mount/id change, not on currentOutfit changes

  const weather = useSuggestionsStore((state) => state.weather);

  const { t } = useTranslation();

  const categoryLabels = useMemo(() => ({
    tops: t('garments.category.tops'),
    bottoms: t('garments.category.bottoms'),
    dresses: t('garments.category.dresses'),
    outerwear: t('garments.category.outerwear'),
    shoes: t('garments.category.shoes'),
    accessories: t('garments.category.accessories'),
    bags: t('garments.category.bags'),
    other: t('garments.category.other'),
  } as Record<string, string>), [t]);

  const seasonLabels = useMemo(() => ({
    spring: t('outfits.create.seasonSpring'),
    summer: t('outfits.create.seasonSummer'),
    fall: t('outfits.create.seasonFall'),
    winter: t('outfits.create.seasonWinter'),
    'all_season': t('outfits.create.seasonAll'),
  } as Record<string, string>), [t]);

  const toggleGarment = (garment: Garment) => {
    if (selectedGarments.find((g) => g.id === garment.id)) {
      setSelectedGarments(selectedGarments.filter((g) => g.id !== garment.id));
      setErrors({ ...errors, garments: undefined });
    } else {
      setSelectedGarments([...selectedGarments, garment]);
      setErrors({ ...errors, garments: undefined });
    }
  };

  const handleOpenStyleSelector = useCallback(() => {
    setGenerationError(null);
    setSelectedRandomStyles([]);
    setShowStyleModal(true);
  }, []);

  const handleGenerateWithStyles = useCallback(() => {
    setShowStyleModal(false);
    const result = generateRandomOutfit(garments, occasion as Occasion, weather, selectedRandomStyles.length > 0 ? selectedRandomStyles : undefined);
    if (result.error) {
      setGenerationError(result.error);
      return;
    }
    setSelectedGarments(result.outfit);
    setHasGenerated(true);
  }, [garments, occasion, weather, selectedRandomStyles]);

  const toggleRandomStyle = useCallback((style: GarmentStyle) => {
    setSelectedRandomStyles((prev) => {
      const isSelected = prev.includes(style);
      if (isSelected) return prev.filter((s) => s !== style);
      if (prev.length >= 2) return prev; // max 2
      return [...prev, style];
    });
  }, []);

  // Filtrar prendas por categoría y búsqueda
  const filteredGarments = useMemo(() => {
    let filtered = garments;
    
    // Filtrar por categoría
    if (filterCategory !== 'all') {
      filtered = filtered.filter(g => g.category === filterCategory);
    }
    
    // Filtrar por búsqueda de texto
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      filtered = filtered.filter(g => 
        g.name.toLowerCase().includes(query) ||
        g.brand?.toLowerCase().includes(query) ||
        g.color?.toLowerCase().includes(query) ||
        g.notes?.toLowerCase().includes(query)
      );
    }
    
    return filtered;
  }, [garments, filterCategory, searchQuery]);

  // Verificar si el formulario está completo
  const isFormComplete = useMemo(() => {
    return name.trim().length > 0 && selectedGarments.length > 0;
  }, [name, selectedGarments]);

  const validate = () => {
    const newErrors: { name?: string; garments?: string } = {};

    if (!name.trim()) {
      newErrors.name = t('outfits.create.errorNameRequired');
    }

    if (selectedGarments.length === 0) {
      newErrors.garments = t('outfits.create.errorGarmentsRequired');
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validate() || !user) return;

    setIsLoading(true);
    const data = {
      name: name.trim(),
      description: description.trim() || undefined,
      occasion: occasion.trim() || undefined,
      season,
      garmentIds: selectedGarments.map((g) => g.id),
    };

    if (isEditMode && id) {
      const success = await updateOutfit(id, data);
      setIsLoading(false);
      if (success) {
        setShowSuccessModal(true);
      }
    } else {
      const outfit = await createOutfit(user.id, data, selectedGarments);
      setIsLoading(false);
      if (outfit) {
        setShowSuccessModal(true);
      }
    }
  };

  if (garments.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color="#111827" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{isEditMode ? t('outfits.editTitle') : t('outfits.createOutfit')}</Text>
        </View>
        <EmptyState
          icon="shirt-outline"
          title={t('outfits.create.noGarments')}
          message={t('outfits.create.noGarmentsMessage')}
          actionLabel={t('outfits.create.noGarmentsAction')}
          onAction={() => router.push('/garments/create')}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{isEditMode ? t('outfits.editTitle') : t('outfits.createOutfit')}</Text>
      </View>

      {isLoadingEdit && (
        <View style={styles.editLoadingOverlay}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      )}
      <ScrollView 
        style={styles.scrollView} 
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.formContainer}>
          {/* Nombre del Outfit */}
          <Input
            label={t('outfits.create.name')}
            value={name}
            onChangeText={(text) => {
              setName(text);
              setErrors({ ...errors, name: undefined });
            }}
            placeholder={t('outfits.create.namePlaceholder')}
            error={errors.name}
            maxLength={50}
          />

          {/* Descripción */}
          <Input
            label={t('outfits.create.description')}
            value={description}
            onChangeText={setDescription}
            placeholder={t('outfits.create.descriptionPlaceholder')}
            multiline
            numberOfLines={3}
          />

          {/* Ocasión — chip picker */}
          <View style={styles.section}>
            <Text style={styles.label}>{t('outfits.create.occasion')}</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.seasonScroll}
            >
              {OCCASIONS.map((o) => (
                <TouchableOpacity
                  key={o.value}
                  onPress={() => {
                    setOccasion(o.value);
                    setHasGenerated(false);
                    setGenerationError(null);
                  }}
                  style={[
                    styles.chip,
                    occasion === o.value ? styles.chipActiveSecondary : styles.chipInactive,
                  ]}
                >
                  <Text style={occasion === o.value ? styles.chipTextActive : styles.chipTextInactive}>
                    {o.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {/* Temporada */}
          <View style={styles.section}>
            <Text style={styles.label}>{t('outfits.create.season')}</Text>
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.seasonScroll}
            >
              {SEASONS.map((s) => (
                <TouchableOpacity
                  key={s.value}
                  onPress={() => setSeason(s.value as GarmentSeason)}
                  style={[
                    styles.chip,
                    season === s.value ? styles.chipActiveSecondary : styles.chipInactive,
                  ]}
                >
                  <Text style={season === s.value ? styles.chipTextActive : styles.chipTextInactive}>
                    {seasonLabels[s.value]}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {/* Generar Outfit Aleatorio */}
          <View style={styles.section}>
            {generationError && (
              <View style={styles.generateErrorBanner}>
                <Ionicons name="alert-circle" size={18} color="#EF4444" />
                <Text style={styles.generateErrorText}>{generationError}</Text>
              </View>
            )}
            {hasGenerated ? (
              <TouchableOpacity
                onPress={handleOpenStyleSelector}
                style={styles.generateButton}
                activeOpacity={0.8}
              >
                <Ionicons name="refresh" size={20} color="#FFFFFF" style={styles.generateButtonIcon} />
                <Text style={styles.generateButtonText}>Probar otro outfit</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                onPress={handleOpenStyleSelector}
                style={styles.generateButton}
                activeOpacity={0.8}
              >
                <Ionicons name="dice" size={20} color="#FFFFFF" style={styles.generateButtonIcon} />
                <Text style={styles.generateButtonText}>Generar Outfit Aleatorio</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Outfit Preview - Muestra el outfit completo */}
          {selectedGarments.length > 0 && (
            <View style={styles.previewSection}>
              <Text style={styles.label}>{t('outfits.create.preview')}</Text>
              <OutfitPreview selectedGarments={selectedGarments} />
            </View>
          )}

          {/* Seleccionar Prendas */}
          <View style={styles.section}>
            <View style={styles.labelRow}>
              <Text style={styles.label}>{t('outfits.create.selectGarments')}</Text>
              <View style={styles.badge}>
                <Text style={styles.badgeText}>
                  {t('outfits.create.garmentCount', { count: selectedGarments.length })}
                </Text>
              </View>
            </View>
            {errors.garments && (
              <Text style={styles.errorText}>{errors.garments}</Text>
            )}

            {/* Barra de Búsqueda */}
            <View style={styles.searchContainer}>
              <Ionicons name="search" size={20} color="#9CA3AF" style={styles.searchIcon} />
              <TextInput
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholder={t('outfits.create.searchPlaceholder')}
                placeholderTextColor="#9CA3AF"
                style={styles.searchInput}
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setSearchQuery('')} style={styles.clearButton}>
                  <Ionicons name="close-circle" size={20} color="#9CA3AF" />
                </TouchableOpacity>
              )}
            </View>

            {/* Filtros de Categoría */}
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false}
              style={styles.filterScroll}
              contentContainerStyle={styles.filterContent}
            >
              <TouchableOpacity
                onPress={() => setFilterCategory('all')}
                style={[
                  styles.filterChip,
                  filterCategory === 'all' && styles.filterChipActive,
                ]}
              >
                <Ionicons 
                  name="grid-outline" 
                  size={16} 
                  color={filterCategory === 'all' ? '#FFFFFF' : '#6B7280'} 
                  style={styles.filterIcon}
                />
                <Text style={[
                  styles.filterText,
                  filterCategory === 'all' && styles.filterTextActive,
                ]}>
                  {t('garments.category.all')}
                </Text>
              </TouchableOpacity>
              {GARMENT_CATEGORIES.map((cat) => (
                <TouchableOpacity
                  key={cat.value}
                  onPress={() => setFilterCategory(cat.value)}
                  style={[
                    styles.filterChip,
                    filterCategory === cat.value && styles.filterChipActive,
                  ]}
                >
                  <Text style={[
                    styles.filterText,
                    filterCategory === cat.value && styles.filterTextActive,
                  ]}>
                    {categoryLabels[cat.value]}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <View style={styles.garmentGrid}>
              {filteredGarments.map((garment) => {
                const isSelected = !!selectedGarments.find((g) => g.id === garment.id);
                return (
                  <TouchableOpacity
                    key={garment.id}
                    onPress={() => toggleGarment(garment)}
                    style={styles.garmentCard}
                    activeOpacity={0.7}
                  >
                    <View style={[
                      styles.cardContainer,
                      isSelected && styles.cardSelected,
                    ]}>
                      {/* Imagen */}
                      <View style={styles.imageWrapper}>
                        <Image
                          source={{ uri: garment.imageUrl }}
                          style={styles.cardImage}
                          contentFit="contain"
                          cachePolicy="memory-disk"
                        />
                        {isSelected && (
                          <View style={styles.selectedOverlay}>
                            <View style={styles.checkmarkBadge}>
                              <Ionicons name="checkmark-circle" size={28} color={COLORS.primary} />
                            </View>
                          </View>
                        )}
                      </View>
                      
                      {/* Información de la prenda */}
                      <View style={styles.cardInfo}>
                        <Text style={styles.cardTitle} numberOfLines={1}>
                          {garment.name}
                        </Text>
                        <Text style={styles.cardBrand} numberOfLines={1}>
                          {garment.brand || t('outfits.create.withoutBrand')}
                        </Text>
                        <View style={styles.cardFooter}>
                          <Text style={styles.cardCategory}>
                            {categoryLabels[garment.category] || garment.category}
                          </Text>
                        </View>
                      </View>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

        </View>
      </ScrollView>

      {/* Botón sticky — siempre visible al fondo */}
      <View style={styles.stickyButtonContainer}>
        <Button
          title={isEditMode ? t('common.saveChanges') : t('outfits.createOutfit')}
          onPress={handleSave}
          loading={isLoading}
          disabled={!isFormComplete || isLoading}
          fullWidth
        />
      </View>

      {/* Modal de Éxito */}
      <Modal
        visible={showSuccessModal}
        type="success"
        title={isEditMode ? t('outfits.editSuccessTitle') : t('outfits.create.successTitle')}
        message={isEditMode ? t('outfits.editSuccessMessage') : t('outfits.create.successMessage')}
        actions={
          isEditMode
            ? [
                {
                  text: t('outfits.editBackToDetail'),
                  onPress: () => {
                    setShowSuccessModal(false);
                    router.back();
                  },
                  variant: 'primary' as const,
                },
              ]
            : [
                {
                  text: t('outfits.create.createAnother'),
                  onPress: () => {
                    setShowSuccessModal(false);
                    setName('');
                    setDescription('');
                    setOccasion('casual');
                    setSeason('all_season');
                    setSelectedGarments([]);
                    setErrors({});
                    setGenerationError(null);
                    setHasGenerated(false);
                  },
                  variant: 'primary',
                },
                {
                  text: t('outfits.create.viewOutfits'),
                  onPress: () => {
                    setShowSuccessModal(false);
                    router.push('/(tabs)/home');
                  },
                  variant: 'secondary',
                },
              ]
        }
      />

      {/* Modal de selección de estilos para outfit aleatorio */}
      <RNModal
        visible={showStyleModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowStyleModal(false)}
      >
        <TouchableOpacity
          style={styles.styleModalBackdrop}
          activeOpacity={1}
          onPress={() => setShowStyleModal(false)}
        >
          <TouchableOpacity
            style={styles.styleModalContainer}
            activeOpacity={1}
            onPress={(e) => e.stopPropagation()}
          >
            {/* Close */}
            <TouchableOpacity
              style={styles.styleModalClose}
              onPress={() => setShowStyleModal(false)}
            >
              <Ionicons name="close" size={24} color="#6B7280" />
            </TouchableOpacity>

            {/* Title */}
            <Text style={styles.styleModalTitle}>{t('outfits.create.styleSelectionTitle')}</Text>
            <Text style={styles.styleModalSubtitle}>{t('outfits.create.styleSelectionSubtitle')}</Text>

            {/* Style chips */}
            <View style={styles.styleChipGrid}>
              {GARMENT_STYLES.map((style) => {
                const isSelected = selectedRandomStyles.includes(style.value as GarmentStyle);
                const isMaxed = selectedRandomStyles.length >= 2 && !isSelected;
                return (
                  <TouchableOpacity
                    key={style.value}
                    onPress={() => toggleRandomStyle(style.value as GarmentStyle)}
                    style={[
                      styles.styleChip,
                      isSelected && styles.styleChipActive,
                      isMaxed && styles.styleChipDisabled,
                    ]}
                    disabled={isMaxed}
                  >
                    <Text style={[
                      styles.styleChipText,
                      isSelected && styles.styleChipTextActive,
                      isMaxed && styles.styleChipTextDisabled,
                    ]}>
                      {t(`outfits.create.style${style.value.charAt(0).toUpperCase() + style.value.slice(1)}` as any)}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <Text style={styles.styleModalHint}>{t('outfits.create.styleSelectionPick')}</Text>

            {/* Generate button — always enabled; no styles = fall back to occasion filter */}
            <Button
              title={t('outfits.create.styleSelectionGenerate')}
              onPress={handleGenerateWithStyles}
              fullWidth
            />
          </TouchableOpacity>
        </TouchableOpacity>
      </RNModal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F4F5F7',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
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
    paddingBottom: 100,
  },
  editLoadingOverlay: {
    position: 'absolute',
    top: 60,
    left: 0,
    right: 0,
    bottom: 80,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(244, 245, 247, 0.8)',
    zIndex: 10,
  },
  formContainer: {
    padding: 20,
  },
  section: {
    marginBottom: 24,
  },
  previewSection: {
    marginBottom: 24,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 12,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  badge: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginBottom: 16,
    paddingHorizontal: 16,
    paddingVertical: 4,
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  searchIcon: {
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    height: 40,
    fontSize: 14,
    color: '#111827',
    paddingVertical: 8,
  },
  clearButton: {
    padding: 8,
    marginLeft: 4,
  },
  filterScroll: {
    marginBottom: 16,
  },
  filterContent: {
    paddingRight: 20,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    marginRight: 8,
    backgroundColor: '#E5E7EB',
  },
  filterChipActive: {
    backgroundColor: COLORS.primary,
  },
  filterIcon: {
    marginRight: 6,
  },
  filterText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
  },
  filterTextActive: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  seasonScroll: {
    paddingRight: 20,
  },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    marginRight: 8,
    borderWidth: 1,
  },
  chipInactive: {
    backgroundColor: '#F3F4F6',
    borderColor: '#E5E7EB',
  },
  chipActiveSecondary: {
    backgroundColor: COLORS.secondary,
    borderColor: COLORS.secondary,
  },
  chipTextInactive: {
    color: '#6B7280',
    fontSize: 14,
    fontWeight: '500',
  },
  chipTextActive: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  garmentGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -8,
  },
  garmentCard: {
    width: '50%',
    padding: 8,
  },
  cardContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardSelected: {
    borderColor: COLORS.primary,
    borderWidth: 3,
  },
  imageWrapper: {
    position: 'relative',
    width: '100%',
    aspectRatio: 1,
    backgroundColor: '#F9FAFB',
  },
  cardImage: {
    width: '100%',
    height: '100%',
  },
  selectedOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(98, 217, 199, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkmarkBadge: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 4,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  cardInfo: {
    padding: 12,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  cardBrand: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 8,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardCategory: {
    fontSize: 11,
    color: '#6B7280',
    textTransform: 'capitalize',
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  errorText: {
    color: '#EF4444',
    fontSize: 12,
    marginTop: -8,
    marginBottom: 8,
  },
  stickyButtonContainer: {
    paddingHorizontal: 20,
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
  generateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.secondary,
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    shadowColor: COLORS.secondary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  generateButtonIcon: {
    marginRight: 8,
  },
  generateButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  generateErrorBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
  },
  generateErrorText: {
    flex: 1,
    color: '#DC2626',
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 10,
    lineHeight: 20,
  },
  // Style modal
  styleModalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  styleModalContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  styleModalClose: {
    position: 'absolute',
    top: 16,
    right: 16,
    zIndex: 1,
    padding: 4,
  },
  styleModalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    textAlign: 'center',
    marginBottom: 8,
  },
  styleModalSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 20,
  },
  styleChipGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 10,
    marginBottom: 16,
  },
  styleChip: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 24,
    backgroundColor: '#F3F4F6',
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
  },
  styleChipActive: {
    backgroundColor: COLORS.secondary,
    borderColor: COLORS.secondary,
  },
  styleChipDisabled: {
    opacity: 0.4,
  },
  styleChipText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#374151',
  },
  styleChipTextActive: {
    color: '#FFFFFF',
  },
  styleChipTextDisabled: {
    color: '#9CA3AF',
  },
  styleModalHint: {
    fontSize: 13,
    color: '#9CA3AF',
    textAlign: 'center',
    marginBottom: 20,
  },
});

/**
 * Create Garment Screen
 * Pantalla para crear una nueva prenda
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { View, Text, ScrollView, Image, Alert, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Button, Input, Modal, GarmentVisibilityForm } from '@/components';
import { useAuth } from '@/hooks/useAuth';
import { useGarments } from '@/hooks/useGarments';
import { useImagePicker } from '@/hooks/useImagePicker';
import { useAIAnalysis } from '@/hooks/useAIAnalysis';
import { useTranslation } from '@/hooks/useTranslation';
import { usePhotoTip } from '@/hooks/usePhotoTip';
import { useAuthStore } from '@/store/authStore';
import { GARMENT_CATEGORIES, SEASONS, GARMENT_STYLES, COLORS } from '@/lib/constants';
import type { GarmentCategory, GarmentSeason, GarmentStyle, ListingType } from '@/types';

export default function CreateGarmentScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { t } = useTranslation();
  const { user } = useAuth();
  const token = useAuthStore((state) => state.token);
  const { createGarment, getGarmentById, updateGarment } = useGarments();
  const { imageUri, isUploading, pickImage, capturePhoto, uploadGarmentImage, resetImage } = useImagePicker();
  const { isAnalyzing, analyzeImage } = useAIAnalysis();

  const [name, setName] = useState('');
  const [category, setCategory] = useState<GarmentCategory>('tops');
  const [brand, setBrand] = useState('');
  const [noBrand, setNoBrand] = useState(false);
  const [color, setColor] = useState('');
  const [seasons, setSeasons] = useState<GarmentSeason[]>(['all_season']);
  const [selectedStyles, setSelectedStyles] = useState<GarmentStyle[]>([]);
  const [notes, setNotes] = useState('');
  const [isPublic, setIsPublic] = useState(false);
  const [listingType, setListingType] = useState<ListingType | null>(null);
  const [errors, setErrors] = useState<{ 
    name?: string; 
    image?: string; 
    brand?: string;
    color?: string;
    season?: string;
  }>({});
  const [isLoading, setIsLoading] = useState(false);
  const [lastAnalyzedUri, setLastAnalyzedUri] = useState<string | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editImageUri, setEditImageUri] = useState<string | null>(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showEditSuccessModal, setShowEditSuccessModal] = useState(false);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isFormEnabled, setIsFormEnabled] = useState(false);
  const [aiDetected, setAiDetected] = useState(false);
  const { showTip, dismissTip, tipVisible, tipTitle, tipMessage, tipType } = usePhotoTip();

  // Cargar datos de la prenda si estamos editando
  useEffect(() => {
    if (id) {
      setIsEditMode(true);
      const garment = getGarmentById(id);
      if (garment) {
        setName(garment.name);
        setCategory(garment.category);
        setBrand(garment.brand || '');
        setNoBrand(!garment.brand);
        setColor(garment.color || '');
        // Manejar season como array o string
        if (Array.isArray(garment.season)) {
          setSeasons(garment.season);
        } else {
          setSeasons(garment.season ? [garment.season] : ['all_season']);
        }
        // Manejar style como array o string
        if (Array.isArray(garment.style)) {
          setSelectedStyles(garment.style);
        } else if (garment.style) {
          setSelectedStyles([garment.style]);
        } else {
          setSelectedStyles([]);
        }
        setNotes(garment.notes || '');
        setIsPublic((garment as any).is_public ?? false);
        setListingType((garment as any).listing_type ?? null);
        setEditImageUri(garment.image_url);
        setLastAnalyzedUri(garment.image_url);
        setIsFormEnabled(true); // Habilitar formulario en modo edición
      }
    }
  }, [id]);

  // Analizar imagen automáticamente cuando cambia imageUri
  useEffect(() => {
    if (imageUri && imageUri !== lastAnalyzedUri && !isAnalyzing && !isEditMode) {
      handleImageAnalysis();
    }
  }, [imageUri]);

  const handleImageAnalysis = async () => {
    if (!imageUri || imageUri === lastAnalyzedUri) return;
    
    setLastAnalyzedUri(imageUri);
    setIsFormEnabled(false);
    setAiDetected(false);
    const { analysis, error } = await analyzeImage(imageUri);
    
    if (analysis && analysis.confidence > 0.5) {
      // Auto-completar campos con la detección de IA
      setName(analysis.name);
      setCategory(analysis.category);
      setColor(analysis.color);
      setSeasons([analysis.season]);
      if (analysis.brand) setBrand(analysis.brand);
      if (analysis.description) setNotes(analysis.description);

      setIsFormEnabled(true);
      setAiDetected(true);

      const highConfidence = analysis.confidence > 0.7;
      Alert.alert(
        highConfidence ? t('garments.create.aiDetectedHigh') : t('garments.create.aiDetectedMedium'),
        `${analysis.name}\n\n${highConfidence ? t('garments.create.aiDetectedHighMessage') : t('garments.create.aiDetectedMediumMessage')}`,
        [{ text: t('garments.create.incompleteGotIt') }]
      );
    } else {
      // Si no se detectó con confianza, habilitar formulario para entrada manual
      setIsFormEnabled(true);
      if (error) {
        Alert.alert(t('garments.create.aiErrorTitle'), error, [{ text: t('garments.create.incompleteGotIt') }]);
      } else {
        Alert.alert(
          t('garments.create.aiNotDetectedTitle'),
          t('garments.create.aiNotDetectedMessage'),
          [{ text: t('garments.create.incompleteGotIt') }]
        );
      }
    }
  };

  const validate = useCallback(() => {
    const newErrors: { 
      name?: string; 
      image?: string; 
      brand?: string;
      color?: string;
      season?: string;
    } = {};

    if (!name.trim()) {
      newErrors.name = t('garments.create.errorNameRequired');
    }

    if (!imageUri && !editImageUri) {
      newErrors.image = t('garments.create.errorImageRequired');
    }

    if (!noBrand && !brand.trim()) {
      newErrors.brand = t('garments.create.errorBrandRequired');
    }

    if (!color.trim()) {
      newErrors.color = t('garments.create.errorColorRequired');
    }

    if (seasons.length === 0) {
      newErrors.season = t('garments.create.errorSeasonRequired');
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [name, imageUri, editImageUri, noBrand, brand, color, seasons]);

  // Manejar selección de temporadas
  const handleSeasonToggle = useCallback((seasonValue: GarmentSeason) => {
    if (seasonValue === 'all_season') {
      // Si se selecciona "Todas las Temporadas"
      setSeasons(prev => {
        // Si ya está seleccionada, desmarcarla
        if (prev.includes('all_season')) {
          return prev.filter(s => s !== 'all_season');
        }
        // Si no está seleccionada, limpiar las demás y solo dejar esta
        return ['all_season'];
      });
    } else {
      // Si se selecciona cualquier otra temporada
      setSeasons(prev => {
        // Si "Todas las Temporadas" estaba seleccionada, removerla
        const filtered = prev.filter(s => s !== 'all_season');
        
        // Toggle de la temporada seleccionada
        if (filtered.includes(seasonValue)) {
          return filtered.filter(s => s !== seasonValue);
        } else {
          return [...filtered, seasonValue];
        }
      });
    }
  }, []);

  // Manejar selección de estilos (multi-select)
  const handleStyleToggle = useCallback((styleValue: GarmentStyle) => {
    setSelectedStyles(prev => {
      if (prev.includes(styleValue)) {
        return prev.filter(s => s !== styleValue);
      } else {
        return [...prev, styleValue];
      }
    });
  }, []);

  // Verificar si el formulario está completo
  const isFormComplete = useMemo(() => {
    const hasImage = !!(imageUri || editImageUri);
    const hasName = name.trim().length > 0;
    const hasBrand = noBrand || brand.trim().length > 0;
    const hasColor = color.trim().length > 0;
    const hasSeason = seasons.length > 0;
    
    return hasImage && hasName && hasBrand && hasColor && hasSeason;
  }, [imageUri, editImageUri, name, noBrand, brand, color, seasons]);

  const handlePickWithOption = useCallback((isCamera: boolean) => {
    Alert.alert(
      t('garments.create.photo'),
      t('garments.create.cropOption'),
      [
        { text: t('garments.create.useFull'), onPress: () => {
          setAiDetected(false);
          showTip(() => isCamera ? capturePhoto(false) : pickImage(false));
        }},
        { text: t('garments.create.useCrop'), onPress: () => {
          setAiDetected(false);
          showTip(() => isCamera ? capturePhoto(true) : pickImage(true));
        }},
        { text: t('common.cancel'), style: 'cancel' },
      ]
    );
  }, [t, pickImage, capturePhoto, showTip, setAiDetected]);

  const handleCreate = useCallback(async () => {
    if (!user) {
      Alert.alert(
        t('common.error'),
        'Your session has expired. Please go back and log in again.',
        [{ text: t('common.ok') }]
      );
      return;
    }

    if (!validate()) {
      Alert.alert(
        t('garments.create.incompleteTitle'),
        t('garments.create.incompleteMessage'),
        [{ text: t('garments.create.incompleteGotIt') }]
      );
      return;
    }

    setIsLoading(true);

    try {
      const imageUrl = imageUri || editImageUri;
      
      // Determinar el valor de season a enviar
      const seasonValue = seasons.length === 1 ? seasons[0] : seasons;

      if (isEditMode && id) {
        // Preparar datos para actualizar
        const updateData = {
          name: name.trim(),
          category,
          brand: noBrand ? undefined : (brand.trim() || undefined),
          color: color.trim() || undefined,
          season: seasonValue,
          style: selectedStyles, // Send array (empty = clear styles)
          notes: notes.trim() || undefined,
          isPublic,
          ...(isPublic && listingType ? { listingType } : {}),
        };

        // Actualizar prenda existente (sin enviar image_url)
        const success = await updateGarment(id, updateData, token || undefined);

        setIsLoading(false);

        if (success) {
          setShowEditSuccessModal(true);
        } else {
          setErrorMessage(t('garments.create.errorUpdateFailed'));
          setShowErrorModal(true);
        }
      } else {
        // Crear nueva prenda
        const garment = await createGarment(user.id, {
          name: name.trim(),
          category,
          brand: noBrand ? undefined : (brand.trim() || undefined),
          color: color.trim() || undefined,
          season: seasonValue,
          style: selectedStyles.length > 0 ? selectedStyles : undefined,
          image_url: imageUrl || '',
          notes: notes.trim() || undefined,
          isPublic,
          ...(isPublic && listingType ? { listingType } : {}),
        }, token || undefined);

        setIsLoading(false);

        if (garment) {
          setShowSuccessModal(true);
        } else {
          setErrorMessage(t('garments.create.errorCreateFailed'));
          setShowErrorModal(true);
        }
      }
    } catch (error) {
      setIsLoading(false);
      console.error('Error creating/updating garment:', error);
      const errorMsg = error instanceof Error ? error.message : t('garments.create.errorGeneric');
      setErrorMessage(`${t('garments.create.errorGeneric')}: ${errorMsg}`);
      setShowErrorModal(true);
    }
  }, [validate, user, isEditMode, id, name, category, noBrand, brand, color, seasons, selectedStyles, notes, imageUri, editImageUri, token, createGarment, updateGarment, router]);

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{isEditMode ? t('garments.create.editTitle') : t('garments.create.title')}</Text>
      </View>

      <ScrollView 
        style={styles.scrollView} 
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.formContainer}>
          {/* Image Picker */}
          <View style={styles.section}>
            <View style={styles.labelRow}>
              <Text style={styles.label}>{t('garments.create.photo')}</Text>
              {isAnalyzing && (
                <View style={styles.aiAnalyzingBadge}>
                  <Ionicons name="sparkles" size={12} color={COLORS.secondary} />
                  <Text style={styles.aiAnalyzingText}>{t('garments.create.aiAnalyzing')}</Text>
                </View>
              )}
              {aiDetected && lastAnalyzedUri === imageUri && !isAnalyzing && !isEditMode && (
                <View style={styles.aiSuggestedBadge}>
                  <Ionicons name="checkmark-circle" size={12} color={COLORS.success} />
                  <Text style={styles.aiSuggestedText}>{t('garments.create.aiDetectedByAI')}</Text>
                </View>
              )}
            </View>
            {(imageUri || editImageUri) ? (
              <View style={styles.imagePreviewContainer}>
                <Image
                  source={{ uri: imageUri || editImageUri || '' }}
                  style={styles.imagePreview}
                  resizeMode="contain"
                />
                {!isEditMode && (
                  <TouchableOpacity
                    onPress={() => {
                      setLastAnalyzedUri(null);
                      setAiDetected(false);
                      handlePickWithOption(false);
                    }}
                    style={styles.changeImageButton}
                    disabled={isAnalyzing}
                  >
                    <Ionicons name="camera" size={24} color={COLORS.primary} />
                  </TouchableOpacity>
                )}
              </View>
            ) : (
              <View style={styles.imagePickerRow}>
                <TouchableOpacity
                  onPress={() => handlePickWithOption(false)}
                  style={styles.imagePickerButton}
                  disabled={isAnalyzing}
                >
                  <Ionicons name="images-outline" size={32} color="#9CA3AF" />
                  <Text style={styles.imagePickerText}>{t('garments.create.chooseFromGallery')}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => handlePickWithOption(true)}
                  style={styles.imagePickerButton}
                  disabled={isAnalyzing}
                >
                  <Ionicons name="camera-outline" size={32} color="#9CA3AF" />
                  <Text style={styles.imagePickerText}>{t('garments.create.takePhoto')}</Text>
                </TouchableOpacity>
              </View>
            )}
            {errors.image && <Text style={styles.errorText}>{errors.image}</Text>}
          </View>

          {!isFormEnabled && !isEditMode && imageUri && (
            <View style={styles.infoMessage}>
              <Ionicons name="information-circle" size={20} color={COLORS.secondary} />
              <Text style={styles.infoMessageText}>
                {isAnalyzing ? t('garments.create.aiInfoAnalyzing') : t('garments.create.aiInfoWaiting')}
              </Text>
            </View>
          )}

          {/* Mostrar formulario solo si hay imagen Y está habilitado, O si está en modo edición */}
          {((imageUri && isFormEnabled) || isEditMode) && (
            <>
              <Input
                label={t('garments.create.name')}
                value={name}
                onChangeText={(text) => {
                  if (text.length <= 30) {
                    setName(text);
                  }
                }}
                placeholder={t('garments.create.namePlaceholder')}
                error={errors.name}
                maxLength={30}
              />

              <View style={styles.section}>
                <Text style={styles.label}>{t('garments.create.category')}</Text>
                <View style={styles.chipContainer}>
                  {GARMENT_CATEGORIES.map((cat) => (
                    <TouchableOpacity
                      key={cat.value}
                      onPress={() => setCategory(cat.value as GarmentCategory)}
                      style={[
                        styles.chip,
                        category === cat.value ? styles.chipActive : styles.chipInactive,
                      ]}
                    >
                      <Text style={category === cat.value ? styles.chipTextActive : styles.chipTextInactive}>
                        {t('garments.category.' + cat.value)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <Input
                label={t('garments.create.brand')}
                value={brand}
                onChangeText={(text) => {
                  setBrand(text);
                  if (text.length > 0) setNoBrand(false);
                  setErrors({ ...errors, brand: undefined });
                }}
                placeholder={t('garments.create.brandPlaceholder')}
                error={errors.brand}
                editable={!noBrand}
              />

              <TouchableOpacity
                style={styles.checkboxRow}
                onPress={() => {
                  setNoBrand(!noBrand);
                  if (!noBrand) {
                    setBrand('');
                    setErrors({ ...errors, brand: undefined });
                  }
                }}
                activeOpacity={0.7}
              >
                <View style={[styles.checkbox, noBrand && styles.checkboxActive]}>
                  {noBrand && <Ionicons name="checkmark" size={16} color="#FFFFFF" />}
                </View>
                <Text style={styles.checkboxLabel}>{t('garments.create.noBrand')}</Text>
              </TouchableOpacity>

              <Input
                label={t('garments.create.color')}
                value={color}
                onChangeText={(text) => {
                  setColor(text);
                  setErrors({ ...errors, color: undefined });
                }}
                placeholder={t('garments.create.colorPlaceholder')}
                error={errors.color}
              />

              <View style={styles.section}>
                <Text style={styles.label}>{t('garments.create.season')}</Text>
                <View style={styles.chipContainer}>
                  {SEASONS.map((s) => {
                    const isAllSeason = s.value === 'all_season';
                    const isSelected = seasons.includes(s.value as GarmentSeason);
                    const isDisabled = !isAllSeason && seasons.includes('all_season');
                    
                    return (
                      <TouchableOpacity
                        key={s.value}
                        onPress={() => {
                          handleSeasonToggle(s.value as GarmentSeason);
                          setErrors({ ...errors, season: undefined });
                        }}
                        disabled={isDisabled}
                        style={[
                          styles.chip,
                          isSelected ? styles.chipActiveSecondary : styles.chipInactive,
                          isDisabled && styles.chipDisabled,
                        ]}
                      >
                        <Text style={[
                          isSelected ? styles.chipTextActive : styles.chipTextInactive,
                          isDisabled && styles.chipTextDisabled,
                        ]}>
                          {t('garments.season.' + s.value)}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
                {errors.season && <Text style={styles.errorText}>{errors.season}</Text>}
              </View>

              <View style={styles.section}>
                <Text style={styles.label}>{t('garments.create.style')}</Text>
                <View style={styles.chipContainer}>
                  {GARMENT_STYLES.map((st) => {
                    const isSelected = selectedStyles.includes(st.value as GarmentStyle);
                    return (
                      <TouchableOpacity
                        key={st.value}
                        onPress={() => handleStyleToggle(st.value as GarmentStyle)}
                        style={[
                          styles.chip,
                          isSelected ? styles.chipActiveTertiary : styles.chipInactive,
                        ]}
                      >
                        <Text style={isSelected ? styles.chipTextActive : styles.chipTextInactive}>
                          {t('garments.style.' + st.value)}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              <Input
                label={t('garments.create.notes')}
                value={notes}
                onChangeText={setNotes}
                placeholder={t('garments.create.notesPlaceholder')}
                multiline
                numberOfLines={3}
              />

              <GarmentVisibilityForm
                isPublic={isPublic}
                listingType={listingType}
                onIsPublicChange={setIsPublic}
                onListingTypeChange={setListingType}
              />

              <View style={styles.buttonContainer}>
                <Button
                  title={isEditMode ? t('garments.create.saveChanges') : t('garments.create.addToCloset')}
                  onPress={handleCreate}
                  loading={isLoading || isUploading}
                  disabled={!isFormComplete || isLoading || isUploading}
                  fullWidth
                />
              </View>
            </>
          )}
        </View>
      </ScrollView>

      {/* Modal de Éxito */}
      <Modal
        visible={showSuccessModal}
        type="success"
        title={t('garments.create.successTitle')}
        message={t('garments.create.successMessage')}
        actions={[
          {
            text: t('garments.create.successAddAnother'),
            onPress: () => {
              setShowSuccessModal(false);
              // Limpiar formulario
              setName('');
              setCategory('tops');
              setBrand('');
              setNoBrand(false);
              setColor('');
              setSeasons(['all_season']);
              setSelectedStyles([]);
              setNotes('');
              setIsPublic(false);
              setListingType(null);
              setEditImageUri(null);
              setLastAnalyzedUri(null);
              setAiDetected(false);
              resetImage();
              setIsFormEnabled(false);
              setErrors({});
            },
            variant: 'primary',
          },
          {
            text: t('garments.create.successViewCloset'),
            onPress: () => {
              setShowSuccessModal(false);
              router.push('/(tabs)/closet');
            },
            variant: 'secondary',
          },
        ]}
        closeOnBackdrop={false}
      />

      {/* Modal de Edición Exitosa */}
      <Modal
        visible={showEditSuccessModal}
        type="success"
        title={t('garments.create.editSuccessTitle')}
        message={t('garments.create.editSuccessMessage')}
        actions={[
          {
            text: t('garments.create.successViewClosetAlt'),
            onPress: () => {
              setShowEditSuccessModal(false);
              router.push('/(tabs)/closet');
            },
            variant: 'primary',
          },
        ]}
        closeOnBackdrop={false}
      />

      {/* Modal de Error */}
      <Modal
        visible={showErrorModal}
        type="error"
        title={t('garments.create.errorTitle')}
        message={errorMessage}
        onClose={() => setShowErrorModal(false)}
        actions={[
          {
            text: t('garments.create.incompleteGotIt'),
            onPress: () => setShowErrorModal(false),
            variant: 'primary',
          },
        ]}
      />

      {/* Modal del Tip de Foto (máximo 3 veces) */}
      <Modal
        visible={tipVisible}
        type={tipType}
        title={tipTitle}
        message={tipMessage}
        closeOnBackdrop={false}
        actions={[
          {
            text: t('garments.create.photoTipGotIt'),
            onPress: dismissTip,
            variant: 'primary',
          },
        ]}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F4F5F7',
  },
  header: {
    paddingHorizontal: 24,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
    marginLeft: 16,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  formContainer: {
    width: '100%',
    maxWidth: 600,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    gap: 16,
  },
  section: {
    marginBottom: 16,
  },
  label: {
    color: '#374151',
    fontWeight: '500',
    marginBottom: 8,
    fontSize: 14,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  aiAnalyzingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EDE9FE',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  aiAnalyzingText: {
    color: COLORS.secondary,
    fontSize: 11,
    fontWeight: '600',
  },
  aiSuggestedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#D1FAE5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  aiSuggestedText: {
    color: COLORS.success,
    fontSize: 11,
    fontWeight: '600',
  },
  imagePreviewContainer: {
    position: 'relative',
    width: '100%',
    height: 256,
  },
  imagePreview: {
    width: '100%',
    height: '100%',
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
  },
  changeImageButton: {
    position: 'absolute',
    bottom: 16,
    right: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  imagePickerRow: {
    flexDirection: 'row',
    gap: 8,
  },
  imagePickerButton: {
    flex: 1,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: '#D1D5DB',
    borderRadius: 12,
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  imagePickerText: {
    color: '#6B7280',
    marginTop: 8,
    fontSize: 14,
  },
  errorText: {
    color: '#EF4444',
    fontSize: 12,
    marginTop: 4,
  },
  chipContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipActive: {
    backgroundColor: COLORS.primary,
  },
  chipActiveSecondary: {
    backgroundColor: COLORS.secondary,
  },
  chipActiveTertiary: {
    backgroundColor: '#10B981',
  },
  chipInactive: {
    backgroundColor: '#E5E7EB',
  },
  chipDisabled: {
    opacity: 0.4,
  },
  chipTextActive: {
    color: '#FFFFFF',
    fontSize: 13,
    textAlign: 'center',
  },
  chipTextInactive: {
    color: '#374151',
    fontSize: 13,
    textAlign: 'center',
  },
  chipTextDisabled: {
    color: '#9CA3AF',
  },
  buttonContainer: {
    marginTop: 8,
  },
  infoMessage: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EDE9FE',
    padding: 12,
    borderRadius: 8,
    gap: 8,
    marginBottom: 16,
  },
  infoMessageText: {
    flex: 1,
    fontSize: 14,
    color: COLORS.secondary,
    fontWeight: '500',
  },
  disabledSection: {
    opacity: 0.5,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 8,
    marginBottom: 4,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#D1D5DB',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  checkboxActive: {
    backgroundColor: '#10B981',
    borderColor: '#10B981',
  },
  checkboxLabel: {
    fontSize: 14,
    color: '#374151',
  },
});

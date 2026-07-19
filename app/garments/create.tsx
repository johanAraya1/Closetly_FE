/**
 * Create Garment Screen
 * Pantalla para crear una nueva prenda
 */

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { View, Text, ScrollView, Alert, TouchableOpacity, StyleSheet, Platform, Animated, Easing } from 'react-native';

const isWeb = Platform.OS === 'web';
import { Image } from 'expo-image';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Button, Input, Modal, GarmentVisibilityForm, DuplicateWarningModal } from '@/components';
import { ColorPicker } from '@/components/ColorPicker';
import { normalizeColorString } from '@/utils/format';
import { checkDuplicate } from '@/services/garmentService';
import { removeBackground } from '@/services/backgroundRemoval';
import { useAuth } from '@/hooks/useAuth';
import { useGarments } from '@/hooks/useGarments';
import { useImagePicker } from '@/hooks/useImagePicker';
import { useAIAnalysis } from '@/hooks/useAIAnalysis';
import { useTranslation } from '@/hooks/useTranslation';
import { usePhotoTip } from '@/hooks/usePhotoTip';
import { useAuthStore } from '@/store/authStore';
import { GARMENT_CATEGORIES, SEASONS, GARMENT_STYLES, COLORS } from '@/lib/constants';
import { pickImageFromGallery, takePhoto } from '@/utils/imageUtils';
import * as ImageManipulator from 'expo-image-manipulator';
import type { Garment, GarmentCategory, GarmentSeason, GarmentStyle, ListingType } from '@/types';

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
  const [extraImageUris, setExtraImageUris] = useState<string[]>([]);
  const [extraEditImageUris, setExtraEditImageUris] = useState<string[]>([]);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showEditSuccessModal, setShowEditSuccessModal] = useState(false);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isFormEnabled, setIsFormEnabled] = useState(false);
  const [aiDetected, setAiDetected] = useState(false);
  const { showTip, dismissTip, tipVisible, tipTitle, tipMessage, tipType } = usePhotoTip();

  // Parallel background removal state
  const [bgProcessedBase64, setBgProcessedBase64] = useState<string | null>(null);
  const bgProcessedRef = useRef<string | null>(null); // ref para evitar stale closure en doCreate
  const [isBgRemoving, setIsBgRemoving] = useState(false);
  const bgProcessingUri = useRef<string | null>(null);

  // Animation for bg removal overlay
  const scanAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!isBgRemoving || isEditMode) return;

    const scanLoop = Animated.loop(
      Animated.timing(scanAnim, {
        toValue: 1,
        duration: 2500,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    );
    const pulseLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 800,
          easing: Easing.ease,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0.2,
          duration: 800,
          easing: Easing.ease,
          useNativeDriver: true,
        }),
      ]),
    );

    scanLoop.start();
    pulseLoop.start();

    return () => {
      scanLoop.stop();
      pulseLoop.stop();
      scanAnim.setValue(0);
      pulseAnim.setValue(0.2);
    };
  }, [isBgRemoving, isEditMode]);

  // Duplicate detection state
  const [showDuplicateModal, setShowDuplicateModal] = useState(false);
  const [duplicateGarment, setDuplicateGarment] = useState<Garment | null>(null);

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
        const existingExtraUris = (garment as any).imageUrls?.slice(1) || (garment as any).image_urls?.slice(1) || [];
        setEditImageUri((garment as any).image_url || garment.imageUrl);
        setExtraEditImageUris(existingExtraUris);
        setLastAnalyzedUri((garment as any).image_url || garment.imageUrl);
        setIsFormEnabled(true); // Habilitar formulario en modo edición
      }
    }
  }, [id]);

  // Analizar imagen automáticamente cuando cambia imageUri
  // y arrancar background removal en paralelo
  useEffect(() => {
    if (imageUri && imageUri !== lastAnalyzedUri && !isAnalyzing && !isEditMode) {
      handleImageAnalysis();
      startBackgroundRemoval(imageUri);
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

  // Background removal en paralelo con el análisis de IA
  // En web se usa RMBG-1.4 (Transformers.js), en mobile el backend lo hace con Sharp.
  const startBackgroundRemoval = useCallback(async (uri: string) => {
    // Solo corre en web — mobile depende del backend para bg removal
    if (Platform.OS !== 'web') return;
    if (typeof window !== 'undefined' && (window as any).__E2E_TEST__) return; // Skip in E2E tests

    // Marcar esta URI como la que estamos procesando
    bgProcessingUri.current = uri;
    setIsBgRemoving(true);
    setBgProcessedBase64(null);
    bgProcessedRef.current = null;

    try {
      const manipResult = await ImageManipulator.manipulateAsync(
        uri,
        [{ resize: { width: 1024 } }],
        { base64: true, compress: 0.8, format: ImageManipulator.SaveFormat.JPEG }
      );
      if (bgProcessingUri.current !== uri) return; // Stale, cancelar

      let base64 = manipResult.base64!;

      // Ejecutar bg removal client-side: web usa Transformers.js via Web Worker,
      // native (Android) usa MLKit Selfie Segmentation on-device, sin costos.
      const result = await removeBackground(base64, 'image/jpeg');
      if (bgProcessingUri.current !== uri) return; // Stale, cancelar

      if (result.bgRemoved) {
        console.log('[Create] Background removal completed');
        setBgProcessedBase64(result.base64);
        bgProcessedRef.current = result.base64;
      } else {
        console.warn('[Create] Early bg removal failed:', result.error);
        // No es crítico — el service lo reintentará al guardar o usará la original
        bgProcessedRef.current = base64;
      }
    } catch (error) {
      if (bgProcessingUri.current === uri) {
        console.warn('[Create] Early bg removal error:', error);
      }
    } finally {
      if (bgProcessingUri.current === uri) {
        setIsBgRemoving(false);
      }
    }
  }, []);

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
    const hasStyles = selectedStyles.length > 0;
    
    return hasImage && hasName && hasBrand && hasColor && hasSeason && hasStyles;
  }, [imageUri, editImageUri, name, noBrand, brand, color, seasons, selectedStyles]);

  const activeFirstImageUri = imageUri || editImageUri;
  const activeExtraUris = !isEditMode ? extraImageUris : extraEditImageUris;
  const allImages = activeFirstImageUri ? [activeFirstImageUri, ...activeExtraUris] : [...activeExtraUris];

  // Cuando el bg removal termina, mostrar la imagen procesada en preview
  const processedImageUri = bgProcessedBase64
    ? `data:image/jpeg;base64,${bgProcessedBase64}`
    : null;

  const handlePickImage = useCallback((isCamera: boolean) => {
    setAiDetected(false);
    showTip(() => isCamera ? capturePhoto(true) : pickImage(true));
  }, [pickImage, capturePhoto, showTip, setAiDetected]);

  const MAX_IMAGES = 2;

  const handlePickExtraImage = useCallback(async (isCamera: boolean) => {
    if (allImages.length >= MAX_IMAGES) return;
    const uri = isCamera ? await takePhoto() : await pickImageFromGallery({ crop: true });
    if (uri) {
      if (isEditMode) {
        setExtraEditImageUris(prev => [...prev, uri]);
      } else {
        setExtraImageUris(prev => [...prev, uri]);
      }
    }
  }, [isEditMode, allImages.length]);

  const handleRemoveImage = useCallback((index: number) => {
    if (isEditMode) {
      if (index === 0) {
        setEditImageUri(null);
      } else {
        setExtraEditImageUris(prev => prev.filter((_, i) => i !== index - 1));
      }
    } else {
      if (index === 0) {
        resetImage();
        setLastAnalyzedUri(null);
        setAiDetected(false);
        setBgProcessedBase64(null);
        bgProcessedRef.current = null;
        setIsBgRemoving(false);
        bgProcessingUri.current = null;
      } else {
        setExtraImageUris(prev => prev.filter((_, i) => i !== index - 1));
      }
    }
  }, [isEditMode, resetImage]);

  // Core creation logic, extracted so we can call it after duplicate check
  const doCreate = useCallback(async () => {
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
          color: normalizeColorString(color) || undefined,
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
        const firstExtra = activeExtraUris.length > 0 ? activeExtraUris[0] : undefined;
        const garment = await createGarment(user.id, {
          name: name.trim(),
          category,
          brand: noBrand ? undefined : (brand.trim() || undefined),
          color: normalizeColorString(color) || undefined,
            season: seasonValue,
            style: selectedStyles.length > 0 ? selectedStyles : undefined,
            imageUrl: imageUrl || '',
            imageBackUrl: firstExtra,
            imageBase64: bgProcessedRef.current || undefined, // Pasar si ya se procesó en paralelo
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
  }, [isEditMode, id, name, category, noBrand, brand, color, seasons, selectedStyles, notes, imageUri, editImageUri, token, createGarment, updateGarment, activeExtraUris, router, t, isPublic, listingType]);

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
      // Duplicate check only for new garments (not edit mode)
      if (!isEditMode) {
        const imageUrl = imageUri || editImageUri;
        const seasonValue = seasons.length === 1 ? seasons[0] : undefined;

        const result = await checkDuplicate(
          user.id,
          imageUrl!,
          {
            name: name.trim(),
            category,
            brand: noBrand ? undefined : (brand.trim() || undefined),
            color: normalizeColorString(color) || undefined,
            season: seasonValue,
            style: selectedStyles.length > 0 ? selectedStyles : undefined,
          },
          token || '',
        );

        if (result.isDuplicate && result.matchedGarment) {
          setDuplicateGarment(result.matchedGarment);
          setShowDuplicateModal(true);
          setIsLoading(false);
          return; // Stop — wait for user decision
        }
      }

      // No duplicate detected (or edit mode): proceed with creation
      await doCreate();
    } catch (error) {
      setIsLoading(false);
      console.error('Error in handleCreate:', error);
      // If duplicate check fails, still allow creation
      await doCreate();
    }
  }, [validate, user, isEditMode, id, name, category, noBrand, brand, color, seasons, selectedStyles, imageUri, editImageUri, token, doCreate, t]);

  const handleConfirmDuplicate = useCallback(async () => {
    setShowDuplicateModal(false);
    setDuplicateGarment(null);
    // User says "No, guardar de todas formas": proceed with creation
    await doCreate();
  }, [doCreate]);

  const handleCancelDuplicate = useCallback(() => {
    setShowDuplicateModal(false);
    setDuplicateGarment(null);
    // User says "Es esta, cancelar": do nothing, go back to form
  }, []);

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
            {allImages.length > 0 ? (
              <View style={styles.imagePreviewContainer}>
                {/* Main image (first one) */}
                <View style={[
                  styles.mainImageWrapper,
                  processedImageUri && styles.mainImageWrapperProcessed,
                ]}>
                  <Image
                    source={{ uri: processedImageUri || allImages[0] }}
                    style={styles.mainImage}
                    contentFit="contain"
                    cachePolicy="memory-disk"
                  />
                  <TouchableOpacity
                    onPress={() => handleRemoveImage(0)}
                    style={styles.removeImageBadge}
                  >
                    <Ionicons name="close-circle" size={22} color="#EF4444" />
                  </TouchableOpacity>

                  {/* Badge cuando el bg removal se completó */}
                  {processedImageUri && !isBgRemoving && (
                    <View style={styles.bgRemovedBadge}>
                      <Ionicons name="checkmark-circle" size={14} color="#10B981" />
                      <Text style={styles.bgRemovedBadgeText}>Bg removed</Text>
                    </View>
                  )}

                  {/* Background removal animation overlay */}
                  {isBgRemoving && !isEditMode && (
                    <View style={StyleSheet.absoluteFill} pointerEvents="none">
                      <View style={styles.bgOverlayDim} />
                      {isWeb ? (
                        <View style={[styles.bgScanLine, styles.bgScanLineWeb]} />
                      ) : (
                        <Animated.View
                          style={[
                            styles.bgScanLine,
                            {
                              transform: [
                                {
                                  translateY: scanAnim.interpolate({
                                    inputRange: [0, 1],
                                    outputRange: [-30, 286],
                                  }),
                                },
                              ],
                            },
                          ]}
                        />
                      )}
                      {isWeb ? (
                        <View style={[styles.bgOverlayCenter, styles.bgPulseWeb]}>
                          <Ionicons name="sparkles" size={28} color="#FFFFFF" />
                          <Text style={styles.bgOverlayText}>
                            {t('garments.create.bgRemoving')}
                          </Text>
                        </View>
                      ) : (
                        <Animated.View
                          style={[
                            styles.bgOverlayCenter,
                            { opacity: pulseAnim },
                          ]}
                        >
                          <Ionicons name="sparkles" size={28} color="#FFFFFF" />
                          <Text style={styles.bgOverlayText}>
                            {t('garments.create.bgRemoving')}
                          </Text>
                        </Animated.View>
                      )}
                    </View>
                  )}
                </View>
                {/* Side panel: extra thumbs + add button */}
                <View style={styles.imageSidePanel}>
                  {allImages.slice(1).map((uri, i) => (
                    <View key={i + 1} style={styles.extraThumbWrapper}>
                      <Image source={{ uri }} style={styles.extraThumb} contentFit="cover" cachePolicy="memory-disk" />
                      <TouchableOpacity
                        onPress={() => handleRemoveImage(i + 1)}
                        style={styles.removeExtraBadge}
                      >
                        <Ionicons name="close-circle" size={18} color="#EF4444" />
                      </TouchableOpacity>
                    </View>
                  ))}
                  {allImages.length < MAX_IMAGES && (
                    <View style={styles.addExtraRow}>
                      <TouchableOpacity
                        onPress={() => handlePickExtraImage(false)}
                        style={styles.addExtraButton}
                      >
                        <Ionicons name="images-outline" size={22} color={COLORS.primary} />
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() => handlePickExtraImage(true)}
                        style={styles.addExtraButton}
                      >
                        <Ionicons name="camera-outline" size={22} color={COLORS.primary} />
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              </View>
            ) : (
              <View style={styles.imagePickerRow}>
                <TouchableOpacity
                  onPress={() => handlePickImage(false)}
                  style={styles.imagePickerButton}
                  disabled={isAnalyzing}
                >
                  <Ionicons name="images-outline" size={32} color="#9CA3AF" />
                  <Text style={styles.imagePickerText}>{t('garments.create.chooseFromGallery')}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => handlePickImage(true)}
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

              <ColorPicker
                label={t('garments.create.color')}
                value={color}
                onChange={(text) => {
                  setColor(text);
                  setErrors({ ...errors, color: undefined });
                }}
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
                {isBgRemoving && !isEditMode && (
                  <View style={styles.bgRemovingHint}>
                    <Text style={styles.bgRemovingText}>{t('garments.create.bgRemoving')}</Text>
                  </View>
                )}
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
              setExtraImageUris([]);
              setExtraEditImageUris([]);
              setLastAnalyzedUri(null);
              setAiDetected(false);
              setBgProcessedBase64(null);
              bgProcessedRef.current = null;
              setIsBgRemoving(false);
              bgProcessingUri.current = null;
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

      {/* Duplicate Warning Modal */}
      {duplicateGarment && (
        <DuplicateWarningModal
          visible={showDuplicateModal}
          matchedGarment={{
            id: duplicateGarment.id,
            name: duplicateGarment.name,
            imageUrl: duplicateGarment.imageUrl,
            category: duplicateGarment.category,
            brand: duplicateGarment.brand,
            color: duplicateGarment.color,
            confidence: (duplicateGarment as any).confidence ?? 0.9
          }}
          onCancel={handleCancelDuplicate}
          onConfirm={handleConfirmDuplicate}
        />
      )}
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
    flexDirection: 'row',
    width: '100%',
    height: 256,
    gap: 8,
  },
  mainImageWrapper: {
    flex: 1,
    position: 'relative',
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#F3F4F6',
  },
  mainImage: {
    width: '100%',
    height: '100%',
  },
  removeImageBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 3,
  },
  imageSidePanel: {
    width: 90,
    flexDirection: 'column',
    gap: 8,
  },
  extraThumbWrapper: {
    position: 'relative',
    width: 90,
    height: 90,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#F3F4F6',
  },
  extraThumb: {
    width: '100%',
    height: '100%',
  },
  removeExtraBadge: {
    position: 'absolute',
    top: 2,
    right: 2,
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: 1,
  },
  addExtraRow: {
    flexDirection: 'row',
    gap: 6,
  },
  addExtraButton: {
    width: 42,
    height: 90,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: '#D1D5DB',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F9FAFB',
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
  bgRemovingHint: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 12,
  },
  bgRemovingText: {
    fontSize: 13,
    color: COLORS.primary,
    fontWeight: '500',
  },
  bgOverlayDim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.45)',
    borderRadius: 12,
  },
  bgScanLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: 'rgba(98, 217, 199, 0.8)',
    shadowColor: '#62D9C7',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 8,
    elevation: 8,
  },
  bgOverlayCenter: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  bgOverlayText: {
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: '600',
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  mainImageWrapperProcessed: {
    backgroundColor: '#ECFDF5',
    borderWidth: 2,
    borderColor: '#62D9C7',
    borderStyle: 'dashed',
  },
  bgRemovedBadge: {
    position: 'absolute',
    bottom: 6,
    left: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255,255,255,0.9)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 2,
    elevation: 3,
  },
  bgRemovedBadgeText: {
    fontSize: 11,
    color: '#374151',
    fontWeight: '600',
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
  ...(isWeb && {
    bgScanLineWeb: {
      animationName: {
        '0%': { transform: [{ translateY: -30 }] },
        '100%': { transform: [{ translateY: 286 }] },
      },
      animationDuration: '2.5s',
      animationIterationCount: 'infinite',
      animationTimingFunction: 'linear',
    } as any,
    bgPulseWeb: {
      animationName: {
        '0%': { opacity: 0.2 },
        '50%': { opacity: 1 },
        '100%': { opacity: 0.2 },
      },
      animationDuration: '1.6s',
      animationIterationCount: 'infinite',
      animationTimingFunction: 'ease-in-out',
    } as any,
  }),
});

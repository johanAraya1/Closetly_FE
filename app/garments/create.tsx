/**
 * Create Garment Screen
 * Pantalla para crear una nueva prenda
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { View, Text, ScrollView, Image, Alert, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Button, Input, Modal } from '@/components';
import { useAuth } from '@/hooks/useAuth';
import { useGarments } from '@/hooks/useGarments';
import { useImagePicker } from '@/hooks/useImagePicker';
import { useAIAnalysis } from '@/hooks/useAIAnalysis';
import { useAuthStore } from '@/store/authStore';
import { GARMENT_CATEGORIES, SEASONS, GARMENT_STYLES, COLORS } from '@/lib/constants';
import { validationMessages } from '@/utils/validation';
import type { GarmentCategory, GarmentSeason, GarmentStyle } from '@/types';

export default function CreateGarmentScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { user } = useAuth();
  const token = useAuthStore((state) => state.token);
  const { createGarment, getGarmentById, updateGarment } = useGarments();
  const { imageUri, isUploading, pickImage, capturePhoto, uploadGarmentImage, resetImage } = useImagePicker();
  const { isAnalyzing, analyzeImage } = useAIAnalysis();

  const [name, setName] = useState('');
  const [category, setCategory] = useState<GarmentCategory>('tops');
  const [brand, setBrand] = useState('');
  const [color, setColor] = useState('');
  const [seasons, setSeasons] = useState<GarmentSeason[]>(['all-season']);
  const [style, setStyle] = useState<GarmentStyle>('casual');
  const [notes, setNotes] = useState('');
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

  // Cargar datos de la prenda si estamos editando
  useEffect(() => {
    if (id) {
      setIsEditMode(true);
      const garment = getGarmentById(id);
      if (garment) {
        setName(garment.name);
        setCategory(garment.category);
        setBrand(garment.brand || '');
        setColor(garment.color || '');
        // Manejar season como array o string
        if (Array.isArray(garment.season)) {
          setSeasons(garment.season);
        } else {
          const seasonValue = garment.season === 'all_season' ? 'all-season' : garment.season;
          setSeasons(seasonValue ? [seasonValue] : ['all-season']);
        }
        setStyle(garment.style || 'casual');
        setNotes(garment.notes || '');
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
        highConfidence ? '✨ IA Detectó' : '🔍 IA Detectó (revisar)',
        `${analysis.name}\n\n${highConfidence ? 'La IA ha completado los campos automáticamente. Puedes editarlos si lo deseas.' : 'La IA completó los campos pero con confianza media. Revisa que los datos sean correctos.'}`,
        [{ text: 'OK' }]
      );
    } else {
      // Si no se detectó con confianza, habilitar formulario para entrada manual
      setIsFormEnabled(true);
      if (error) {
        Alert.alert('Error de IA', error, [{ text: 'OK' }]);
      } else {
        Alert.alert(
          '⚠️ No se pudo detectar',
          'La IA no pudo identificar la prenda con suficiente confianza. Por favor, completa los campos manualmente.',
          [{ text: 'OK' }]
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
      newErrors.name = validationMessages.garment.nameRequired;
    }

    if (!imageUri && !editImageUri) {
      newErrors.image = validationMessages.garment.imageRequired;
    }

    if (!brand.trim()) {
      newErrors.brand = 'La marca es obligatoria';
    }

    if (!color.trim()) {
      newErrors.color = 'El color es obligatorio';
    }

    if (seasons.length === 0) {
      newErrors.season = 'Debes seleccionar al menos una temporada';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [name, imageUri, editImageUri, brand, color, seasons]);

  // Manejar selección de temporadas
  const handleSeasonToggle = useCallback((seasonValue: GarmentSeason) => {
    if (seasonValue === 'all-season') {
      // Si se selecciona "Todas las Temporadas"
      setSeasons(prev => {
        // Si ya está seleccionada, desmarcarla
        if (prev.includes('all-season')) {
          return prev.filter(s => s !== 'all-season');
        }
        // Si no está seleccionada, limpiar las demás y solo dejar esta
        return ['all-season'];
      });
    } else {
      // Si se selecciona cualquier otra temporada
      setSeasons(prev => {
        // Si "Todas las Temporadas" estaba seleccionada, removerla
        const filtered = prev.filter(s => s !== 'all-season');
        
        // Toggle de la temporada seleccionada
        if (filtered.includes(seasonValue)) {
          return filtered.filter(s => s !== seasonValue);
        } else {
          return [...filtered, seasonValue];
        }
      });
    }
  }, []);

  // Verificar si el formulario está completo
  const isFormComplete = useMemo(() => {
    const hasImage = !!(imageUri || editImageUri);
    const hasName = name.trim().length > 0;
    const hasBrand = brand.trim().length > 0;
    const hasColor = color.trim().length > 0;
    const hasSeason = seasons.length > 0;
    
    return hasImage && hasName && hasBrand && hasColor && hasSeason;
  }, [imageUri, editImageUri, name, brand, color, seasons]);

  const handleCreate = useCallback(async () => {
    if (!validate() || !user) {
      Alert.alert(
        'Campos Incompletos',
        'Por favor completa todos los campos obligatorios (Nombre, Foto, Marca, Color y Temporada) para agregar la prenda al closet.',
        [{ text: 'Entendido' }]
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
          brand: brand.trim() || undefined,
          color: color.trim() || undefined,
          season: seasonValue,
          style,
          notes: notes.trim() || undefined,
        };

        // Actualizar prenda existente (sin enviar image_url)
        const success = await updateGarment(id, updateData, token || undefined);

        setIsLoading(false);

        if (success) {
          setShowEditSuccessModal(true);
        } else {
          setErrorMessage('No se pudo actualizar la prenda. Por favor, intenta nuevamente.');
          setShowErrorModal(true);
        }
      } else {
        // Crear nueva prenda
        const garment = await createGarment(user.id, {
          name: name.trim(),
          category,
          brand: brand.trim() || undefined,
          color: color.trim() || undefined,
          season: seasonValue,
          style,
          image_url: imageUrl || '',
          notes: notes.trim() || undefined,
        }, token || undefined);

        setIsLoading(false);

        if (garment) {
          setShowSuccessModal(true);
        } else {
          setErrorMessage('No se pudo crear la prenda. Verifica que todos los datos sean correctos.');
          setShowErrorModal(true);
        }
      }
    } catch (error) {
      setIsLoading(false);
      console.error('Error creating/updating garment:', error);
      const errorMsg = error instanceof Error ? error.message : 'Error desconocido';
      setErrorMessage(`Error al ${isEditMode ? 'actualizar' : 'crear'} la prenda: ${errorMsg}`);
      setShowErrorModal(true);
    }
  }, [validate, user, isEditMode, id, name, category, brand, color, seasons, style, notes, imageUri, editImageUri, token, createGarment, updateGarment, router]);

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{isEditMode ? 'Editar Prenda' : 'Agregar Prenda'}</Text>
      </View>

      <ScrollView 
        style={styles.scrollView} 
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.formContainer}>
          {/* Image Picker */}
          <View style={styles.section}>
            <View style={styles.labelRow}>
              <Text style={styles.label}>Foto</Text>
              {isAnalyzing && (
                <View style={styles.aiAnalyzingBadge}>
                  <Ionicons name="sparkles" size={12} color={COLORS.secondary} />
                  <Text style={styles.aiAnalyzingText}>Analizando...</Text>
                </View>
              )}
              {aiDetected && lastAnalyzedUri === imageUri && !isAnalyzing && !isEditMode && (
                <View style={styles.aiSuggestedBadge}>
                  <Ionicons name="checkmark-circle" size={12} color={COLORS.success} />
                  <Text style={styles.aiSuggestedText}>Detectado por IA</Text>
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
                      if (isEditMode) setEditImageUri(null);
                      pickImage();
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
                  onPress={() => {
                    setAiDetected(false);
                    pickImage();
                  }}
                  style={styles.imagePickerButton}
                  disabled={isAnalyzing}
                >
                  <Ionicons name="images-outline" size={32} color="#9CA3AF" />
                  <Text style={styles.imagePickerText}>Galería</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => {
                    setAiDetected(false);
                    capturePhoto();
                  }}
                  style={styles.imagePickerButton}
                  disabled={isAnalyzing}
                >
                  <Ionicons name="camera-outline" size={32} color="#9CA3AF" />
                  <Text style={styles.imagePickerText}>Cámara</Text>
                </TouchableOpacity>
              </View>
            )}
            {errors.image && <Text style={styles.errorText}>{errors.image}</Text>}
          </View>

          {!isFormEnabled && !isEditMode && imageUri && (
            <View style={styles.infoMessage}>
              <Ionicons name="information-circle" size={20} color={COLORS.secondary} />
              <Text style={styles.infoMessageText}>
                {isAnalyzing ? 'Analizando imagen con IA...' : 'Esperando detección de IA...'}
              </Text>
            </View>
          )}

          {/* Mostrar formulario solo si hay imagen Y está habilitado, O si está en modo edición */}
          {((imageUri && isFormEnabled) || isEditMode) && (
            <>
              <Input
                label="Nombre *"
                value={name}
                onChangeText={(text) => {
                  if (text.length <= 30) {
                    setName(text);
                  }
                }}
                placeholder="ej., Chaqueta de Mezclilla Azul"
                error={errors.name}
                maxLength={30}
              />

              <View style={styles.section}>
                <Text style={styles.label}>Categoría *</Text>
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
                        {cat.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <Input
                label="Marca *"
                value={brand}
                onChangeText={(text) => {
                  setBrand(text);
                  setErrors({ ...errors, brand: undefined });
                }}
                placeholder="ej., Levi's"
                error={errors.brand}
              />

              <Input
                label="Color *"
                value={color}
                onChangeText={(text) => {
                  setColor(text);
                  setErrors({ ...errors, color: undefined });
                }}
                placeholder="ej., Azul"
                error={errors.color}
              />

              <View style={styles.section}>
                <Text style={styles.label}>Temporada *</Text>
                <View style={styles.chipContainer}>
                  {SEASONS.map((s) => {
                    const isAllSeason = s.value === 'all-season';
                    const isSelected = seasons.includes(s.value as GarmentSeason);
                    const isDisabled = !isAllSeason && seasons.includes('all-season');
                    
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
                          {s.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
                {errors.season && <Text style={styles.errorText}>{errors.season}</Text>}
              </View>

              <View style={styles.section}>
                <Text style={styles.label}>Estilo</Text>
                <View style={styles.chipContainer}>
                  {GARMENT_STYLES.map((st) => (
                    <TouchableOpacity
                      key={st.value}
                      onPress={() => setStyle(st.value as GarmentStyle)}
                      style={[
                        styles.chip,
                        style === st.value ? styles.chipActiveTertiary : styles.chipInactive,
                      ]}
                    >
                      <Text style={style === st.value ? styles.chipTextActive : styles.chipTextInactive}>
                        {st.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <Input
                label="Notas"
                value={notes}
                onChangeText={setNotes}
                placeholder="Agrega detalles adicionales..."
                multiline
                numberOfLines={3}
              />

              <View style={styles.buttonContainer}>
                <Button
                  title={isEditMode ? "Guardar Cambios" : "Agregar al Closet"}
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
        title="¡Prenda Agregada!"
        message="Tu prenda se ha agregado exitosamente al closet. ¿Deseas agregar otra prenda?"
        actions={[
          {
            text: 'Sí, agregar otra',
            onPress: () => {
              setShowSuccessModal(false);
              // Limpiar formulario
              setName('');
              setCategory('tops');
              setBrand('');
              setColor('');
              setSeasons(['all-season']);
              setStyle('casual');
              setNotes('');
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
            text: 'No, ver mi closet',
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
        title="¡Prenda Actualizada!"
        message="Tu prenda se ha actualizado exitosamente."
        actions={[
          {
            text: 'Ver mi closet',
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
        title="Error"
        message={errorMessage}
        onClose={() => setShowErrorModal(false)}
        actions={[
          {
            text: 'Entendido',
            onPress: () => setShowErrorModal(false),
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
});

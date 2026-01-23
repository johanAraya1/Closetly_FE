/**
 * Create Collection Screen
 * Pantalla para crear una nueva colección
 */

import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Button, Input, Loading, Modal } from '@/components';
import { useAuth } from '@/hooks/useAuth';
import { useCollections } from '@/hooks/useCollections';
import { useOutfits } from '@/hooks/useOutfits';
import { useCollectionsStore } from '@/store/collectionsStore';
import { COLORS } from '@/lib/constants';
import { validationMessages } from '@/utils/validation';

export default function CreateCollectionScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { createCollection, error } = useCollections();
  const { outfits, isLoading: loadingOutfits } = useOutfits(true);

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
      setErrorMessage(currentError || 'Failed to create collection. Please try again.');
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
    return <Loading message="Loading outfits..." />;
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={COLORS.gray[900]} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Create Collection</Text>
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        <Input
          label="Collection Name *"
          value={name}
          onChangeText={setName}
          placeholder="e.g., Summer Vibes"
          error={errors.name}
        />

        <Input
          label="Description"
          value={description}
          onChangeText={setDescription}
          placeholder="Describe this collection..."
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
                {isPublic ? 'Public' : 'Private'}
              </Text>
              <Text style={styles.privacyDescription}>
                {isPublic
                  ? 'Anyone can see this collection'
                  : 'Only you can see this collection'}
              </Text>
            </View>
          </View>
          <View style={[styles.toggleTrack, isPublic && styles.toggleTrackActive]}>
            <View style={[styles.toggleThumb, isPublic && styles.toggleThumbActive]} />
          </View>
        </TouchableOpacity>

        {/* Sección de selección de outfits */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Select Outfits ({selectedOutfits.length})</Text>
          <Text style={styles.sectionSubtitle}>Choose outfits to include in this collection</Text>
          
          {outfits.length === 0 ? (
            <View style={styles.emptyOutfits}>
              <Ionicons name="shirt-outline" size={40} color="#D1D5DB" />
              <Text style={styles.emptyText}>No outfits available</Text>
              <Text style={styles.emptySubtext}>Create some outfits first</Text>
            </View>
          ) : (
            <View style={styles.outfitsGrid}>
              {outfits.map((outfit) => {
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
                      <Text style={styles.outfitGarments}>
                        {outfit.garments?.length || 0} garment{outfit.garments?.length !== 1 ? 's' : ''}
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </View>

        <View style={styles.createButtonContainer}>
          {selectedOutfits.length < 2 && (
            <Text style={styles.minOutfitsText}>
              Select at least 2 outfits ({selectedOutfits.length}/2)
            </Text>
          )}
          <Button
            title="Create Collection"
            onPress={handleCreate}
            loading={isLoading}
            disabled={!isValidForm}
            fullWidth
          />
        </View>
      </ScrollView>

      {/* Success Modal */}
      <Modal
        visible={showSuccessModal}
        type="success"
        title="Collection Created!"
        message="Your collection has been created successfully. Would you like to create another one?"
        actions={[
          {
            text: 'Create Another',
            onPress: handleCreateAnother,
            variant: 'primary',
          },
          {
            text: 'Go to Collections',
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
        title="Error"
        message={errorMessage}
        actions={[
          {
            text: 'OK',
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
  createButtonContainer: {
    marginTop: 8,
  },
  minOutfitsText: {
    fontSize: 14,
    color: '#EF4444',
    textAlign: 'center',
    marginBottom: 12,
    fontWeight: '500',
  },
});

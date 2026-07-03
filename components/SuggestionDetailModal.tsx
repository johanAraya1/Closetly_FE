/**
 * SuggestionDetailModal Component
 * Modal que muestra una recomendación de outfit en detalle con
 * grid completo de prendas, guardado, edición y vista ampliada
 */

import React, { useState, useCallback, useMemo } from 'react';
import {
  Modal,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  Dimensions,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '@/lib/constants';
import { useTranslation } from '@/hooks/useTranslation';
import { FullScreenImage } from './FullScreenImage';
import { useSuggestionsStore } from '@/store/suggestionsStore';
import type { Suggestion, Garment, WeatherData } from '@/types';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const GRID_PADDING = 24;
const GRID_GAP = 12;
const GRID_COLUMNS = 3;
const ITEM_WIDTH = (SCREEN_WIDTH - GRID_PADDING * 2 - GRID_GAP * (GRID_COLUMNS - 1)) / GRID_COLUMNS;

interface SuggestionDetailModalProps {
  visible: boolean;
  suggestion: Suggestion | null;
  suggestionIndex: number;
  garments: Garment[];
  weather: WeatherData | null;
  isSaving: boolean;
  savedOutfitId: string | null;
  onSave: (suggestion: Suggestion) => void;
  onEdit: (outfitId: string) => void;
  onClose: () => void;
}

export const SuggestionDetailModal: React.FC<SuggestionDetailModalProps> = ({
  visible,
  suggestion,
  suggestionIndex,
  garments,
  weather,
  isSaving,
  savedOutfitId,
  onSave,
  onEdit,
  onClose,
}) => {
  const { t } = useTranslation();
  const [fullScreenImage, setFullScreenImage] = useState<{
    url: string;
    name?: string;
  } | null>(null);

  const pinnedGarmentIds = useSuggestionsStore((s) => s.pinnedGarmentIds);
  const isRegenerating = useSuggestionsStore((s) => s.isRegenerating);
  const togglePin = useSuggestionsStore((s) => s.togglePin);
  const regenerateWithPinned = useSuggestionsStore((s) => s.regenerateWithPinned);

  const matchedGarments = suggestion
    ? (suggestion.garmentIds
        .map((id) => garments.find((g) => g.id === id))
        .filter(Boolean) as Garment[])
    : [];

  const currentPins = useMemo(
    () => pinnedGarmentIds[suggestionIndex] || [],
    [pinnedGarmentIds, suggestionIndex],
  );

  // Check if all required categories are pinned
  const pinnedCategories = useMemo(() => {
    return currentPins
      .map((id) => {
        const g = garments.find((g) => g.id === id);
        return g?.category;
      })
      .filter(Boolean) as string[];
  }, [currentPins, garments]);

  const requiredCategories = ['tops', 'bottoms', 'shoes'];
  const allRequiredPinned = requiredCategories.every((cat) =>
    pinnedCategories.includes(cat),
  );
  const hasPins = currentPins.length > 0;
  const canRegenerate = hasPins && !allRequiredPinned && !isRegenerating;

  const handlePin = useCallback(
    (garmentId: string, category: string) => {
      const accepted = togglePin(suggestionIndex, garmentId, category);
      if (!accepted) {
        Alert.alert(
          '',
          t('suggestionPin.sameCategoryError', { category: t(`garments.category.${category}`) }),
        );
      }
    },
    [suggestionIndex, togglePin, t],
  );

  const handleRegenerate = useCallback(() => {
    regenerateWithPinned(suggestionIndex);
  }, [regenerateWithPinned, suggestionIndex]);

  const handleSave = useCallback(() => {
    if (!suggestion) return;
    onSave(suggestion);
  }, [suggestion, onSave]);

  const handleEdit = useCallback(() => {
    if (!savedOutfitId) return;
    onEdit(savedOutfitId);
  }, [savedOutfitId, onEdit]);

  return (
    <>
      <Modal
        visible={visible}
        animationType="slide"
        presentationStyle="pageSheet"
        statusBarTranslucent
        onRequestClose={onClose}
      >
        <StatusBar barStyle="dark-content" />

        {suggestion && (
          <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
              <TouchableOpacity onPress={onClose} style={styles.headerBack}>
                <Ionicons name="close" size={24} color="#111827" />
              </TouchableOpacity>
              <View style={styles.headerTitleContainer}>
                <Text style={styles.headerTitle} numberOfLines={1}>
                  {suggestion.name}
                </Text>
                <View style={styles.occasionBadge}>
                  <Text style={styles.occasionText} numberOfLines={1}>
                    {suggestion.occasion}
                  </Text>
                </View>
              </View>
            </View>

            <ScrollView
              style={styles.scrollView}
              contentContainerStyle={styles.scrollContent}
            >
              {/* Weather context */}
              {weather && (
                <View style={styles.weatherRow}>
                  <Ionicons name="thermometer-outline" size={16} color="#6B7280" />
                  <Text style={styles.weatherText}>
                    {Math.round(weather.temp)}° — {weather.description}
                  </Text>
                </View>
              )}

              {/* Garment grid — all garments visible */}
              <Text style={styles.sectionLabel}>{t('home.suggestionGarments')}</Text>
              {matchedGarments.length > 0 ? (
                <View style={styles.garmentGrid}>
                  {matchedGarments.map((garment) => {
                    const isPinned = currentPins.includes(garment.id);
                    return (
                      <View
                        key={garment.id}
                        style={[styles.gridItem, { width: ITEM_WIDTH }]}
                      >
                        <TouchableOpacity
                          activeOpacity={0.85}
                          onPress={() =>
                            setFullScreenImage({
                              url: garment.imageUrl,
                              name: garment.name,
                            })
                          }
                        >
                          <Image
                            source={{ uri: garment.imageUrl }}
                            style={[styles.garmentImage, { height: ITEM_WIDTH }]}
                            contentFit="cover"
                            cachePolicy="memory-disk"
                          />
                        </TouchableOpacity>
                        <View style={styles.garmentInfo}>
                          <View style={styles.garmentInfoRow}>
                            <View style={styles.garmentInfoText}>
                              <Text style={styles.garmentName} numberOfLines={1}>
                                {garment.name}
                              </Text>
                              <Text style={styles.garmentCategory} numberOfLines={1}>
                                {garment.category}
                              </Text>
                            </View>
                            <TouchableOpacity
                              onPress={() => handlePin(garment.id, garment.category)}
                              style={styles.pinButton}
                              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                            >
                              <Ionicons
                                name={isPinned ? 'pin' : 'pin-outline'}
                                size={18}
                                color={isPinned ? COLORS.primary : '#9CA3AF'}
                              />
                            </TouchableOpacity>
                          </View>
                        </View>
                      </View>
                    );
                  })}
                </View>
              ) : (
                <View style={styles.emptyGarments}>
                  <Ionicons name="shirt-outline" size={32} color="#D1D5DB" />
                  <Text style={styles.emptyGarmentsText}>{t('home.noGarmentsSuggestion')}</Text>
                </View>
              )}

              {/* Reasoning */}
              {suggestion.reasoning && (
                <View style={styles.reasoningSection}>
                  <Text style={styles.sectionLabel}>{t('home.suggestionReasoning')}</Text>
                  <Text style={styles.reasoningText}>{suggestion.reasoning}</Text>
                </View>
              )}

              {/* Description */}
              {suggestion.description && (
                <View style={styles.descriptionSection}>
                  <Text style={styles.sectionLabel}>{t('home.suggestionDescription')}</Text>
                  <Text style={styles.descriptionText}>{suggestion.description}</Text>
                </View>
              )}
            </ScrollView>

            {/* Regenerate with pinned */}
            <View style={styles.pinActionBar}>
              {isRegenerating ? (
                <View style={styles.regenLoading}>
                  <ActivityIndicator size="small" color={COLORS.primary} />
                  <Text style={styles.regenLoadingText}>
                    {t('home.loading')}
                  </Text>
                </View>
              ) : (
                <>
                  {allRequiredPinned && hasPins && (
                    <Text style={styles.pinHelperText}>
                      {t('suggestionPin.allPinned')}
                    </Text>
                  )}
                  <TouchableOpacity
                    style={[
                      styles.regenButton,
                      (!canRegenerate) && styles.regenButtonDisabled,
                    ]}
                    onPress={handleRegenerate}
                    disabled={!canRegenerate}
                    activeOpacity={0.8}
                  >
                    <Ionicons
                      name="refresh"
                      size={16}
                      color={canRegenerate ? '#FFFFFF' : '#9CA3AF'}
                    />
                    <Text
                      style={[
                        styles.regenButtonText,
                        !canRegenerate && styles.regenButtonTextDisabled,
                      ]}
                    >
                      {t('suggestionPin.regenerateWithPinned')}
                    </Text>
                  </TouchableOpacity>
                </>
              )}
            </View>

            {/* Bottom action bar */}
            <View style={styles.actionBar}>
              {savedOutfitId ? (
                <>
                  <View style={styles.savedBadge}>
                    <Ionicons name="checkmark-circle" size={18} color="#10B981" />
                    <Text style={styles.savedText}>{t('home.saved')}</Text>
                  </View>
                  <TouchableOpacity
                    style={styles.editButton}
                    onPress={handleEdit}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="create-outline" size={18} color="#FFFFFF" />
                    <Text style={styles.editButtonText}>{t('home.editSuggestion')}</Text>
                  </TouchableOpacity>
                </>
              ) : (
                <TouchableOpacity
                  style={styles.saveButton}
                  onPress={handleSave}
                  disabled={isSaving}
                  activeOpacity={0.8}
                >
                  {isSaving ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <>
                      <Ionicons name="bookmark-outline" size={18} color="#FFFFFF" />
                      <Text style={styles.saveButtonText}>{t('home.saveSuggestion')}</Text>
                    </>
                  )}
                </TouchableOpacity>
              )}
            </View>
          </View>
        )}
      </Modal>

      {/* Full-screen image viewer */}
      <FullScreenImage
        visible={!!fullScreenImage}
        imageUrl={fullScreenImage?.url ?? ''}
        garmentName={fullScreenImage?.name}
        onClose={() => setFullScreenImage(null)}
      />
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F4F5F7',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 56,
    paddingBottom: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  headerBack: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  headerTitleContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    flexShrink: 1,
  },
  occasionBadge: {
    backgroundColor: '#62D9C7' + '20',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  occasionText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#62D9C7',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 24,
    paddingBottom: 100,
  },
  weatherRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 20,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 14,
  },
  weatherText: {
    fontSize: 14,
    color: '#6B7280',
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#9CA3AF',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 12,
  },
  garmentGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: GRID_GAP,
    marginBottom: 24,
  },
  gridItem: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 2,
  },
  garmentImage: {
    width: '100%',
    backgroundColor: '#F9FAFB',
  },
  garmentInfo: {
    padding: 8,
  },
  garmentName: {
    fontSize: 12,
    fontWeight: '600',
    color: '#111827',
  },
  garmentCategory: {
    fontSize: 10,
    color: '#9CA3AF',
    marginTop: 2,
    textTransform: 'capitalize',
  },
  emptyGarments: {
    alignItems: 'center',
    padding: 32,
    gap: 8,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginBottom: 24,
  },
  emptyGarmentsText: {
    fontSize: 14,
    color: '#9CA3AF',
  },
  reasoningSection: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  reasoningText: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 22,
  },
  descriptionSection: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  descriptionText: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 22,
  },
  actionBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 16,
    paddingBottom: 32,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  saveButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingVertical: 14,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  savedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 14,
    backgroundColor: '#10B981' + '15',
    borderRadius: 10,
  },
  savedText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#10B981',
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 24,
    marginLeft: 12,
  },
  editButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  garmentTouch: {
    width: '50%',
    height: 60,
  },
  garmentInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  garmentInfoText: {
    flex: 1,
    marginRight: 4,
  },
  pinButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pinActionBar: {
    paddingHorizontal: 24,
    paddingVertical: 8,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  regenButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: COLORS.primary,
    borderRadius: 10,
    paddingVertical: 10,
  },
  regenButtonDisabled: {
    backgroundColor: '#F3F4F6',
  },
  regenButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  regenButtonTextDisabled: {
    color: '#9CA3AF',
  },
  regenLoading: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 10,
  },
  regenLoadingText: {
    fontSize: 14,
    color: COLORS.primary,
    fontWeight: '500',
  },
  pinHelperText: {
    fontSize: 12,
    color: '#9CA3AF',
    textAlign: 'center',
    marginBottom: 8,
  },
});

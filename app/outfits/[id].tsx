/**
 * Outfit Detail Screen
 * Pantalla de detalle del outfit con opción de compartir como imagen
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  Image,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Modal,
  Dimensions,
  Platform,
} from 'react-native';
import { useRouter, useLocalSearchParams, Stack } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import ViewShot from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';
import { useOutfits } from '@/hooks/useOutfits';
import { useTranslation } from '@/hooks/useTranslation';
import { OutfitShareCard } from '@/components/OutfitShareCard';
import { COLORS } from '@/lib/constants';
import type { GarmentSeason } from '@/types';

const SCREEN_WIDTH = Dimensions.get('window').width;
const isSmallScreen = SCREEN_WIDTH < 600;
const GRID_COLUMNS = isSmallScreen ? 2 : 3;
const GRID_GAP = 10;
const GRID_PADDING = 20;
const ITEM_WIDTH = (SCREEN_WIDTH - GRID_PADDING * 2 - GRID_GAP * (GRID_COLUMNS - 1)) / GRID_COLUMNS;

const seasonLabels: Record<GarmentSeason, string> = {
  spring: '🌿 Primavera',
  summer: '☀️ Verano',
  fall: '🍂 Otoño',
  winter: '❄️ Invierno',
  all_season: '🌎 Todas las Temporadas',
};

const categoryLabels: Record<string, string> = {
  tops: 'Blusas y Camisas',
  bottoms: 'Pantalones',
  dresses: 'Vestidos',
  outerwear: 'Abrigos',
  shoes: 'Zapatos',
  accessories: 'Accesorios',
  bags: 'Bolsos',
  other: 'Otros',
};

export default function OutfitDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useTranslation();
  const { currentOutfit, isLoading, error, loadOutfitById, deleteOutfit, toggleFavorite, clearError } = useOutfits();

  const [showShareModal, setShowShareModal] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const shareCardRef = useRef<ViewShot>(null);

  // Load outfit on mount
  useEffect(() => {
    if (id) {
      loadOutfitById(id);
    }
  }, [id]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearError();
    };
  }, []);

  const outfit = currentOutfit;
  const garments = outfit?.garments || [];

  // --- Share Handler ---
  const handleOpenShareModal = useCallback(() => {
    if (!outfit) return;
    setShowShareModal(true);
  }, [outfit]);

  const handleShare = useCallback(async () => {
    if (!outfit || !shareCardRef.current) return;

    setIsSharing(true);
    try {
      const uri = await shareCardRef.current.capture?.();
      if (!uri) throw new Error('No URI captured');

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, {
          mimeType: 'image/png',
          dialogTitle: outfit.name,
        });
      } else {
        Alert.alert(t('common.error'), t('outfits.shareTitle'));
      }
    } catch (err) {
      console.error('Share failed:', err);
      Alert.alert(t('common.error'), t('outfits.sharing'));
    } finally {
      setIsSharing(false);
      setShowShareModal(false);
    }
  }, [outfit, t]);

  // --- Favorite Toggle ---
  const handleToggleFavorite = useCallback(async () => {
    if (!outfit) return;
    try {
      await toggleFavorite(outfit.id, !outfit.is_favorite);
    } catch (err) {
      Alert.alert(t('common.error'), t('outfits.errorFavorite'));
    }
  }, [outfit, t]);

  // --- Delete Handler ---
  const handleDelete = useCallback(() => {
    if (!outfit) return;

    Alert.alert(
      t('outfits.deleteTitle'),
      t('outfits.deleteConfirm', { name: outfit.name }),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.delete'),
          style: 'destructive',
          onPress: async () => {
            setIsDeleting(true);
            try {
              await deleteOutfit(outfit.id);
              router.back();
            } catch (err) {
              Alert.alert(t('common.error'), t('outfits.errorDelete'));
            } finally {
              setIsDeleting(false);
            }
          },
        },
      ]
    );
  }, [outfit, t, router]);

  // --- Error retry ---
  const handleRetry = useCallback(() => {
    if (id) {
      clearError();
      loadOutfitById(id);
    }
  }, [id]);

  // --- Loading State ---
  if (isLoading && !outfit) {
    return (
      <SafeAreaView style={styles.container}>
        <Stack.Screen options={{ title: t('outfits.detailTitle'), headerShown: true }} />
        <View style={styles.loadingContainer}>
          {/* Header skeleton */}
          <View style={styles.skeletonHeader}>
            <View style={[styles.skeletonBlock, { width: 40, height: 40, borderRadius: 20 }]} />
            <View style={[styles.skeletonBlock, { flex: 1, height: 28, marginHorizontal: 16 }]} />
            <View style={[styles.skeletonBlock, { width: 40, height: 40, borderRadius: 20 }]} />
          </View>

          {/* Info skeleton */}
          <View style={styles.skeletonInfo}>
            <View style={[styles.skeletonBlock, { height: 20, width: '60%', marginBottom: 12 }]} />
            <View style={[styles.skeletonBlock, { height: 14, width: '40%', marginBottom: 8 }]} />
            <View style={[styles.skeletonBlock, { height: 14, width: '30%' }]} />
          </View>

          {/* Grid skeleton */}
          <View style={styles.skeletonGrid}>
            {Array.from({ length: 4 }).map((_, i) => (
              <View key={i} style={[styles.skeletonGridItem, { width: ITEM_WIDTH }]}>
                <View style={[styles.skeletonBlock, { height: ITEM_WIDTH, borderTopLeftRadius: 12, borderTopRightRadius: 12 }]} />
                <View style={{ padding: 8 }}>
                  <View style={[styles.skeletonBlock, { height: 12, width: '80%', marginBottom: 6 }]} />
                  <View style={[styles.skeletonBlock, { height: 10, width: '50%' }]} />
                </View>
              </View>
            ))}
          </View>
        </View>
      </SafeAreaView>
    );
  }

  // --- Error State ---
  if (error && !outfit) {
    return (
      <SafeAreaView style={styles.container}>
        <Stack.Screen options={{ title: t('outfits.detailTitle'), headerShown: true }} />
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={64} color={COLORS.error} />
          <Text style={styles.errorTitle}>{t('common.error')}</Text>
          <Text style={styles.errorMessage}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={handleRetry}>
            <Ionicons name="refresh" size={20} color={COLORS.white} />
            <Text style={styles.retryText}>{t('common.retry')}</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // --- No outfit found ---
  if (!outfit) {
    return (
      <SafeAreaView style={styles.container}>
        <Stack.Screen options={{ title: t('outfits.detailTitle'), headerShown: true }} />
        <View style={styles.errorContainer}>
          <Ionicons name="shirt-outline" size={64} color={COLORS.gray[300]} />
          <Text style={styles.errorTitle}>{t('collections.notFound')}</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* ===== Custom Header ===== */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.headerButton}>
          <Ionicons name="arrow-back" size={24} color={COLORS.gray[800]} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {outfit.name}
        </Text>
        <TouchableOpacity onPress={handleOpenShareModal} style={styles.headerButton}>
          <Ionicons name="share-outline" size={24} color={COLORS.gray[800]} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.list}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ===== Garment Grid ===== */}
        <Text style={styles.sectionTitle}>{t('outfits.garments')}</Text>
        {garments.length > 0 ? (
          <View style={styles.gridContainer}>
            {garments.map((garment) => (
              <View key={garment.id} style={[styles.gridItem, { width: ITEM_WIDTH }]}>
                <Image
                  source={{ uri: garment.imageUrl }}
                  style={[styles.garmentImage, { height: ITEM_WIDTH }]}
                  resizeMode="contain"
                />
                <View style={styles.garmentInfo}>
                  <Text style={styles.garmentName} numberOfLines={1}>
                    {garment.name}
                  </Text>
                  <Text style={styles.garmentCategory} numberOfLines={1}>
                    {categoryLabels[garment.category] || garment.category}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        ) : (
          <View style={styles.emptyGarments}>
            <Ionicons name="shirt-outline" size={40} color={COLORS.gray[300]} />
            <Text style={styles.emptyGarmentsText}>{t('outfits.noGarments')}</Text>
          </View>
        )}

        {/* ===== Info Section ===== */}
        <View style={styles.infoSection}>
          {outfit.description ? (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>{t('outfits.description')}</Text>
              <Text style={styles.infoValue}>{outfit.description}</Text>
            </View>
          ) : null}

          {outfit.occasion ? (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>{t('outfits.occasion')}</Text>
              <View style={styles.chip}>
                <Text style={styles.chipText}>🏷️ {outfit.occasion}</Text>
              </View>
            </View>
          ) : null}

          {outfit.season ? (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>{t('outfits.season')}</Text>
              <View style={styles.chip}>
                <Text style={styles.chipText}>{seasonLabels[outfit.season] || outfit.season}</Text>
              </View>
            </View>
          ) : null}
        </View>

        {/* ===== Actions ===== */}
        <View style={styles.actionsSection}>
          {/* Favorite Toggle */}
          <TouchableOpacity style={styles.actionButton} onPress={handleToggleFavorite}>
            <Ionicons
              name={outfit.is_favorite ? 'heart' : 'heart-outline'}
              size={22}
              color={outfit.is_favorite ? COLORS.error : COLORS.gray[500]}
            />
            <Text style={[styles.actionText, outfit.is_favorite && { color: COLORS.error }]}>
              {outfit.is_favorite ? t('outfits.favorites') : t('outfits.favorites')}
            </Text>
          </TouchableOpacity>

          {/* Share Button */}
          <TouchableOpacity style={styles.actionButton} onPress={handleOpenShareModal}>
            <Ionicons name="share-outline" size={22} color={COLORS.gray[500]} />
            <Text style={styles.actionText}>{t('outfits.share')}</Text>
          </TouchableOpacity>

          {/* Delete Button */}
          <TouchableOpacity
            style={[styles.actionButton, styles.deleteButton]}
            onPress={handleDelete}
            disabled={isDeleting}
          >
            {isDeleting ? (
              <ActivityIndicator size="small" color={COLORS.error} />
            ) : (
              <Ionicons name="trash-outline" size={22} color={COLORS.error} />
            )}
            <Text style={[styles.actionText, styles.deleteText]}>
              {t('common.delete')}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* ===== Share Modal ===== */}
      <Modal
        visible={showShareModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowShareModal(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalContainer}>
            {/* Close button */}
            <TouchableOpacity
              style={styles.modalClose}
              onPress={() => setShowShareModal(false)}
            >
              <Ionicons name="close" size={28} color={COLORS.gray[600]} />
            </TouchableOpacity>

            <Text style={styles.modalTitle}>{t('outfits.shareTitle')}</Text>

            {/* Share Card Preview (capturable) */}
            <View style={styles.shareCardWrapper}>
              <ViewShot
                ref={shareCardRef}
                options={{ format: 'png', quality: 1 }}
              >
                <OutfitShareCard outfit={outfit} garments={garments} />
              </ViewShot>
            </View>

            {/* Modal Actions */}
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setShowShareModal(false)}
              >
                <Text style={styles.cancelButtonText}>{t('common.cancel')}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.shareButton}
                onPress={handleShare}
                disabled={isSharing}
              >
                {isSharing ? (
                  <ActivityIndicator size="small" color={COLORS.white} />
                ) : (
                  <>
                    <Ionicons name="share-outline" size={20} color={COLORS.white} />
                    <Text style={styles.shareButtonText}>{t('outfits.share')}</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.gray[50],
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray[200],
  },
  headerButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.gray[900],
    textAlign: 'center',
    marginHorizontal: 8,
  },
  list: {
    flex: 1,
  },
  listContent: {
    paddingBottom: 40,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.gray[800],
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 12,
  },

  // ---- Garment Grid ----
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: GRID_PADDING,
    gap: GRID_GAP,
  },
  gridItem: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },
  garmentImage: {
    width: '100%',
    backgroundColor: COLORS.gray[100],
  },
  garmentInfo: {
    padding: 8,
  },
  garmentName: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.gray[800],
    marginBottom: 2,
  },
  garmentCategory: {
    fontSize: 10,
    color: COLORS.gray[400],
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  emptyGarments: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    marginHorizontal: 20,
    backgroundColor: COLORS.white,
    borderRadius: 12,
  },
  emptyGarmentsText: {
    fontSize: 14,
    color: COLORS.gray[400],
    marginTop: 8,
  },

  // ---- Info Section ----
  infoSection: {
    marginTop: 24,
    marginHorizontal: 20,
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },
  infoRow: {
    marginBottom: 16,
  },
  infoRowLast: {
    marginBottom: 0,
  },
  infoLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.gray[400],
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 6,
  },
  infoValue: {
    fontSize: 15,
    color: COLORS.gray[700],
    lineHeight: 22,
  },
  chip: {
    alignSelf: 'flex-start',
    backgroundColor: COLORS.gray[100],
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  chipText: {
    fontSize: 14,
    color: COLORS.gray[600],
    fontWeight: '500',
  },

  // ---- Actions ----
  actionsSection: {
    flexDirection: 'row',
    marginTop: 24,
    marginHorizontal: 20,
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 8,
  },
  actionText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.gray[500],
  },
  deleteButton: {},
  deleteText: {
    color: COLORS.error,
  },

  // ---- Loading Skeletons ----
  loadingContainer: {
    flex: 1,
  },
  skeletonHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray[200],
  },
  skeletonInfo: {
    padding: 20,
    backgroundColor: COLORS.white,
    marginTop: 20,
    marginHorizontal: 20,
    borderRadius: 12,
  },
  skeletonGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: GRID_PADDING,
    gap: GRID_GAP,
    marginTop: 12,
  },
  skeletonGridItem: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    overflow: 'hidden',
  },
  skeletonBlock: {
    backgroundColor: COLORS.gray[100],
  },

  // ---- Error State ----
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.gray[800],
    marginTop: 16,
    marginBottom: 8,
  },
  errorMessage: {
    fontSize: 14,
    color: COLORS.gray[500],
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: COLORS.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '600',
  },

  // ---- Share Modal ----
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContainer: {
    backgroundColor: COLORS.white,
    borderRadius: 24,
    padding: 24,
    width: '100%',
    maxWidth: 440,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 24,
    elevation: 16,
  },
  modalClose: {
    position: 'absolute',
    top: 16,
    right: 16,
    zIndex: 1,
    padding: 4,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.gray[900],
    marginBottom: 20,
    marginTop: 4,
  },
  shareCardWrapper: {
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
    width: '100%',
  },
  cancelButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.gray[200],
    backgroundColor: COLORS.white,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.gray[600],
  },
  shareButton: {
    flex: 1.5,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: COLORS.primary,
  },
  shareButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.white,
  },
});

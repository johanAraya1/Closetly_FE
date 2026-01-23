/**
 * CollectionCard Component
 * Tarjeta para mostrar una colección con preview de outfits
 */

import React, { useState } from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { Collection } from '@/types';
import { COLORS } from '@/lib/constants';
import { Modal } from './Modal';

interface CollectionCardProps {
  collection: Collection;
  onPress?: () => void;
  onDelete?: () => void;
}

export const CollectionCard = React.memo<CollectionCardProps>(({
  collection,
  onPress,
  onDelete,
}) => {
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  // Obtener las primeras imágenes de los outfits para el preview
  const previewImages = collection.outfits
    ?.slice(0, 4)
    .map(outfit => outfit.garments?.[0]?.imageUrl)
    .filter(Boolean) || [];

  const handleDeletePress = (e: any) => {
    e.stopPropagation();
    setShowDeleteModal(true);
  };

  const confirmDelete = () => {
    setShowDeleteModal(false);
    if (onDelete) {
      onDelete();
    }
  };

  return (
    <TouchableOpacity 
      style={styles.card} 
      onPress={onPress}
      activeOpacity={0.7}
    >
      {/* Preview Grid o Cover Image */}
      {previewImages.length > 0 ? (
        <View style={styles.previewContainer}>
          {previewImages.length === 1 ? (
            <Image
              source={{ uri: previewImages[0] }}
              style={styles.singleImage}
              resizeMode="cover"
            />
          ) : (
            <View style={styles.grid}>
              {previewImages.map((url, index) => (
                <View 
                  key={index} 
                  style={[
                    styles.gridItem,
                    previewImages.length === 2 && styles.gridItem2,
                    previewImages.length === 3 && index === 0 && styles.gridItem3First,
                    previewImages.length === 3 && index > 0 && styles.gridItem3Other,
                  ]}
                >
                  <Image
                    source={{ uri: url }}
                    style={styles.gridImage}
                    resizeMode="cover"
                  />
                </View>
              ))}
            </View>
          )}
          
          {/* Overlay con conteo si hay más outfits */}
          {collection.outfits && collection.outfits.length > 4 && (
            <View style={styles.moreOverlay}>
              <Text style={styles.moreText}>+{collection.outfits.length - 4}</Text>
            </View>
          )}
        </View>
      ) : (
        <View style={styles.emptyPreview}>
          <Ionicons name="albums-outline" size={48} color="#D1D5DB" />
        </View>
      )}

      {/* Collection Info */}
      <View style={styles.info}>
        <View style={styles.header}>
          <Text style={styles.name} numberOfLines={1}>
            {collection.name}
          </Text>
          <View style={styles.headerRight}>
            {collection.isPublic && (
              <View style={styles.publicBadge}>
                <Ionicons name="globe-outline" size={14} color={COLORS.primary} />
              </View>
            )}
            {onDelete && (
              <TouchableOpacity 
                onPress={handleDeletePress}
                style={styles.deleteButton}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons name="trash-outline" size={18} color="#EF4444" />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {collection.description && (
          <Text style={styles.description} numberOfLines={2}>
            {collection.description}
          </Text>
        )}

        <View style={styles.footer}>
          <View style={styles.outfitCount}>
            <Ionicons name="shirt-outline" size={16} color="#6B7280" />
            <Text style={styles.countText}>
              {collection.outfits?.length || 0} outfit{collection.outfits?.length !== 1 ? 's' : ''}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
        </View>
      </View>

      {/* Delete Confirmation Modal */}
      <Modal
        visible={showDeleteModal}
        type="error"
        title="Delete Collection"
        message={`Are you sure you want to delete "${collection.name}"? This action cannot be undone.`}
        actions={[
          {
            text: 'Cancel',
            onPress: () => setShowDeleteModal(false),
            variant: 'secondary',
          },
          {
            text: 'Delete',
            onPress: confirmDelete,
            variant: 'primary',
          },
        ]}
        onClose={() => setShowDeleteModal(false)}
      />
    </TouchableOpacity>
  );
});

const styles = StyleSheet.create({
  card: {
    backgroundColor: 'white',
    borderRadius: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
    overflow: 'hidden',
  },
  previewContainer: {
    width: '100%',
    height: 200,
    backgroundColor: '#F9FAFB',
    position: 'relative',
  },
  singleImage: {
    width: '100%',
    height: '100%',
  },
  grid: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  gridItem: {
    width: '50%',
    height: '50%',
    borderWidth: 1,
    borderColor: '#FFFFFF',
  },
  gridItem2: {
    width: '50%',
    height: '100%',
  },
  gridItem3First: {
    width: '100%',
    height: '50%',
  },
  gridItem3Other: {
    width: '50%',
    height: '50%',
  },
  gridImage: {
    width: '100%',
    height: '100%',
  },
  moreOverlay: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  moreText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  emptyPreview: {
    width: '100%',
    height: 200,
    backgroundColor: '#F9FAFB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  info: {
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  name: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    flex: 1,
    marginRight: 8,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  publicBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#EFF6FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FEE2E2',
    justifyContent: 'center',
    alignItems: 'center',
  },
  description: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
    marginBottom: 12,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  outfitCount: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  countText: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
});

/**
 * GarmentCard Component
 * Tarjeta para mostrar una prenda
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import type { Garment } from '@/types';
import { formatEnumValue, getColorFromName } from '@/utils/format';
import { COLORS } from '@/lib/constants';

interface GarmentCardProps {
  garment: Garment;
  onPress?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  showCategory?: boolean;
}

export const GarmentCard = React.memo<GarmentCardProps>(({
  garment,
  onPress,
  onEdit,
  onDelete,
  showCategory = true,
}) => {
  return (
    <TouchableOpacity 
      onPress={onPress} 
      activeOpacity={0.7}
      style={styles.card}
    >
      <View style={styles.imageContainer}>
        <Image
          source={{ uri: (garment.imageUrls?.[0] || (garment as any).image_url || garment.imageUrl) }}
          style={styles.image}
          contentFit="contain"
          cachePolicy="memory-disk"
        />
        {/* Edit Button */}
        <TouchableOpacity
          onPress={(e) => {
            e.stopPropagation();
            if (onEdit) {
              onEdit();
            }
          }}
          style={styles.editButton}
        >
          <Ionicons name="pencil" size={16} color="#62D9C7" />
        </TouchableOpacity>
      </View>
      <View style={styles.info}>
        <Text 
          numberOfLines={2}
          ellipsizeMode="tail"
          style={styles.name}
        >
          {garment.name}
        </Text>
        <View style={styles.metaRow}>
          {garment.brand && (
            <Text 
              numberOfLines={1}
              ellipsizeMode="tail"
              style={styles.brand}
            >
              {garment.brand}
            </Text>
          )}
          {showCategory && (
            <Text 
              numberOfLines={1}
              style={styles.category}
            >
              {formatEnumValue(garment.category)}
            </Text>
          )}
        </View>
        {garment.color && (
          <View style={styles.colorRow}>
            <View 
              style={[
                styles.colorDot, 
                { 
                  backgroundColor: getColorFromName(garment.color),
                  borderColor: getColorFromName(garment.color) === '#FFFFFF' ? '#E5E7EB' : 'transparent',
                }
              ]}
            />
            <Text numberOfLines={1} style={styles.colorText}>
              {garment.color}
            </Text>
          </View>
        )}
      </View>
      {onDelete && (
        <TouchableOpacity
          onPress={(e) => {
            e.stopPropagation();
            if (onDelete) {
              onDelete();
            }
          }}
          style={styles.deleteButton}
        >
          <Ionicons name="trash-outline" size={16} color={COLORS.error} />
        </TouchableOpacity>
      )}
    </TouchableOpacity>
  );
});

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    width: '100%',
  },
  imageContainer: {
    width: '100%',
    aspectRatio: 1,
    backgroundColor: '#F9FAFB',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  editButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  info: {
    padding: 12,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    width: '100%',
    minHeight: 90,
  },
  name: {
    fontSize: 13,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 6,
    lineHeight: 16,
    height: 32,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  brand: {
    fontSize: 11,
    color: '#6B7280',
    flex: 1,
  },
  category: {
    fontSize: 10,
    color: '#9CA3AF',
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    marginLeft: 4,
  },
  colorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 'auto',
  },
  colorDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 1,
    marginRight: 4,
  },
  colorText: {
    fontSize: 10,
    color: '#9CA3AF',
    flex: 1,
  },
  deleteButton: {
    position: 'absolute',
    top: 12,
    left: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#FEE2E2',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
});

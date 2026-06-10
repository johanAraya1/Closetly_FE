/**
 * GarmentCard Component
 * Tarjeta para mostrar una prenda
 */

import React from 'react';
import { View, Text, Image, TouchableOpacity } from 'react-native';
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
      style={{ 
        backgroundColor: '#FFFFFF',
        borderRadius: 12, 
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
        width: '100%',
      }}
    >
      <View style={{ width: '100%', aspectRatio: 1, backgroundColor: '#F9FAFB', justifyContent: 'center', alignItems: 'center', padding: 8, borderBottomWidth: 1, borderBottomColor: '#E5E7EB' }}>
        <Image
          source={{ uri: (garment.imageUrls?.[0] || (garment as any).image_url || garment.imageUrl) }}
          style={{ width: '100%', height: '100%' }}
          resizeMode="contain"
        />
        {/* Edit Button */}
        <TouchableOpacity
          onPress={(e) => {
            e.stopPropagation();
            if (onEdit) {
              onEdit();
            }
          }}
          style={{
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
          }}
        >
          <Ionicons name="pencil" size={16} color="#62D9C7" />
        </TouchableOpacity>
      </View>
      <View style={{ padding: 12, backgroundColor: '#FFFFFF', borderTopWidth: 1, borderTopColor: '#F3F4F6', width: '100%', minHeight: 90 }}>
        <Text 
          numberOfLines={2}
          ellipsizeMode="tail"
          style={{ 
            fontSize: 13, 
            fontWeight: '600', 
            color: '#111827',
            marginBottom: 6,
            lineHeight: 16,
            height: 32
          }}
        >
          {garment.name}
        </Text>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
          {garment.brand && (
            <Text 
              numberOfLines={1}
              ellipsizeMode="tail"
              style={{ 
                fontSize: 11, 
                color: '#6B7280',
                flex: 1
              }}
            >
              {garment.brand}
            </Text>
          )}
          {showCategory && (
            <Text 
              numberOfLines={1}
              style={{ 
                fontSize: 10, 
                color: '#9CA3AF',
                backgroundColor: '#F3F4F6',
                paddingHorizontal: 8,
                paddingVertical: 3,
                borderRadius: 10,
                marginLeft: 4
              }}
            >
              {formatEnumValue(garment.category)}
            </Text>
          )}
        </View>
        {garment.color && (
          <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 'auto' }}>
            <View 
              style={{ 
                width: 12, 
                height: 12, 
                borderRadius: 6, 
                backgroundColor: getColorFromName(garment.color),
                borderWidth: 1,
                borderColor: getColorFromName(garment.color) === '#FFFFFF' ? '#E5E7EB' : 'transparent',
                marginRight: 4
              }}
            />
            <Text numberOfLines={1} style={{ fontSize: 10, color: '#9CA3AF', flex: 1 }}>
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
          style={{ 
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
          }}
        >
          <Ionicons name="trash-outline" size={16} color={COLORS.error} />
        </TouchableOpacity>
      )}
    </TouchableOpacity>
  );
});

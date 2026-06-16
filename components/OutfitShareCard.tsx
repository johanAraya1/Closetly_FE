/**
 * OutfitShareCard Component
 * Tarjeta visual para compartir outfit como imagen
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import type { Outfit, Garment } from '@/types';
import { COLORS } from '@/lib/constants';

interface OutfitShareCardProps {
  outfit: Outfit;
  garments: Garment[];
}

const CARD_WIDTH = 400;

export const OutfitShareCard: React.FC<OutfitShareCardProps> = ({ outfit, garments }) => {
  const seasonLabels: Record<string, string> = {
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

  return (
    <View style={styles.card}>
      {/* Brand Header */}
      <View style={styles.brandHeader}>
        <Text style={styles.brandName}>Closetly</Text>
      </View>

      {/* Garment Grid */}
      {garments.length > 0 ? (
        <View style={styles.grid}>
          {garments.slice(0, 4).map((garment) => (
            <View key={garment.id} style={styles.gridItem}>
              <Image
                source={{ uri: garment.imageUrl }}
                style={styles.garmentImage}
                contentFit="contain"
                cachePolicy="memory-disk"
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
        <View style={styles.emptyGrid}>
          <Text style={styles.emptyText}>No garments</Text>
        </View>
      )}

      {/* Outfit Info */}
      <View style={styles.infoSection}>
        <Text style={styles.outfitName}>{outfit.name}</Text>
        {outfit.description ? (
          <Text style={styles.outfitDescription} numberOfLines={2}>
            {outfit.description}
          </Text>
        ) : null}
        <View style={styles.badges}>
          {outfit.occasion ? (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>🏷️ {outfit.occasion}</Text>
            </View>
          ) : null}
          {outfit.season ? (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{seasonLabels[outfit.season] || outfit.season}</Text>
            </View>
          ) : null}
        </View>
      </View>

      {/* Footer Watermark */}
      <Text style={styles.watermark}>Made with Closetly</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    width: CARD_WIDTH,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  brandHeader: {
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray[100],
  },
  brandName: {
    fontSize: 22,
    fontWeight: '800',
    color: COLORS.primary,
    letterSpacing: 1,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 12,
    gap: 8,
  },
  gridItem: {
    width: (CARD_WIDTH - 24 - 8) / 2,
    backgroundColor: COLORS.gray[50],
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.gray[100],
  },
  garmentImage: {
    width: '100%',
    height: 120,
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
  emptyGrid: {
    height: 120,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 12,
    marginVertical: 8,
    backgroundColor: COLORS.gray[50],
    borderRadius: 12,
  },
  emptyText: {
    fontSize: 14,
    color: COLORS.gray[400],
  },
  infoSection: {
    paddingHorizontal: 24,
    paddingVertical: 20,
    borderTopWidth: 1,
    borderTopColor: COLORS.gray[100],
  },
  outfitName: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.gray[900],
    marginBottom: 8,
  },
  outfitDescription: {
    fontSize: 13,
    color: COLORS.gray[500],
    lineHeight: 18,
    marginBottom: 12,
  },
  badges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  badge: {
    backgroundColor: COLORS.gray[100],
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  badgeText: {
    fontSize: 13,
    color: COLORS.gray[600],
    fontWeight: '500',
  },
  watermark: {
    textAlign: 'right',
    fontSize: 11,
    color: COLORS.gray[300],
    fontWeight: '500',
    paddingHorizontal: 24,
    paddingBottom: 20,
    letterSpacing: 0.5,
  },
});

export default OutfitShareCard;

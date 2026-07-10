/**
 * OutfitPreview Component
 * Muestra un preview visual del outfit con las prendas seleccionadas
 */

import React, { useMemo } from 'react';
import { View, Text, StyleSheet, Dimensions, TouchableOpacity } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import type { Garment } from '@/types';

interface OutfitPreviewProps {
  selectedGarments: Garment[];
  onGarmentPress?: (garment: Garment) => void;
  pinnedGarmentIds?: Set<string>;
  onTogglePin?: (garmentId: string) => void;
  baseGarmentIds?: Set<string>;            // ← NUEVO: IDs de prendas base del mix
}

const { width } = Dimensions.get('window');
const PREVIEW_WIDTH = Math.min(width - 48, 350);

// Mapeo de categorías a zonas del cuerpo
const BODY_ZONES = {
  'tops': 'upper',
  'shirts': 'upper',
  'blouses': 'upper',
  'jackets': 'upper',
  'sweaters': 'upper',
  'coats': 'upper',
  'pants': 'lower',
  'skirts': 'lower',
  'shorts': 'lower',
  'jeans': 'lower',
  'dresses': 'full',
  'shoes': 'feet',
  'accessories': 'accessories',
  'bags': 'accessories',
  'scarves': 'accessories',
  'hats': 'accessories',
  'belts': 'accessories',
} as Record<string, string>;

export function OutfitPreview({ selectedGarments, onGarmentPress, pinnedGarmentIds, onTogglePin, baseGarmentIds }: OutfitPreviewProps) {
  // Organizar prendas por zona del cuerpo
  const garmentsByZone = useMemo(() => {
    const zones: Record<string, Garment[]> = {
      upper: [],
      lower: [],
      full: [],
      feet: [],
      accessories: [],
    };

    selectedGarments.forEach((garment) => {
      const zone = BODY_ZONES[garment.category] || 'accessories';
      zones[zone].push(garment);
    });

    return zones;
  }, [selectedGarments]);

  // Determinar qué mostrar basado en las prendas seleccionadas
  const hasFullBodyGarment = garmentsByZone.full.length > 0;
  const showUpperAndLower = !hasFullBodyGarment && (garmentsByZone.upper.length > 0 || garmentsByZone.lower.length > 0);

  if (selectedGarments.length === 0) {
    return null;
  }

  return (
    <View style={styles.container}>
      <View style={styles.previewBox}>
        {/* Prenda de cuerpo completo (vestidos) */}
        {hasFullBodyGarment && (
          <View style={styles.fullBodyZone}>
            {garmentsByZone.full.map((garment, idx) => (
              <View key={garment.id} style={[styles.garmentWrapper, idx > 0 && styles.overlayGarment]}>
                <View>
                  <TouchableOpacity onPress={() => onGarmentPress?.(garment)} activeOpacity={0.8}>
                    <Image
                      source={{ uri: garment.imageUrl }}
                      style={styles.fullBodyImage}
                      contentFit="contain"
                      cachePolicy="memory-disk"
                    />
                  </TouchableOpacity>
                  {onTogglePin && (
                    <TouchableOpacity
                      onPress={() => onTogglePin(garment.id)}
                      style={styles.pinButton}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <Ionicons
                        name={pinnedGarmentIds?.has(garment.id) ? 'pin' : 'pin-outline'}
                        size={18}
                        color={pinnedGarmentIds?.has(garment.id) ? '#4F46E5' : '#9CA3AF'}
                      />
                    </TouchableOpacity>
                  )}
                  {baseGarmentIds?.has(garment.id) && (
                    <View style={styles.baseBadge}>
                      <Text style={styles.baseBadgeText}>BASE</Text>
                    </View>
                  )}
                </View>
                <Text style={styles.garmentLabel} numberOfLines={1}>
                  {garment.name}
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* Zona superior e inferior separadas */}
        {showUpperAndLower && (
          <>
            {/* Zona superior (tops, camisas, etc.) */}
            {garmentsByZone.upper.length > 0 && (
              <View style={styles.upperZone}>
                {garmentsByZone.upper.map((garment, idx) => (
                  <View key={garment.id} style={[styles.garmentWrapper, idx > 0 && styles.overlayGarment]}>
                    <View>
                      <TouchableOpacity onPress={() => onGarmentPress?.(garment)} activeOpacity={0.8}>
                        <Image
                          source={{ uri: garment.imageUrl }}
                          style={styles.upperImage}
                          contentFit="contain"
                          cachePolicy="memory-disk"
                        />
                      </TouchableOpacity>
                      {onTogglePin && (
                        <TouchableOpacity
                          onPress={() => onTogglePin(garment.id)}
                          style={styles.pinButton}
                          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        >
                          <Ionicons
                            name={pinnedGarmentIds?.has(garment.id) ? 'pin' : 'pin-outline'}
                            size={18}
                            color={pinnedGarmentIds?.has(garment.id) ? '#4F46E5' : '#9CA3AF'}
                          />
                        </TouchableOpacity>
                      )}
                      {baseGarmentIds?.has(garment.id) && (
                        <View style={styles.baseBadge}>
                          <Text style={styles.baseBadgeText}>BASE</Text>
                        </View>
                      )}
                    </View>
                    <Text style={styles.garmentLabel} numberOfLines={1}>
                      {garment.name}
                    </Text>
                  </View>
                ))}
              </View>
            )}

            {/* Zona inferior (pantalones, faldas, etc.) */}
            {garmentsByZone.lower.length > 0 && (
              <View style={styles.lowerZone}>
                {garmentsByZone.lower.map((garment, idx) => (
                  <View key={garment.id} style={[styles.garmentWrapper, idx > 0 && styles.overlayGarment]}>
                    <View>
                      <TouchableOpacity onPress={() => onGarmentPress?.(garment)} activeOpacity={0.8}>
                        <Image
                          source={{ uri: garment.imageUrl }}
                          style={styles.lowerImage}
                          contentFit="contain"
                          cachePolicy="memory-disk"
                        />
                      </TouchableOpacity>
                      {onTogglePin && (
                        <TouchableOpacity
                          onPress={() => onTogglePin(garment.id)}
                          style={styles.pinButton}
                          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        >
                          <Ionicons
                            name={pinnedGarmentIds?.has(garment.id) ? 'pin' : 'pin-outline'}
                            size={18}
                            color={pinnedGarmentIds?.has(garment.id) ? '#4F46E5' : '#9CA3AF'}
                          />
                        </TouchableOpacity>
                      )}
                      {baseGarmentIds?.has(garment.id) && (
                        <View style={styles.baseBadge}>
                          <Text style={styles.baseBadgeText}>BASE</Text>
                        </View>
                      )}
                    </View>
                    <Text style={styles.garmentLabel} numberOfLines={1}>
                      {garment.name}
                    </Text>
                  </View>
                ))}
              </View>
            )}
          </>
        )}

        {/* Zona de calzado */}
        {garmentsByZone.feet.length > 0 && (
          <View style={styles.feetZone}>
                {garmentsByZone.feet.map((garment, idx) => (
                  <View key={garment.id} style={[styles.garmentWrapper, idx > 0 && styles.overlayGarment]}>
                    <View>
                      <TouchableOpacity onPress={() => onGarmentPress?.(garment)} activeOpacity={0.8}>
                        <Image
                          source={{ uri: garment.imageUrl }}
                          style={styles.feetImage}
                          contentFit="contain"
                          cachePolicy="memory-disk"
                        />
                      </TouchableOpacity>
                      {onTogglePin && (
                        <TouchableOpacity
                          onPress={() => onTogglePin(garment.id)}
                          style={styles.pinButton}
                          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        >
                          <Ionicons
                            name={pinnedGarmentIds?.has(garment.id) ? 'pin' : 'pin-outline'}
                            size={18}
                            color={pinnedGarmentIds?.has(garment.id) ? '#4F46E5' : '#9CA3AF'}
                          />
                        </TouchableOpacity>
                      )}
                      {baseGarmentIds?.has(garment.id) && (
                        <View style={styles.baseBadge}>
                          <Text style={styles.baseBadgeText}>BASE</Text>
                        </View>
                      )}
                    </View>
                    <Text style={styles.garmentLabel} numberOfLines={1}>
                      {garment.name}
                    </Text>
                  </View>
                ))}
          </View>
        )}

        {/* Zona de accesorios */}
        {garmentsByZone.accessories.length > 0 && (
          <View style={styles.accessoriesZone}>
            <Text style={styles.accessoriesTitle}>Accesorios:</Text>
            <View style={styles.accessoriesGrid}>
                {garmentsByZone.accessories.map((garment) => (
                <View key={garment.id} style={styles.accessoryItem}>
                  <View>
                    <TouchableOpacity onPress={() => onGarmentPress?.(garment)} activeOpacity={0.8}>
                      <Image
                        source={{ uri: garment.imageUrl }}
                        style={styles.accessoryImage}
                        contentFit="contain"
                        cachePolicy="memory-disk"
                      />
                    </TouchableOpacity>
                    {onTogglePin && (
                      <TouchableOpacity
                        onPress={() => onTogglePin(garment.id)}
                        style={styles.pinButton}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      >
                        <Ionicons
                          name={pinnedGarmentIds?.has(garment.id) ? 'pin' : 'pin-outline'}
                          size={16}
                          color={pinnedGarmentIds?.has(garment.id) ? '#4F46E5' : '#9CA3AF'}
                        />
                      </TouchableOpacity>
                    )}
                    {baseGarmentIds?.has(garment.id) && (
                      <View style={styles.baseBadge}>
                        <Text style={styles.baseBadgeText}>BASE</Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.accessoryLabel} numberOfLines={1}>
                    {garment.name}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}
      </View>

      {/* Resumen */}
      <View style={styles.summaryBox}>
        <Text style={styles.summaryText}>
          {selectedGarments.length} {selectedGarments.length === 1 ? 'prenda' : 'prendas'} seleccionadas
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    alignItems: 'center',
    marginVertical: 12,
  },

  previewBox: {
    width: PREVIEW_WIDTH,
    backgroundColor: '#F9FAFB',
    borderRadius: 16,
    padding: 16,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderStyle: 'dashed',
  },

  /* ===== ZONAS DEL CUERPO ===== */
  fullBodyZone: {
    width: '100%',
    minHeight: 350,
    position: 'relative',
  },

  upperZone: {
    width: '100%',
    minHeight: 200,
    marginBottom: 8,
    position: 'relative',
  },

  lowerZone: {
    width: '100%',
    minHeight: 200,
    position: 'relative',
  },

  feetZone: {
    width: '100%',
    minHeight: 120,
    marginTop: 8,
    position: 'relative',
  },

  accessoriesZone: {
    width: '100%',
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },

  /* ===== PRENDAS ===== */
  garmentWrapper: {
    width: '100%',
    marginBottom: 8,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },

  overlayGarment: {
    position: 'absolute',
    top: 0,
    left: 0,
    opacity: 0.7,
  },

  fullBodyImage: {
    width: '100%',
    height: 350,
  },

  upperImage: {
    width: '100%',
    height: 200,
  },

  lowerImage: {
    width: '100%',
    height: 200,
  },

  feetImage: {
    width: '100%',
    height: 120,
  },

  garmentLabel: {
    fontSize: 12,
    color: '#374151',
    fontWeight: '600',
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
  },

  /* ===== ACCESORIOS ===== */
  accessoriesTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6B7280',
    marginBottom: 8,
  },

  accessoriesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },

  accessoryItem: {
    width: 100,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },

  accessoryImage: {
    width: '100%',
    height: 100,
  },

  accessoryLabel: {
    fontSize: 11,
    color: '#374151',
    fontWeight: '500',
    paddingHorizontal: 6,
    paddingVertical: 4,
    textAlign: 'center',
  },

  /* ===== RESUMEN ===== */
  summaryBox: {
    marginTop: 12,
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: '#EEF2FF',
    borderRadius: 20,
  },

  summaryText: {
    fontSize: 13,
    color: '#4F46E5',
    fontWeight: '600',
  },

  /* ===== PIN BUTTON ===== */
  pinButton: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 2,
    elevation: 3,
  },

  /* ===== BASE BADGE ===== */
  baseBadge: {
    position: 'absolute',
    top: 6,
    left: 6,
    backgroundColor: '#F59E0B',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 3,
  },
  baseBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
});

export default OutfitPreview;

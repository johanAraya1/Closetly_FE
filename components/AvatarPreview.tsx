/**
 * AvatarPreview Component
 * Avatar minimalista y limpio que se viste dinámicamente
 */

import React, { useMemo } from 'react';
import { View, StyleSheet, Dimensions, Text } from 'react-native';
import { getColorFromName } from '@/utils/format';
import type { Garment } from '@/types';

interface AvatarPreviewProps {
  selectedGarments: Garment[];
}

const BODY_ZONES = {
  'tops': 'upper',
  'shirts': 'upper',
  'blouses': 'upper',
  'jackets': 'upper',
  'sweaters': 'upper',
  'pants': 'lower',
  'skirts': 'lower',
  'shorts': 'lower',
  'dresses': 'full',
  'shoes': 'feet',
  'accessories': 'accessories',
  'bags': 'accessories',
  'scarves': 'accessories',
} as Record<string, string>;

export const AvatarPreview = React.memo<AvatarPreviewProps>(({ selectedGarments }) => {
  const { width } = Dimensions.get('window');
  const AVATAR_SIZE = Math.min(width - 40, 280);

  const garmentsByZone = useMemo(() => {
    const zones = {
      upper: null as Garment | null,
      lower: null as Garment | null,
      full: null as Garment | null,
      feet: null as Garment | null,
      accessories: [] as Garment[],
    };

    selectedGarments.forEach((garment) => {
      const category = garment.category.toLowerCase();
      const zone = BODY_ZONES[category] || 'accessories';
      
      if (zone === 'accessories') {
        zones.accessories.push(garment);
      } else if (zone === 'upper' && !zones.upper) {
        zones.upper = garment;
      } else if (zone === 'lower' && !zones.lower) {
        zones.lower = garment;
      } else if (zone === 'full' && !zones.full) {
        zones.full = garment;
      } else if (zone === 'feet' && !zones.feet) {
        zones.feet = garment;
      }
    });

    return zones;
  }, [selectedGarments]);

  const getClothingColor = (colorName: string) => {
    if (!colorName) return '#E5E7EB';
    return getColorFromName(colorName);
  };

  const upperColor = getClothingColor(garmentsByZone.upper?.color || '');
  const lowerColor = getClothingColor(garmentsByZone.lower?.color || '');
  const fullColor = getClothingColor(garmentsByZone.full?.color || '');
  const feetColor = getClothingColor(garmentsByZone.feet?.color || '');

  const showDress = !!garmentsByZone.full;

  return (
    <View style={[styles.container, { height: AVATAR_SIZE + 90 }]}>
      <View style={[styles.avatarCanvas, { width: AVATAR_SIZE, height: AVATAR_SIZE }]}>
        
        {/* ========== CABEZA ========== */}
        <View style={styles.headSection}>
          {/* Pelo */}
          <View style={styles.hair} />
          
          {/* Cara */}
          <View style={styles.head}>
            {/* Ojos */}
            <View style={styles.eyes}>
              <View style={styles.eye} />
              <View style={styles.eye} />
            </View>
            
            {/* Nariz */}
            <View style={styles.nose} />
            
            {/* Boca */}
            <View style={styles.mouth} />
          </View>
        </View>

        {/* ========== CUELLO ========== */}
        <View style={styles.neck} />

        {/* ========== CUERPO ========== */}
        <View style={styles.bodySection}>
          {!showDress ? (
            <>
              {/* CAMISA */}
              <View style={[styles.shirt, { backgroundColor: upperColor }]}>
                {garmentsByZone.upper && (
                  <Text style={styles.shirtLabel} numberOfLines={1}>
                    {garmentsByZone.upper.name.substring(0, 8)}
                  </Text>
                )}
              </View>

              {/* PANTALONES */}
              <View style={[styles.pants, { backgroundColor: lowerColor }]}>
                {garmentsByZone.lower && (
                  <Text style={styles.pantsLabel} numberOfLines={1}>
                    {garmentsByZone.lower.name.substring(0, 8)}
                  </Text>
                )}
              </View>
            </>
          ) : (
            /* VESTIDO */
            <View style={[styles.dress, { backgroundColor: fullColor }]}>
              {garmentsByZone.full && (
                <Text style={styles.dressLabel} numberOfLines={1}>
                  {garmentsByZone.full.name.substring(0, 8)}
                </Text>
              )}
            </View>
          )}
        </View>

        {/* ========== BRAZOS ========== */}
        <View style={styles.armsContainer}>
          <View style={styles.arm} />
          <View style={styles.arm} />
        </View>

        {/* ========== PIERNAS ========== */}
        <View style={styles.legsSection}>
          <View style={styles.leg} />
          <View style={styles.leg} />
        </View>

        {/* ========== PIES ========== */}
        <View style={styles.feetSection}>
          <View style={[styles.foot, { backgroundColor: feetColor }]} />
          <View style={[styles.foot, { backgroundColor: feetColor }]} />
        </View>

        {/* Sombra base */}
        <View style={styles.baseShadow} />

        {/* ========== ACCESORIOS ========== */}
        {garmentsByZone.accessories.slice(0, 3).map((garment, index) => (
          <View
            key={garment.id}
            style={[
              styles.accessoryBag,
              {
                backgroundColor: getClothingColor(garment.color || ''),
                top: 50 + index * 45,
                right: 10,
              },
            ]}
          >
            <Text style={styles.bagIcon}>👜</Text>
          </View>
        ))}
      </View>

      {/* INFO */}
      {selectedGarments.length > 0 && (
        <View style={styles.infoBox}>
          <Text style={styles.infoText}>
            {selectedGarments.length} {selectedGarments.length === 1 ? 'prenda' : 'prendas'}
          </Text>
        </View>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
    backgroundColor: '#F9FAFB',
    borderRadius: 16,
    marginBottom: 24,
  },

  avatarCanvas: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 6,
    position: 'relative',
  },

  /* ===== CABEZA ===== */
  headSection: {
    alignItems: 'center',
    marginBottom: 8,
    position: 'relative',
    height: 88,
    justifyContent: 'flex-end',
  },

  hair: {
    position: 'absolute',
    top: 0,
    width: 86,
    height: 46,
    backgroundColor: '#2C1810',
    borderRadius: 50,
    zIndex: 1,
  },

  head: {
    width: 68,
    height: 70,
    borderRadius: 34,
    backgroundColor: '#F4B896',
    zIndex: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },

  eyes: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 10,
  },

  eye: {
    width: 10,
    height: 11,
    backgroundColor: '#2C1810',
    borderRadius: 50,
  },

  nose: {
    width: 4,
    height: 5,
    backgroundColor: '#E6B895',
    borderRadius: 2,
    marginBottom: 8,
  },

  mouth: {
    width: 16,
    height: 4,
    backgroundColor: '#D97706',
    borderRadius: 2,
  },

  /* ===== CUELLO ===== */
  neck: {
    width: 20,
    height: 10,
    backgroundColor: '#F4B896',
    marginBottom: 0,
  },

  /* ===== CUERPO ===== */
  bodySection: {
    width: 96,
    alignItems: 'center',
  },

  shirt: {
    width: 96,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
    borderTopLeftRadius: 6,
    borderTopRightRadius: 6,
  },

  shirtLabel: {
    fontSize: 9,
    fontWeight: '600',
    color: '#FFFFFF',
    textShadowColor: '#00000030',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 1,
  },

  pants: {
    width: 96,
    height: 46,
    justifyContent: 'center',
    alignItems: 'center',
    borderBottomLeftRadius: 6,
    borderBottomRightRadius: 6,
  },

  pantsLabel: {
    fontSize: 9,
    fontWeight: '600',
    color: '#FFFFFF',
    textShadowColor: '#00000030',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 1,
  },

  dress: {
    width: 96,
    height: 94,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },

  dressLabel: {
    fontSize: 9,
    fontWeight: '600',
    color: '#FFFFFF',
    textShadowColor: '#00000030',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 1,
  },

  /* ===== BRAZOS ===== */
  armsContainer: {
    position: 'absolute',
    top: 104,
    width: 136,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  arm: {
    width: 15,
    height: 48,
    backgroundColor: '#F4B896',
    borderBottomLeftRadius: 8,
    borderBottomRightRadius: 8,
  },

  /* ===== PIERNAS ===== */
  legsSection: {
    flexDirection: 'row',
    gap: 15,
    marginTop: 3,
  },

  leg: {
    width: 13,
    height: 46,
    backgroundColor: '#F4B896',
  },

  /* ===== PIES ===== */
  feetSection: {
    flexDirection: 'row',
    gap: 15,
    marginTop: 1,
  },

  foot: {
    width: 15,
    height: 10,
    borderRadius: 2,
    borderBottomLeftRadius: 5,
    borderBottomRightRadius: 5,
  },

  /* ===== SOMBRA ===== */
  baseShadow: {
    position: 'absolute',
    bottom: 3,
    width: '55%',
    height: 4,
    backgroundColor: '#00000012',
    borderRadius: 50,
  },

  /* ===== ACCESORIOS ===== */
  accessoryBag: {
    position: 'absolute',
    width: 34,
    height: 34,
    borderRadius: 5,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
  },

  bagIcon: {
    fontSize: 15,
  },

  /* ===== INFO ===== */
  infoBox: {
    marginTop: 14,
  },

  infoText: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '500',
  },
});

export default AvatarPreview;

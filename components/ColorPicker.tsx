/**
 * ColorPicker Component
 * Grilla de colores multi-select con swatches + texto editable para colores personalizados
 */

import React, { useState, useCallback, useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Input } from '@/components';
import { useTranslation } from '@/hooks/useTranslation';
import { getColorHexArray } from '@/utils/format';
import { COLORS } from '@/lib/constants';

export interface ColorOption {
  name: string;
  hex: string;
}

export const PRESET_COLORS: ColorOption[] = [
  { name: 'Blanco', hex: '#FFFFFF' },
  { name: 'Negro', hex: '#000000' },
  { name: 'Gris', hex: '#6B7280' },
  { name: 'Gris Claro', hex: '#D1D5DB' },
  { name: 'Gris Oscuro', hex: '#374151' },
  { name: 'Rojo', hex: '#DC2626' },
  { name: 'Rojo Oscuro', hex: '#991B1B' },
  { name: 'Azul', hex: '#2563EB' },
  { name: 'Azul Oscuro', hex: '#1E3A8A' },
  { name: 'Azul Claro', hex: '#BFDBFE' },
  { name: 'Celeste', hex: '#87CEEB' },
  { name: 'Verde', hex: '#16A34A' },
  { name: 'Verde Oscuro', hex: '#14532D' },
  { name: 'Verde Claro', hex: '#BBF7D0' },
  { name: 'Amarillo', hex: '#EAB308' },
  { name: 'Amarillo Claro', hex: '#FEF3C7' },
  { name: 'Naranja', hex: '#EA580C' },
  { name: 'Rosa', hex: '#EC4899' },
  { name: 'Rosa Claro', hex: '#FBCFE8' },
  { name: 'Morado', hex: '#9333EA' },
  { name: 'Marrón', hex: '#92400E' },
  { name: 'Beige', hex: '#D4C4B0' },
  { name: 'Crema', hex: '#F5F5DC' },
  { name: 'Dorado', hex: '#FFD700' },
  { name: 'Plateado', hex: '#C0C0C0' },
  { name: 'Turquesa', hex: '#14B8A6' },
  { name: 'Vino', hex: '#7F1D1D' },
];

interface ColorPickerProps {
  value: string; // colores separados por coma
  onChange: (value: string) => void;
  error?: string;
  label?: string;
}

export const ColorPicker: React.FC<ColorPickerProps> = ({ value, onChange, error, label }) => {
  const { t } = useTranslation();
  const [showCustom, setShowCustom] = useState(false);

  const selectedColors = useMemo(() => {
    if (!value?.trim()) return [];
    return value
      .split(',')
      .map((c) => c.trim())
      .filter(Boolean);
  }, [value]);

  const selectedHexes = useMemo(() => getColorHexArray(value), [value]);

  const toggleColor = useCallback(
    (colorName: string) => {
      const normalized = colorName.toLowerCase().trim();
      const current = selectedColors.map((c) => c.toLowerCase().trim());
      if (current.includes(normalized)) {
        // Sacarlo
        const filtered = selectedColors.filter(
          (c) => c.toLowerCase().trim() !== normalized,
        );
        onChange(filtered.join(', '));
      } else {
        // Agregarlo
        onChange(selectedColors.length > 0 ? `${value}, ${colorName}` : colorName);
      }
    },
    [selectedColors, value, onChange],
  );

  const isSelected = (colorName: string) =>
    selectedColors.some((c) => c.toLowerCase().trim() === colorName.toLowerCase().trim());

  return (
    <View style={styles.container}>
      {label && <Text style={styles.label}>{label}</Text>}

      {/* Previsualización de colores seleccionados */}
      {selectedHexes.length > 0 && (
        <View style={styles.previewRow}>
          {selectedHexes.map((hex, i) => (
            <View
              key={`${hex}-${i}`}
              style={[
                styles.previewDot,
                {
                  backgroundColor: hex,
                  borderColor: hex === '#FFFFFF' ? '#E5E7EB' : 'transparent',
                },
              ]}
            />
          ))}
          <Text style={styles.previewText} numberOfLines={1}>
            {selectedColors.join(', ')}
          </Text>
        </View>
      )}

      {/* Grilla de colores */}
      <ScrollView
        horizontal={false}
        style={styles.gridScroll}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.grid}>
          {PRESET_COLORS.map((c) => {
            const sel = isSelected(c.name);
            return (
              <TouchableOpacity
                key={c.name}
                style={[styles.swatch, sel && styles.swatchSelected]}
                onPress={() => toggleColor(c.name)}
                activeOpacity={0.7}
              >
                <View
                  style={[
                    styles.swatchCircle,
                    {
                      backgroundColor: c.hex,
                      borderColor:
                        c.hex === '#FFFFFF' ? '#D1D5DB' : 'transparent',
                    },
                    sel && styles.swatchCircleSelected,
                  ]}
                />
                <Text
                  style={[styles.swatchLabel, sel && styles.swatchLabelSelected]}
                  numberOfLines={1}
                >
                  {c.name}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>

      {/* Botón para color personalizado */}
      <TouchableOpacity
        style={styles.customToggle}
        onPress={() => setShowCustom(!showCustom)}
      >
        <Ionicons
          name={showCustom ? 'chevron-up' : 'pencil'}
          size={16}
          color={COLORS.primary}
        />
        <Text style={styles.customToggleText}>
          {showCustom
            ? t('garments.create.hideCustomColor') || 'Ocultar color personalizado'
            : t('garments.create.customColor') || 'Escribir color manualmente'}
        </Text>
      </TouchableOpacity>

      {showCustom && (
        <Input
          value={value}
          onChangeText={onChange}
          placeholder={t('garments.create.colorPlaceholder')}
          multiline={false}
        />
      )}

      {error && <Text style={styles.error}>{error}</Text>}
    </View>
  );
};

const SWATCH_SIZE = 56;

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  previewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  previewDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 1,
  },
  previewText: {
    fontSize: 14,
    color: '#6B7280',
    flex: 1,
  },
  gridScroll: {
    maxHeight: 260,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  swatch: {
    width: SWATCH_SIZE + 16,
    alignItems: 'center',
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  swatchSelected: {
    borderColor: COLORS.primary,
    backgroundColor: '#EFF6FF',
  },
  swatchCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 4,
  },
  swatchCircleSelected: {
    borderWidth: 2,
    borderColor: COLORS.primary,
  },
  swatchLabel: {
    fontSize: 10,
    color: '#6B7280',
    textAlign: 'center',
  },
  swatchLabelSelected: {
    color: COLORS.primary,
    fontWeight: '600',
  },
  customToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    marginTop: 4,
  },
  customToggleText: {
    fontSize: 13,
    color: COLORS.primary,
  },
  error: {
    fontSize: 12,
    color: '#EF4444',
    marginTop: 4,
  },
});

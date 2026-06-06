/**
 * GarmentVisibilityForm Component
 * Switch for public visibility + conditional listing type picker
 */

import React, { useState } from 'react';
import { View, Text, Switch, TouchableOpacity, Alert, Modal as RNModal, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, LISTING_TYPES } from '@/lib/constants';
import { useTranslation } from '@/hooks/useTranslation';
import type { ListingType } from '@/types';

interface GarmentVisibilityFormProps {
  isPublic: boolean;
  listingType: ListingType | null;
  onIsPublicChange: (value: boolean) => void;
  onListingTypeChange: (value: ListingType | null) => void;
}

export const GarmentVisibilityForm: React.FC<GarmentVisibilityFormProps> = ({
  isPublic,
  listingType,
  onIsPublicChange,
  onListingTypeChange,
}) => {
  const { t } = useTranslation();
  const [showPicker, setShowPicker] = useState(false);

  const handleInfoPress = () => {
    Alert.alert(
      t('garments.isPublic.label'),
      t('garments.isPublic.tooltip'),
      [{ text: t('common.ok') }]
    );
  };

  const handleSelectType = (type: ListingType) => {
    onListingTypeChange(type);
    setShowPicker(false);
  };

  const handleClearType = () => {
    onListingTypeChange(null);
    setShowPicker(false);
  };

  const selectedType = LISTING_TYPES.find((lt) => lt.value === listingType);

  return (
    <View style={styles.container}>
      {/* Visibility Toggle */}
      <View style={styles.switchRow}>
        <View style={styles.switchLabelContainer}>
          <Text style={styles.label}>{t('garments.isPublic.label')}</Text>
          <TouchableOpacity onPress={handleInfoPress} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name="information-circle-outline" size={20} color={COLORS.gray[400]} />
          </TouchableOpacity>
        </View>
        <Switch
          value={isPublic}
          onValueChange={onIsPublicChange}
          trackColor={{ false: '#E5E7EB', true: COLORS.primary + '80' }}
          thumbColor={isPublic ? COLORS.primary : '#FFFFFF'}
        />
      </View>

      {isPublic && (
        <Text style={styles.hint}>{t('garments.isPublic.hint')}</Text>
      )}

      {/* Listing Type Picker (only when public) */}
      {isPublic && (
        <>
          <Text style={[styles.label, styles.pickerLabel]}>{t('garments.listingType.label')}</Text>
          <TouchableOpacity
            style={styles.pickerButton}
            onPress={() => setShowPicker(true)}
            activeOpacity={0.7}
          >
            {selectedType ? (
              <View style={styles.pickerValueRow}>
                <View style={[styles.colorDot, { backgroundColor: selectedType.color }]} />
                <Text style={styles.pickerValueText}>
                  {t(selectedType.labelKey)}
                </Text>
              </View>
            ) : (
              <Text style={styles.pickerPlaceholder}>Select...</Text>
            )}
            <Ionicons name="chevron-down" size={18} color={COLORS.gray[400]} />
          </TouchableOpacity>

          {/* Picker Modal */}
          <RNModal
            visible={showPicker}
            transparent
            animationType="fade"
            onRequestClose={() => setShowPicker(false)}
          >
            <TouchableOpacity
              style={styles.backdrop}
              activeOpacity={1}
              onPress={() => setShowPicker(false)}
            >
              <TouchableOpacity
                style={styles.modalContent}
                activeOpacity={1}
                onPress={(e) => e.stopPropagation()}
              >
                <Text style={styles.modalTitle}>{t('garments.listingType.label')}</Text>

                {LISTING_TYPES.map((lt) => (
                  <TouchableOpacity
                    key={lt.value}
                    style={[
                      styles.optionRow,
                      listingType === lt.value && styles.optionRowActive,
                    ]}
                    onPress={() => handleSelectType(lt.value)}
                  >
                    <View style={[styles.optionDot, { backgroundColor: lt.color }]} />
                    <View style={styles.optionTextContainer}>
                      <Text style={[
                        styles.optionLabel,
                        listingType === lt.value && styles.optionLabelActive,
                      ]}>
                        {t(lt.labelKey)}
                      </Text>
                      <Text style={styles.optionDescription}>
                        {t(lt.descriptionKey)}
                      </Text>
                    </View>
                    {listingType === lt.value && (
                      <Ionicons name="checkmark" size={20} color={COLORS.primary} />
                    )}
                  </TouchableOpacity>
                ))}

                {listingType && (
                  <TouchableOpacity
                    style={styles.clearButton}
                    onPress={handleClearType}
                  >
                    <Text style={styles.clearButtonText}>Clear</Text>
                  </TouchableOpacity>
                )}
              </TouchableOpacity>
            </TouchableOpacity>
          </RNModal>
        </>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  switchLabelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  label: {
    color: '#374151',
    fontWeight: '500',
    fontSize: 14,
  },
  hint: {
    color: '#6B7280',
    fontSize: 12,
    marginTop: 4,
    lineHeight: 16,
  },
  pickerLabel: {
    marginTop: 16,
    marginBottom: 8,
  },
  pickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
  },
  pickerValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  colorDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  pickerValueText: {
    fontSize: 16,
    color: '#111827',
  },
  pickerPlaceholder: {
    fontSize: 16,
    color: '#9CA3AF',
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 16,
    textAlign: 'center',
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 10,
    marginBottom: 4,
    gap: 12,
  },
  optionRowActive: {
    backgroundColor: '#F0FDF4',
  },
  optionDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  optionTextContainer: {
    flex: 1,
  },
  optionLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  optionLabelActive: {
    color: COLORS.primary,
  },
  optionDescription: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 2,
    lineHeight: 18,
  },
  clearButton: {
    marginTop: 12,
    alignItems: 'center',
    paddingVertical: 10,
  },
  clearButtonText: {
    fontSize: 14,
    color: COLORS.error,
    fontWeight: '500',
  },
});

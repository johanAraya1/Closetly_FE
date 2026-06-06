/**
 * ListingTypeBadge Component
 * Colored pill badge showing the listing type of a public garment
 * Uses LISTING_TYPES constant for colors and labels
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LISTING_TYPES } from '@/lib/constants';
import { useTranslation } from '@/hooks/useTranslation';
import type { ListingType } from '@/types';

interface ListingTypeBadgeProps {
  type: ListingType;
}

export const ListingTypeBadge: React.FC<ListingTypeBadgeProps> = ({ type }) => {
  const { t } = useTranslation();
  const listingType = LISTING_TYPES.find((lt) => lt.value === type);

  if (!listingType) return null;

  return (
    <View style={[styles.badge, { backgroundColor: listingType.color + '20' }]}>
      <View style={[styles.dot, { backgroundColor: listingType.color }]} />
      <Text style={[styles.label, { color: listingType.color }]}>
        {t(listingType.labelKey)}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    gap: 4,
    alignSelf: 'flex-start',
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  label: {
    fontSize: 11,
    fontWeight: '600',
  },
});

/**
 * SkeletonCard Component
 * Skeleton loader para mostrar mientras cargan los datos
 */

import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import { COLORS } from '@/lib/constants';

interface SkeletonCardProps {
  width?: number | string;
  height?: number;
  borderRadius?: number;
  style?: any;
}

export const SkeletonCard: React.FC<SkeletonCardProps> = ({
  width = '100%',
  height = 120,
  borderRadius = 8,
  style,
}) => {
  const animatedValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(animatedValue, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(animatedValue, {
          toValue: 0,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  const opacity = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.7],
  });

  return (
    <Animated.View
      style={[
        styles.skeleton,
        {
          width,
          height,
          borderRadius,
          opacity,
        },
        style,
      ]}
    />
  );
};

export const SkeletonGarmentCard: React.FC = () => {
  return (
    <View style={styles.garmentCard}>
      <SkeletonCard height={120} borderRadius={8} />
      <View style={styles.garmentInfo}>
        <SkeletonCard width="70%" height={16} style={{ marginBottom: 8 }} />
        <SkeletonCard width="50%" height={12} />
      </View>
    </View>
  );
};

export const SkeletonOutfitCard: React.FC = () => {
  return (
    <View style={styles.outfitCard}>
      <SkeletonCard height={200} borderRadius={12} />
      <View style={styles.outfitInfo}>
        <SkeletonCard width="60%" height={18} style={{ marginBottom: 8 }} />
        <SkeletonCard width="80%" height={14} />
      </View>
    </View>
  );
};

export const SkeletonList: React.FC<{ count?: number; type?: 'garment' | 'outfit' }> = ({
  count = 3,
  type = 'garment',
}) => {
  const SkeletonComponent = type === 'garment' ? SkeletonGarmentCard : SkeletonOutfitCard;

  return (
    <View style={styles.list}>
      {Array.from({ length: count }).map((_, index) => (
        <SkeletonComponent key={index} />
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  skeleton: {
    backgroundColor: COLORS.gray[200],
  },
  garmentCard: {
    marginBottom: 16,
  },
  garmentInfo: {
    marginTop: 8,
  },
  outfitCard: {
    marginBottom: 16,
  },
  outfitInfo: {
    marginTop: 12,
  },
  list: {
    padding: 16,
  },
});

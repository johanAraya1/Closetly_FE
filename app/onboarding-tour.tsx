/**
 * Onboarding Tour Screen
 * Tour guiado para usuarios nuevos — se muestra una sola vez
 * después del primer registro/login.
 *
 * Diseño: FlatList horizontal con paginación, dots y botón
 * "Saltar" / "Comenzar".
 */

import React, { useRef, useState, useCallback } from 'react';
import { View, Text, FlatList, Dimensions, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Button } from '@/components';
import { useTranslation } from '@/hooks/useTranslation';
import { COLORS } from '@/lib/constants';

const { width } = Dimensions.get('window');
const TOUR_KEY = '@closetly/tour_completed';

interface TourPage {
  icon: keyof typeof Ionicons.glyphMap;
  iconColor: string;
  titleKey: string;
  descKey: string;
}

const PAGES: TourPage[] = [
  {
    icon: 'shirt-outline',
    iconColor: COLORS.primary,
    titleKey: 'tour.page1Title',
    descKey: 'tour.page1Desc',
  },
  {
    icon: 'toggle-outline',
    iconColor: COLORS.secondary,
    titleKey: 'tour.page2Title',
    descKey: 'tour.page2Desc',
  },
  {
    icon: 'calendar-outline',
    iconColor: '#8B5CF6',
    titleKey: 'tour.page3Title',
    descKey: 'tour.page3Desc',
  },
  {
    icon: 'storefront-outline',
    iconColor: '#F97316',
    titleKey: 'tour.page4Title',
    descKey: 'tour.page4Desc',
  },
];

export default function OnboardingTourScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const flatListRef = useRef<FlatList>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const isLastPage = currentIndex === PAGES.length - 1;

  const completeTour = useCallback(async () => {
    await AsyncStorage.setItem(TOUR_KEY, 'true');
    router.replace('/(tabs)/home');
  }, [router]);

  const handleNext = useCallback(() => {
    if (isLastPage) {
      completeTour();
    } else {
      flatListRef.current?.scrollToIndex({ index: currentIndex + 1 });
    }
  }, [isLastPage, currentIndex, completeTour]);

  const onScroll = useCallback((e: any) => {
    const index = Math.round(e.nativeEvent.contentOffset.x / width);
    setCurrentIndex(index);
  }, []);

  const renderItem = useCallback(({ item }: { item: TourPage }) => (
    <View style={styles.page}>
      <View style={[styles.iconCircle, { backgroundColor: item.iconColor + '15' }]}>
        <Ionicons name={item.icon} size={72} color={item.iconColor} />
      </View>
      <Text style={styles.pageTitle}>{t(item.titleKey as any)}</Text>
      <Text style={styles.pageDesc}>{t(item.descKey as any)}</Text>
    </View>
  ), [t]);

  return (
    <SafeAreaView style={styles.container}>
      {/* Header: Skip button */}
      {!isLastPage && (
        <TouchableOpacity onPress={completeTour} style={styles.skipButton}>
          <Text style={styles.skipText}>{t('tour.skip')}</Text>
        </TouchableOpacity>
      )}

      {/* Pages */}
      <FlatList
        ref={flatListRef}
        data={PAGES}
        renderItem={renderItem}
        keyExtractor={(_, i) => String(i)}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={onScroll}
        bounces={false}
      />

      {/* Dots + Action */}
      <View style={styles.footer}>
        <View style={styles.dotsRow}>
          {PAGES.map((_, i) => (
            <View
              key={i}
              style={[styles.dot, i === currentIndex && styles.dotActive]}
            />
          ))}
        </View>

        <Button
          title={isLastPage ? t('tour.start') : t('common.next') || 'Next'}
          onPress={handleNext}
          fullWidth
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  skipButton: {
    position: 'absolute',
    top: 16,
    right: 20,
    zIndex: 10,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  skipText: {
    fontSize: 16,
    color: '#6B7280',
    fontWeight: '600',
  },
  page: {
    width,
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    paddingBottom: 40,
  },
  iconCircle: {
    width: 160,
    height: 160,
    borderRadius: 80,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 40,
  },
  pageTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
    textAlign: 'center',
    marginBottom: 16,
  },
  pageDesc: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: 10,
  },
  footer: {
    paddingHorizontal: 24,
    paddingBottom: 24,
    gap: 20,
  },
  dotsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#D1D5DB',
  },
  dotActive: {
    backgroundColor: COLORS.primary,
    width: 24,
  },
});

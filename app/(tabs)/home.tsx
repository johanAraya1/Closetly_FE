/**
 * Home Screen
 * Pantalla principal con resumen de outfits y accesos rápidos
 */

import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, RefreshControl, Animated, Easing, Platform, ActivityIndicator, Alert } from 'react-native';
import { Image } from 'expo-image';
import { useRouter, useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as LocalAuthentication from 'expo-local-authentication';
import { Button, OutfitCard, Loading, EmptyState, SkeletonCard } from '@/components';
import { SuggestionDetailModal } from '@/components/SuggestionDetailModal';
import type { Garment, Suggestion } from '@/types';
import { useAuth } from '@/hooks/useAuth';
import { useGarments } from '@/hooks/useGarments';
import { useOutfits } from '@/hooks/useOutfits';
import { useTranslation } from '@/hooks/useTranslation';
import { COLORS } from '@/lib/constants';
import { parseLocalDate } from '@/utils/date';
import { useSuggestionsStore } from '@/store/suggestionsStore';
import { useSmartSuggestions } from '@/hooks/useSmartSuggestions';
import { tokenService } from '@/services/tokenService';
import { withScreenErrorBoundary } from '@/components';
import { useRecentCalendarEntries } from '@/hooks/useRecentCalendarEntries';

/** Unique key for a suggestion based on its garment IDs */
function suggestionKey(s: Pick<Suggestion, 'garmentIds'>): string {
  return [...(s.garmentIds ?? [])].sort().join(',');
}

function HomeScreen() {
  const router = useRouter();
  const { profile, user, logout } = useAuth();
  const { garments } = useGarments(true);
  const { outfits, isLoading, loadOutfits, createOutfit } = useOutfits(true, 3);
  const { t, locale } = useTranslation();
  const [refreshing, setRefreshing] = useState(false);
  const spinAnim = useRef(new Animated.Value(0)).current;

  // Suggestion detail modal state
  const [selectedSuggestion, setSelectedSuggestion] = useState<Suggestion | null>(null);
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState<number | null>(null);
  const [isSavingSuggestion, setIsSavingSuggestion] = useState(false);
  const [savedOutfitIds, setSavedOutfitIds] = useState<Record<string, string>>({});

  const {
    garments: suggestionGarments,
    weather,
    lastUpdated,
    pinnedGarmentIds,
    isRegenerating,
    togglePin,
    clearPins,
    regenerateWithPinned,
    message: suggestionsMessage,
  } = useSuggestionsStore();

  // Smart suggestions hook — orchestrates AI + user hybrid engine
  const {
    suggestions,
    isLoading: smartSuggestionsLoading,
    error: smartSuggestionsError,
    refresh,
  } = useSmartSuggestions();

  const suggestionsLoading = smartSuggestionsLoading;
  const suggestionsError = smartSuggestionsError;

  // Spinning animation for refresh icon
  useEffect(() => {
    if (suggestionsLoading) {
      const animation = Animated.loop(
        Animated.timing(spinAnim, {
          toValue: 1,
          duration: 1000,
          easing: Easing.linear,
          useNativeDriver: true,
        }),
      );
      animation.start();
      return () => animation.stop();
    }
    spinAnim.setValue(0);
  }, [suggestionsLoading]);

  const spinInterpolation = spinAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const favoriteOutfits = outfits.filter((o) => o.is_favorite);
  const checklistSteps = useMemo(() => [
    { key: 'garment', label: t('home.addFirstGarment'), done: garments.length > 0 },
    { key: 'outfit', label: t('home.createFirstOutfit'), done: outfits.length > 0 },
  ], [garments.length, outfits.length, t]);

  const allStepsDone = useMemo(() => checklistSteps.every((s) => s.done), [checklistSteps]);

  // Últimos 5 días desde el calendario (outfits usados recientemente)
  const { dayEntries: recentDayEntries, isLoading: recentDaysLoading, refresh: refreshRecentDays } = useRecentCalendarEntries(5);

  // Refrescar al volver al home (después de loguear un outfit, etc.)
  useFocusEffect(
    useCallback(() => {
      refreshRecentDays();
    }, [refreshRecentDays]),
  );

  const displayName = useMemo(() => {
    const name =
      profile?.username ||
      profile?.full_name ||
      user?.email?.split('@')[0] ||
      t('auth.username');
    return name?.trim() || t('auth.username');
  }, [profile?.username, profile?.full_name, user?.email, t]);

  // Biometric banner — invitar a activar huella solo si el hardware lo soporta
  const [biometricBanner, setBiometricBanner] = useState<{ visible: boolean; hasHardware: boolean }>({
    visible: false,
    hasHardware: false,
  });

  useEffect(() => {
    (async () => {
      if (Platform.OS === 'web') return;
      try {
        const hasHardware = await LocalAuthentication.hasHardwareAsync();
        const enabled = await tokenService.getBiometricEnabled();
        if (hasHardware && !enabled) {
          setBiometricBanner({ visible: true, hasHardware: true });
        }
      } catch {
        // ignore — no hay soporte biométrico
      }
    })();
  }, []);

  const dismissBiometricBanner = useCallback(() => {
    setBiometricBanner((prev) => ({ ...prev, visible: false }));
  }, []);

  // Track which suggestions have been saved as outfits
  const savedSuggestionKeys = useMemo(() => {
    const keys = new Set(Object.keys(savedOutfitIds));
    // Also check existing outfits (loaded from API)
    outfits.forEach((o) => {
      const ids = o.garments?.map((g) => g.id) ?? [];
      const key = [...ids].sort().join(',');
      if (key) keys.add(key);
    });
    return keys;
  }, [savedOutfitIds, outfits]);

  const handleOpenSuggestion = useCallback((s: Suggestion, index: number) => {
    setSelectedSuggestion(s);
    setSelectedSuggestionIndex(index);
  }, []);

  const handleCloseSuggestion = useCallback(() => {
    setSelectedSuggestion(null);
    setSelectedSuggestionIndex(null);
  }, []);

  const handleSaveSuggestion = useCallback(async (s: Suggestion) => {
    if (!user) return;
    setIsSavingSuggestion(true);
    try {
      const key = suggestionKey(s);
      // Don't save again if already saved
      if (savedSuggestionKeys.has(key)) return;

      // Find the garments for this suggestion to pass to createOutfit
      const matchedGarments = s.garmentIds
        .map((id) => suggestionGarments.find((g) => g.id === id))
        .filter(Boolean) as Garment[];

      const newOutfit = await createOutfit(user.id, {
        name: s.name,
        description: s.description || undefined,
        occasion: s.occasion || undefined,
        garmentIds: s.garmentIds,
      }, matchedGarments);
      if (newOutfit) {
        setSavedOutfitIds((prev) => ({ ...prev, [key]: newOutfit.id }));
      }
    } finally {
      setIsSavingSuggestion(false);
    }
  }, [user, createOutfit, savedSuggestionKeys, suggestionGarments]);

  const handleEditSuggestion = useCallback((outfitId: string) => {
    setSelectedSuggestion(null);
    router.push(`/outfits/create?id=${outfitId}`);
  }, [router]);

  const handleLogout = async () => {
    await logout();
    // Single Stack — router.replace funciona sin freeze.
    router.replace('/(auth)/onboarding');
  };

  const onRefresh = useCallback(async () => {
    if (!user) return;
    setRefreshing(true);
    await loadOutfits(user.id);
    setRefreshing(false);
  }, [user, loadOutfits]);

  if (isLoading && !refreshing && outfits.length === 0) {
    // Mostrar skeleton de carga sin bloquear toda la pantalla
    return <Loading message="Loading your wardrobe..." />;
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView 
        style={styles.scrollView}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[COLORS.primary]}
            tintColor={COLORS.primary}
          />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerRow}>
            <View style={styles.headerText}>
              <Text style={styles.headerTitle}>
                {t('home.title', { username: displayName })}
              </Text>
              <Text style={styles.headerSubtitle}>
                {t('home.subtitle')}
              </Text>
            </View>
            <TouchableOpacity
              onPress={handleLogout}
              style={styles.logoutButton}
              accessibilityLabel={t('auth.logout')}
            >
              <Ionicons name="log-out-outline" size={20} color={COLORS.gray[700]} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Primeros Pasos — checklist para usuarios nuevos */}
        {!allStepsDone && (
          <View style={styles.checklistSection}>
            <Text style={styles.checklistTitle}>{t('home.gettingStarted')}</Text>
            {checklistSteps.map((step) => (
              <View key={step.key} style={styles.checklistRow}>
                <View style={[styles.checkbox, step.done && styles.checkboxDone]}>
                  {step.done ? (
                    <Ionicons name="checkmark" size={14} color="#FFFFFF" />
                  ) : (
                    <View style={styles.checkboxEmpty} />
                  )}
                </View>
                <Text style={[styles.checklistLabel, step.done && styles.checklistLabelDone]}>
                  {step.label}
                </Text>
              </View>
            ))}
            <Text style={styles.checklistHint}>{t('home.checklistHint')}</Text>
          </View>
        )}

        {/* Banner biométrico — invitar a activar huella */}
        {biometricBanner.visible && biometricBanner.hasHardware && (
          <View style={styles.biometricBanner}>
            <View style={styles.biometricBannerContent}>
              <Ionicons name="finger-print-outline" size={24} color={COLORS.primary} />
              <View style={styles.biometricBannerTextCol}>
                <Text style={styles.biometricBannerTitle}>
                  {t('biometric.inviteTitle') || '🔒 Ingresá con tu huella'}
                </Text>
                <Text style={styles.biometricBannerDesc}>
                  {t('biometric.inviteDesc') ||
                    'Activá la huella digital en Configuración para iniciar sesión más rápido.'}
                </Text>
              </View>
            </View>
            <View style={styles.biometricBannerActions}>
              <TouchableOpacity
                style={styles.biometricBannerBtn}
                onPress={() => router.push('/settings')}
              >
                <Text style={styles.biometricBannerBtnText}>
                  {t('biometric.goToSettings') || 'Ir a Configuración'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.biometricBannerDismiss}
                onPress={dismissBiometricBanner}
              >
                <Text style={styles.biometricBannerDismissText}>
                  {t('common.remindLater') || 'Después'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Weather Card */}
        {weather && (
          <View style={styles.weatherCard}>
            <View style={styles.weatherRow}>
              <View style={styles.weatherInfo}>
                <Text style={styles.weatherTemp}>
                  {Math.round(weather.temp)}°
                </Text>
                <Text style={styles.weatherCondition}>
                  {weather.description}
                </Text>
              </View>
              <View style={styles.weatherIconContainer}>
                <Image
                  source={{ uri: `https://openweathermap.org/img/wn/${weather.icon}@2x.png` }}
                  style={styles.weatherIcon}
                  contentFit="contain"
                  cachePolicy="memory-disk"
                />
              </View>
            </View>
          </View>
        )}

        {/* What I wore today — Calendar Card */}
        <TouchableOpacity
          onPress={() => router.push('/calendar')}
          style={styles.calendarCard}
        >
          <View style={styles.calendarCardContent}>
            <View style={[styles.calendarIcon, { backgroundColor: '#8B5CF6' + '20' }]}>
              <Ionicons name="calendar-outline" size={24} color="#8B5CF6" />
            </View>
            <View style={styles.calendarCardText}>
              <Text style={styles.calendarCardTitle}>{t('home.logTodayCard')}</Text>
              <Text style={styles.calendarCardHint}>{t('home.logTodayCardHint')}</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
          </View>
        </TouchableOpacity>

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            {t('home.quickActions')}
          </Text>
          <View style={styles.actionsRow}>
            <TouchableOpacity
              onPress={() => router.push('/garments/create')}
              style={[styles.actionCard, styles.actionCardFirst]}
            >
              <View style={[styles.actionIcon, { backgroundColor: COLORS.primary + '20' }]}>
                <Ionicons name="shirt-outline" size={24} color={COLORS.primary} />
              </View>
              <Text style={styles.actionText}>{t('home.addGarment')}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => router.push('/outfits/create')}
              style={[styles.actionCard, styles.actionCardMiddle]}
            >
              <View style={[styles.actionIcon, { backgroundColor: COLORS.secondary + '20' }]}>
                <Ionicons name="create-outline" size={24} color={COLORS.secondary} />
              </View>
              <Text style={styles.actionText}>{t('home.createOutfit')}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => router.push('/(tabs)/closet')}
              style={[styles.actionCard, styles.actionCardLast]}
            >
              <View style={[styles.actionIcon, { backgroundColor: COLORS.primary + '20' }]}>
                <Ionicons name="grid-outline" size={24} color={COLORS.primary} />
              </View>
              <Text style={styles.actionText}>{t('home.browse')}</Text>
            </TouchableOpacity>
          </View>

          {/* Row 2: Stats, Planner & Packing */}
          <View style={[styles.actionsRow, { marginTop: 10 }]}>
            <TouchableOpacity
              onPress={() => router.push('/stats')}
              style={[styles.actionCard, styles.actionCardFirst]}
            >
              <View style={[styles.actionIcon, { backgroundColor: '#10B981' + '20' }]}>
                <Ionicons name="bar-chart-outline" size={24} color="#10B981" />
              </View>
              <Text style={styles.actionText}>{t('stats.title')}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => router.push('/planner')}
              style={[styles.actionCard, styles.actionCardMiddle]}
            >
              <View style={[styles.actionIcon, { backgroundColor: '#62D9C7' + '20' }]}>
                <Ionicons name="calendar-outline" size={24} color="#62D9C7" />
              </View>
              <Text style={styles.actionText}>{t('planner.title')}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => router.push('/packing')}
              style={[styles.actionCard, styles.actionCardLast]}
            >
              <View style={[styles.actionIcon, { backgroundColor: '#F59E0B' + '20' }]}>
                <Ionicons name="briefcase-outline" size={24} color="#F59E0B" />
              </View>
              <Text style={styles.actionText}>{t('packing.title')}</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* AI Outfit Suggestions */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>
              {t('home.suggestionsToday')}
            </Text>
            <TouchableOpacity
              onPress={refresh}
              style={styles.refreshButton}
              disabled={suggestionsLoading}
              accessibilityLabel={t('home.refresh')}
            >
              <Animated.View style={{ transform: [{ rotate: spinInterpolation }] }}>
                <Ionicons
                  name="refresh"
                  size={20}
                  color={suggestionsLoading ? COLORS.gray[400] : COLORS.primary}
                />
              </Animated.View>
            </TouchableOpacity>
          </View>

          {/* Loading skeletons */}
          {suggestionsLoading && (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.suggestionsScroll}
            >
              {Array.from({ length: 3 }).map((_, i) => (
                <View key={i} style={styles.suggestionSkeleton}>
                  <SkeletonCard height={160} borderRadius={12} />
                  <View style={{ marginTop: 10, paddingHorizontal: 4 }}>
                    <SkeletonCard width="70%" height={14} style={{ marginBottom: 6 }} />
                    <SkeletonCard width="50%" height={12} />
                  </View>
                </View>
              ))}
            </ScrollView>
          )}

          {/* Warning sutil si hay error pero tenemos sugerencias cacheadas */}
          {!suggestionsLoading && suggestionsError && suggestions.length > 0 && (
            <View style={styles.suggestionsWarning}>
              <Ionicons name="cloud-offline-outline" size={14} color={COLORS.gray[400]} />
              <Text style={styles.suggestionsWarningText}>
                {t('home.suggestionsStale')}
              </Text>
            </View>
          )}

          {/* Error state — solo cuando no hay sugerencias para mostrar */}
          {!suggestionsLoading && suggestionsError && suggestions.length === 0 && (
            <View style={styles.suggestionsStatusContainer}>
              <Ionicons name="cloud-offline-outline" size={32} color={COLORS.gray[400]} />
              <Text style={styles.suggestionsStatusText}>
                {t('home.suggestionsError')}
              </Text>
              <TouchableOpacity
                onPress={refresh}
                style={styles.retryButton}
              >
                <Text style={styles.retryButtonText}>{t('home.refresh')}</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Empty state */}
          {!suggestionsLoading && !suggestionsError && suggestions.length === 0 && (
            <View style={styles.suggestionsStatusContainer}>
              <Ionicons name="bulb-outline" size={32} color={COLORS.gray[400]} />
              <Text style={styles.suggestionsStatusText}>
                {suggestionsMessage || t('home.noSuggestions')}
              </Text>
            </View>
          )}

          {/* Suggestions carousel — siempre se muestra si hay sugerencias */}
          {!suggestionsLoading && suggestions.length > 0 && (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.suggestionsScroll}
            >
              {suggestions.map((suggestion, suggestionIndex) => {
                const matchedGarments = suggestion.garmentIds
                  .map((id) => suggestionGarments.find((g) => g.id === id))
                  .filter(Boolean) as Garment[];
                const isSaved = savedSuggestionKeys.has(suggestionKey(suggestion));
                const currentPins = pinnedGarmentIds[suggestionIndex] || [];
                const hasPins = currentPins.length > 0;
                const pinnedCategories = currentPins
                  .map((id) => {
                    const g = suggestionGarments.find((g) => g.id === id);
                    return g?.category;
                  })
                  .filter(Boolean) as string[];
                const requiredCategories = ['tops', 'bottoms', 'shoes'];
                const allRequiredPinned = requiredCategories.every((cat) =>
                  pinnedCategories.includes(cat),
                );
                const canRegenerate = hasPins && !allRequiredPinned && !isRegenerating;

                return (
                  <View key={`${suggestion.name}-${suggestionIndex}`} style={styles.suggestionCardWrapper}>
                    <TouchableOpacity
                      style={styles.suggestionCard}
                      activeOpacity={0.95}
                      onPress={() => handleOpenSuggestion(suggestion, suggestionIndex)}
                    >
                      {/* Garment images grid */}
                      {matchedGarments.length > 0 && (
                        <View style={styles.garmentGrid}>
                          {matchedGarments.slice(0, 4).map((garment, idx) => {
                            const isPinned = currentPins.includes(garment.id);
                            return (
                              <View key={garment.id} style={styles.garmentThumb}>
                                <Image
                                  source={{ uri: garment.imageUrl }}
                                  style={styles.garmentThumbImage}
                                  contentFit="cover"
                                  cachePolicy="memory-disk"
                                />
                                {idx === 3 && matchedGarments.length > 4 && (
                                  <View style={styles.garmentMoreOverlay}>
                                    <Text style={styles.garmentMoreText}>
                                      +{matchedGarments.length - 4}
                                    </Text>
                                  </View>
                                )}
                                {/* Pin toggle overlay */}
                                <TouchableOpacity
                                  style={styles.cardPinButton}
                                  onPress={() => {
                                    const accepted = togglePin(suggestionIndex, garment.id, garment.category);
                                    if (!accepted) {
                                      Alert.alert(
                                        '',
                                        t('suggestionPin.sameCategoryError', {
                                          category: t(`garments.category.${garment.category}`),
                                        }),
                                      );
                                    }
                                  }}
                                  hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                                >
                                  <Ionicons
                                    name={isPinned ? 'pin' : 'pin-outline'}
                                    size={14}
                                    color={isPinned ? '#FFFFFF' : '#FFFFFF'}
                                    style={isPinned ? undefined : { opacity: 0.6 }}
                                  />
                                </TouchableOpacity>
                              </View>
                            );
                          })}
                        </View>
                      )}

                      {/* Name + occasion badge + source badge + saved indicator */}
                      <View style={styles.suggestionInfo}>
                        <Text style={styles.suggestionName} numberOfLines={1}>
                          {suggestion.name}
                        </Text>
                        <View style={styles.badgeRow}>
                          {/* Source badge */}
                          <View
                            style={[
                              styles.sourceBadge,
                              suggestion.source === 'user'
                                ? styles.sourceBadgeUser
                                : styles.sourceBadgeAI,
                            ]}
                          >
                            <Text style={styles.sourceBadgeText} numberOfLines={1}>
                              {suggestion.source === 'user'
                                ? t('smartSuggestions.sourceUser')
                                : t('smartSuggestions.sourceAI')}
                            </Text>
                          </View>
                          <View style={styles.occasionBadge}>
                            <Text style={styles.occasionText} numberOfLines={1}>
                              {suggestion.occasion}
                            </Text>
                          </View>
                          {isSaved && (
                            <Ionicons name="checkmark-circle" size={16} color="#10B981" />
                          )}
                        </View>
                      </View>
                      {/* Last-used line for user suggestions */}
                      {suggestion.source === 'user' && (
                        <View style={styles.lastUsedRow}>
                          <Text style={styles.lastUsedText}>
                            {suggestion.lastUsed
                              ? t('smartSuggestions.lastUsed', {
                                  date: new Date(suggestion.lastUsed).toLocaleDateString(
                                    locale === 'es' ? 'es-AR' : 'en-US',
                                    { day: 'numeric', month: 'long', year: 'numeric' },
                                  ),
                                })
                              : t('smartSuggestions.neverWorn')}
                          </Text>
                        </View>
                      )}
                    </TouchableOpacity>

                    {/* Regenerate with pinned button */}
                    <View style={styles.cardRegenSection}>
                      {isRegenerating ? (
                        <View style={styles.cardRegenLoading}>
                          <ActivityIndicator size="small" color={COLORS.primary} />
                        </View>
                      ) : (
                        <TouchableOpacity
                          style={[
                            styles.cardRegenButton,
                            !canRegenerate && styles.cardRegenButtonDisabled,
                          ]}
                          onPress={() => regenerateWithPinned(suggestionIndex)}
                          disabled={!canRegenerate}
                          activeOpacity={0.7}
                        >
                          <Ionicons
                            name="refresh"
                            size={14}
                            color={canRegenerate ? COLORS.primary : '#9CA3AF'}
                          />
                          <Text
                            style={[
                              styles.cardRegenText,
                              !canRegenerate && styles.cardRegenTextDisabled,
                            ]}
                            numberOfLines={1}
                          >
                            {t('suggestionPin.regenerateWithPinned')}
                          </Text>
                        </TouchableOpacity>
                      )}
                      {allRequiredPinned && hasPins && (
                        <Text style={styles.cardPinnedHelper}>
                          {t('suggestionPin.allPinned')}
                        </Text>
                      )}
                    </View>
                  </View>
                );
              })}
            </ScrollView>
          )}
        </View>

        {/* Favorite Outfits */}
        {favoriteOutfits.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>
                {t('home.favoriteOutfits')}
              </Text>
              <TouchableOpacity>
                <Text style={styles.seeAllText}>{t('home.seeAll')}</Text>
              </TouchableOpacity>
            </View>
            {favoriteOutfits.slice(0, 3).map((outfit) => (
              <OutfitCard
                key={outfit.id}
                outfit={outfit}
                onPress={() => router.push(`/outfits/${outfit.id}`)}
              />
            ))}
          </View>
        )}

        {/* Recently Used — Last 5 Days from Calendar */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>
              {t('home.recentlyUsed')}
            </Text>
          </View>
          {recentDaysLoading ? (
            <View style={styles.recentDayList}>
              {[1, 2, 3, 4, 5].map((i) => (
                <View key={i} style={styles.recentDayCard}>
                  <View style={[styles.skeletonLine, { height: 14, width: '30%', marginBottom: 8 }]} />
                  <View style={styles.rCardImageSkeleton} />
                  <View style={[styles.skeletonLine, { height: 14, width: '50%', marginTop: 8 }]} />
                </View>
              ))}
            </View>
          ) : (
            <View style={styles.recentDayList}>
              {recentDayEntries.map((day) => {
                const dayDate = parseLocalDate(day.date);
                const dateParts = dayDate.toLocaleDateString(
                  locale === 'es' ? 'es-AR' : 'en-US',
                  { weekday: 'short', day: 'numeric', month: 'short' },
                ).split(' ');
                const weekday = dateParts[0]?.replace(',', '') || '';
                const dayNum = dateParts[1] || '';
                const month = dateParts[2]?.replace('.', '') || '';

                if (day.entry) {
                  const outfit = day.entry.outfit;
                  const heroGarment = outfit.garments?.[0];
                  const extraCount = (outfit.garments?.length || 1) - 1;
                  return (
                    <TouchableOpacity
                      key={day.date}
                      style={styles.recentDayCard}
                      onPress={() => router.push(`/outfits/${outfit.id}`)}
                      activeOpacity={0.95}
                    >
                      {/* Date header */}
                      <View style={styles.rCardDateBar}>
                        <Ionicons name="calendar-outline" size={14} color={COLORS.primary} />
                        <Text style={styles.rCardDateText}>
                          {`${weekday}, ${dayNum} ${month}`}
                        </Text>
                      </View>
                      {/* Hero image */}
                      <View style={styles.rCardImageWrap}>
                        {heroGarment ? (
                          <>
                            <Image
                              source={{ uri: heroGarment.imageUrl }}
                              style={styles.rCardImage}
                              contentFit="cover"
                              cachePolicy="memory-disk"
                            />
                            {extraCount > 0 && (
                              <View style={styles.rCardBadge}>
                                <Text style={styles.rCardBadgeText}>+{extraCount}</Text>
                              </View>
                            )}
                          </>
                        ) : (
                          <View style={styles.rCardPlaceholder}>
                            <Ionicons name="shirt-outline" size={32} color="#D1D5DB" />
                          </View>
                        )}
                      </View>
                      {/* Outfit name */}
                      <View style={styles.rCardInfo}>
                        <Text style={styles.rCardName} numberOfLines={1}>
                          {outfit.name}
                        </Text>
                        {outfit.occasion && (
                          <Text style={styles.rCardOccasion} numberOfLines={1}>
                            {outfit.occasion}
                          </Text>
                        )}
                      </View>
                    </TouchableOpacity>
                  );
                }

                // Empty day — placeholder con imagen + invitar a registrar
                return (
                  <TouchableOpacity
                    key={day.date}
                    style={styles.recentDayCard}
                    onPress={() => router.push(`/calendar/log-today?date=${day.date}`)}
                    activeOpacity={0.95}
                  >
                    {/* Date header */}
                    <View style={styles.rCardDateBar}>
                      <Ionicons name="calendar-outline" size={14} color="#9CA3AF" />
                      <Text style={[styles.rCardDateText, { color: '#9CA3AF' }]}>
                        {`${weekday}, ${dayNum} ${month}`}
                      </Text>
                    </View>
                    {/* Placeholder image */}
                    <View style={styles.rCardImageWrap}>
                      <View style={[styles.rCardPlaceholder, { backgroundColor: '#F9FAFB' }]}>
                        <Ionicons name="image-outline" size={36} color="#D1D5DB" />
                        <Text style={styles.rCardEmptyLabel}>
                          {t('home.notLoggedForDay')}
                        </Text>
                      </View>
                    </View>
                    {/* CTA */}
                    <View style={styles.rCardInfo}>
                      <View style={styles.rCardEmptyButton}>
                        <Ionicons name="add-circle-outline" size={16} color={COLORS.primary} />
                        <Text style={styles.rCardEmptyButtonText}>
                          {t('home.logForDay')}
                        </Text>
                      </View>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </View>
      </ScrollView>

      {/* Suggestion Detail Modal */}
      <SuggestionDetailModal
        visible={!!selectedSuggestion}
        suggestion={selectedSuggestion}
        suggestionIndex={selectedSuggestionIndex ?? 0}
        garments={suggestionGarments}
        weather={weather}
        isSaving={isSavingSuggestion}
        savedOutfitId={
          selectedSuggestion
            ? savedOutfitIds[suggestionKey(selectedSuggestion)] ?? null
            : null
        }
        onSave={handleSaveSuggestion}
        onEdit={handleEditSuggestion}
        onClose={handleCloseSuggestion}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F4F5F7',
  },
  scrollView: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 24,
    backgroundColor: '#FFFFFF',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  headerText: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#6B7280',
    marginTop: 4,
  },
  logoutButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  section: {
    paddingHorizontal: 24,
    paddingVertical: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  seeAllText: {
    color: '#62D9C7',
    fontWeight: '500',
    fontSize: 15,
  },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  actionCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  actionCardFirst: {
    marginRight: 8,
  },
  actionCardMiddle: {
    marginHorizontal: 4,
  },
  actionCardLast: {
    marginLeft: 8,
  },
  actionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  actionText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#111827',
    textAlign: 'center',
  },
  emptyContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 32,
  },
  recentSkeleton: {
    gap: 12,
  },
  skeletonCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    overflow: 'hidden',
  },
  skeletonImage: {
    height: 120,
    backgroundColor: '#F3F4F6',
  },
  skeletonTextRow: {
    padding: 12,
    gap: 8,
  },
  skeletonLine: {
    height: 14,
    backgroundColor: '#F3F4F6',
    borderRadius: 4,
    width: '60%',
  },

  // Weather Card
  weatherCard: {
    marginHorizontal: 24,
    marginTop: 8,
    marginBottom: 8,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  weatherRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  weatherInfo: {
    flex: 1,
  },
  weatherTemp: {
    fontSize: 28,
    fontWeight: '700',
    color: '#111827',
  },
  weatherCondition: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 2,
    textTransform: 'capitalize',
  },
  weatherIconContainer: {
    width: 56,
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
  },
  weatherIcon: {
    width: 56,
    height: 56,
  },

  // Suggestions
  refreshButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  suggestionsScroll: {
    paddingRight: 24,
    gap: 12,
  },
  suggestionCardWrapper: {
    width: 220,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  cardPinButton: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(0,0,0,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  cardRegenSection: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  cardRegenButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: COLORS.primary + '15',
  },
  cardRegenButtonDisabled: {
    backgroundColor: '#F3F4F6',
  },
  cardRegenText: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.primary,
  },
  cardRegenTextDisabled: {
    color: '#9CA3AF',
  },
  cardRegenLoading: {
    alignItems: 'center',
    paddingVertical: 6,
  },
  cardPinnedHelper: {
    fontSize: 10,
    color: '#9CA3AF',
    textAlign: 'center',
    marginTop: 4,
  },
  suggestionsStatusContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 32,
    alignItems: 'center',
    gap: 12,
  },
  suggestionsStatusText: {
    fontSize: 15,
    color: '#6B7280',
    textAlign: 'center',
  },
  retryButton: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: COLORS.primary + '15',
  },
  retryButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.primary,
  },
  suggestionsWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  suggestionsWarningText: {
    fontSize: 12,
    color: COLORS.gray[400],
  },
  suggestionSkeleton: {
    width: 200,
    marginRight: 12,
  },

  // Suggestion Card
  suggestionCard: {
    // Touchable area — visual styles moved to wrapper
  },
  garmentGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    height: 120,
    overflow: 'hidden',
  },
  garmentThumb: {
    width: '50%',
    height: 60,
    backgroundColor: '#F9FAFB',
    position: 'relative',
  },
  garmentThumbImage: {
    width: '100%',
    height: '100%',
  },
  garmentMoreOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  garmentMoreText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  suggestionInfo: {
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  suggestionName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    flex: 1,
  },
  occasionBadge: {
    backgroundColor: COLORS.primary + '20',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
    maxWidth: 100,
  },
  occasionText: {
    fontSize: 11,
    fontWeight: '500',
    color: COLORS.primary,
  },
  sourceBadge: {
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 3,
  },
  sourceBadgeAI: {
    backgroundColor: '#7C3AED20',
  },
  sourceBadgeUser: {
    backgroundColor: '#10B98120',
  },
  sourceBadgeText: {
    fontSize: 10,
    fontWeight: '600',
  },
  lastUsedRow: {
    paddingHorizontal: 12,
    paddingBottom: 8,
  },
  lastUsedText: {
    fontSize: 11,
    color: '#9CA3AF',
  },
  reasoningContainer: {
    paddingHorizontal: 12,
    paddingBottom: 12,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    paddingTop: 10,
    marginTop: 0,
  },
  reasoningLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#9CA3AF',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  reasoningText: {
    fontSize: 12,
    color: '#6B7280',
    lineHeight: 18,
  },

  // Calendar Card
  calendarCard: {
    marginHorizontal: 20,
    marginBottom: 12,
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  calendarCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  calendarIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  calendarCardText: {
    flex: 1,
  },
  calendarCardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 2,
  },
  calendarCardHint: {
    fontSize: 13,
    color: '#6B7280',
  },

  // Primeros Pasos Checklist
  checklistSection: {
    marginHorizontal: 20,
    marginBottom: 16,
    backgroundColor: '#F0FDF4',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#BBF7D0',
  },
  checklistTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#166534',
    marginBottom: 12,
  },
  checklistRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    gap: 10,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: '#D1D5DB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxDone: {
    backgroundColor: '#22C55E',
    borderColor: '#22C55E',
  },
  checkboxEmpty: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#D1D5DB',
  },
  checklistLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    flex: 1,
  },
  checklistLabelDone: {
    color: '#6B7280',
    textDecorationLine: 'line-through',
  },
  checklistHint: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
    lineHeight: 16,
  },

  // Banner biométrico
  biometricBanner: {
    marginHorizontal: 20,
    marginBottom: 16,
    backgroundColor: '#EFF6FF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  biometricBannerContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  biometricBannerTextCol: {
    flex: 1,
  },
  biometricBannerTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1E40AF',
    marginBottom: 4,
  },
  biometricBannerDesc: {
    fontSize: 13,
    color: '#3B82F6',
    lineHeight: 18,
  },
  biometricBannerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 12,
    marginLeft: 36,
  },
  biometricBannerBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  biometricBannerBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
  biometricBannerDismiss: {
    paddingHorizontal: 4,
    paddingVertical: 8,
  },
  biometricBannerDismissText: {
    color: '#6B7280',
    fontSize: 13,
  },

  // Recently Used — Last 5 Days (card style)
  recentDayList: {
    gap: 12,
  },
  recentDayCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  rCardDateBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 8,
  },
  rCardDateText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
  },
  rCardImageWrap: {
    height: 160,
    backgroundColor: '#F3F4F6',
    position: 'relative',
  },
  rCardImage: {
    width: '100%',
    height: '100%',
  },
  rCardBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  rCardBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  rCardPlaceholder: {
    flex: 1,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  rCardEmptyLabel: {
    fontSize: 13,
    color: '#9CA3AF',
  },
  rCardInfo: {
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  rCardName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
  },
  rCardOccasion: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  rCardEmptyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  rCardEmptyButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.primary,
  },
  rCardImageSkeleton: {
    height: 160,
    backgroundColor: '#F3F4F6',
    marginHorizontal: 0,
  },
});

export default withScreenErrorBoundary(HomeScreen);

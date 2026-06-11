/**
 * Home Screen
 * Pantalla principal con resumen de outfits y accesos rápidos
 */

import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, RefreshControl, Alert, Animated, Easing, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Button, OutfitCard, Loading, EmptyState, SkeletonCard } from '@/components';
import type { Garment } from '@/types';
import { useAuth } from '@/hooks/useAuth';
import { useOutfits } from '@/hooks/useOutfits';
import { useTranslation } from '@/hooks/useTranslation';
import { COLORS } from '@/lib/constants';
import { useSuggestionsStore } from '@/store/suggestionsStore';
import { withScreenErrorBoundary } from '@/components';

function HomeScreen() {
  const router = useRouter();
  const { profile, user, logout } = useAuth();
  const { outfits, isLoading, loadOutfits } = useOutfits(true, 3);
  const { t } = useTranslation();
  const [refreshing, setRefreshing] = useState(false);
  const [expandedSuggestion, setExpandedSuggestion] = useState<string | null>(null);
  const spinAnim = useRef(new Animated.Value(0)).current;

  const {
    suggestions,
    garments: suggestionGarments,
    weather,
    isLoading: suggestionsLoading,
    error: suggestionsError,
    message: suggestionsMessage,
    fetchSuggestions,
    lastUpdated,
  } = useSuggestionsStore();

  // Fetch suggestions on mount
  useEffect(() => {
    fetchSuggestions();
  }, []);

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
  const recentOutfits = outfits.slice(0, 3);
  const displayName = useMemo(() => {
    const name =
      profile?.username ||
      profile?.full_name ||
      user?.email?.split('@')[0] ||
      t('auth.username');
    return name?.trim() || t('auth.username');
  }, [profile?.username, profile?.full_name, user?.email, t]);

  const handleLogout = () => {
    Alert.alert(
      t('auth.logout'),
      '¿Seguro que quieres cerrar sesión?',
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('auth.logout'),
          style: 'destructive',
          onPress: async () => {
            await logout();
            router.replace('/(auth)/onboarding');
          },
        },
      ]
    );
  };

  const onRefresh = useCallback(async () => {
    if (!user) return;
    setRefreshing(true);
    await loadOutfits(user.id);
    setRefreshing(false);
  }, [user, loadOutfits]);

  if (isLoading && !refreshing) {
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
                  resizeMode="contain"
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
              onPress={() => fetchSuggestions()}
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
                onPress={() => fetchSuggestions()}
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
              {suggestions.map((suggestion) => {
                const isExpanded = expandedSuggestion === suggestion.name;
                const matchedGarments = suggestion.garmentIds
                  .map((id) => suggestionGarments.find((g) => g.id === id))
                  .filter(Boolean) as Garment[];

                return (
                  <TouchableOpacity
                    key={suggestion.name}
                    style={styles.suggestionCard}
                    activeOpacity={0.95}
                    onPress={() =>
                      setExpandedSuggestion(isExpanded ? null : suggestion.name)
                    }
                  >
                    {/* Garment images grid */}
                    {matchedGarments.length > 0 && (
                      <View style={styles.garmentGrid}>
                        {matchedGarments.slice(0, 4).map((garment, idx) => (
                          <View key={garment.id} style={styles.garmentThumb}>
                            <Image
                              source={{ uri: garment.imageUrl }}
                              style={styles.garmentThumbImage}
                              resizeMode="cover"
                            />
                            {idx === 3 && matchedGarments.length > 4 && (
                              <View style={styles.garmentMoreOverlay}>
                                <Text style={styles.garmentMoreText}>
                                  +{matchedGarments.length - 4}
                                </Text>
                              </View>
                            )}
                          </View>
                        ))}
                      </View>
                    )}

                    {/* Name + occasion badge */}
                    <View style={styles.suggestionInfo}>
                      <Text style={styles.suggestionName} numberOfLines={1}>
                        {suggestion.name}
                      </Text>
                      <View style={styles.occasionBadge}>
                        <Text style={styles.occasionText} numberOfLines={1}>
                          {suggestion.occasion}
                        </Text>
                      </View>
                    </View>

                    {/* Expandable reasoning */}
                    {isExpanded && suggestion.reasoning && (
                      <View style={styles.reasoningContainer}>
                        <Text style={styles.reasoningLabel}>
                          {t('home.suggestionReason')}
                        </Text>
                        <Text style={styles.reasoningText}>
                          {suggestion.reasoning}
                        </Text>
                      </View>
                    )}
                  </TouchableOpacity>
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

        {/* Recent Outfits */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>
              {t('home.recentOutfits')}
            </Text>
          </View>
          {recentOutfits.length > 0 ? (
            recentOutfits.map((outfit) => (
              <OutfitCard
                key={outfit.id}
                outfit={outfit}
                onPress={() => router.push(`/outfits/${outfit.id}`)}
              />
            ))
          ) : (
            <View style={styles.emptyContainer}>
              <EmptyState
                icon="shirt-outline"
                title={t('home.noOutfits')}
                message={t('home.noOutfitsMessage')}
                actionLabel={t('home.createOutfit')}
                onAction={() => router.push('/outfits/create')}
              />
            </View>
          )}
        </View>
      </ScrollView>
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
});

export default withScreenErrorBoundary(HomeScreen);

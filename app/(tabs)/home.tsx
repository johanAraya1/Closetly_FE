/**
 * Home Screen
 * Pantalla principal con resumen de outfits y accesos rápidos
 */

import React, { useState, useCallback, useMemo } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, RefreshControl, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Button, OutfitCard, Loading, EmptyState } from '@/components';
import { useAuth } from '@/hooks/useAuth';
import { useOutfits } from '@/hooks/useOutfits';
import { useTranslation } from '@/hooks/useTranslation';
import { COLORS } from '@/lib/constants';

export default function HomeScreen() {
  const router = useRouter();
  const { profile, user, logout } = useAuth();
  const { outfits, isLoading, loadOutfits } = useOutfits();
  const { t } = useTranslation();
  const [refreshing, setRefreshing] = useState(false);

  const favoriteOutfits = outfits.filter((o) => o.is_favorite);
  const recentOutfits = outfits.slice(0, 5);
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
});

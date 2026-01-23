/**
 * Profile Screen
 * Pantalla de perfil del usuario
 */

import React from 'react';
import { View, Text, ScrollView, Image, TouchableOpacity, Alert, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Button } from '@/components';
import { useAuth } from '@/hooks/useAuth';
import { useGarments } from '@/hooks/useGarments';
import { useOutfits } from '@/hooks/useOutfits';
import { useCollections } from '@/hooks/useCollections';
import { useTranslation } from '@/hooks/useTranslation';
import { COLORS } from '@/lib/constants';

export default function ProfileScreen() {
  const router = useRouter();
  const { profile, user, logout, isAdmin } = useAuth();
  const { garments } = useGarments();
  const { outfits } = useOutfits();
  const { collections } = useCollections();
  const { t } = useTranslation();

  const handleLogout = async () => {
    await logout();
    router.replace('/(auth)/onboarding');
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.avatarContainer}>
            {profile?.avatar_url ? (
              <Image
                source={{ uri: profile.avatar_url }}
                style={styles.avatar}
              />
            ) : (
              <Text style={styles.avatarText}>
                {profile?.username?.charAt(0).toUpperCase() || '?'}
              </Text>
            )}
          </View>
          <Text style={styles.username}>
            {profile?.username || 'User'}
          </Text>
          {profile?.full_name && (
            <Text style={styles.fullName}>{profile.full_name}</Text>
          )}
          {profile?.bio && (
            <Text style={styles.bio}>
              {profile.bio}
            </Text>
          )}
          <View style={styles.privacyBadge}>
            <Ionicons
              name={profile?.is_public ? 'globe-outline' : 'lock-closed-outline'}
              size={16}
              color={COLORS.gray[500]}
            />
            <Text style={styles.privacyText}>
              {profile?.is_public ? 'Public' : 'Private'} Profile
            </Text>
          </View>
        </View>

        {/* Stats */}
        <View style={styles.statsSection}>
          <View style={styles.statsCard}>
            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>
                  {garments.length}
                </Text>
                <Text style={styles.statLabel}>Garments</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>
                  {outfits.length}
                </Text>
                <Text style={styles.statLabel}>Outfits</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>
                  {collections.length}
                </Text>
                <Text style={styles.statLabel}>Collections</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Actions */}
        <View style={styles.actionsSection}>
          {/* Admin Section - Solo visible para administradores */}
          {isAdmin && (
            <>
              <View style={styles.adminBadge}>
                <Ionicons name="shield-checkmark" size={16} color={COLORS.primary} />
                <Text style={styles.adminBadgeText}>Administrador</Text>
              </View>
              <TouchableOpacity
                onPress={() => router.push('/admin/dashboard')}
                style={[styles.actionItem, styles.adminItem]}
              >
                <View style={styles.actionLeft}>
                  <Ionicons name="shield" size={24} color={COLORS.primary} />
                  <Text style={[styles.actionText, styles.adminText]}>Panel de Administración</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={COLORS.primary} />
              </TouchableOpacity>
              <View style={styles.divider} />
            </>
          )}
          <TouchableOpacity
            onPress={() => router.push('/settings')}
            style={styles.actionItem}
          >
            <View style={styles.actionLeft}>
              <Ionicons name="settings-outline" size={24} color={COLORS.gray[700]} />
              <Text style={styles.actionText}>{t('profile.settings')}</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={COLORS.gray[400]} />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => {}}
            style={styles.actionItem}
          >
            <View style={styles.actionLeft}>
              <Ionicons name="help-circle-outline" size={24} color={COLORS.gray[700]} />
              <Text style={styles.actionText}>Help & Support</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={COLORS.gray[400]} />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleLogout}
            style={[styles.actionItem, styles.logoutItem]}
          >
            <View style={styles.actionLeft}>
              <Ionicons name="log-out-outline" size={24} color="#EF4444" />
              <Text style={[styles.actionText, styles.logoutText]}>{t('auth.logout')}</Text>
            </View>
          </TouchableOpacity>
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
    alignItems: 'center',
  },
  avatarContainer: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: '#62D9C7',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  avatar: {
    width: 96,
    height: 96,
    borderRadius: 48,
  },
  avatarText: {
    fontSize: 36,
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  username: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
  },
  fullName: {
    fontSize: 16,
    color: '#6B7280',
    marginTop: 4,
  },
  bio: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 8,
    textAlign: 'center',
  },
  privacyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  privacyText: {
    fontSize: 14,
    color: '#6B7280',
    marginLeft: 4,
  },
  statsSection: {
    paddingHorizontal: 24,
    paddingVertical: 24,
  },
  statsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
  },
  statLabel: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 4,
  },
  actionsSection: {
    paddingHorizontal: 24,
    paddingBottom: 24,
  },
  actionItem: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  actionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionText: {
    fontSize: 16,
    color: '#111827',
    fontWeight: '500',
    marginLeft: 12,
  },
  logoutItem: {
    borderWidth: 1,
    borderColor: '#EF4444',
    backgroundColor: '#FEF2F2',
  },
  logoutText: {
    color: '#EF4444',
  },
  adminBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary + '20',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    marginBottom: 12,
    alignSelf: 'center',
  },
  adminBadgeText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.primary,
    marginLeft: 6,
  },
  adminItem: {
    backgroundColor: COLORS.primary + '10',
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  adminText: {
    color: COLORS.primary,
    fontWeight: '600',
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.gray[200],
    marginVertical: 12,
  },
});
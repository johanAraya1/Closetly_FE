/**
 * Profile Screen
 * Pantalla de perfil del usuario
 */

import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, ScrollView, Image, TouchableOpacity, Alert, StyleSheet, Switch } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Button, Input } from '@/components';
import { useAuth } from '@/hooks/useAuth';
import { useGarments } from '@/hooks/useGarments';
import { useOutfits } from '@/hooks/useOutfits';
import { useCollections } from '@/hooks/useCollections';
import { useTranslation } from '@/hooks/useTranslation';
import { COLORS } from '@/lib/constants';

export default function ProfileScreen() {
  const router = useRouter();
  const { profile, user, logout, isAdmin, updateProfile, isLoading } = useAuth();
  const { garments } = useGarments();
  const { outfits } = useOutfits();
  const { collections } = useCollections();
  const { t } = useTranslation();
  const [username, setUsername] = useState('');
  const [fullName, setFullName] = useState('');
  const [bio, setBio] = useState('');
  const [isPublic, setIsPublic] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const displayName = useMemo(() => {
    const name =
      profile?.username ||
      profile?.full_name ||
      user?.email?.split('@')[0] ||
      t('auth.username');
    return name?.trim() || t('auth.username');
  }, [profile?.username, profile?.full_name, user?.email, t]);

  useEffect(() => {
    setUsername(profile?.username || '');
    setFullName(profile?.full_name || '');
    setBio(profile?.bio || '');
    setIsPublic(Boolean(profile?.is_public));
  }, [profile?.username, profile?.full_name, profile?.bio, profile?.is_public]);

  const handleLogout = async () => {
    await logout();
    router.replace('/(auth)/onboarding');
  };

  const handleSaveProfile = async () => {
    if (!profile) return;
    if (!username.trim()) {
      Alert.alert('Error', 'El usuario es obligatorio.');
      return;
    }

    setIsSaving(true);
    const success = await updateProfile({
      username: username.trim(),
      full_name: fullName.trim() || undefined,
      bio: bio.trim() || undefined,
      is_public: isPublic,
    });
    setIsSaving(false);

    if (success) {
      Alert.alert('Éxito', 'Perfil actualizado correctamente.');
    } else {
      Alert.alert('Error', 'No se pudo actualizar el perfil.');
    }
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
              <View style={styles.avatarPlaceholder}>
                <Ionicons name="shirt-outline" size={44} color="#FFFFFF" />
              </View>
            )}
          </View>
          <Text style={styles.username}>
            {displayName}
          </Text>
          {profile?.full_name && profile?.full_name !== displayName && (
            <Text style={styles.fullName}>{profile.full_name}</Text>
          )}
          <View style={styles.emailRow}>
            <Ionicons name="mail-outline" size={14} color={COLORS.gray[400]} />
            <Text style={styles.emailText}>{user?.email || ''}</Text>
          </View>
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

        {/* Edit Profile */}
        <View style={styles.editSection}>
          <Text style={styles.sectionTitle}>Editar Perfil</Text>
          <Input
            label="Usuario"
            value={username}
            onChangeText={setUsername}
            placeholder="Tu usuario"
            autoCapitalize="none"
          />
          <Input
            label="Nombre completo"
            value={fullName}
            onChangeText={setFullName}
            placeholder="Tu nombre"
          />
          <Input
            label="Correo electrónico"
            value={user?.email || ''}
            editable={false}
            selectTextOnFocus={false}
          />
          <Input
            label="Bio"
            value={bio}
            onChangeText={setBio}
            placeholder="Cuéntanos sobre ti..."
            multiline
            numberOfLines={3}
          />
          <View style={styles.privacyRow}>
            <View>
              <Text style={styles.privacyLabel}>Perfil público</Text>
              <Text style={styles.privacyHint}>
                Permite que otros usuarios vean tu perfil.
              </Text>
            </View>
            <Switch
              value={isPublic}
              onValueChange={setIsPublic}
              trackColor={{ false: '#E5E7EB', true: COLORS.primary + '80' }}
              thumbColor={isPublic ? COLORS.primary : '#FFFFFF'}
            />
          </View>
          <Button
            title={isSaving || isLoading ? 'Guardando...' : 'Guardar cambios'}
            onPress={handleSaveProfile}
            loading={isSaving || isLoading}
            fullWidth
          />
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
  avatarPlaceholder: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#62D9C7',
    alignItems: 'center',
    justifyContent: 'center',
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
  emailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    gap: 4,
  },
  emailText: {
    fontSize: 13,
    color: '#9CA3AF',
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
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 12,
  },
  editSection: {
    paddingHorizontal: 24,
    paddingBottom: 24,
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
  privacyRow: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  privacyLabel: {
    fontSize: 16,
    color: '#111827',
    fontWeight: '500',
  },
  privacyHint: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
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

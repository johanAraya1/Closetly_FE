/**
 * Reset Password Screen
 * Pantalla para establecer nueva contraseña desde el link de Supabase
 * Lee el access_token del hash de la URL
 */

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Button, Input } from '@/components';
import { useTranslation } from '@/hooks/useTranslation';
import { API_URL } from '@/lib/constants';

interface HashParams {
  accessToken?: string;
  refreshToken?: string;
  type?: string;
}

function parseHash(): HashParams {
  if (Platform.OS !== 'web') return {};

  try {
    const hash = window.location.hash.replace(/^#/, '');
    const params = new URLSearchParams(hash);
    return {
      accessToken: params.get('access_token') || undefined,
      refreshToken: params.get('refresh_token') || undefined,
      type: params.get('type') || undefined,
    };
  } catch {
    return {};
  }
}

export default function ResetPasswordScreen() {
  const router = useRouter();
  const { t } = useTranslation();

  const [hashParams, setHashParams] = useState<HashParams>({});
  const [isLoading, setIsLoading] = useState(true);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  useEffect(() => {
    const params = parseHash();
    setHashParams(params);

    // Clean the hash from the URL so it doesn't linger
    if (Platform.OS === 'web' && window.location.hash) {
      window.history.replaceState(null, '', window.location.pathname);
    }

    setIsLoading(false);
  }, []);

  const handleResetPassword = async () => {
    if (!newPassword || newPassword.length < 8) {
      Alert.alert(t('common.error'), 'Password must be at least 8 characters');
      return;
    }

    if (newPassword !== confirmPassword) {
      Alert.alert(t('common.error'), 'Passwords do not match');
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch(`${API_URL}/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accessToken: hashParams.accessToken,
          refreshToken: hashParams.refreshToken,
          newPassword,
        }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.message || 'Failed to reset password');
      }

      setIsSuccess(true);
    } catch (error) {
      Alert.alert(
        t('common.error'),
        error instanceof Error ? error.message : 'Failed to reset password',
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerContainer}>
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const hasValidToken = hashParams.accessToken && hashParams.type === 'recovery';

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
          {isSuccess ? (
            <View style={styles.successContainer}>
              <View style={styles.successIcon}>
                <Ionicons name="checkmark-circle" size={64} color="#10B981" />
              </View>
              <Text style={styles.successTitle}>
                {t('auth.passwordUpdated')}
              </Text>
              <Button
                title={t('auth.signIn')}
                onPress={() => router.replace('/(auth)/login')}
                fullWidth
              />
            </View>
          ) : hasValidToken ? (
            <>
              <Text style={styles.title}>
                {t('auth.resetPassword')}
              </Text>
              <Text style={styles.subtitle}>
                {t('auth.forgotPasswordSubtitle')}
              </Text>

              <Input
                label={t('auth.newPassword')}
                value={newPassword}
                onChangeText={setNewPassword}
                placeholder="••••••••"
                secureTextEntry={!showPassword}
                icon={<Ionicons name="lock-closed-outline" size={20} color="#9CA3AF" />}
                rightIcon={
                  <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                    <Ionicons
                      name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                      size={20}
                      color="#9CA3AF"
                    />
                  </TouchableOpacity>
                }
              />

              <Input
                label={t('auth.confirmNewPassword')}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                placeholder="••••••••"
                secureTextEntry={!showPassword}
                icon={<Ionicons name="lock-closed-outline" size={20} color="#9CA3AF" />}
              />

              <Button
                title={t('auth.resetPassword')}
                onPress={handleResetPassword}
                loading={isSubmitting}
                fullWidth
              />

              <View style={styles.footer}>
                <Button
                  title={t('auth.backToLogin')}
                  onPress={() => router.replace('/(auth)/login')}
                  variant="ghost"
                />
              </View>
            </>
          ) : (
            <>
              <View style={styles.errorContainer}>
                <View style={styles.errorIcon}>
                  <Ionicons name="alert-circle" size={64} color="#EF4444" />
                </View>
                <Text style={styles.errorTitle}>
                  {t('auth.resetLinkExpired')}
                </Text>
                <Text style={styles.errorText}>
                  {t('auth.invalidResetLink')}
                </Text>
                <Button
                  title={t('auth.forgotPassword')}
                  onPress={() => router.replace('/(auth)/forgot-password')}
                  fullWidth
                />
                <View style={styles.footer}>
                  <Button
                    title={t('auth.backToLogin')}
                    onPress={() => router.replace('/(auth)/login')}
                    variant="ghost"
                  />
                </View>
              </View>
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F4F5F7',
  },
  keyboardView: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 24,
    paddingTop: Platform.OS === 'ios' ? 20 : 40,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#6B7280',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 16,
    color: '#6B7280',
    lineHeight: 24,
    marginBottom: 32,
  },
  successContainer: {
    alignItems: 'center',
    paddingTop: 60,
  },
  successIcon: {
    marginBottom: 24,
  },
  successTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#111827',
    textAlign: 'center',
    marginBottom: 32,
  },
  errorContainer: {
    alignItems: 'center',
    paddingTop: 60,
  },
  errorIcon: {
    marginBottom: 24,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#EF4444',
    marginBottom: 12,
  },
  errorText: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 24,
  },
});

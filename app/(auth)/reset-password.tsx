/**
 * Reset Password Screen
 * Pantalla para establecer nueva contraseña desde el link de Supabase
 * Lee el access_token del hash de la URL
 */

import React, { useEffect, useState, useMemo } from 'react';
import {
  View,
  Text,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Button, Input, Modal } from '@/components';
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
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const passwordCriteria = useMemo(() => {
    const length = newPassword.length >= 8 && newPassword.length <= 16;
    const uppercase = /[A-Z]/.test(newPassword);
    const lowercase = /[a-z]/.test(newPassword);
    const number = /[0-9]/.test(newPassword);
    const special = /[!@#$%^&*(),.?":{}|<>_\-+=\[\]\\\/~`]/.test(newPassword);
    return {
      length,
      uppercase,
      lowercase,
      number,
      special,
      all: length && uppercase && lowercase && number && special,
    };
  }, [newPassword]);

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
    if (!passwordCriteria.all) {
      setErrorMessage('La contraseña no cumple todos los requisitos.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMessage('Las contraseñas no coinciden.');
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
      setErrorMessage(
        error instanceof Error ? error.message : 'Error al restablecer la contraseña',
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
                {t('auth.resetPasswordSubtitle')}
              </Text>

              <Input
                label={t('auth.newPassword')}
                value={newPassword}
                onChangeText={(text) => {
                  setNewPassword(text);
                  setConfirmPassword('');
                }}
                placeholder="••••••••"
                secureTextEntry={!showPassword}
                autoComplete="new-password"
                maxLength={16}
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

              {/* Password rules checklist */}
              <View style={styles.passwordRules}>
                <Text style={styles.rulesTitle}>{t('auth.passwordRules')}</Text>
                <View style={styles.ruleRow}>
                  <Ionicons
                    name={passwordCriteria.length ? 'checkmark-circle' : 'close-circle'}
                    size={16}
                    color={passwordCriteria.length ? '#10B981' : '#EF4444'}
                  />
                  <Text style={styles.ruleText}>{t('auth.passwordLength')}</Text>
                </View>
                <View style={styles.ruleRow}>
                  <Ionicons
                    name={passwordCriteria.uppercase ? 'checkmark-circle' : 'close-circle'}
                    size={16}
                    color={passwordCriteria.uppercase ? '#10B981' : '#EF4444'}
                  />
                  <Text style={styles.ruleText}>{t('auth.passwordUppercase')}</Text>
                </View>
                <View style={styles.ruleRow}>
                  <Ionicons
                    name={passwordCriteria.lowercase ? 'checkmark-circle' : 'close-circle'}
                    size={16}
                    color={passwordCriteria.lowercase ? '#10B981' : '#EF4444'}
                  />
                  <Text style={styles.ruleText}>{t('auth.passwordLowercase')}</Text>
                </View>
                <View style={styles.ruleRow}>
                  <Ionicons
                    name={passwordCriteria.number ? 'checkmark-circle' : 'close-circle'}
                    size={16}
                    color={passwordCriteria.number ? '#10B981' : '#EF4444'}
                  />
                  <Text style={styles.ruleText}>{t('auth.passwordNumber')}</Text>
                </View>
                <View style={styles.ruleRow}>
                  <Ionicons
                    name={passwordCriteria.special ? 'checkmark-circle' : 'close-circle'}
                    size={16}
                    color={passwordCriteria.special ? '#10B981' : '#EF4444'}
                  />
                  <Text style={styles.ruleText}>{t('auth.passwordSpecial')}</Text>
                </View>
              </View>

              {passwordCriteria.all && (
                <Input
                  label={t('auth.confirmNewPassword')}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  placeholder="••••••••"
                  secureTextEntry={!showConfirmPassword}
                  autoComplete="off"
                  maxLength={16}
                  icon={<Ionicons name="lock-closed-outline" size={20} color="#9CA3AF" />}
                  rightIcon={
                    <TouchableOpacity onPress={() => setShowConfirmPassword(!showConfirmPassword)}>
                      <Ionicons
                        name={showConfirmPassword ? 'eye-off-outline' : 'eye-outline'}
                        size={20}
                        color="#9CA3AF"
                      />
                    </TouchableOpacity>
                  }
                />
              )}

              <Button
                title={t('auth.resetPassword')}
                onPress={handleResetPassword}
                loading={isSubmitting}
                disabled={newPassword.length === 0 || confirmPassword.length === 0 || newPassword !== confirmPassword}
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

      <Modal
        visible={errorMessage !== null}
        type="error"
        title={t('common.error')}
        message={errorMessage || ''}
        onClose={() => setErrorMessage(null)}
        actions={[
          {
            text: 'Entendido',
            onPress: () => setErrorMessage(null),
            variant: 'primary',
          },
        ]}
      />
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
  passwordRules: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: 16,
  },
  rulesTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 8,
  },
  ruleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  ruleText: {
    fontSize: 13,
    color: '#374151',
  },
});

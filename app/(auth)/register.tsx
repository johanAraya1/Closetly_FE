/**
 * Register Screen
 * Pantalla de registro
 */

import React, { useMemo, useState } from 'react';
import { View, Text, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Button, Input, Modal } from '@/components';
import { useAuth } from '@/hooks/useAuth';
import { useAuthStore } from '@/store/authStore';
import { useTranslation } from '@/hooks/useTranslation';
import { 
  isValidEmail, 
  isValidPassword, 
  isValidUsername, 
  validationMessages 
} from '@/utils/validation';

export default function RegisterScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { register, isLoading, error, clearError } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [username, setUsername] = useState('');
  const [fullName, setFullName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errors, setErrors] = useState<{ 
    email?: string; 
    password?: string; 
    username?: string;
    confirmPassword?: string;
  }>({});
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  const passwordCriteria = useMemo(() => {
    const length = password.length >= 8 && password.length <= 16;
    const uppercase = /[A-Z]/.test(password);
    const lowercase = /[a-z]/.test(password);
    const number = /[0-9]/.test(password);
    const special = /[!@#$%^&*(),.?":{}|<>_\-+=\[\]\\\/~`]/.test(password);
    return {
      length,
      uppercase,
      lowercase,
      number,
      special,
      all: length && uppercase && lowercase && number && special,
    };
  }, [password]);

  const validate = () => {
    const newErrors: { email?: string; password?: string; username?: string; confirmPassword?: string } = {};

    if (!email) {
      newErrors.email = validationMessages.email.required;
    } else if (!isValidEmail(email)) {
      newErrors.email = validationMessages.email.invalid;
    }

    if (!password) {
      newErrors.password = validationMessages.password.required;
    } else if (!isValidPassword(password)) {
      if (password.length < 8) {
        newErrors.password = validationMessages.password.tooShort;
      } else if (password.length > 16) {
        newErrors.password = validationMessages.password.tooLong;
      } else if (!passwordCriteria.uppercase) {
        newErrors.password = validationMessages.password.noUppercase;
      } else if (!passwordCriteria.lowercase) {
        newErrors.password = validationMessages.password.noLowercase;
      } else if (!passwordCriteria.number) {
        newErrors.password = validationMessages.password.noNumber;
      } else if (!passwordCriteria.special) {
        newErrors.password = validationMessages.password.noSpecial;
      } else {
        newErrors.password = validationMessages.password.weak;
      }
    }

    if (!username) {
      newErrors.username = validationMessages.username.required;
    } else if (!isValidUsername(username)) {
      newErrors.username = validationMessages.username.invalid;
    }

    if (passwordCriteria.all) {
      if (!confirmPassword) {
        newErrors.confirmPassword = t('auth.confirmPasswordRequired');
      } else if (confirmPassword !== password) {
        newErrors.confirmPassword = validationMessages.password.mismatch;
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleRegister = async () => {
    clearError();
    
    if (!validate()) {
      setErrorMessage(t('auth.registrationError'));
      setShowErrorModal(true);
      return;
    }

    const success = await register(email, password, username, fullName);

    if (success) {
      setShowSuccessModal(true);
      // Redirigir después de mostrar el modal
      setTimeout(() => {
        router.replace('/(tabs)/home');
      }, 2000);
    } else {
      // Leer el error fresco del store (evita stale closure)
      const currentError = useAuthStore.getState().error;
      let message = currentError || t('auth.genericError');
      if (currentError?.includes('409') || currentError?.includes('already exists') || currentError?.includes('Conflict')) {
        message = t('auth.emailAlreadyRegistered');
      } else if (currentError?.includes('400')) {
        message = t('auth.invalidData');
      } else if (currentError?.includes('network') || currentError?.includes('fetch') || currentError?.includes('timeout')) {
        message = t('auth.networkError');
      }
      setErrorMessage(message);
      setShowErrorModal(true);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
          <Text style={styles.title}>
            {t('auth.createAccount')}
          </Text>
          <Text style={styles.subtitle}>
            {t('auth.joinClosetly')}
          </Text>

          <Input
            label={t('auth.email')}
            value={email}
            onChangeText={(text) => {
              setEmail(text);
              setErrors({ ...errors, email: undefined });
            }}
            placeholder={t('auth.emailPlaceholder')}
            keyboardType="email-address"
            autoCapitalize="none"
            error={errors.email}
            icon={<Ionicons name="mail-outline" size={20} color="#9CA3AF" />}
          />

          <Input
            label={t('auth.username')}
            value={username}
            onChangeText={(text) => {
              setUsername(text);
              setErrors({ ...errors, username: undefined });
            }}
            placeholder={t('auth.usernamePlaceholder')}
            autoCapitalize="none"
            error={errors.username}
            icon={<Ionicons name="at-outline" size={20} color="#9CA3AF" />}
          />

          <Input
            label={t('auth.fullNameOptional')}
            value={fullName}
            onChangeText={setFullName}
            placeholder={t('auth.fullNamePlaceholder')}
            icon={<Ionicons name="person-outline" size={20} color="#9CA3AF" />}
          />

          <Input
            label={t('auth.password')}
            value={password}
            onChangeText={(text) => {
              setPassword(text);
              setErrors({ ...errors, password: undefined });
            }}
            placeholder={t('auth.passwordPlaceholder')}
            secureTextEntry={!showPassword}
            maxLength={16}
            error={errors.password}
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

          <View style={styles.passwordRules}>
            <Text style={styles.rulesTitle}>{t('auth.passwordRules')}</Text>
            <View style={styles.ruleItem}>
              <Ionicons
                name={passwordCriteria.length ? 'checkmark-circle' : 'close-circle'}
                size={16}
                color={passwordCriteria.length ? '#10B981' : '#EF4444'}
              />
              <Text style={styles.ruleText}>{t('auth.passwordLength')}</Text>
            </View>
            <View style={styles.ruleItem}>
              <Ionicons
                name={passwordCriteria.uppercase ? 'checkmark-circle' : 'close-circle'}
                size={16}
                color={passwordCriteria.uppercase ? '#10B981' : '#EF4444'}
              />
              <Text style={styles.ruleText}>{t('auth.passwordUppercase')}</Text>
            </View>
            <View style={styles.ruleItem}>
              <Ionicons
                name={passwordCriteria.lowercase ? 'checkmark-circle' : 'close-circle'}
                size={16}
                color={passwordCriteria.lowercase ? '#10B981' : '#EF4444'}
              />
              <Text style={styles.ruleText}>{t('auth.passwordLowercase')}</Text>
            </View>
            <View style={styles.ruleItem}>
              <Ionicons
                name={passwordCriteria.number ? 'checkmark-circle' : 'close-circle'}
                size={16}
                color={passwordCriteria.number ? '#10B981' : '#EF4444'}
              />
              <Text style={styles.ruleText}>{t('auth.passwordNumber')}</Text>
            </View>
            <View style={styles.ruleItem}>
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
              label={t('auth.confirmPassword')}
              value={confirmPassword}
              onChangeText={(text) => {
                setConfirmPassword(text);
                setErrors({ ...errors, confirmPassword: undefined });
              }}
              placeholder={t('auth.passwordPlaceholder')}
              secureTextEntry={!showConfirmPassword}
              maxLength={16}
              error={errors.confirmPassword}
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

          <View style={styles.buttonContainer}>
            <Button
              title={t('auth.createAccount')}
              onPress={handleRegister}
              loading={isLoading}
              fullWidth
            />
          </View>

          <View style={styles.footer}>
            <Text style={styles.footerText}>{t('auth.alreadyHaveAccount')} </Text>
            <Button
              title={t('auth.signIn')}
              onPress={() => router.push('/(auth)/login')}
              variant="ghost"
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Modal de Error */}
      <Modal
        visible={showErrorModal}
        type="error"
        title={t('auth.registrationErrorTitle')}
        message={errorMessage}
        onClose={() => setShowErrorModal(false)}
        actions={[
          {
            text: t('auth.gotIt'),
            onPress: () => setShowErrorModal(false),
            variant: 'primary',
          },
        ]}
      />

      {/* Modal de Éxito */}
      <Modal
        visible={showSuccessModal}
        type="success"
        title={t('auth.accountCreatedTitle')}
        message={t('auth.accountCreatedMessage')}
        actions={[
          {
            text: t('auth.continue'),
            onPress: () => {
              setShowSuccessModal(false);
              router.replace('/(tabs)/home');
            },
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
    alignItems: 'center',
  },
  keyboardView: {
    flex: 1,
    width: '100%',
    maxWidth: 440,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 24,
    paddingTop: 32,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#6B7280',
    marginBottom: 32,
  },
  buttonContainer: {
    marginTop: 16,
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
  ruleItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  ruleText: {
    fontSize: 13,
    color: '#374151',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 24,
  },
  footerText: {
    color: '#6B7280',
    fontSize: 15,
  },
});

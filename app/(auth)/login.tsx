/**
 * Login Screen
 * Pantalla de inicio de sesión
 */

import React, { useState } from 'react';
import { View, Text, KeyboardAvoidingView, Platform, ScrollView, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Button, Input, Modal } from '@/components';
import { useAuth } from '@/hooks/useAuth';
import { useTranslation } from '@/hooks/useTranslation';
import { isValidEmail, isValidPassword, validationMessages } from '@/utils/validation';

export default function LoginScreen() {
  const router = useRouter();
  const { login, isLoading, error, clearError } = useAuth();
  const { t } = useTranslation();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const validate = () => {
    const newErrors: { email?: string; password?: string } = {};

    if (!email) {
      newErrors.email = validationMessages.email.required;
    } else if (!isValidEmail(email)) {
      newErrors.email = validationMessages.email.invalid;
    }

    if (!password) {
      newErrors.password = validationMessages.password.required;
    } else if (!isValidPassword(password)) {
      newErrors.password = validationMessages.password.tooShort;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleLogin = async () => {
    clearError();
    
    if (!validate()) {
      setErrorMessage('Por favor, completa todos los campos correctamente');
      setShowErrorModal(true);
      return;
    }

    const success = await login(email, password);

    if (success) {
      router.replace('/(tabs)/home');
    } else {
      // Mapear errores comunes del backend
      let message = error || 'Error al iniciar sesión';
      if (error?.includes('401') || error?.includes('Unauthorized') || error?.includes('Invalid')) {
        message = 'Correo o contraseña incorrectos. Por favor, verifica tus credenciales.';
      } else if (error?.includes('404') || error?.includes('not found')) {
        message = 'No existe una cuenta con este correo. ¿Deseas crear una cuenta nueva?';
      } else if (error?.includes('network') || error?.includes('fetch')) {
        message = 'Error de conexión. Verifica tu internet e intenta nuevamente.';
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
            {t('auth.welcomeBack')}
          </Text>
          <Text style={styles.subtitle}>
            {t('auth.loginSubtitle')}
          </Text>

          <Input
            label={t('auth.email')}
            value={email}
            onChangeText={(text) => {
              setEmail(text);
              setErrors({ ...errors, email: undefined });
            }}
            placeholder="your@email.com"
            keyboardType="email-address"
            autoCapitalize="none"
            error={errors.email}
            icon={<Ionicons name="mail-outline" size={20} color="#9CA3AF" />}
          />

          <Input
            label={t('auth.password')}
            value={password}
            onChangeText={(text) => {
              setPassword(text);
              setErrors({ ...errors, password: undefined });
            }}
            placeholder="••••••••"
            secureTextEntry
            error={errors.password}
            icon={<Ionicons name="lock-closed-outline" size={20} color="#9CA3AF" />}
          />

          <Button
            title={t('auth.signIn')}
            onPress={handleLogin}
            loading={isLoading}
            fullWidth
          />

          <View style={styles.footer}>
            <Text style={styles.footerText}>{t('auth.dontHaveAccount')} </Text>
            <Button
              title={t('auth.register')}
              onPress={() => router.push('/(auth)/register')}
              variant="ghost"
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <Modal
        visible={showErrorModal}
        type="error"
        title="Error al Iniciar Sesión"
        message={errorMessage}
        onClose={() => setShowErrorModal(false)}
        actions={[
          {
            text: 'Entendido',
            onPress: () => setShowErrorModal(false),
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
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 24,
  },
  footerText: {
    color: '#6B7280',
  },
});

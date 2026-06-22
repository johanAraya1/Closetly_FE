/**
 * Login Screen
 * Pantalla de inicio de sesión
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Button, Input, Modal } from '@/components';
import * as LocalAuthentication from 'expo-local-authentication';
import { useAuth } from '@/hooks/useAuth';
import { useAuthStore } from '@/store/authStore';
import { useTranslation } from '@/hooks/useTranslation';
import { checkBiometric } from '@/hooks/useBiometricCheck';
import { tokenService } from '@/services/tokenService';
import { isValidEmail, validationMessages } from '@/utils/validation';

// SOLO guarda email — NUNCA guarda contraseña
const REMEMBER_KEY = '@closetly/remember_me';

export default function LoginScreen() {
  const router = useRouter();
  const { login, isLoading, error, clearError } = useAuth();
  const { t } = useTranslation();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [biometricAvailable, setBiometricAvailable] = useState(false);

  // Verificar disponibilidad de biometría al montar la pantalla
  useEffect(() => {
    (async () => {
      if (Platform.OS === 'web') return;
      try {
        const [hasHardware, isEnrolled, biometricEnabled] = await Promise.all([
          LocalAuthentication.hasHardwareAsync(),
          LocalAuthentication.isEnrolledAsync(),
          tokenService.getBiometricEnabled(),
        ]);
        if (hasHardware && isEnrolled && biometricEnabled) {
          setBiometricAvailable(true);
        }
      } catch {
        // Silently fail — no mostrar botón
      }
    })();
  }, []);

  // Cargar email guardado al montar la pantalla
  // SOLO email — NUNCA se guarda la contraseña
  useEffect(() => {
    (async () => {
      try {
        const saved = await AsyncStorage.getItem(REMEMBER_KEY);
        if (saved) {
          const data = JSON.parse(saved);
          // Migración retro: formato anterior { email, password }
          // nuevo formato solo guarda { email }
          if (data.email) setEmail(data.email);
          setRememberMe(true);
        }
      } catch {
        // Si falla la lectura, arrancamos limpio
      }
    })();
  }, []);

  const validate = () => {
    const newErrors: { email?: string; password?: string } = {};

    if (!email) {
      newErrors.email = validationMessages.email.required;
    } else if (!isValidEmail(email)) {
      newErrors.email = validationMessages.email.invalid;
    }

    if (!password) {
      newErrors.password = validationMessages.password.required;
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

    // Mostrar overlay de transición INMEDIATAMENTE al tocar el botón
    setIsTransitioning(true);

    const success = await login(email, password);

    if (!success) {
      // Si falla, ocultar overlay y mostrar error
      setIsTransitioning(false);

      const currentError = useAuthStore.getState().error;
      let message = currentError || 'Error al iniciar sesión';
      if (currentError?.includes('401') || currentError?.includes('Unauthorized') || currentError?.includes('Invalid')) {
        message = 'Correo o contraseña incorrectos. Por favor, verifica tus credenciales.';
      } else if (currentError?.includes('404') || currentError?.includes('not found')) {
        message = 'No existe una cuenta con este correo. ¿Deseas crear una cuenta nueva?';
      } else if (currentError?.includes('network') || currentError?.includes('fetch') || currentError?.includes('timeout')) {
        message = 'Error de conexión. Verifica tu internet e intenta nuevamente.';
      }
      setErrorMessage(message);
      setShowErrorModal(true);
      return;
    }

    // Recordar email: guardar SOLO el email, NUNCA la contraseña
    try {
      if (rememberMe) {
        await AsyncStorage.setItem(REMEMBER_KEY, JSON.stringify({ email }));
      } else {
        await AsyncStorage.removeItem(REMEMBER_KEY);
      }
    } catch {
      // Si falla la persistencia, no bloquear el login
    }

    // El layout de auth ya tiene un <Redirect> que se activa cuando
    // isAuthenticated cambia a true — no hacemos replace explícito
    // para evitar la doble navegación que deja la pantalla colgada.
  };

  const handleBiometricLogin = async () => {
    clearError();
    setIsTransitioning(true);

    const { success } = await checkBiometric();
    if (!success) {
      setIsTransitioning(false);
      return; // Usuario canceló o falló — no mostrar error
    }

    // Intentar refresh directo con el token guardado
    const result = await tokenService.biometricRefresh();

    if (!result) {
      setIsTransitioning(false);
      setErrorMessage(
        'No se pudo restaurar la sesión. El acceso con huella expiró, ' +
        'ingresá con tu contraseña para renovarlo.'
      );
      setShowErrorModal(true);
      return;
    }

    // Restaurar sesión manualmente en el store
    useAuthStore.setState({
      user: result.session.user,
      profile: result.session.profile,
      token: result.token,
      isAuthenticated: true,
      isLoading: false,
      error: null,
    });

    // El auth layout redirige automáticamente al detectar isAuthenticated
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
            autoComplete="email"
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
            secureTextEntry={!showPassword}
            autoComplete="current-password"
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

          {/* Remember Me */}
          <TouchableOpacity
            style={styles.rememberMeRow}
            onPress={() => setRememberMe(!rememberMe)}
            activeOpacity={0.7}
          >
            <View style={[styles.checkbox, rememberMe && styles.checkboxChecked]}>
              {rememberMe && <Ionicons name="checkmark" size={16} color="#fff" />}
            </View>
            <Text style={styles.rememberMeText}>{t('auth.rememberMe')}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => router.push('/(auth)/forgot-password')}
            style={styles.forgotPassword}
          >
            <Text style={styles.forgotPasswordText}>{t('auth.forgotPassword')}</Text>
          </TouchableOpacity>

          {biometricAvailable && (
            <>
              {/* Divisor "o" */}
              <View style={styles.biometricDivider}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>o</Text>
                <View style={styles.dividerLine} />
              </View>

              {/* Botón de huella/Face ID */}
              <TouchableOpacity
                style={styles.biometricButton}
                onPress={handleBiometricLogin}
                activeOpacity={0.7}
              >
                <Ionicons name="finger-print" size={22} color="#6B7280" />
                <Text style={styles.biometricButtonText}>
                  Ingresar con huella digital
                </Text>
              </TouchableOpacity>
            </>
          )}

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

      {/* Overlay de transición: se muestra apenas toca el botón, dura
          hasta que la página recarga (web) o el componente se desmonta (native) */}
      {isTransitioning && (
        <View style={styles.transitionOverlay}>
          <View style={styles.transitionContent}>
            <ActivityIndicator size="large" color="#62D9C7" />
            <Text style={styles.transitionText}>
              {t('auth.signIn')}...
            </Text>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F4F5F7',
    alignItems: 'center',
    position: 'relative',
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
  rememberMeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    marginBottom: 12,
    marginTop: 8,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#D1D5DB',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  checkboxChecked: {
    backgroundColor: '#62D9C7',
    borderColor: '#62D9C7',
  },
  rememberMeText: {
    color: '#374151',
    fontSize: 14,
    fontWeight: '500',
  },
  forgotPassword: {
    alignSelf: 'flex-end',
    marginBottom: 16,
    marginTop: 4,
  },
  forgotPasswordText: {
    color: '#62D9C7',
    fontSize: 14,
    fontWeight: '500',
  },
  biometricDivider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 20,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#D1D5DB',
  },
  dividerText: {
    marginHorizontal: 12,
    color: '#9CA3AF',
    fontSize: 14,
  },
  biometricButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 24,
    marginBottom: 8,
  },
  biometricButtonText: {
    marginLeft: 10,
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
  },
  transitionOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(244, 245, 247, 0.95)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 100,
  },
  transitionContent: {
    alignItems: 'center',
    gap: 16,
  },
  transitionText: {
    fontSize: 16,
    color: '#374151',
    fontWeight: '500',
  },
});

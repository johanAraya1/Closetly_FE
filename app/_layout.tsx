/**
 * Root Layout
 * Layout raíz de la aplicación con expo-router
 * Inicializa sesión segura al arrancar la app
 * 
 * Single Stack — sin renderizado condicional.
 * Los route guards en (auth) y (tabs) manejan las redirecciones.
 */

import { useEffect, useState, useRef } from 'react';
import { View, ActivityIndicator, StyleSheet, PanResponder } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { useAuth } from '@/hooks/useAuth';
import { useIdleTimer } from '@/hooks/useIdleTimer';
import { checkBiometric } from '@/hooks/useBiometricCheck';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { analytics } from '@/services/analyticsService';
import {
  registerForPushNotifications,
  registerPushToken,
  unregisterPushToken,
} from '@/services/pushNotificationService';
import {
  setupNotificationHandler,
  setupNotificationResponseHandler,
  setupAndroidNotificationChannel,
} from '@/utils/notificationHandler';

// Inicializar analytics y notification handler (antes del render)
analytics.init();
setupNotificationHandler();

export default function RootLayout() {
  const { isAuthenticated, loadSession, isInitialized, biometricEnabled, logout } = useAuth();
  const router = useRouter();
  const [isAppReady, setIsAppReady] = useState(false);
  const biometricChecked = useRef(false);

  // Idle timer para auto-logout por inactividad
  const { resetIdleTimer } = useIdleTimer();

  // PanResponder: captura toques para resetear el timer de inactividad
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponderCapture: () => {
        resetIdleTimer();
        return false; // no capturar, solo notificar
      },
    }),
  ).current;

  // Inicializar sesión al arrancar la app
  useEffect(() => {
    async function initializeApp() {
      try {
        // Cargar sesión guardada en SecureStore (cifrada)
        await loadSession();
      } catch (error) {
        console.error('Error initializing app:', error);
      } finally {
        setIsAppReady(true);
      }
    }

    initializeApp();
  }, []);

  // Verificar biometría DESPUÉS de restaurar sesión
  useEffect(() => {
    if (!isAppReady || !isInitialized || !isAuthenticated || !biometricEnabled) {
      return;
    }

    if (biometricChecked.current) {
      return;
    }
    biometricChecked.current = true;

    (async () => {
      const result = await checkBiometric();
      if (!result.success) {
        // Falló biometría → cerrar sesión
        await logout();
      }
    })();
  }, [isAppReady, isInitialized, isAuthenticated, biometricEnabled, logout]);

  // Configurar canal de notificaciones en Android (al arrancar)
  useEffect(() => {
    setupAndroidNotificationChannel();
  }, []);

  // Listener de navegación cuando el usuario TOCA una notificación
  useEffect(() => {
    const cleanup = setupNotificationResponseHandler(router);
    return cleanup;
  }, [router]);

  // Registrar push token cuando auth cambia (login/logout)
  useEffect(() => {
    if (!isAppReady || !isInitialized) return;

    async function handlePushTokenRegistration() {
      if (isAuthenticated) {
        // Login o sesión restaurada → registrar push token
        const token = await registerForPushNotifications();
        if (token) {
          await registerPushToken(token);
        }
      } else {
        // Logout → desregistrar push token
        await unregisterPushToken();
      }
    }

    handlePushTokenRegistration();
  }, [isAuthenticated, isAppReady, isInitialized]);

  // Mostrar splash screen mientras carga la sesión
  if (!isAppReady || !isInitialized) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#62D9C7" />
      </View>
    );
  }

  return (
    <ThemeProvider>
      {/*
       * Single Stack — todos los grupos de rutas conviven.
       * Los route guards en (auth)/_layout.tsx y (tabs)/_layout.tsx
       * redirigen según el estado de autenticación.
       * Sin renderizado condicional → router.replace funciona
       * correctamente SIN freezes en web.
       */}
      <View
        style={styles.root}
        {...panResponder.panHandlers}
      >
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="index" />
          <Stack.Screen name="onboarding-tour" />
          <Stack.Screen name="(auth)" />
          <Stack.Screen name="(tabs)" />
        </Stack>
      </View>
    </ThemeProvider>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F4F5F7',
  },
});

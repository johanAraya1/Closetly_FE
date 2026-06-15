/**
 * Root Layout
 * Layout raíz de la aplicación con expo-router
 * Inicializa sesión segura al arrancar la app
 */

import { useEffect, useState } from 'react';
import { View, ActivityIndicator, StyleSheet, Platform } from 'react-native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { useAuth } from '@/hooks/useAuth';
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
  // TODOS los hooks deben estar al inicio (antes de cualquier return)
  const { isAuthenticated, isLoading, loadSession, isInitialized } = useAuth();
  const segments = useSegments();
  const router = useRouter();
  const [isAppReady, setIsAppReady] = useState(false);

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

  // Sincronización de ruta cuando el árbol cambia por renderizado condicional.
  // El renderizado condicional ya maneja el cambio de árbol (auth ↔ tabs).
  // Este efecto maneja casos borde: cuando la URL actual no coincide con
  // rutas válidas después del cambio de árbol.
  useEffect(() => {
    if (isLoading || !isAppReady || !isInitialized) return;

    const inAuthGroup = segments[0] === '(auth)';
    const inTabsGroup = segments[0] === '(tabs)';

    if (isAuthenticated && inAuthGroup) {
      // Autenticado pero en (auth): el árbol ya cambió a tabs, la URL
      // vieja (/login, /register) no coincide con el nuevo árbol.
      if (Platform.OS === 'web') {
        // En web, router.replace entre estado inconsistente no actualiza
        // el DOM. window.location.href fuerza una navegación real del
        // navegador que siempre funciona.
        window.location.href = '/home';
      } else {
        router.replace('/');
      }
    } else if (!isAuthenticated && inTabsGroup) {
      if (Platform.OS === 'web') {
        window.location.href = '/onboarding';
      } else {
        router.replace('/');
      }
    }
  }, [isAuthenticated, segments, isLoading, isAppReady, isInitialized]);

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
       * Renderizado condicional: cuando cambia isAuthenticated,
       * React desmonta el árbol viejo y monta el nuevo.
       * Esto resuelve el freeze visual en web donde router.replace
       * entre grupos de rutas no actualiza el DOM.
       */}
      {isAuthenticated ? (
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="index" />
          <Stack.Screen name="(tabs)" />
        </Stack>
      ) : (
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="index" />
          <Stack.Screen name="(auth)" />
        </Stack>
      )}
    </ThemeProvider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F4F5F7',
  },
});

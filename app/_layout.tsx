/**
 * Root Layout
 * Layout raíz de la aplicación con expo-router
 * Inicializa sesión segura al arrancar la app
 */

import { useEffect, useState } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { useAuth } from '@/hooks/useAuth';
import { ErrorBoundary } from '@/components';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { analytics } from '@/services/analyticsService';

// Inicializar analytics
analytics.init();

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

  // Navegación automática según estado de autenticación
  useEffect(() => {
    if (isLoading || !isAppReady || !isInitialized) return;

    const inAuthGroup = segments[0] === '(auth)';
    const inTabsGroup = segments[0] === '(tabs)';

    if (!isAuthenticated && inTabsGroup) {
      // Usuario no autenticado intentando acceder a tabs
      router.replace('/(auth)/onboarding');
    } else if (isAuthenticated && inAuthGroup) {
      // Usuario autenticado en pantallas de auth
      router.replace('/(tabs)/home');
    }
  }, [isAuthenticated, segments, isLoading, isAppReady, isInitialized]);

  // Mostrar splash screen mientras carga la sesión
  if (!isAppReady || !isInitialized) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#62D9C7" />
      </View>
    );
  }

  return (
    <ErrorBoundary>
      <ThemeProvider>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="index" />
          <Stack.Screen name="(auth)" />
          <Stack.Screen name="(tabs)" />
        </Stack>
      </ThemeProvider>
    </ErrorBoundary>
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

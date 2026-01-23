/**
 * AdminRoute Component
 * Protege rutas que solo deben ser accesibles para administradores
 */

import React, { ReactNode } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/hooks/useAuth';
import { COLORS } from '@/lib/constants';
import { Ionicons } from '@expo/vector-icons';

interface AdminRouteProps {
  children: ReactNode;
  fallback?: ReactNode;
}

export const AdminRoute: React.FC<AdminRouteProps> = ({ children, fallback }) => {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  // Mostrar loading mientras verifica
  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Verificando permisos...</Text>
      </View>
    );
  }

  // Si no es admin, mostrar fallback o redirigir
  if (user?.role !== 'admin') {
    if (fallback) {
      return <>{fallback}</>;
    }

    // Redirigir automáticamente después de un momento
    setTimeout(() => {
      router.replace('/(tabs)/home');
    }, 2000);

    return (
      <View style={styles.container}>
        <Ionicons name="lock-closed" size={64} color={COLORS.error} />
        <Text style={styles.title}>Acceso Denegado</Text>
        <Text style={styles.message}>
          No tienes permisos para acceder a esta sección.
        </Text>
        <Text style={styles.redirect}>
          Redirigiendo al inicio...
        </Text>
      </View>
    );
  }

  // Usuario es admin, mostrar contenido
  return <>{children}</>;
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.white,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: COLORS.gray[600],
  },
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: COLORS.white,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.gray[900],
    marginTop: 16,
    marginBottom: 8,
  },
  message: {
    fontSize: 16,
    color: COLORS.gray[600],
    textAlign: 'center',
    marginBottom: 16,
  },
  redirect: {
    fontSize: 14,
    color: COLORS.gray[500],
    fontStyle: 'italic',
  },
});

/**
 * Index Screen
 * Pantalla inicial que redirige según estado de autenticación
 */

import { useEffect } from 'react';
import { useRouter } from 'expo-router';
import { View } from 'react-native';
import { Loading } from '@/components';
import { useAuth } from '@/hooks/useAuth';

export default function Index() {
  const router = useRouter();
  const { isAuthenticated } = useAuth();

  useEffect(() => {
    // Con renderizado condicional, index se remonta cada vez que
    // cambia isAuthenticated. Redirigir según estado actual.
    const timeout = setTimeout(() => {
      router.replace(isAuthenticated ? '/(tabs)/home' : '/(auth)/onboarding');
    }, 100);
    
    return () => clearTimeout(timeout);
  }, [isAuthenticated]);

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <Loading message="Loading Closetly..." />
    </View>
  );
}

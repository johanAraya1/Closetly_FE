/**
 * Index Screen
 * Pantalla inicial que redirige según estado de autenticación
 */

import { useEffect } from 'react';
import { useRouter } from 'expo-router';
import { View } from 'react-native';
import { Loading } from '@/components';

export default function Index() {
  const router = useRouter();

  useEffect(() => {
    // Redirigir directamente a onboarding después de un breve delay
    const timeout = setTimeout(() => {
      router.replace('/(auth)/onboarding');
    }, 1000);
    
    return () => clearTimeout(timeout);
  }, []);

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <Loading message="Loading Closetly..." />
    </View>
  );
}

/**
 * Index Screen
 * Pantalla inicial que redirige según estado de autenticación
 * y si el usuario ya vió el tour de onboarding.
 */

import { useEffect } from 'react';
import { useRouter } from 'expo-router';
import { View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Loading } from '@/components';
import { useAuth } from '@/hooks/useAuth';

const TOUR_KEY = '@closetly/tour_completed';

export default function Index() {
  const router = useRouter();
  const { isAuthenticated } = useAuth();

  useEffect(() => {
    const timeout = setTimeout(async () => {
      if (!isAuthenticated) {
        router.replace('/(auth)/onboarding');
        return;
      }

      // Authenticated — check if tour was completed
      try {
        const tourSeen = await AsyncStorage.getItem(TOUR_KEY);
        if (tourSeen === 'true') {
          router.replace('/(tabs)/home');
        } else {
          router.replace('/onboarding-tour');
        }
      } catch {
        // If AsyncStorage fails, go straight to home
        router.replace('/(tabs)/home');
      }
    }, 100);

    return () => clearTimeout(timeout);
  }, [isAuthenticated]);

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <Loading message="Loading Closetly..." />
    </View>
  );
}

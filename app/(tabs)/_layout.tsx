/**
 * Tabs Layout
 * Layout con tabs para navegación principal
 * Route guard: si no está autenticado, redirige a onboarding.
 */

import { Tabs, Redirect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '@/lib/constants';
import { useAuth } from '@/hooks/useAuth';
import { useTranslation } from '@/hooks/useTranslation';

export default function TabsLayout() {
  const { isAuthenticated } = useAuth();
  const { t } = useTranslation();

  // Si no está autenticado, no debería estar en tabs
  if (!isAuthenticated) {
    return <Redirect href="/(auth)/onboarding" />;
  }

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: COLORS.gray[400],
        headerShown: false,
        tabBarStyle: {
          backgroundColor: 'white',
          borderTopWidth: 1,
          borderTopColor: COLORS.gray[200],
          height: 65,
          paddingBottom: 8,
          paddingTop: 8,
        },
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="closet"
        options={{
          title: 'Closet',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="shirt-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="outfits"
        options={{
          title: 'Outfits',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="toggle-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="collections"
        options={{
          title: 'Collections +',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="albums-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="marketplace"
        options={{
          title: 'Marketplace',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="storefront-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="chat"
        options={{
          title: t('chat.tabTitle') + ' +',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="chatbubbles-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person-outline" size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}

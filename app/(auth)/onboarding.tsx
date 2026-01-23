/**
 * Onboarding Screen
 * Pantalla de bienvenida
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '@/components';
import { useTranslation } from '@/hooks/useTranslation';

export default function OnboardingScreen() {
  const router = useRouter();
  const { t } = useTranslation();

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.header}>
          <View style={styles.iconContainer}>
            <Text style={styles.icon}>👔</Text>
          </View>
          <Text style={styles.title}>
            {t('auth.appName')}
          </Text>
          <Text style={styles.subtitle}>
            {t('auth.appTagline')}
          </Text>
        </View>

        <View style={styles.description}>
          <Text style={styles.descriptionText}>
            {t('auth.onboardingDescription')}
          </Text>
        </View>

        <View style={styles.buttonContainer}>
          <Button
            title={t('auth.getStarted')}
            onPress={() => router.push('/(auth)/register')}
            fullWidth
          />
          <View style={styles.buttonSpacer} />
          <Button
            title={t('auth.iAlreadyHaveAccount')}
            onPress={() => router.push('/(auth)/login')}
            variant="outline"
            fullWidth
          />
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F4F5F7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    width: '100%',
    maxWidth: 440,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  header: {
    alignItems: 'center',
    marginBottom: 48,
  },
  iconContainer: {
    width: 128,
    height: 128,
    backgroundColor: '#62D9C7',
    borderRadius: 64,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  icon: {
    fontSize: 64,
  },
  title: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 18,
    color: '#6B7280',
    textAlign: 'center',
  },
  description: {
    marginBottom: 32,
  },
  descriptionText: {
    color: '#374151',
    textAlign: 'center',
    fontSize: 16,
    lineHeight: 24,
  },
  buttonContainer: {
    width: '100%',
  },
  buttonSpacer: {
    height: 16,
  },
});

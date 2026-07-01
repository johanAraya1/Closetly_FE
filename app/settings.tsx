/**
 * Settings Screen
 * Pantalla de configuración del usuario
 */

import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Modal, Switch, Platform, Alert } from 'react-native';
import * as LocalAuthentication from 'expo-local-authentication';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '@/lib/constants';
import { withScreenErrorBoundary, Input } from '@/components';
import { useAuth } from '@/hooks/useAuth';
import { useAuthStore } from '@/store/authStore';
import { useTranslation } from '@/hooks/useTranslation';
import { tokenService } from '@/services/tokenService';

function SettingsScreen() {
  const router = useRouter();
  const { profile, biometricEnabled, enableBiometric, disableBiometric } = useAuth();
  const { t, locale, changeLanguage } = useTranslation();
  const [showLanguageModal, setShowLanguageModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [isSavingPassword, setIsSavingPassword] = useState(false);
  const [biometricAvailable, setBiometricAvailable] = useState(false);

  const currentLanguage = locale.startsWith('es') ? t('settings.spanish') : t('settings.english');

  // Verificar disponibilidad de biometría al montar
  useEffect(() => {
    (async () => {
      if (Platform.OS === 'web') {
        setBiometricAvailable(false);
        return;
      }
      try {
        const hasHardware = await LocalAuthentication.hasHardwareAsync();
        const enrolled = await LocalAuthentication.isEnrolledAsync();
        setBiometricAvailable(hasHardware && enrolled);
      } catch {
        setBiometricAvailable(false);
      }
    })();
  }, []);

  const handleBiometricToggle = async (value: boolean) => {
    if (value) {
      // Antes de activar, pedir confirmación biométrica
      try {
        const result = await LocalAuthentication.authenticateAsync({
          promptMessage: 'Registrar huella digital para ingreso rápido',
          cancelLabel: 'Cancelar',
          disableDeviceFallback: false,
        });
        if (result.success) {
          // Verificar si ya tenemos credenciales guardadas
          const existing = await tokenService.getBiometricCredentials();
          if (existing) {
            // Ya hay credenciales, solo activar
            await enableBiometric();
          } else {
            // Pedir contraseña para guardar credenciales
            setPasswordInput('');
            setShowPasswordModal(true);
          }
        }
      } catch {
        // Si falla, no activar
      }
    } else {
      await disableBiometric();
    }
  };

  const handleSavePassword = async () => {
    if (!passwordInput.trim()) {
      Alert.alert('Error', 'Ingresá tu contraseña para activar la huella digital');
      return;
    }
    setIsSavingPassword(true);
    const user = useAuthStore.getState().user;
    const email = user?.email;
    if (email) {
      await tokenService.saveBiometricCredentials(email, passwordInput);
    }
    await enableBiometric();
    setPasswordInput('');
    setShowPasswordModal(false);
    setIsSavingPassword(false);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={COLORS.gray[900]} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('settings.title')}</Text>
      </View>

      <ScrollView style={styles.scrollView}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>PREFERENCES</Text>
          
          <TouchableOpacity 
            style={styles.settingItem}
            onPress={() => setShowLanguageModal(true)}
          >
            <View style={styles.settingLeft}>
              <Ionicons name="language-outline" size={20} color={COLORS.gray[700]} />
              <Text style={styles.settingText}>{t('settings.language')}</Text>
            </View>
            <View style={styles.settingRight}>
              <Text style={styles.settingValue}>{currentLanguage}</Text>
              <Ionicons name="chevron-forward" size={20} color={COLORS.gray[400]} />
            </View>
          </TouchableOpacity>
        </View>

        {/* Biometric Section */}
        {biometricAvailable && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>SEGURIDAD</Text>
            <View style={styles.settingItem}>
              <View style={styles.settingLeft}>
                <Ionicons
                  name={Platform.OS === 'ios' ? 'finger-print-outline' : 'finger-print-outline'}
                  size={20}
                  color={COLORS.gray[700]}
                />
                <Text style={styles.settingText}>
                  {Platform.OS === 'ios' ? 'Face ID / Touch ID' : 'Huella Digital'}
                </Text>
              </View>
              <Switch
                value={biometricEnabled}
                onValueChange={handleBiometricToggle}
                trackColor={{ false: '#D1D5DB', true: '#62D9C780' }}
                thumbColor={biometricEnabled ? '#62D9C7' : '#F4F5F7'}
              />
            </View>
            <Text style={styles.settingHint}>
              {biometricEnabled
                ? 'Usá tu huella o Face ID para ingresar sin contraseña'
                : 'Activá el ingreso con huella digital o Face ID'}
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Language Modal */}
      <Modal
        visible={showLanguageModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowLanguageModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{t('settings.chooseLanguage')}</Text>
              <TouchableOpacity onPress={() => setShowLanguageModal(false)}>
                <Ionicons name="close" size={24} color={COLORS.gray[900]} />
              </TouchableOpacity>
            </View>
            
            <TouchableOpacity
              style={[styles.languageOption, locale.startsWith('en') && styles.languageOptionSelected]}
              onPress={() => {
                changeLanguage('en');
                setShowLanguageModal(false);
              }}
            >
              <Text style={styles.languageText}>{t('settings.english')}</Text>
              {locale.startsWith('en') && (
                <Ionicons name="checkmark" size={24} color={COLORS.primary} />
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.languageOption, locale.startsWith('es') && styles.languageOptionSelected]}
              onPress={() => {
                changeLanguage('es');
                setShowLanguageModal(false);
              }}
            >
              <Text style={styles.languageText}>{t('settings.spanish')}</Text>
              {locale.startsWith('es') && (
                <Ionicons name="checkmark" size={24} color={COLORS.primary} />
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Password Modal — pedir contraseña al activar huella */}
      <Modal
        visible={showPasswordModal}
        transparent
        animationType="slide"
        onRequestClose={() => {
          if (!isSavingPassword) {
            setShowPasswordModal(false);
            setPasswordInput('');
          }
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Confirmar contraseña</Text>
              <TouchableOpacity
                onPress={() => {
                  setShowPasswordModal(false);
                  setPasswordInput('');
                }}
                disabled={isSavingPassword}
              >
                <Ionicons name="close" size={24} color={COLORS.gray[900]} />
              </TouchableOpacity>
            </View>
            <Text style={styles.passwordHint}>
              Ingresá tu contraseña para guardar el acceso con huella digital.
              Se almacena cifrada por hardware en el dispositivo.
            </Text>
            <Input
              label="Contraseña"
              value={passwordInput}
              onChangeText={setPasswordInput}
              placeholder="••••••••"
              secureTextEntry
              autoCapitalize="none"
            />
            <View style={styles.passwordButtons}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => {
                  setShowPasswordModal(false);
                  setPasswordInput('');
                }}
                disabled={isSavingPassword}
              >
                <Text style={styles.cancelButtonText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.saveButton, isSavingPassword && styles.saveButtonDisabled]}
                onPress={handleSavePassword}
                disabled={isSavingPassword}
              >
                <Text style={styles.saveButtonText}>
                  {isSavingPassword ? 'Guardando...' : 'Activar huella'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F4F5F7',
  },
  header: {
    paddingHorizontal: 24,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
    marginLeft: 16,
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 24,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
    marginBottom: 12,
  },
  settingItem: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  settingText: {
    color: '#111827',
    fontSize: 16,
    marginLeft: 12,
  },
  settingRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  settingValue: {
    fontSize: 14,
    color: '#6B7280',
    marginRight: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 40,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
  },
  languageOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
    backgroundColor: '#F4F5F7',
  },
  languageOptionSelected: {
    backgroundColor: '#62D9C720',
    borderWidth: 2,
    borderColor: '#62D9C7',
  },
  languageText: {
    fontSize: 16,
    color: '#111827',
  },
  settingHint: {
    fontSize: 13,
    color: '#9CA3AF',
    marginTop: 4,
    marginLeft: 8,
    paddingHorizontal: 4,
  },
  passwordHint: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 16,
    lineHeight: 20,
  },
  passwordButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: 20,
  },
  cancelButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    backgroundColor: '#F4F5F7',
  },
  cancelButtonText: {
    fontSize: 16,
    color: '#6B7280',
    fontWeight: '500',
  },
  saveButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    backgroundColor: '#62D9C7',
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: '600',
  },
});

export default withScreenErrorBoundary(SettingsScreen);

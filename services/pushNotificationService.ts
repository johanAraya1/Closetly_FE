/**
 * Push Notification Service
 * Servicio para push notifications usando expo-notifications
 * Flujo: Pedir permiso → Obtener Expo push token → Registrar en backend
 */

import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { isDevice } from 'expo-device';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS } from '@/lib/constants';
import { apiClient } from '@/utils/apiClient';

/**
 * Registra el dispositivo para recibir push notifications.
 * 1. Verifica que sea dispositivo físico (no simulador)
 * 2. Pide permiso al usuario
 * 3. Si concedido, obtiene el Expo push token
 * 4. Retorna el token o null si falla/denegado
 */
export const registerForPushNotifications = async (): Promise<string | null> => {
  try {
    // 1. Solo dispositivos físicos soportan push notifications
    if (!isDevice) {
      console.log('[PushNotification] Skipping — simulator/emulator detected');
      return null;
    }

    // 2. Pedir permiso si no lo tenemos
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.log('[PushNotification] Permission denied');
      return null;
    }

    // 3. Obtener Expo push token
    const projectId = process.env.EXPO_PUBLIC_EAS_PROJECT_ID;
    const { data: token } = await Notifications.getExpoPushTokenAsync({
      projectId: projectId || undefined,
    });

    return token;
  } catch (error) {
    console.error('[PushNotification] Registration error:', error);
    return null;
  }
};

/**
 * Devuelve el estado actual del permiso de push notifications
 */
export const getPushPermissionStatus = async (): Promise<Notifications.PermissionStatus> => {
  const { status } = await Notifications.getPermissionsAsync();
  return status;
};

/**
 * Registra el push token en el backend.
 * Almacena el token localmente para poder desregistrarlo después.
 */
export const registerPushToken = async (
  token: string,
  platform: string = Platform.OS
): Promise<boolean> => {
  try {
    const result = await apiClient.post('/push/register', {
      token,
      platform,
    });

    if (result.error) {
      console.error('[PushNotification] Backend registration error:', result.error);
      return false;
    }

    // Guardar token localmente para cleanup en logout
    await AsyncStorage.setItem(STORAGE_KEYS.PUSH_TOKEN, token);
    return true;
  } catch (error) {
    console.error('[PushNotification] Backend registration exception:', error);
    return false;
  }
};

/**
 * Desregistra el push token del backend (logout).
 * Lee el token almacenado localmente y lo envía para desregistrar.
 */
export const unregisterPushToken = async (): Promise<boolean> => {
  try {
    const token = await AsyncStorage.getItem(STORAGE_KEYS.PUSH_TOKEN);
    if (!token) {
      // No hay token registrado, nada que hacer
      return true;
    }

    const result = await apiClient.post('/push/unregister', {
      token,
    });

    if (result.error) {
      console.error('[PushNotification] Backend unregister error:', result.error);
      // Igual limpiamos local para no quedar colgados
      await AsyncStorage.removeItem(STORAGE_KEYS.PUSH_TOKEN);
      return false;
    }

    await AsyncStorage.removeItem(STORAGE_KEYS.PUSH_TOKEN);
    return true;
  } catch (error) {
    console.error('[PushNotification] Backend unregister exception:', error);
    // Limpiar local para no quedar colgados
    await AsyncStorage.removeItem(STORAGE_KEYS.PUSH_TOKEN);
    return false;
  }
};

/**
 * Obtiene el push token almacenado localmente (si existe)
 */
export const getStoredPushToken = async (): Promise<string | null> => {
  try {
    return await AsyncStorage.getItem(STORAGE_KEYS.PUSH_TOKEN);
  } catch {
    return null;
  }
};

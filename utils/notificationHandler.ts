/**
 * Notification Handler
 * Configura el display de notificaciones en foreground y la navegación al tocar
 */

import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import type { Router } from 'expo-router';

/**
 * Configura el handler que muestra notificaciones cuando la app está en foreground.
 * DEBE llamarse antes de que cualquier notificación pueda llegar (ideal al inicio del bundle).
 */
export function setupNotificationHandler(): void {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
    }),
  });
}

/**
 * Configura el canal por defecto en Android.
 * Es necesario llamarlo al menos una vez para que las notificaciones
 * se muestren correctamente en Android 8+.
 */
export async function setupAndroidNotificationChannel(): Promise<void> {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#62D9C7',
    });
  }
}

/**
 * Configura el listener que maneja cuando el usuario TOCA una notificación.
 * Extrae conversationId de los datos y navega al chat correspondiente.
 * Retorna una función de cleanup para usar en useEffect.
 */
export function setupNotificationResponseHandler(router: Router): () => void {
  const subscription = Notifications.addNotificationResponseReceivedListener(
    (response: Notifications.NotificationResponse) => {
      const data = response.notification.request.content.data;

      if (!data) return;

      // Navegar al chat si la notificación tiene conversationId
      if (data.conversationId) {
        const conversationId = String(data.conversationId);
        // Usar as any por typedRoutes (experimento que causa strict typing)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (router as any).push(`/chat/${conversationId}`);
        return;
      }

      // Navegación genérica para futuros tipos de notificación
      if (data.screen && typeof data.screen === 'string') {
        const params = data.params
          ? `?${new URLSearchParams(
              Object.entries(data.params as Record<string, string>)
            ).toString()}`
          : '';

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (router as any).push(`${data.screen}${params}`);
      }
    }
  );

  return () => subscription.remove();
}

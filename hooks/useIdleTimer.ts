/**
 * useIdleTimer Hook
 * Manejo completo de sesión:
 * - Auto-refresh silencioso cada 12 min mientras el usuario está activo
 * - Auto-logout por inactividad (5 min sin interacción)
 * - Auto-logout al volver de background si pasaron > 5 min
 * - Refresh silencioso al volver de background si pasaron < 5 min
 *
 * 4 triggers:
 * 1. Refresh timer: cada 12 min renueva el token silenciosamente
 * 2. Idle timer: sin interacción táctil por > 5 min → logout
 * 3. AppState: background → foreground con > 5 min → logout
 * 4. AppState: background → foreground con < 5 min → refresh + resume
 */

import { useEffect, useRef, useCallback, useState } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { useAuthStore } from '@/store/authStore';
import { tokenService } from '@/services/tokenService';

const IDLE_TIMEOUT = 5 * 60 * 1000;         // 5 min sin tocar → logout
const REFRESH_INTERVAL = 12 * 60 * 1000;     // 12 min → refresh silencioso
const IDLE_CHECK_INTERVAL = 30 * 1000;       // check cada 30s

export function useIdleTimer() {
  const [isAuthed, setIsAuthed] = useState(() => useAuthStore.getState().isAuthenticated);
  const lastActivity = useRef<number>(Date.now());
  const backgroundSince = useRef<number | null>(null);
  const idleInterval = useRef<ReturnType<typeof setInterval> | null>(null);
  const refreshInterval = useRef<ReturnType<typeof setInterval> | null>(null);
  const isLoggingOut = useRef(false);

  // Suscribirse a cambios de isAuthenticated (Zustand)
  useEffect(() => {
    const unsub = useAuthStore.subscribe(
      (state) => state.isAuthenticated,
      (val) => setIsAuthed(val),
    );
    return unsub;
  }, []);

  /** Logout forzado — limpio, sin intentar refresh primero */
  const forcedLogout = useCallback(async () => {
    if (isLoggingOut.current) return;
    isLoggingOut.current = true;

    stopAllTimers();

    const store = useAuthStore.getState();
    if (!store.isAuthenticated) {
      isLoggingOut.current = false;
      return;
    }

    await store.logout();
    isLoggingOut.current = false;
  }, []);

  /** Refresh silencioso — no toca loading/UI, no falla visiblemente */
  const silentRefresh = useCallback(async () => {
    try {
      const newToken = await tokenService.refreshAccessToken();
      if (newToken) {
        useAuthStore.setState({ token: newToken });
      }
      // Si falla, no hacemos nada — el próximo refresh o request lo resolverá
    } catch {
      // Fracaso silencioso
    }
  }, []);

  // Resetear timer de inactividad
  const resetIdleTimer = useCallback(() => {
    lastActivity.current = Date.now();
  }, []);

  const stopAllTimers = useCallback(() => {
    if (idleInterval.current) {
      clearInterval(idleInterval.current);
      idleInterval.current = null;
    }
    if (refreshInterval.current) {
      clearInterval(refreshInterval.current);
      refreshInterval.current = null;
    }
  }, []);

  // Iniciar timers
  const startAllTimers = useCallback(() => {
    stopAllTimers();

    // Timer de inactividad: cada 30s verifica si pasaron 5 min sin tocar
    idleInterval.current = setInterval(() => {
      const elapsed = Date.now() - lastActivity.current;
      if (elapsed >= IDLE_TIMEOUT) {
        forcedLogout();
      }
    }, IDLE_CHECK_INTERVAL);

    // Timer de refresh: cada 12 min renueva el token silenciosamente
    refreshInterval.current = setInterval(() => {
      silentRefresh();
    }, REFRESH_INTERVAL);
  }, [forcedLogout, silentRefresh, stopAllTimers]);

  useEffect(() => {
    if (!isAuthed) return;

    const handleAppState = (nextState: AppStateStatus) => {
      if (nextState === 'background' || nextState === 'inactive') {
        backgroundSince.current = Date.now();
        stopAllTimers();
      } else if (nextState === 'active') {
        if (backgroundSince.current !== null) {
          const elapsed = Date.now() - backgroundSince.current;

          if (elapsed >= IDLE_TIMEOUT) {
            // Estuvo fuera > 5 min → logout directo
            forcedLogout();
            backgroundSince.current = null;
            return;
          }

          // Volvió antes de 5 min → refresh silencioso + reanudar timers
          silentRefresh();
        }

        backgroundSince.current = null;
        resetIdleTimer();
        startAllTimers();
      }
    };

    const appStateSub = AppState.addEventListener('change', handleAppState);

    // Arrancar timers al montar
    startAllTimers();

    return () => {
      appStateSub.remove();
      stopAllTimers();
    };
  }, [isAuthed, forcedLogout, silentRefresh, startAllTimers, stopAllTimers, resetIdleTimer]);

  return {
    resetIdleTimer,
    forcedLogout,
  };
}

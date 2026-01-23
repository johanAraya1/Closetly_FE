/**
 * Rate Limiter
 * Previene brute force attacks y spam de requests
 */

interface RateLimitConfig {
  maxAttempts: number;
  windowMs: number;
  blockDurationMs?: number;
}

interface RateLimitState {
  count: number;
  resetAt: number;
  blockedUntil?: number;
}

class RateLimiter {
  private attempts: Map<string, RateLimitState> = new Map();

  /**
   * Verifica si una acción está permitida según límites
   */
  check(
    key: string,
    config: RateLimitConfig
  ): { allowed: boolean; remainingAttempts: number; blockedUntil?: Date } {
    const now = Date.now();
    const state = this.attempts.get(key);

    // Verificar si está bloqueado
    if (state?.blockedUntil && now < state.blockedUntil) {
      return {
        allowed: false,
        remainingAttempts: 0,
        blockedUntil: new Date(state.blockedUntil),
      };
    }

    // Resetear si pasó la ventana de tiempo
    if (!state || now > state.resetAt) {
      this.attempts.set(key, {
        count: 1,
        resetAt: now + config.windowMs,
      });
      return {
        allowed: true,
        remainingAttempts: config.maxAttempts - 1,
      };
    }

    // Incrementar intentos
    state.count++;

    // Bloquear si excede límite
    if (state.count > config.maxAttempts && config.blockDurationMs) {
      state.blockedUntil = now + config.blockDurationMs;
      return {
        allowed: false,
        remainingAttempts: 0,
        blockedUntil: new Date(state.blockedUntil),
      };
    }

    return {
      allowed: state.count <= config.maxAttempts,
      remainingAttempts: Math.max(0, config.maxAttempts - state.count),
    };
  }

  /**
   * Reinicia el contador para una key específica
   */
  reset(key: string): void {
    this.attempts.delete(key);
  }

  /**
   * Limpia todos los contadores
   */
  clear(): void {
    this.attempts.clear();
  }

  /**
   * Limpia contadores expirados (limpieza automática)
   */
  cleanup(): void {
    const now = Date.now();
    for (const [key, state] of this.attempts.entries()) {
      if (now > state.resetAt && (!state.blockedUntil || now > state.blockedUntil)) {
        this.attempts.delete(key);
      }
    }
  }
}

export const rateLimiter = new RateLimiter();

// Limpiar cada 5 minutos
if (typeof setInterval !== 'undefined') {
  setInterval(() => rateLimiter.cleanup(), 5 * 60 * 1000);
}

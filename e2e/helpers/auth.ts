/**
 * Shared auth helpers for E2E tests.
 *
 * Estrategia: NO dependemos del backend real. Interceptamos las llamadas
 * API con respuestas mock para simular login/register exitosos, e inyectamos
 * sesiones directamente en localStorage para tests post-autenticación.
 *
 * Esto evita:
 * - Dependencia del backend (caídas, rate limiting, cambios)
 * - Usuarios fantasma en Supabase (sin cleanup endpoint)
 * - 404/409 por URLs incorrectas o emails duplicados
 */

import type { Page } from '@playwright/test';

const MOCK_USER_ID = 'e2e-mock-user-id';
const MOCK_PROFILE_ID = 'e2e-mock-profile-id';
const FAKE_TOKEN = 'e2e-fake-token';
const FAKE_REFRESH = 'e2e-fake-refresh';

export interface TestUser {
  email: string;
  password: string;
  username: string;
  fullName: string;
}

/** Genera un objeto TestUser con datos únicos */
export function generateTestUser(): TestUser {
  const ts = Date.now();
  return {
    email: `e2e-${ts}@closetly.test`,
    password: 'Test1234!',
    username: `e2euser${ts}`,
    fullName: 'E2E Test User',
  };
}

// ─── Mock responses ───────────────────────────────────────────

function mockAuthResponse(user: TestUser) {
  return {
    user: {
      id: MOCK_USER_ID,
      email: user.email,
      role: 'user',
    },
    profile: {
      id: MOCK_PROFILE_ID,
      user_id: MOCK_USER_ID,
      username: user.username,
      full_name: user.fullName,
      bio: null,
      avatar_url: null,
      is_public: false,
    },
    accessToken: FAKE_TOKEN,
    refreshToken: FAKE_REFRESH,
  };
}

/** Intercepta POST /api/auth/register y retorna mock 200 */
export async function mockRegisterApi(page: Page, user: TestUser) {
  await page.route('**/api/auth/register', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(mockAuthResponse(user)),
    });
  });
}

/** Intercepta POST /api/auth/login y retorna mock 200 */
export async function mockLoginApi(page: Page, user: TestUser) {
  await page.route('**/api/auth/login', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(mockAuthResponse(user)),
    });
  });
}

/** Intercepta POST /api/auth/forgot-password y retorna mock 200 */
export async function mockForgotPasswordApi(page: Page) {
  await page.route('**/api/auth/forgot-password', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ message: 'Email sent' }),
    });
  });
}

// ─── Session injection ────────────────────────────────────────

const FAKE_USER_JSON = JSON.stringify({
  id: MOCK_USER_ID,
  email: 'e2e@closetly.test',
  role: 'user',
});

const FAKE_PROFILE_JSON = JSON.stringify({
  id: MOCK_PROFILE_ID,
  user_id: MOCK_USER_ID,
  username: 'e2euser',
  full_name: 'E2E User',
  bio: null,
  avatar_url: null,
  is_public: false,
});

/** Inyecta una sesión falsa en localStorage para simular usuario autenticado.
 *  Debe llamarse ANTES de navegar a la página que requiere sesión.
 *
 *  IMPORTANTE: page.evaluate() corre en contexto del navegador. Las
 *  constantes de Node.js (FAKE_TOKEN, etc.) NO existen ahí. Pasamos
 *  los valores como argumentos explícitos. */
export async function injectSession(page: Page) {
  // Navegar a cualquier página del mismo origen para tener acceso a localStorage
  await page.goto('/');
  await page.evaluate(({ token, refresh, userJson, profileJson }) => {
    localStorage.setItem('auth_access_token', token);
    localStorage.setItem('auth_refresh_token', refresh);
    localStorage.setItem('auth_token_expiry', String(Date.now() + 86_400_000));
    localStorage.setItem('auth_user', userJson);
    localStorage.setItem('auth_profile', profileJson);
  }, {
    token: FAKE_TOKEN,
    refresh: FAKE_REFRESH,
    userJson: FAKE_USER_JSON,
    profileJson: FAKE_PROFILE_JSON,
  });
}

// ─── Mock para Home API (outfits) ─────────────────────────────

const MOCK_OUTFITS_RESPONSE = {
  data: [],
  total: 0,
  hasMore: false,
};

/** Intercepta GET /outfits y retorna lista vacía.
 *  La home screen llama useOutfits(true, 3) al montar, que hace
 *  GET /outfits?user_id=...&limit=3. Si no se mockea, la llamada
 *  va al backend real y puede demorar >10s, causando timeout en
 *  la aserción homeLoaded. */
export async function mockOutfitsApi(page: Page) {
  await page.route('**/outfits*', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(MOCK_OUTFITS_RESPONSE),
    });
  });
}

// ─── Selectors ────────────────────────────────────────────────

/** Botón de logout en el header de home (aria-label en DOM).
 *  La traducción EN es "Log Out" (con espacio), la ES es "Cerrar Sesión".
 *  RNW convierte accessibilityLabel → aria-label en el DOM. */
export function homeLogoutButton(page: Page) {
  return page.locator(
    '[aria-label*="log out" i], [aria-label*="cerrar sesión" i]',
  );
}

/** Indica que la home cargó: título de bienvenida o botón de logout */
export function homeLoaded(page: Page) {
  const title = page.getByText(/bienvenido|welcome back/i);
  return title.or(homeLogoutButton(page)).first();
}

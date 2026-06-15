/**
 * Shared auth helpers for E2E tests.
 *
 * Crea usuarios de prueba via API directa (no por UI) para que los tests
 * de login/logout tengan un usuario existente sin depender del formulario
 * de registro.
 *
 * NOTA: no hay endpoint de cleanup, los usuarios quedan huérfanos en Supabase.
 * Usamos emails únicos con timestamp para minimizar colisiones.
 */

import { request } from '@playwright/test';
import type { Page } from '@playwright/test';

/**
 * Normaliza la URL de la API igual que constants.ts.
 * Si EXPO_PUBLIC_API_URL = 'https://closetly-be.vercel.app' → le agrega /api
 * Si EXPO_PUBLIC_API_URL = 'https://closetly-be.vercel.app/api' → lo deja igual
 */
function resolveApiBase(): string {
  const raw =
    process.env.EXPO_PUBLIC_API_URL ||
    process.env.NEXT_PUBLIC_API_URL ||
    process.env.VITE_API_URL ||
    'https://closetly-be.vercel.app';
  const normalized = raw.replace(/\/+$/, '');
  return /\/api$/i.test(normalized) ? normalized : `${normalized}/api`;
}

const API_BASE = resolveApiBase();

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

/**
 * Crea un usuario en el backend llamando directamente a la API de registro.
 * Retorna el TestUser si tuvo éxito, o lanza un error.
 */
export async function createTestUserViaAPI(
  user: TestUser,
): Promise<TestUser> {
  const api = await request.newContext();

  const res = await api.post(`${API_BASE}/auth/register`, {
    data: {
      email: user.email,
      password: user.password,
      username: user.username,
      fullName: user.fullName,
    },
  });

  await api.dispose();

  if (!res.ok()) {
    const body = await res.text().catch(() => '(no body)');
    throw new Error(
      `createTestUserViaAPI failed (${res.status()}) to ${API_BASE}/auth/register: ${body}`,
    );
  }

  return user;
}

/**
 * Registra un usuario y navega la page al home autenticado.
 * Usa la UI (formulario de registro) para que el flujo sea real.
 *
 * Retorna el TestUser creado.
 */
export async function registerAndLogin(
  page: Page,
  user?: TestUser,
): Promise<TestUser> {
  const u = user ?? generateTestUser();

  await page.goto('/(auth)/register');
  await page.waitForLoadState('networkidle');

  // Llenar formulario
  await page.getByPlaceholder(/@/).fill(u.email);
  await page.getByPlaceholder(/username|usuario/i).fill(u.username);

  const fullNameInput = page.locator(
    'input[placeholder="John Doe"], ' +
    'input[placeholder="Juan Pérez"], ' +
    'input[placeholder="Tu nombre"]',
  );
  await fullNameInput.fill(u.fullName);

  // Primer campo password
  const passwordInput = page.locator('input[type="password"]');
  await passwordInput.fill(u.password);

  // Esperar que aparezca confirm password (se activa al cumplir criterios)
  await page.waitForTimeout(2000);

  // Llenar confirm password
  const allPasswordInputs = page.locator('input[type="password"]');
  const count = await allPasswordInputs.count();
  if (count >= 2) {
    await allPasswordInputs.nth(1).fill(u.password);
  }

  // Click en "Crear cuenta" / "Create account"
  await page.getByText(/crear cuenta|create account/i).last().click();

  // En web, el registro exitoso dispara window.location.href = '/' en _layout.tsx
  // que recarga la página. Después del reload index.tsx redirige a (tabs)/home.
  // Esperar la URL final de home (full reload + client-side redirect).
  await page.waitForURL('/(tabs)/home', { timeout: 15000 });

  return u;
}

/**
 * Loguea un usuario existente via UI.
 * Navega a login, completa el formulario, espera la redirección a home.
 */
export async function loginAsUser(
  page: Page,
  email: string,
  password: string,
): Promise<void> {
  await page.goto('/(auth)/login');
  await page.waitForLoadState('networkidle');

  await page.getByPlaceholder(/@/).fill(email);
  await page.locator('input[type="password"]').fill(password);
  await page.getByText(/iniciar sesión|sign in/i).last().click();

  // Login exitoso → window.location.href recarga la página → home se renderiza
  await page.waitForURL('/(tabs)/home', { timeout: 15000 });
}

/**
 * Selector para el botón de logout en el header de home.
 * RNW renderiza accessibilityLabel como aria-label en el DOM.
 */
export function homeLogoutButton(page: Page) {
  return page.locator('[aria-label*="logout" i], [aria-label*="cerrar" i]');
}

/**
 * Selector para detectar que la home cargó: busca el título de bienvenida
 * o el botón de logout (que solo existe cuando hay sesión).
 */
export function homeLoaded(page: Page) {
  const title = page.getByText(/bienvenido|welcome back/i);
  return title.or(homeLogoutButton(page)).first();
}

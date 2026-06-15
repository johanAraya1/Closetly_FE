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
import type { APIRequestContext, Page } from '@playwright/test';

const API_BASE = process.env.EXPO_PUBLIC_API_URL || 'https://closetly-be.vercel.app/api';

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
      `createTestUserViaAPI failed (${res.status()}): ${body}`,
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
  const emailInput = page.getByPlaceholder(/@/);
  await emailInput.fill(u.email);

  const usernameInput = page.getByPlaceholder(/username|usuario/i);
  await usernameInput.fill(u.username);

  // Full name: probar varios placeholders
  const fullNameInput = page.locator(
    'input[placeholder="John Doe"], ' +
    'input[placeholder="Juan Pérez"], ' +
    'input[placeholder="Tu nombre"]',
  );
  await fullNameInput.fill(u.fullName);

  // Password: el campo type="password"
  const passwordInput = page.locator('input[type="password"]');
  await passwordInput.fill(u.password);

  // Esperar que aparezca el segundo campo de password (confirm)
  await page.waitForTimeout(2000);

  // Escribir confirm password en el último input[type="password"]
  const allPasswordInputs = page.locator('input[type="password"]');
  const count = await allPasswordInputs.count();
  if (count >= 2) {
    await allPasswordInputs.nth(1).fill(u.password);
  }

  // Click en "Crear cuenta" / "Create account"
  const submitBtn = page.getByText(/crear cuenta|create account/i).last();
  await submitBtn.click();

  // En web, el registro exitoso dispara window.location.href = '/' en _layout.tsx
  // que recarga la página. Playwright espera la nueva navegación automáticamente.
  // Después del reload, index.tsx redirige a (tabs)/home.
  // Esperamos a que aparezca el header del home o el botón de logout.
  await page.waitForLoadState('networkidle');

  return u;
}

/**
 * Loguea un usuario existente via UI.
 * Asume que la page ya está en /(auth)/login.
 */
export async function loginAsUser(
  page: Page,
  email: string,
  password: string,
): Promise<void> {
  await page.goto('/(auth)/login');
  await page.waitForLoadState('networkidle');

  const emailInput = page.getByPlaceholder(/@/);
  await emailInput.fill(email);

  const passwordInput = page.locator('input[type="password"]');
  await passwordInput.fill(password);

  const submitBtn = page.getByText(/iniciar sesión|sign in/i).last();
  await submitBtn.click();

  // Esperar a que el login procese (window.location.href reload)
  // Después del reload, la app carga la sesión desde localStorage y renderiza home
  await page.waitForLoadState('networkidle');
}

/**
 * E2E tests for logout flow.
 *
 * Cobertura:
 * - Logout desde el icono en home → redirige a onboarding
 * - Logout desde profile → redirige a onboarding
 *
 * Setup: inyectamos una sesión falsa en localStorage para evitar
 * depender del backend o del flujo de registro.
 */

import { test, expect } from '@playwright/test';
import { injectSession, homeLogoutButton } from './helpers/auth';

test.describe('Cerrar sesión', () => {
  test('logout desde home redirige a onboarding', async ({ page }) => {
    // Inyectar sesión falsa y navegar a home
    await injectSession(page);
    await page.goto('/(tabs)/home');
    await page.waitForLoadState('networkidle');

    // El logout button es un icono con aria-label
    const logoutButton = homeLogoutButton(page);
    await expect(logoutButton).toBeVisible({ timeout: 10000 });
    await logoutButton.click();

    // Logout → renderizado condicional cambia a auth → index redirige a onboarding
    await page.waitForURL('/onboarding', { timeout: 10000 });

    await expect(
      page.getByText(/comenzar|get started|empecemos|let.s start/i),
    ).toBeVisible({ timeout: 10000 });
  });

  test('logout desde profile redirige a onboarding', async ({ page }) => {
    // Inyectar sesión falsa y navegar a home
    await injectSession(page);
    await page.goto('/(tabs)/home');
    await page.waitForLoadState('networkidle');

    // Navegar a profile
    await page.goto('/(tabs)/profile');
    await page.waitForLoadState('networkidle');

    // Botón de logout con texto "Cerrar Sesión" / "Log Out" / "Sign Out"
    const logoutButton = page.getByText(/cerrar sesión|log ?out|sign out/i);
    await expect(logoutButton).toBeVisible({ timeout: 5000 });
    await logoutButton.click();

    // Logout → renderizado condicional cambia a auth → index redirige a onboarding
    await page.waitForURL('/onboarding', { timeout: 10000 });

    await expect(
      page.getByText(/comenzar|get started|empecemos|let.s start/i),
    ).toBeVisible({ timeout: 10000 });
  });
});

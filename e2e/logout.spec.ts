/**
 * E2E tests for logout flow.
 *
 * Cobertura:
 * - Logout desde el icono en home → redirige a onboarding
 * - Logout desde profile → redirige a onboarding
 *
 * Setup: registramos un usuario real via UI para tener sesión activa.
 */

import { test, expect } from '@playwright/test';
import { registerAndLogin, homeLogoutButton } from './helpers/auth';

test.describe('Cerrar sesión', () => {
  test('logout desde home redirige a onboarding', async ({ page }) => {
    // Registrar usuario y navegar a home
    await registerAndLogin(page);

    // El logout button en home es un icono con accessibilityLabel → aria-label en DOM
    const logoutButton = homeLogoutButton(page);
    await expect(logoutButton).toBeVisible({ timeout: 10000 });
    await logoutButton.click();

    // Después del logout, el renderizado condicional cambia a auth stack
    // y index.tsx redirige a onboarding.
    await page.waitForURL('/onboarding', { timeout: 10000 });

    // Verificar que el onboarding se renderizó
    await expect(
      page.getByText(/comenzar|get started|empecemos|let.s start/i),
    ).toBeVisible({ timeout: 10000 });
  });

  test('logout desde profile redirige a onboarding', async ({ page }) => {
    // Registrar usuario y navegar a home
    await registerAndLogin(page);

    // Navegar a profile
    await page.goto('/(tabs)/profile');
    await page.waitForLoadState('networkidle');

    // Buscar el botón de logout en profile — <TouchableOpacity>
    // con <Text>Cerrar Sesión</Text> y un icono rojo
    const logoutButton = page.getByText(/cerrar sesión|log ?out|sign out/i);
    await expect(logoutButton).toBeVisible({ timeout: 5000 });
    await logoutButton.click();

    // Después del logout
    await page.waitForURL('/onboarding', { timeout: 10000 });

    await expect(
      page.getByText(/comenzar|get started|empecemos|let.s start/i),
    ).toBeVisible({ timeout: 10000 });
  });
});

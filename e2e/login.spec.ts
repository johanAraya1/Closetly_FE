/**
 * E2E tests for login flow.
 *
 * Cobertura:
 * - Login exitoso redirige a home
 * - Email inválido muestra error de validación client-side
 * - Credenciales incorrectas muestra modal de error
 * - Campos vacíos muestra errores de validación
 * - Link "Olvidé mi contraseña" navega a forgot-password
 *
 * NOTA: el login exitoso usa API mockeada. Los tests de validación
 *       no requieren API (son client-side).
 */

import { test, expect } from '@playwright/test';
import { generateTestUser, mockLoginApi, mockOutfitsApi, homeLoaded } from './helpers/auth';

test.describe('Inicio de sesión', () => {
  const testUser = generateTestUser();

  test.beforeEach(async ({ page }) => {
    await page.goto('/(auth)/login');
    await page.waitForLoadState('networkidle');
    await expect(
      page.getByText(/iniciar sesión|sign in|welcome back|bienvenido/i).first(),
    ).toBeVisible({ timeout: 10000 });
  });

  test('login exitoso redirige a home', async ({ page }) => {
    // Mockear APIs
    await mockLoginApi(page, testUser);
    await mockOutfitsApi(page.context());

    await page.getByPlaceholder(/@/).fill(testUser.email);
    await page.locator('input[type="password"]').fill(testUser.password);
    await page.getByText(/iniciar sesión|sign in/i).last().click();

    // Login exitoso → window.location.href recarga la página
    // La URL real en el browser es /home (Expo Router saca los route groups)
    await page.waitForURL('/home', { timeout: 15000 });

    await expect(homeLoaded(page)).toBeVisible({ timeout: 10000 });
  });

  test('email inválido muestra error de validación', async ({ page }) => {
    await page.getByPlaceholder(/@/).fill('no-es-un-email');
    await page.locator('input[type="password"]').fill(testUser.password);
    await page.getByText(/iniciar sesión|sign in/i).last().click();

    const errorMsg = page.getByText(
      /Please enter a valid email address/i,
    ).first();
    await expect(errorMsg).toBeVisible({ timeout: 5000 });
  });

  test('credenciales incorrectas muestra modal de error', async ({ page }) => {
    // Mockear API de login para que DEVUELVA error 401
    await page.route('**/api/auth/login', async (route) => {
      await route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({
          error: 'Invalid email or password',
          message: 'Invalid email or password',
        }),
      });
    });

    await page.getByPlaceholder(/@/).fill(testUser.email);
    await page.locator('input[type="password"]').fill('WrongPass1!');
    await page.getByText(/iniciar sesión|sign in/i).last().click();

    // El modal de error debería mostrarse
    const errorModal = page.getByText(
      /incorrectos|inválidas|invalid|incorrect/i,
    );
    await expect(errorModal).toBeVisible({ timeout: 10000 });
  });

  test('campos vacíos muestra errores de validación', async ({ page }) => {
    await page.getByText(/iniciar sesión|sign in/i).last().click();

    const emailError = page.getByText(
      /email.*required|required.*email|campo.*requerido|requerido.*campo/i,
    );
    const passwordError = page.getByText(
      /password.*required|required.*password|contraseña.*requerido/i,
    );

    await expect(
      emailError.or(passwordError).first(),
    ).toBeVisible({ timeout: 5000 });
  });

  test('link "Olvidé mi contraseña" navega a forgot-password', async ({ page }) => {
    // RNW renderiza Text como display:inline, Playwright lo ve oculto.
    // El click hace bubble al TouchableOpacity padre, usamos force.
    const forgotLink = page.getByText(/olvidé|olvidaste|forgot/i);
    await forgotLink.click({ force: true });

    // Verificamos navegación por URL (Expo Router saca route groups)
    await page.waitForURL('/forgot-password', { timeout: 10000 });
  });
});

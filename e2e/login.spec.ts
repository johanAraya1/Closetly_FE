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
 * Para tener un usuario existente sin depender de seed data,
 * creamos uno via API directa en beforeAll.
 */

import { test, expect } from '@playwright/test';
import { generateTestUser, createTestUserViaAPI, homeLoaded } from './helpers/auth';
import type { TestUser } from './helpers/auth';

test.describe('Inicio de sesión', () => {
  let testUser: TestUser;

  test.beforeAll(async () => {
    testUser = generateTestUser();
    await createTestUserViaAPI(testUser);
  });

  test.beforeEach(async ({ page }) => {
    await page.goto('/(auth)/login');
    await page.waitForLoadState('networkidle');
    await expect(
      page.getByText(/iniciar sesión|sign in|welcome back|bienvenido/i).first(),
    ).toBeVisible({ timeout: 10000 });
  });

  test('login exitoso redirige a home', async ({ page }) => {
    await page.getByPlaceholder(/@/).fill(testUser.email);
    await page.locator('input[type="password"]').fill(testUser.password);
    await page.getByText(/iniciar sesión|sign in/i).last().click();

    // Login exitoso → window.location.href recarga la página
    await page.waitForURL('/(tabs)/home', { timeout: 15000 });

    // Verificar que la home tiene elementos de sesión
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
    await page.getByPlaceholder(/@/).fill(testUser.email);
    await page.locator('input[type="password"]').fill('WrongPass1!');
    await page.getByText(/iniciar sesión|sign in/i).last().click();

    // El backend responde con error → se muestra el modal de error
    const errorModal = page.getByText(
      /incorrectos|inválidas|invalid|incorrect/i,
    );

    await expect(errorModal).toBeVisible({ timeout: 15000 });
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
    const forgotLink = page.getByText(/olvidé|olvidaste|forgot/i);
    await expect(forgotLink).toBeVisible({ timeout: 5000 });
    await forgotLink.click();

    await expect(
      page.getByText(/olvidaste|forgot|restablecer|reset/i).first(),
    ).toBeVisible({ timeout: 10000 });
  });
});

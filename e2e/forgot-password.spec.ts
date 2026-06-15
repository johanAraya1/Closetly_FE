/**
 * E2E tests for forgot-password flow.
 *
 * Cobertura (UI únicamente — el flujo completo requiere leer el email):
 * - Formulario renderiza campo de email
 * - Email inválido muestra error de validación
 * - Email válido (usuario existente) muestra mensaje de éxito
 * - Link "Volver a iniciar sesión" funciona
 *
 * NOTA: el reset-password requiere access_token del hash de URL (Supabase magic link),
 * no podemos testearlo end-to-end sin acceso al email del usuario.
 *
 * Para asegurar que el email existe, creamos un usuario via API en beforeAll.
 */

import { test, expect } from '@playwright/test';
import { generateTestUser, createTestUserViaAPI } from './helpers/auth';
import type { TestUser } from './helpers/auth';

test.describe('Olvidé mi contraseña', () => {
  let testUser: TestUser;

  test.beforeAll(async () => {
    testUser = generateTestUser();
    await createTestUserViaAPI(testUser);
  });

  test.beforeEach(async ({ page }) => {
    await page.goto('/(auth)/forgot-password');
    await page.waitForLoadState('networkidle');
    await expect(
      page.getByText(/olvidaste|forgot|restablecer|reset/i).first(),
    ).toBeVisible({ timeout: 10000 });
  });

  test('el formulario tiene campo de email y botón de envío', async ({ page }) => {
    const emailInput = page.getByPlaceholder(/@/);
    await expect(emailInput).toBeVisible({ timeout: 5000 });

    const submitBtn = page.getByText(
      /enviar|send|restablecer|reset/i,
    );
    await expect(submitBtn).toBeVisible();
  });

  test('email inválido muestra error', async ({ page }) => {
    await page.getByPlaceholder(/@/).fill('no-es-un-email');
    await page.getByText(/enviar|send|restablecer|reset/i).last().click();

    // El error se muestra via Alert.alert
    const errorMsg = page.getByText(
      /Please enter a valid email address/i,
    ).first();
    await expect(errorMsg).toBeVisible({ timeout: 5000 });
  });

  test('email de usuario existente muestra mensaje de éxito', async ({ page }) => {
    await page.getByPlaceholder(/@/).fill(testUser.email);
    await page.getByText(/enviar|send|restablecer|reset/i).last().click();

    // Si el usuario existe, el BE envía el email y responde 200.
    // El frontend cambia a la vista de éxito con "Revisá tu email" / "Check your email"
    await expect(
      page.getByText(/revisa|revisá|check|enviamos|sent|link/i),
    ).toBeVisible({ timeout: 15000 });
  });

  test('link "Volver a iniciar sesión" navega a login', async ({ page }) => {
    // El link está en el footer del formulario (antes de enviar)
    const backToLogin = page.getByText(
      /volver|back to login|iniciar sesión|sign in/i,
    );
    await expect(backToLogin).toBeVisible();
    await backToLogin.click();

    await expect(
      page.getByText(/iniciar sesión|sign in|welcome back|bienvenido/i).first(),
    ).toBeVisible({ timeout: 10000 });
  });
});

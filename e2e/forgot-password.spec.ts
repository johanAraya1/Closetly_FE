/**
 * E2E tests for forgot-password flow.
 *
 * Cobertura:
 * - Formulario renderiza campo de email
 * - Email inválido muestra error de validación
 * - Email válido muestra mensaje de éxito (API mockeada)
 * - Link "Volver a iniciar sesión" funciona
 *
 * NOTA: el reset-password requiere access_token del hash de URL (Supabase magic link),
 * no podemos testearlo end-to-end.
 */

import { test, expect } from '@playwright/test';
import { mockForgotPasswordApi } from './helpers/auth';

test.describe('Olvidé mi contraseña', () => {
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

    const submitBtn = page.getByText(/enviar|send|restablecer|reset/i);
    await expect(submitBtn).toBeVisible();
  });

  test('email inválido muestra error', async ({ page }) => {
    await page.getByPlaceholder(/@/).fill('no-es-un-email');
    await page.getByText(/enviar|send|restablecer|reset/i).last().click();

    const errorMsg = page.getByText(
      /Please enter a valid email address/i,
    ).first();
    await expect(errorMsg).toBeVisible({ timeout: 5000 });
  });

  test('email válido muestra mensaje de éxito', async ({ page }) => {
    // Mockear la API de forgot-password
    await mockForgotPasswordApi(page);

    await page.getByPlaceholder(/@/).fill('test@example.com');
    await page.getByText(/enviar|send|restablecer|reset/i).last().click();

    // La API mockeada responde → se muestra pantalla de éxito
    await expect(
      page.getByText(/revisa|revisá|check|enviamos|sent|link/i),
    ).toBeVisible({ timeout: 10000 });
  });

  test('link "Volver a iniciar sesión" navega a login', async ({ page }) => {
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

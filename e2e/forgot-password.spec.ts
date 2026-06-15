/**
 * E2E tests for forgot-password flow.
 *
 * Cobertura:
 * - Formulario renderiza campo de email
 * - Email inválido no envía el formulario (Alert.alert es no-op en RNW web)
 * - Email válido muestra mensaje de éxito (API mockeada)
 * - Link "Volver a iniciar sesión" funciona
 *
 * NOTA: el reset-password requiere access_token del hash de URL (Supabase magic link),
 * no podemos testearlo end-to-end.
 *
 * NOTA sobre Alert.alert en RNW v0.19: React Native Web implementa
 * Alert.alert() como una función vacía (no-op). No llama a window.alert()
 * ni renderiza nada en el DOM. NO podemos testear mensajes de error
 * que dependan de Alert — verificamos que no haya navegación.
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

    // Usamos regex que NO matchee el subtitle "send you a link to reset"
    const submitBtn = page.getByText(/send reset|enviar link/i);
    await expect(submitBtn).toBeVisible();
  });

  test('email inválido no envía el formulario', async ({ page }) => {
    await page.getByPlaceholder(/@/).fill('no-es-un-email');

    // Alert.alert es no-op en RNW v0.19 — no hay feedback visual.
    // Verificamos que la página NO navega (el formulario no se envía).
    // 1. Click en submit
    await page.getByText(/send reset|enviar link/i).click();

    // 2. La página sigue siendo forgot-password (no redirige a éxito)
    await expect(page).toHaveURL(/\/(auth\/)?forgot-password/);

    // 3. El input de email sigue visible (misma pantalla)
    await expect(page.getByPlaceholder(/@/)).toBeVisible();
  });

  test('email válido muestra mensaje de éxito', async ({ page }) => {
    // Mockear la API de forgot-password
    await mockForgotPasswordApi(page);

    await page.getByPlaceholder(/@/).fill('test@example.com');
    await page.getByText(/send reset|enviar link/i).click();

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

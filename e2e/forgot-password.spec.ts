/**
 * E2E tests for forgot-password flow.
 *
 * Cobertura:
 * - Formulario renderiza campo de email
 * - Email inválido muestra error de validación (Alert.alert en web)
 * - Email válido muestra mensaje de éxito (API mockeada)
 * - Link "Volver a iniciar sesión" funciona
 *
 * NOTA: el reset-password requiere access_token del hash de URL (Supabase magic link),
 * no podemos testearlo end-to-end.
 *
 * NOTA sobre Alert.alert en RNW web: React Native Web convierte Alert.alert()
 * en window.alert() del browser nativo. El texto del diálogo NO está en el DOM,
 * lo interceptamos con page.waitForEvent('dialog').
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

  test('email inválido muestra error', async ({ page }) => {
    await page.getByPlaceholder(/@/).fill('no-es-un-email');

    // Alert.alert en RNW web → window.alert(). Interceptamos el dialog.
    const [dialog] = await Promise.all([
      page.waitForEvent('dialog', { timeout: 5000 }),
      page.getByText(/send reset|enviar link/i).click(),
    ]);

    expect(dialog.message()).toMatch(/Please enter a valid email address/i);
    await dialog.accept();
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

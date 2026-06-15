/**
 * E2E tests for user registration flow.
 *
 * Cobertura:
 * - Formulario renderiza los campos esperados ✓
 * - Email inválido muestra error de validación ✓
 * - Registro exitoso redirige a home (nuevo)
 * - Email ya registrado muestra error (nuevo)
 */

import { test, expect } from '@playwright/test';
import { generateTestUser, createTestUserViaAPI } from './helpers/auth';

test.describe('Registro de usuario', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/(auth)/register');
    await page.waitForLoadState('networkidle');
    await expect(
      page.getByText(/crear cuenta|create account/i).first(),
    ).toBeVisible({ timeout: 10000 });
  });

  test('el formulario tiene los campos esperados', async ({ page }) => {
    const emailInput = page.getByPlaceholder(/@/);
    await expect(emailInput).toBeVisible({ timeout: 5000 });
    await emailInput.fill(generateTestUser().email);

    const usernameInput = page.getByPlaceholder(/username|usuario/i);
    await expect(usernameInput).toBeVisible();
    await usernameInput.fill(generateTestUser().username);

    const fullNameInput = page.locator(
      'input[placeholder="John Doe"], ' +
      'input[placeholder="Juan Pérez"], ' +
      'input[placeholder="Tu nombre"]',
    );
    await expect(fullNameInput).toBeVisible();
    await fullNameInput.fill(generateTestUser().fullName);

    const passwordInput = page.locator('input[type="password"]');
    await expect(passwordInput).toBeVisible();
    await passwordInput.fill(generateTestUser().password);

    // Esperar que aparezca confirmar password
    await page.waitForTimeout(2000);
    const passwordCount = await page.locator('input[type="password"]').count();
    expect(passwordCount).toBeGreaterThanOrEqual(2);

    const submitBtn = page.getByText(/crear cuenta|create account/i).last();
    await expect(submitBtn).toBeVisible();
  });

  test('falla con email inválido', async ({ page }) => {
    await page.getByPlaceholder(/@/).fill('email-invalido');
    await page.getByPlaceholder(/username|usuario/i).fill('testuser');
    await page.locator('input[type="password"]').fill('Test1234!');
    await page.getByText(/crear cuenta|create account/i).last().click();

    const errorMsg = page.getByText(
      /Please enter a valid email address/i,
    ).first();
    await expect(errorMsg).toBeVisible({ timeout: 5000 });
  });

  test('registro exitoso redirige a home', async ({ page }) => {
    const user = generateTestUser();

    // Llenar formulario completo
    await page.getByPlaceholder(/@/).fill(user.email);
    await page.getByPlaceholder(/username|usuario/i).fill(user.username);

    const fullNameInput = page.locator(
      'input[placeholder="John Doe"], ' +
      'input[placeholder="Juan Pérez"], ' +
      'input[placeholder="Tu nombre"]',
    );
    await fullNameInput.fill(user.fullName);

    const passwordInput = page.locator('input[type="password"]');
    await passwordInput.fill(user.password);

    // Esperar confirm password
    await page.waitForTimeout(2000);
    const allPasswordInputs = page.locator('input[type="password"]');
    const count = await allPasswordInputs.count();
    if (count >= 2) {
      await allPasswordInputs.nth(1).fill(user.password);
    }

    // Click submit
    await page.getByText(/crear cuenta|create account/i).last().click();

    // En web, window.location.href recarga la página.
    // Después del reload, la app init → lee token de localStorage → redirige a home.
    // Esperar a que la home se renderice (header con "Bienvenido" / "Welcome" o icono de logout).
    await page.waitForLoadState('networkidle');

    // Verificar que estamos autenticados: el logout icon debería existir
    const logoutIcon = page.locator('[accessibilityLabel*="logout" i], [accessibilityLabel*="cerrar" i]');
    const homeTitle = page.getByText(/bienvenido|welcome back/i);

    // Esperar hasta 15s que la home cargue (puede tardar por el full reload)
    await expect(
      logoutIcon.or(homeTitle).first(),
    ).toBeVisible({ timeout: 15000 });
  });

  test('registro con email duplicado muestra error', async ({ page }) => {
    // Primero crear un usuario via API directa
    const user = generateTestUser();
    await createTestUserViaAPI(user);

    // Intentar registrar el mismo email por UI
    await page.getByPlaceholder(/@/).fill(user.email);
    await page.getByPlaceholder(/username|usuario/i).fill('otro-user');
    await page.locator('input[type="password"]').fill('OtherPass1!');

    // Esperar confirm password
    await page.waitForTimeout(2000);
    const allPasswordInputs = page.locator('input[type="password"]');
    const count = await allPasswordInputs.count();
    if (count >= 2) {
      await allPasswordInputs.nth(1).fill('OtherPass1!');
    }

    await page.getByText(/crear cuenta|create account/i).last().click();

    // Esperar que aparezca el modal de error
    const errorModal = page.getByText(
      /already registered|ya registrado|ya existe|duplicado/i,
    );
    await expect(errorModal).toBeVisible({ timeout: 15000 });
  });
});

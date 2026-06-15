/**
 * E2E tests for user registration flow.
 *
 * Cobertura:
 * - Formulario renderiza los campos esperados ✓
 * - Email inválido muestra error de validación ✓
 * - Registro exitoso redirige a home (API mockeada)
 * - Contraseña no cumple criterios → no muestra confirm password (nuevo)
 *
 * NOTA: no testeamos "email duplicado" porque eso requiere el backend real.
 */

import { test, expect } from '@playwright/test';
import { generateTestUser, mockRegisterApi, homeLoaded } from './helpers/auth';

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

    // Esperar que aparezca confirmar password (se activa al cumplir criterios)
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

    // Mockear la API de registro
    await mockRegisterApi(page, user);

    // Llenar formulario
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

    await page.waitForTimeout(2000);
    const allPasswordInputs = page.locator('input[type="password"]');
    const count = await allPasswordInputs.count();
    if (count >= 2) {
      await allPasswordInputs.nth(1).fill(user.password);
    }

    // Click submit
    await page.getByText(/crear cuenta|create account/i).last().click();

    // La API mockeada responde → app guarda token → window.location.href recarga
    // → app lee token de localStorage → redirige a (tabs)/home
    // La URL real en el browser es /home (Expo Router saca los route groups)
    await page.waitForURL('/home', { timeout: 15000 });

    // Verificar que la home renderizó elementos de sesión
    await expect(homeLoaded(page)).toBeVisible({ timeout: 10000 });
  });

  test('contraseña débil no muestra confirm password', async ({ page }) => {
    // Escribir una contraseña que no cumple criterios
    await page.locator('input[type="password"]').fill('123');

    // Esperar un momento a que React procese
    await page.waitForTimeout(1000);

    // No debería aparecer el segundo campo de password
    const passwordCount = await page.locator('input[type="password"]').count();
    expect(passwordCount).toBe(1);
  });
});

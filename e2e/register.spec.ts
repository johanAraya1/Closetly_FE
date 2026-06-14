import { test, expect } from '@playwright/test';

const TEST_USER = {
  email: `test-${Date.now()}@closetly.test`,
  username: `testuser${Date.now()}`,
  fullName: 'Test User',
  password: 'Test1234!',
};

test.describe('Registro de usuario', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/(auth)/register');
    await page.waitForLoadState('networkidle');
    await expect(page.getByText(/crear cuenta|create account/i).first()).toBeVisible({ timeout: 10000 });
  });

  test('el formulario tiene los campos esperados', async ({ page }) => {
    // Verificar que los inputs existen por sus placeholders
    // Email: "your@email.com" (en) / "tu@email.com" (es)
    const emailInput = page.getByPlaceholder(/@/);
    await expect(emailInput).toBeVisible({ timeout: 5000 });
    await emailInput.fill(TEST_USER.email);

    // Username: "username" (en) / "usuario" (es)
    const usernameInput = page.getByPlaceholder(/username|usuario/i);
    await expect(usernameInput).toBeVisible();
    await usernameInput.fill(TEST_USER.username);

    // Full name: "John Doe" (en), "Juan Pérez" (es), "Tu nombre"
    const fullNameInput = page.locator(
      'input[placeholder="John Doe"], ' +
      'input[placeholder="Juan Pérez"], ' +
      'input[placeholder="Tu nombre"]'
    );
    await expect(fullNameInput).toBeVisible();
    await fullNameInput.fill(TEST_USER.fullName);

    // Password: secureTextEntry => input[type="password"]
    const passwordInput = page.locator('input[type="password"]');
    await expect(passwordInput).toBeVisible();
    await passwordInput.fill(TEST_USER.password);

    // Esperar que aparezca confirmar password (se activa al cumplir criterios)
    await page.waitForTimeout(2000);
    const passwordCount = await page.locator('input[type="password"]').count();
    expect(passwordCount).toBeGreaterThanOrEqual(2);

    // Botón de submit existe
    const submitBtn = page.getByText(/crear cuenta|create account/i).last();
    await expect(submitBtn).toBeVisible();
  });

  test('falla con email inválido', async ({ page }) => {
    await page.getByPlaceholder(/@/).fill('email-invalido');
    await page.getByPlaceholder(/username|usuario/i).fill(TEST_USER.username);
    await page.locator('input[type="password"]').fill('Test1234!');
    await page.getByText(/crear cuenta|create account/i).last().click();

    // Mensaje de validación (hardcodeado en validation.ts)
    const errorMsg = page.getByText(/Please enter a valid email address/i).first();
    await expect(errorMsg).toBeVisible({ timeout: 5000 });
  });
});

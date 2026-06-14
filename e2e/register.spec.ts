import { test, expect } from '@playwright/test';
import { deleteTestUser } from './helpers/cleanup';

const TEST_USER = {
  email: `test-${Date.now()}@closetly.test`,
  username: `testuser${Date.now()}`,
  fullName: 'Test User',
  password: 'Test1234!',
};

test.describe('Registro de usuario', () => {
  test.beforeAll(async () => {
    // Limpiar el usuario antes de crear uno nuevo
    await deleteTestUser(TEST_USER.email);
  });

  test.afterAll(async () => {
    // Limpiar después del test
    await deleteTestUser(TEST_USER.email);
  });

  test.beforeEach(async ({ page }) => {
    await page.goto('/(auth)/register');
    await page.waitForLoadState('networkidle');
    await expect(page.getByText(/crear cuenta|create account/i).first()).toBeVisible({ timeout: 10000 });
  });

  test('registro exitoso con datos válidos', async ({ page }) => {
    const emailInput = page.locator('input[placeholder*="email"]');
    const usernameInput = page.locator('input[placeholder*="username" i], input[placeholder*="usuario" i]');
    const fullNameInput = page.locator('input[placeholder*="nombre" i], input[placeholder*="full name" i]');
    const passwordInput = page.locator('input[placeholder*="contraseña" i], input[placeholder*="password" i]');

    await emailInput.fill(TEST_USER.email);
    await usernameInput.fill(TEST_USER.username);
    await fullNameInput.fill(TEST_USER.fullName);
    await passwordInput.fill(TEST_USER.password);

    // Esperar que aparezca confirmar contraseña
    await page.waitForTimeout(1000);
    const confirmInput = page.locator('input[placeholder*="contraseña" i], input[placeholder*="password" i]').last();
    
    if (await confirmInput.isVisible().catch(() => false)) {
      const firstValue = await passwordInput.inputValue();
      const lastValue = await confirmInput.inputValue().catch(() => '');
      if (lastValue !== firstValue) {
        await confirmInput.fill(TEST_USER.password);
      }
    }

    // Click en "Crear cuenta"
    const submitButton = page.getByText(/crear cuenta|create account/i).last();
    await submitButton.click();

    // Esperar respuesta
    await page.waitForTimeout(5000);

    // Verificar: modal de éxito o redirección a home
    const successModal = page.getByText(/cuenta creada|registro exitoso/i).first();
    const successVisible = await successModal.isVisible().catch(() => false);
    
    if (successVisible) {
      const okBtn = page.getByText(/entendido|got it|ok/i);
      if (await okBtn.isVisible().catch(() => false)) {
        await okBtn.click();
      }
      return;
    }

    // Si llegó a home, está autenticado
    const currentUrl = page.url();
    if (currentUrl.includes('tabs') || currentUrl.includes('home')) {
      return;
    }

    // Error inesperado
    await page.screenshot({ path: 'test-results/register-failed.png' });
    expect(successVisible).toBeTruthy();
  });

  test('falla con email inválido', async ({ page }) => {
    await page.locator('input[placeholder*="email"]').fill('email-invalido');
    await page.locator('input[placeholder*="username" i], input[placeholder*="usuario" i]').fill(TEST_USER.username);
    await page.locator('input[placeholder*="contraseña" i], input[placeholder*="password" i]').fill('Test1234!');

    await page.getByText(/crear cuenta|create account/i).last().click();

    const errorText = page.getByText(/email inválido|email no válido|invalid email/i).first();
    await expect(errorText).toBeVisible({ timeout: 5000 });
  });
});

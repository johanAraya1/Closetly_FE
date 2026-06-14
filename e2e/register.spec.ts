import { test, expect } from '@playwright/test';
import { deleteTestUser } from './helpers/cleanup';

const TEST_USER = {
  email: `test-${Date.now()}@closetly.test`,
  username: `testuser${Date.now()}`,
  fullName: 'Test User',
  password: 'Test1234!',
};

/**
 * Los placeholders del formulario varían por idioma y usan el componente
 * <Input> de React Native Web. Password usa secureTextEntry que en web
 * se renderiza como input[type="password"].
 */
test.describe('Registro de usuario', () => {
  test.beforeAll(async () => {
    await deleteTestUser(TEST_USER.email);
  });

  test.afterAll(async () => {
    await deleteTestUser(TEST_USER.email);
  });

  test.beforeEach(async ({ page }) => {
    await page.goto('/(auth)/register');
    await page.waitForLoadState('networkidle');
    await expect(page.getByText(/crear cuenta|create account/i).first()).toBeVisible({ timeout: 10000 });
  });

  test('registro exitoso con datos válidos', async ({ page }) => {
    // Email — placeholder contiene "@" en todos los idiomas
    await page.getByPlaceholder(/@/).fill(TEST_USER.email);

    // Username — placeholder exacto: "username" (en) o "usuario" (es)
    await page.getByPlaceholder(/username|usuario/i).fill(TEST_USER.username);

    // Full name — placeholder varía: "John Doe", "Juan Pérez", "Tu nombre"
    const fullNameInput = page.locator(
      'input[placeholder="John Doe"], ' +
      'input[placeholder="Juan Pérez"], ' +
      'input[placeholder="Tu nombre"]'
    );
    await fullNameInput.fill(TEST_USER.fullName);

    // Password — usa secureTextEntry => input[type="password"]
    await page.locator('input[type="password"]').fill(TEST_USER.password);

    // Esperar a que aparezca confirmar contraseña (se activa cuando
    // el password cumple todos los criterios: 8-16, mayúsc, min, num, especial)
    await page.waitForTimeout(1500);

    const passwordInputs = page.locator('input[type="password"]');
    const passwordCount = await passwordInputs.count();

    if (passwordCount > 1) {
      // El último input[type="password"] es el confirmar
      await passwordInputs.last().fill(TEST_USER.password);
    }

    // Click "Crear cuenta"
    await page.getByText(/crear cuenta|create account/i).last().click();

    // Esperar respuesta del backend
    await page.waitForTimeout(5000);

    // Verificar resultado: modal de éxito o redirección a home
    const currentUrl = page.url();
    if (currentUrl.includes('tabs') || currentUrl.includes('home')) {
      return; // Redirección exitosa
    }

    const successModal = page.getByText(/cuenta creada|registro exitoso|account created/i).first();
    const successVisible = await successModal.isVisible().catch(() => false);

    if (successVisible) {
      const okBtn = page.getByText(/entendido|got it|ok|continue|continuar/i);
      if (await okBtn.isVisible().catch(() => false)) {
        await okBtn.click();
      }
      // El modal cierra y redirige a home después de 2s (ver register.tsx)
      await page.waitForURL(/tabs|home/, { timeout: 10000 }).catch(() => {});
      return;
    }

    // Si llegamos acá, algo salió mal
    await page.screenshot({ path: 'test-results/register-failed.png' });
    expect(successVisible).toBeTruthy();
  });

  test('falla con email inválido', async ({ page }) => {
    // Email inválido
    await page.getByPlaceholder(/@/).fill('email-invalido');

    // Username
    await page.getByPlaceholder(/username|usuario/i).fill(TEST_USER.username);

    // Password
    await page.locator('input[type="password"]').fill('Test1234!');

    // Hacer submit
    await page.getByText(/crear cuenta|create account/i).last().click();

    // Debería mostrar error de validación (mensaje hardcodeado en validation.ts)
    const errorMsg = page.getByText(/Please enter a valid email address/i).first();
    await expect(errorMsg).toBeVisible({ timeout: 5000 });
  });
});

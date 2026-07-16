/**
 * E2E tests for Garment Creation screen.
 *
 * Cobertura:
 * - Creación exitosa: llenar formulario, enviar, verificar modal de éxito
 * - Validación: botón deshabilitado hasta completar campos requeridos
 * - Categoría: cambiar chip de categoría, enviar, verificar payload
 *
 * NOTA: la selección de imagen se maneja con el file chooser de Playwright
 * (mockeando un PNG real). El análisis de IA se mockea a nivel API para
 * habilitar el formulario sin auto-completar campos.
 */

import { test, expect } from '@playwright/test';
import path from 'path';
import { injectSession } from './helpers/auth';
import { mockAIAnalysisApi } from './helpers/garment';

const TEST_IMAGE = path.join(__dirname, 'fixtures', 'test-image.png');

test.describe('Garment Creation', () => {
  test.beforeEach(async ({ page }) => {
    await injectSession(page);
    await page.goto('/garments/create');
    await page.waitForLoadState('networkidle');

    await page.addInitScript(() => {
      (window as any).__E2E_TEST__ = true;
    });

    // Mock AI analysis to enable the form without auto-filling fields
    await mockAIAnalysisApi(page);

    // Guard: if Alert.alert maps to window.alert (some RNW setups), auto-accept it
    page.on('dialog', async (dialog) => {
      await dialog.accept();
    });

    // Listen for file chooser BEFORE interacting with the gallery button
    // (the tip may or may not appear, so the chooser could open immediately)
    const fileChooserPromise = page.waitForEvent('filechooser', { timeout: 10000 });

    // Click the "Gallery" button to start image selection
    await page.getByText(/Gallery|Galeria|Galería/i).first().click();

    // Dismiss the photo tip modal if it appears (first 3 visits show it)
    try {
      await page.getByText(/Got it!|Entendido|Entendido!/i).first().click({ timeout: 3000 });
    } catch {
      // Tip not shown or already dismissed — continue
    }

    // Wait for the file chooser and provide the test image
    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles(TEST_IMAGE);

    // Wait for AI analysis to complete and the form to render.
    // The "Add to Closet" button only appears when the form is enabled.
    await expect(
      page.getByText(/Add to Closet|Agregar al Closet/i),
    ).toBeVisible({ timeout: 20000 });
  });

  test('create garment successfully', async ({ page }) => {
    // Mock the POST /api/garments endpoint
    await page.route('**/api/garments', async (route) => {
      if (route.request().method() !== 'POST') {
        await route.continue();
        return;
      }
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: {
            id: 'e2e-mock-garment-id',
            name: 'My Test Garment',
            category: 'tops',
            brand: 'Test Brand',
            color: 'Red',
            season: 'all_season',
            imageUrl: 'https://example.com/test.jpg',
            imageUrls: ['https://example.com/test.jpg'],
            isPublic: false,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        }),
      });
    });

    // Fill required fields
    await page.getByPlaceholder(/Blue Denim|Chaqueta/i).fill('My Test Garment');
    await page.getByPlaceholder(/Levi/i).fill('Test Brand');
    // Click the "Rojo" swatch in the ColorPicker (replaced the old text input)
    await page.getByText('Rojo').first().click();
    // Select a style chip
    await page.getByText('Casual').first().click();

    // Submit the form
    await page.getByText(/Add to Closet|Agregar al Closet/i).click();

    // Verify the success modal appears
    await expect(
      page.getByText(/Garment Added|Prenda Agregada/i),
    ).toBeVisible({ timeout: 10000 });
  });

  test('submit button is disabled until all required fields are filled', async ({ page }) => {
    const submitBtn = page.getByRole('button', { name: /Add to Closet|Agregar al Closet/i });

    // Initially: name, brand, color are empty → button disabled
    await expect(submitBtn).toBeDisabled();

    // Fill only name
    await page.getByPlaceholder(/Blue Denim|Chaqueta/i).fill('Test Garment');
    await expect(submitBtn).toBeDisabled();

    // Fill only brand (color still missing)
    await page.getByPlaceholder(/Levi/i).fill('Test Brand');
    await expect(submitBtn).toBeDisabled();

    // Click the "Rojo" swatch in the ColorPicker
    await page.getByText('Rojo').first().click();
    // Style not selected yet → button still disabled
    await expect(submitBtn).toBeDisabled();

    // Select a style chip to fully enable the button
    await page.getByText('Casual').first().click();
    await expect(submitBtn).toBeEnabled();
  });

  test('category selection changes active chip', async ({ page }) => {
    let requestBody: any;

    // Intercept POST /api/garments to capture the payload
    await page.route('**/api/garments', async (route) => {
      if (route.request().method() !== 'POST') {
        await route.continue();
        return;
      }
      requestBody = JSON.parse(route.request().postData() || '{}');
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: {
            id: 'e2e-mock-garment-id',
            name: 'Test Garment',
            category: 'bottoms',
            brand: 'Test Brand',
            color: 'Red',
            season: 'all_season',
            imageUrl: 'https://example.com/test.jpg',
            imageUrls: ['https://example.com/test.jpg'],
            isPublic: false,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        }),
      });
    });

    // Verify default category chip "Tops & Blouses" is visible
    await expect(
      page.getByText(/Tops & Blouses|Blusas y Camisas/i).first(),
    ).toBeVisible({ timeout: 5000 });

    // Click the "Bottoms" category chip
    await page.getByText(/Bottoms|Pantalones/i).first().click();

    // Fill required fields to enable the submit button
    await page.getByPlaceholder(/Blue Denim|Chaqueta/i).fill('Test Garment');
    await page.getByPlaceholder(/Levi/i).fill('Test Brand');
    // Click the "Rojo" swatch in the ColorPicker
    await page.getByText('Rojo').first().click();
    // Select a style chip
    await page.getByText('Casual').first().click();

    // Submit the form
    await page.getByText(/Add to Closet|Agregar al Closet/i).click();

    // Verify success modal
    await expect(
      page.getByText(/Garment Added|Prenda Agregada/i),
    ).toBeVisible({ timeout: 10000 });

    // Verify the API was called with the selected category
    expect(requestBody).toBeDefined();
    expect(requestBody.category).toBe('bottoms');
  });
});

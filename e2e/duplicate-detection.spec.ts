/**
 * E2E tests for Duplicate Detection flow.
 *
 * Cobertura:
 * - Modal de duplicado aparece cuando el BE detecta una prenda similar
 * - Cancel ("Es esta, cancelar"): modal se cierra, no se crea prenda
 * - Confirm ("No, guardar de todas formas"): modal se cierra y se crea
 *
 * Estrategia:
 * - Mockeamos POST /api/garments/check-duplicate para simular el BE
 * - Usamos el mismo setup de garment-create (sesión, imagen, formulario)
 * - Verificamos que el modal se muestre con los datos correctos
 */

import { test, expect } from '@playwright/test';
import path from 'path';
import { injectSession } from './helpers/auth';
import { mockAIAnalysisApi } from './helpers/garment';

const TEST_IMAGE = path.join(__dirname, 'fixtures', 'test-image.png');

const MOCK_DUPLICATE_RESPONSE = {
  isDuplicate: true,
  matchedGarment: {
    id: 'existing-garment-1',
    name: 'Blue T-Shirt',
    imageUrl: 'https://example.com/existing.jpg',
    category: 'tops',
    brand: 'Nike',
    color: 'blue',
    confidence: 85,
  },
};

const MOCK_DUPLICATE_RESPONSE_LOW_CONFIDENCE = {
  isDuplicate: false,
};

test.describe('Duplicate Detection', () => {
  test.beforeEach(async ({ page }) => {
    await injectSession(page);
    await page.goto('/garments/create');
    await page.waitForLoadState('networkidle');

    // Mock AI analysis to enable the form without auto-filling
    await mockAIAnalysisApi(page);

    // Guard: if Alert.alert maps to window.alert, auto-accept it
    page.on('dialog', async (dialog) => {
      await dialog.accept();
    });

    // Listen for file chooser before gallery click
    const fileChooserPromise = page.waitForEvent('filechooser', { timeout: 10000 });

    // Click "Gallery" to start image selection
    await page.getByText(/Gallery|Galeria|Galería/i).first().click();

    // Dismiss photo tip modal if shown
    try {
      await page.getByText(/Got it!|Entendido/i).first().click({ timeout: 3000 });
    } catch {
      // Tip not shown — continue
    }

    // Select the test image
    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles(TEST_IMAGE);

    // Wait for form to render after AI analysis
    await expect(
      page.getByText(/Add to Closet|Agregar al Closet/i),
    ).toBeVisible({ timeout: 20000 });
  });

  test('shows duplicate warning modal when duplicate is detected', async ({ page }) => {
    // Mock the check-duplicate endpoint to return a duplicate
    await page.route('**/api/garments/check-duplicate', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(MOCK_DUPLICATE_RESPONSE),
      });
    });

    // Mock the POST /api/garments (in case confirm is called)
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
            color: 'Blue',
            imageUrl: 'https://example.com/test.jpg',
            imageUrls: ['https://example.com/test.jpg'],
            isPublic: false,
          },
        }),
      });
    });

    // Fill required fields
    await page.getByPlaceholder(/Blue Denim|Chaqueta/i).fill('My Test Garment');
    await page.getByPlaceholder(/Levi/i).fill('Test Brand');
    // Click the "Azul" swatch in the ColorPicker
    await page.getByText('Azul').first().click();

    // Submit the form
    await page.getByText(/Add to Closet|Agregar al Closet/i).click();

    // Verify the duplicate warning modal appears
    await expect(
      page.getByText('Encontramos una prenda muy similar'),
    ).toBeVisible({ timeout: 10000 });

    // Verify matched garment info is shown
    await expect(
      page.getByText('Blue T-Shirt'),
    ).toBeVisible();
  });

  test('cancel returns to form without creating garment', async ({ page }) => {
    let checkDuplicateCalled = false;
    let createGarmentCalled = false;

    // Mock check-duplicate
    await page.route('**/api/garments/check-duplicate', async (route) => {
      checkDuplicateCalled = true;
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(MOCK_DUPLICATE_RESPONSE),
      });
    });

    // Mock POST /api/garments — should NOT be called on cancel
    await page.route('**/api/garments', async (route) => {
      if (route.request().method() !== 'POST') {
        await route.continue();
        return;
      }
      createGarmentCalled = true;
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: {} }),
      });
    });

    // Fill and submit
    await page.getByPlaceholder(/Blue Denim|Chaqueta/i).fill('My Test Garment');
    await page.getByPlaceholder(/Levi/i).fill('Test Brand');
    await page.getByText('Azul').first().click();
    await page.getByText(/Add to Closet|Agregar al Closet/i).click();

    // Wait for modal to appear
    await expect(
      page.getByText('Encontramos una prenda muy similar'),
    ).toBeVisible({ timeout: 10000 });

    // Click cancel ("Es esta, cancelar")
    await page.getByText('Es esta, cancelar').click();

    // Modal should be closed, form should still be visible
    await expect(
      page.getByText(/Add to Closet|Agregar al Closet/i),
    ).toBeVisible();

    // Verify check-duplicate was called but create was NOT
    expect(checkDuplicateCalled).toBe(true);
    expect(createGarmentCalled).toBe(false);
  });

  test('confirm creates garment despite duplicate warning', async ({ page }) => {
    let checkDuplicateCalled = false;
    let createGarmentCalled = false;

    // Mock check-duplicate
    await page.route('**/api/garments/check-duplicate', async (route) => {
      checkDuplicateCalled = true;
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(MOCK_DUPLICATE_RESPONSE),
      });
    });

    // Mock POST /api/garments — should be called on confirm
    await page.route('**/api/garments', async (route) => {
      if (route.request().method() !== 'POST') {
        await route.continue();
        return;
      }
      createGarmentCalled = true;
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: {
            id: 'e2e-mock-garment-id',
            name: 'My Test Garment',
            category: 'tops',
            brand: 'Test Brand',
            color: 'Blue',
            imageUrl: 'https://example.com/test.jpg',
            imageUrls: ['https://example.com/test.jpg'],
            isPublic: false,
          },
        }),
      });
    });

    // Fill and submit
    await page.getByPlaceholder(/Blue Denim|Chaqueta/i).fill('My Test Garment');
    await page.getByPlaceholder(/Levi/i).fill('Test Brand');
    await page.getByText('Azul').first().click();
    await page.getByText(/Add to Closet|Agregar al Closet/i).click();

    // Wait for modal to appear
    await expect(
      page.getByText('Encontramos una prenda muy similar'),
    ).toBeVisible({ timeout: 10000 });

    // Click confirm ("No, guardar de todas formas")
    await page.getByText('No, guardar de todas formas').click();

    // Should show success modal after creation
    await expect(
      page.getByText(/Garment Added|Prenda Agregada/),
    ).toBeVisible({ timeout: 10000 });

    // Verify both APIs were called
    expect(checkDuplicateCalled).toBe(true);
    expect(createGarmentCalled).toBe(true);
  });

  test('proceeds with creation when no duplicate is found', async ({ page }) => {
    let createGarmentCalled = false;

    // Mock check-duplicate to return NO duplicate
    await page.route('**/api/garments/check-duplicate', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(MOCK_DUPLICATE_RESPONSE_LOW_CONFIDENCE),
      });
    });

    // Mock POST /api/garments
    await page.route('**/api/garments', async (route) => {
      if (route.request().method() !== 'POST') {
        await route.continue();
        return;
      }
      createGarmentCalled = true;
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: {
            id: 'e2e-mock-garment-id',
            name: 'My Test Garment',
            category: 'tops',
            brand: 'Test Brand',
            color: 'Blue',
            imageUrl: 'https://example.com/test.jpg',
            imageUrls: ['https://example.com/test.jpg'],
            isPublic: false,
          },
        }),
      });
    });

    // Fill and submit
    await page.getByPlaceholder(/Blue Denim|Chaqueta/i).fill('My Test Garment');
    await page.getByPlaceholder(/Levi/i).fill('Test Brand');
    await page.getByText('Azul').first().click();
    await page.getByText(/Add to Closet|Agregar al Closet/i).click();

    // Should go directly to success (no duplicate modal)
    await expect(
      page.getByText(/Garment Added|Prenda Agregada/),
    ).toBeVisible({ timeout: 10000 });

    expect(createGarmentCalled).toBe(true);
  });

  test('shows confidence percentage in duplicate modal', async ({ page }) => {
    // Mock check-duplicate with known confidence
    await page.route('**/api/garments/check-duplicate', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          isDuplicate: true,
          matchedGarment: {
            id: 'existing-garment-2',
            name: 'Similar Shirt',
            imageUrl: 'https://example.com/similar.jpg',
            category: 'tops',
            confidence: 85,
          },
        }),
      });
    });

    // Fill and submit
    await page.getByPlaceholder(/Blue Denim|Chaqueta/i).fill('My Test Garment');
    await page.getByPlaceholder(/Levi/i).fill('Test Brand');
    await page.getByText('Azul').first().click();
    await page.getByText(/Add to Closet|Agregar al Closet/i).click();

    // Modal should appear
    await expect(
      page.getByText('Encontramos una prenda muy similar'),
    ).toBeVisible({ timeout: 10000 });

    // Verify confidence is shown (should be 85%, not 8500% or 9000%)
    await expect(
      page.getByText(/85%/),
    ).toBeVisible();
  });
});

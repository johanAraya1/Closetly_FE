/**
 * E2E tests for Closet screen.
 *
 * Cobertura:
 * - Grilla de prendas: mock 6 garments, verificar que se renderizan
 * - Estado vacío: mock 0 garments, verificar mensaje vacío
 * - Carga completa: mock 10 garments, FlatList renderiza todas (initialNumToRender=12)
 *
 * Setup: inyectamos sesión falsa en localStorage para evitar depender
 * del backend o del flujo de autenticación. Mockeamos GET /api/garments*
 * con context.route() para que persista entre navegaciones.
 */

import { test, expect } from '@playwright/test';
import { injectSession } from './helpers/auth';
import { generateMockGarments, mockGarmentsApi } from './helpers/garments';

test.describe('Closet', () => {
  test.beforeEach(async ({ page }) => {
    // Inyectar sesión falsa antes de navegar
    await injectSession(page);
  });

  test('closet muestra prendas en grilla', async ({ page, context }) => {
    const garments = generateMockGarments(6);
    await mockGarmentsApi(context, garments);

    await page.goto('/(tabs)/closet');
    await page.waitForLoadState('networkidle');

    // Verificar que se muestran todas las prendas
    // { exact: true } evita que "Mock Garment 1" matchee también "Mock Garment 10"
    for (const g of garments) {
      await expect(page.getByText(g.name, { exact: true })).toBeVisible({ timeout: 10000 });
    }
  });

  test('closet vacío muestra mensaje vacío', async ({ page, context }) => {
    await mockGarmentsApi(context, []);

    await page.goto('/(tabs)/closet');
    await page.waitForLoadState('networkidle');

    // Verificar que se muestra el EmptyState
    // .first() porque "No garments yet" (title) + "Start adding..." (subtitle) matchean
    await expect(
      page.getByText(/no garments|no prendas|todavía|start adding|agregar/i).first(),
    ).toBeVisible({ timeout: 10000 });
  });

  test('closet muestra 10 prendas desde la primera carga (initialNumToRender=12)', async ({ page, context }) => {
    const garments = generateMockGarments(10);
    await mockGarmentsApi(context, garments);

    await page.goto('/(tabs)/closet');
    await page.waitForLoadState('networkidle');

    // FlatList tiene initialNumToRender={12}, todas las prendas se renderizan
    for (const g of garments) {
      await expect(page.getByText(g.name, { exact: true })).toBeVisible({ timeout: 10000 });
    }
  });
});

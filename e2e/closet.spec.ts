/**
 * E2E tests for Closet screen.
 *
 * Cobertura:
 * - Grilla de prendas: mock 6 garments, verificar que se renderizan
 * - Estado vacío: mock 0 garments, verificar mensaje vacío
 * - Paginación: mock 10 garments con 6 en primera página, scroll trigger
 *   onEndReached, verificar que cargan las 4 restantes
 *
 * Setup: inyectamos sesión falsa en localStorage para evitar depender
 * del backend o del flujo de autenticación. Mockeamos GET /api/garments*
 * con context.route() para que persista entre navegaciones.
 */

import { test, expect } from '@playwright/test';
import { injectSession } from './helpers/auth';
import { generateMockGarments, mockGarmentsApi, scrollToFlatListEnd } from './helpers/garments';

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
    for (const g of garments) {
      await expect(page.getByText(g.name)).toBeVisible({ timeout: 10000 });
    }

    // Verificar que se ve el contador de prendas
    await expect(
      page.getByText(/6|garment|prenda/i),
    ).toBeVisible({ timeout: 5000 });
  });

  test('closet vacío muestra mensaje vacío', async ({ page, context }) => {
    await mockGarmentsApi(context, []);

    await page.goto('/(tabs)/closet');
    await page.waitForLoadState('networkidle');

    // Verificar que se muestra el EmptyState
    await expect(
      page.getByText(/no garments|no prendas|todavía|start adding|agregar/i),
    ).toBeVisible({ timeout: 10000 });
  });

  test('closet paginación carga más prendas al hacer scroll', async ({ page, context }) => {
    const allGarments = generateMockGarments(10);

    // Usamos un wrapper objeto para evitar narrowing de TS con let en closures
    const deferred: { resolve: (() => void) | null } = { resolve: null };

    // Handler con respuesta diferida para la segunda página
    await context.route('**/api/garments*', async (route) => {
      const url = new URL(route.request().url());
      const offset = parseInt(url.searchParams.get('offset') || '0');

      if (offset === 0) {
        // Primera página responde inmediatamente
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            data: allGarments.slice(0, 6),
            total: 10,
            hasMore: true,
          }),
        });
      } else {
        // Segunda página queda en espera hasta que resolvamos manualmente
        await new Promise<void>((resolve) => {
          deferred.resolve = resolve;
        });
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            data: allGarments.slice(6),
            total: 10,
            hasMore: false,
          }),
        });
      }
    });

    // Navegar sin networkidle (la segunda página queda pending)
    await page.goto('/(tabs)/closet');

    // Verificar primeras 6 prendas
    for (let i = 0; i < 6; i++) {
      await expect(page.getByText(allGarments[i].name)).toBeVisible({ timeout: 10000 });
    }

    // Verificar que las últimas 4 NO están visibles todavía
    for (let i = 6; i < 10; i++) {
      await expect(page.getByText(allGarments[i].name)).not.toBeVisible();
    }

    // Scroll para triggerear onEndReached (si no se disparó automáticamente)
    await scrollToFlatListEnd(page);

    // Liberar la segunda página
    if (deferred.resolve) {
      deferred.resolve();
    }

    // Esperar a que se rendericen las 10 prendas
    for (let i = 0; i < 10; i++) {
      await expect(page.getByText(allGarments[i].name)).toBeVisible({ timeout: 10000 });
    }
  });
});

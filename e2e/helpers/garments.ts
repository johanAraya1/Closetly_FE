/**
 * Garment helpers for E2E tests.
 *
 * Estrategia: interceptamos GET /api/garments* con respuestas mock
 * para simular distintos escenarios (grilla, vacío, paginación).
 *
 * Usamos context.route() (persiste entre navegaciones/reloads) para
 * que los mocks sobrevivan a router.replace de Expo Router web.
 */

import type { BrowserContext, Page } from '@playwright/test';

export interface MockGarment {
  id: string;
  userId: string;
  name: string;
  category: string;
  brand?: string;
  color?: string;
  imageUrl: string;
  imageUrls: string[];
  createdAt: string;
  updatedAt: string;
}

const MOCK_USER_ID = 'e2e-mock-user-id';
const CATEGORIES = ['tops', 'bottoms', 'dresses', 'outerwear', 'shoes', 'accessories'];
const COLORS = ['Red', 'Blue', 'Black', 'White', 'Green', 'Yellow'];

/**
 * Genera N prendas mock con datos únicos.
 * @param count  Cantidad de prendas a generar
 * @param startIndex  Índice inicial (útil para paginación)
 */
export function generateMockGarments(count: number, startIndex = 0): MockGarment[] {
  const garments: MockGarment[] = [];

  for (let i = 0; i < count; i++) {
    const idx = startIndex + i;
    garments.push({
      id: `e2e-garment-${idx}`,
      userId: MOCK_USER_ID,
      name: `Mock Garment ${idx + 1}`,
      category: CATEGORIES[idx % CATEGORIES.length],
      brand: 'Test Brand',
      color: COLORS[idx % COLORS.length],
      imageUrl: 'https://via.placeholder.com/150',
      imageUrls: ['https://via.placeholder.com/150'],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  }

  return garments;
}

/**
 * Intercepta GET /api/garments* y retorna una lista fija de garments mockeados.
 * Usa context.route() para persistir entre navegaciones/reloads.
 *
 * Para escenarios de paginación (diferentes respuestas según offset),
 * usá un handler inline en el test con context.route() directamente.
 */
export async function mockGarmentsApi(
  context: BrowserContext,
  garments: MockGarment[],
  total?: number,
  hasMore?: boolean,
) {
  const responseTotal = total ?? garments.length;
  const responseHasMore = hasMore ?? false;

  await context.route('**/api/garments*', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        data: garments,
        total: responseTotal,
        hasMore: responseHasMore,
      }),
    });
  });
}

/**
 * Scrollea el FlatList vertical hasta el final para triggerear onEndReached.
 * Busca el primer elemento con overflow-y: auto/scroll que tenga contenido
 * scrolleable (scrollHeight > clientHeight).
 */
export async function scrollToFlatListEnd(page: Page): Promise<void> {
  await page.evaluate(() => {
    const allElements = Array.from(document.querySelectorAll('*'));
    for (const el of allElements) {
      const overflowY = window.getComputedStyle(el).overflowY;
      if (
        (overflowY === 'auto' || overflowY === 'scroll') &&
        el.scrollHeight > el.clientHeight
      ) {
        el.scrollTop = el.scrollHeight;
        break;
      }
    }
  });
}

/**
 * Shared garment E2E test helpers.
 *
 * Estrategia: mockeamos POST /api/ai/analyze-garment con confianza baja (0.4)
 * para que el formulario se habilite SIN auto-completar campos. Así podemos
 * controlar exactamente qué se envía en cada test.
 *
 * POST /api/garments se mockea con una prenda de prueba para simular
 * creación exitosa sin depender del backend real.
 */

import type { Page } from '@playwright/test';

const MOCK_GARMENT_ID = 'e2e-mock-garment-id';
const MOCK_USER_ID = 'e2e-mock-user-id';

/** Prenda mockeada que devuelve POST /api/garments */
export const MOCK_GARMENT = {
  id: MOCK_GARMENT_ID,
  user_id: MOCK_USER_ID,
  userId: MOCK_USER_ID,
  name: 'E2E Test Garment',
  category: 'tops',
  brand: 'Test Brand',
  color: 'Blue',
  season: 'all_season',
  style: [],
  imageUrl: 'https://example.com/test.jpg',
  image_url: 'https://example.com/test.jpg',
  imageUrls: ['https://example.com/test.jpg'],
  image_urls: ['https://example.com/test.jpg'],
  notes: null,
  isPublic: false,
  is_public: false,
  listingType: null,
  listing_type: null,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

/**
 * Respuesta del análisis de IA con confianza BAJA (0.4).
 * El formulario se habilita (isFormEnabled = true) pero los campos
 * NO se auto-completan, permitiendo que los tests controlen los valores.
 */
export const MOCK_AI_ANALYSIS = {
  name: 'Mock AI Garment',
  category: 'tops',
  color: 'Blue',
  brand: 'Mock Brand',
  season: 'all_season',
  description: 'AI analyzed garment for E2E',
  confidence: 0.4,
};

/** Intercepta POST /api/ai/analyze-garment y retorna análisis mock */
export async function mockAIAnalysisApi(page: Page) {
  await page.route('**/api/ai/analyze-garment', async (route) => {
    if (route.request().method() !== 'POST') {
      await route.continue();
      return;
    }
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(MOCK_AI_ANALYSIS),
    });
  });
}

/** Intercepta POST /api/garments y retorna creación exitosa */
export async function mockGarmentCreateApi(page: Page) {
  await page.route('**/api/garments', async (route) => {
    if (route.request().method() !== 'POST') {
      await route.continue();
      return;
    }
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ data: MOCK_GARMENT }),
    });
  });
}

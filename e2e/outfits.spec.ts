/**
 * E2E tests for Outfits screen.
 *
 * Cobertura:
 * - Outfit list loads and displays outfits from mock API
 * - Create outfit screen loads with garment grid and form elements
 *
 * NOTA: todas las APIs son mockeadas. Usamos injectSession para
 *       simular autenticación sin depender del backend.
 */

import { test, expect, type BrowserContext } from '@playwright/test';
import { injectSession } from './helpers/auth';

// ─── Mock Data ────────────────────────────────────────────────

const MOCK_GARMENTS = [
  {
    id: 'g-1',
    userId: 'e2e-mock-user-id',
    name: 'Blue Denim Jacket',
    category: 'outerwear',
    brand: "Levi's",
    color: 'Blue',
    season: 'all_season',
    imageUrl: 'https://placehold.co/400/3B82F6/FFFFFF?text=Jacket',
    imageUrls: ['https://placehold.co/400/3B82F6/FFFFFF?text=Jacket'],
    notes: null,
    isPublic: false,
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
  },
  {
    id: 'g-2',
    userId: 'e2e-mock-user-id',
    name: 'White T-Shirt',
    category: 'tops',
    brand: 'Nike',
    color: 'White',
    season: 'all_season',
    imageUrl: 'https://placehold.co/400/FFFFFF/000000?text=T-Shirt',
    imageUrls: ['https://placehold.co/400/FFFFFF/000000?text=T-Shirt'],
    notes: null,
    isPublic: false,
    createdAt: '2024-01-02T00:00:00.000Z',
    updatedAt: '2024-01-02T00:00:00.000Z',
  },
];

const MOCK_OUTFITS_RESPONSE = {
  data: [
    {
      id: 'o-1',
      name: 'Casual Friday',
      description: 'Perfect for a casual day at work',
      occasion: 'casual',
      season: 'all_season',
      is_favorite: true,
      isFavorite: true,
      garmentIds: ['g-1', 'g-2'],
      createdAt: '2024-06-10T12:00:00.000Z',
      updatedAt: '2024-06-10T12:00:00.000Z',
    },
    {
      id: 'o-2',
      name: 'Summer Vibes',
      description: 'Light and breezy for summer',
      occasion: 'casual',
      season: 'summer',
      is_favorite: false,
      isFavorite: false,
      garmentIds: ['g-2'],
      createdAt: '2024-06-08T12:00:00.000Z',
      updatedAt: '2024-06-08T12:00:00.000Z',
    },
  ],
  total: 2,
  hasMore: false,
};

// ─── Mock helpers ─────────────────────────────────────────────

/** Intercepta GET /api/outfits* y retorna la respuesta mockeada.
 *  Usamos context.route() para que persista entre full reloads
 *  (Expo Router hace reload al navegar entre tabs en web). */
async function mockOutfitsApi(context: BrowserContext, response: object) {
  await context.route('**/api/outfits*', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(response),
    });
  });
}

/** Intercepta GET /api/garments* y retorna la lista de prendas.
 *  Sirve tanto para la llamada directa de useGarments como para
 *  la llamada batch de fetchOutfits (/garments?id=in.(...)). */
async function mockGarmentsApi(context: BrowserContext, garments: any[]) {
  await context.route('**/api/garments*', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ data: garments }),
    });
  });
}

// ─── Tests ────────────────────────────────────────────────────

test.describe('Outfits', () => {
  test.beforeEach(async ({ page }) => {
    await injectSession(page);
  });

  test('outfit list loads existing outfits from API', async ({ page }) => {
    await mockOutfitsApi(page.context(), MOCK_OUTFITS_RESPONSE);
    await mockGarmentsApi(page.context(), MOCK_GARMENTS);

    await page.goto('/(tabs)/outfits');
    await page.waitForLoadState('networkidle');

    // Title — EN "My Outfits" / ES "Mis Outfits"
    await expect(
      page.getByText(/my outfits|mis outfits/i),
    ).toBeVisible({ timeout: 10000 });

    // Each outfit from mock data should appear by name
    await expect(
      page.getByText('Casual Friday'),
    ).toBeVisible({ timeout: 10000 });

    await expect(
      page.getByText('Summer Vibes'),
    ).toBeVisible({ timeout: 10000 });
  });

  test('create outfit screen loads and shows garments', async ({ page }) => {
    await mockGarmentsApi(page.context(), MOCK_GARMENTS);
    await mockOutfitsApi(page.context(), { data: [], total: 0, hasMore: false });

    await page.goto('/outfits/create');
    await page.waitForLoadState('networkidle');

    // Header — EN "Create Outfit" / ES "Crear Outfit"
    await expect(
      page.getByText(/create outfit|crear outfit/i),
    ).toBeVisible({ timeout: 10000 });

    // Name input placeholder — EN "e.g., Casual Friday" / ES "ej., Viernes Casual"
    await expect(
      page.getByPlaceholder(/e\.g\.,|ej\./i),
    ).toBeVisible({ timeout: 10000 });

    // Garment cards from mock data should render
    await expect(
      page.getByText('Blue Denim Jacket'),
    ).toBeVisible({ timeout: 10000 });

    await expect(
      page.getByText('White T-Shirt'),
    ).toBeVisible({ timeout: 10000 });
  });
});

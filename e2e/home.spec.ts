/**
 * E2E tests for Home screen.
 *
 * Cobertura:
 * - Home carga con outfits: mock 3 outfits, verifica que se rendericen
 * - Home muestra estado vacío: mock outfits vacíos, verifica checklist
 * - Home muestra loading en primera visita: verifica Loading component
 *
 * Setup: inyectamos sesión falsa en localStorage para evitar
 * depender del backend o del flujo de login.
 */

import { test, expect } from '@playwright/test';
import {
  injectSession,
  mockOutfitsApiWithData,
  mockGarmentsApi,
  mockSuggestionsApi,
  createMockOutfits,
  homeLoaded,
} from './helpers/auth';

test.describe('Home Screen', () => {
  const MOCK_GARMENTS = [
    {
      id: 'e2e-garment-1',
      userId: 'e2e-mock-user-id',
      name: 'Blue Shirt',
      category: 'tops',
      color: 'blue',
      season: 'all_season',
      imageUrl: 'https://example.com/shirt.jpg',
      imageUrls: ['https://example.com/shirt.jpg'],
      isPublic: false,
      createdAt: '2024-06-01T10:00:00.000Z',
      updatedAt: '2024-06-01T10:00:00.000Z',
    },
    {
      id: 'e2e-garment-2',
      userId: 'e2e-mock-user-id',
      name: 'Black Pants',
      category: 'bottoms',
      color: 'black',
      season: 'all_season',
      imageUrl: 'https://example.com/pants.jpg',
      imageUrls: ['https://example.com/pants.jpg'],
      isPublic: false,
      createdAt: '2024-06-02T10:00:00.000Z',
      updatedAt: '2024-06-02T10:00:00.000Z',
    },
  ];

  test.beforeEach(async ({ page }) => {
    await injectSession(page);
  });

  test('home loads with outfits', async ({ page }) => {
    const mockOutfits = createMockOutfits();

    await mockOutfitsApiWithData(page.context(), mockOutfits);
    await mockGarmentsApi(page.context(), MOCK_GARMENTS);
    await mockSuggestionsApi(page.context());

    await page.goto('/(tabs)/home');
    await page.waitForLoadState('networkidle');

    // Verificar que el header de bienvenida se renderiza
    await expect(homeLoaded(page)).toBeVisible({ timeout: 15000 });

    // Verificar que los 3 outfits aparecen en la sección de recientes
    await expect(page.getByText('Casual Monday')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('Office Tuesday')).toBeVisible({ timeout: 5000 });
    await expect(page.getByText('Evening Glam')).toBeVisible({ timeout: 5000 });

    // La sección de favoritos debe aparecer (1 outfit es favorito)
    await expect(
      page.getByText(/favourite|favorite|favoritos/i),
    ).toBeVisible({ timeout: 5000 });

    // El checklist "Primeros Pasos" NO debe aparecer (ambos pasos completos)
    const checklist = page.getByText(/getting started|primeros pasos/i);
    await expect(checklist).toHaveCount(0);
  });

  test('home shows empty state with checklist', async ({ page }) => {
    await mockOutfitsApiWithData(page.context(), []);
    await mockGarmentsApi(page.context(), []);
    await mockSuggestionsApi(page.context());

    await page.goto('/(tabs)/home');
    await page.waitForLoadState('networkidle');

    // Verificar que el header de bienvenida se renderiza
    await expect(homeLoaded(page)).toBeVisible({ timeout: 15000 });

    // El checklist "Primeros Pasos" debe aparecer
    const checklist = page.getByText(/getting started|primeros pasos/i).first();
    await expect(checklist).toBeVisible({ timeout: 10000 });

    // Ambas tareas deben mostrarse
    await expect(
      page.getByText(/add.*garment|añade.*prenda|add.*first/i),
    ).toBeVisible({ timeout: 5000 });
    await expect(
      page.getByText(/create.*outfit|crea.*conjunto|create.*first/i),
    ).toBeVisible({ timeout: 5000 });
  });

  test('home shows loading on first visit', async ({ page }) => {
    // Deferred promise para controlar cuándo responde la API de outfits
    let fulfillOutfits: () => void;
    const outfitsDeferred = new Promise<void>((resolve) => {
      fulfillOutfits = resolve;
    });

    await page.context().route('**/outfits?user_id*', async (route) => {
      await outfitsDeferred;
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: [],
          total: 0,
          hasMore: false,
        }),
      });
    });

    // Mockear el resto de APIs normalmente (no deben interferir)
    await mockGarmentsApi(page.context(), []);
    await mockSuggestionsApi(page.context());

    await page.goto('/(tabs)/home');

    // Mientras la API de outfits no responde, el Loading debe ser visible
    await expect(
      page.getByText(/Loading your wardrobe/i),
    ).toBeVisible({ timeout: 10000 });

    // Resolver la deferred — la API responde con datos vacíos
    fulfillOutfits!();

    // Tras recibir la respuesta, la pantalla principal debe cargar
    await expect(homeLoaded(page)).toBeVisible({ timeout: 10000 });
  });
});

/**
 * E2E tests for Calendar screen.
 *
 * Cobertura:
 * - Calendar month view loads and renders entries as markers
 * - Log outfit flow: select outfit and submit (via direct navigation)
 *
 * NOTA sobre Alert.alert en RNW v0.19: React Native Web implementa
 * Alert.alert() como una función vacía (no-op). El callback del botón
 * de éxito en log-today no se ejecuta. Verificamos que la llamada POST
 * se realizó correctamente en lugar de esperar navegación.
 */

import { test, expect } from '@playwright/test';
import { injectSession } from './helpers/auth';

const MOCK_USER_ID = 'e2e-mock-user-id';

// ─── Mock data builders ─────────────────────────────────────

function buildOutfits() {
  return [
    {
      id: 'outfit-1',
      userId: MOCK_USER_ID,
      name: 'Casual Monday',
      is_favorite: false,
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
    },
    {
      id: 'outfit-2',
      userId: MOCK_USER_ID,
      name: 'Elegant Evening',
      is_favorite: true,
      createdAt: '2026-01-02T00:00:00Z',
      updatedAt: '2026-01-02T00:00:00Z',
    },
  ];
}

function buildCalendarEntries(year: number, month: string) {
  const outfits = buildOutfits();
  return [
    {
      id: 'entry-1',
      date: `${year}-${month}-15`,
      outfit: outfits[0],
    },
    {
      id: 'entry-2',
      date: `${year}-${month}-20`,
      outfit: outfits[1],
    },
  ];
}

// ─── Mock setup ─────────────────────────────────────────────

async function setupCalendarMock(
  context: import('@playwright/test').BrowserContext,
  entries: Record<string, unknown>[],
) {
  await context.route('**/api/calendar**', async (route) => {
    const url = route.request().url();
    const method = route.request().method();

    if (!url.includes('/calendar/log') && method === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: entries }),
      });
    } else if (url.includes('/calendar/log') && method === 'POST') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: {
            id: 'new-entry-1',
            date: '2026-06-16',
            outfit: { id: 'outfit-1' },
          },
        }),
      });
    } else {
      await route.continue();
    }
  });
}

async function setupOutfitsMock(
  context: import('@playwright/test').BrowserContext,
  outfits: Record<string, unknown>[],
) {
  await context.route('**/api/outfits*', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        data: outfits,
        total: outfits.length,
        hasMore: false,
      }),
    });
  });
}

// ─── Tests ──────────────────────────────────────────────────

test.describe('Calendar', () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const monthLabel = now.toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  });

  const outfits = buildOutfits();
  const entries = buildCalendarEntries(year, month);

  test.beforeEach(async ({ page, context }) => {
    await setupCalendarMock(context, entries);
    await setupOutfitsMock(context, outfits);
    await injectSession(page);
  });

  test('calendar loads month view with entry markers', async ({ page }) => {
    await page.goto('/calendar');
    await page.waitForLoadState('networkidle');

    // Calendar title is visible
    await expect(
      page.getByText(/calendar|calendario/i).first(),
    ).toBeVisible({ timeout: 10000 });

    // Month label shows current month and year
    // .first() avoids the screen header title (also shows "June 2026")
    await expect(
      page.getByText(monthLabel, { exact: true }).first(),
    ).toBeVisible({ timeout: 5000 });

    // Calendar grid shows day numbers (our mocked dates)
    await expect(
      page.getByText('15', { exact: true }),
    ).toBeVisible({ timeout: 5000 });
    await expect(
      page.getByText('20', { exact: true }),
    ).toBeVisible({ timeout: 5000 });

    // The "+" add button is present (Ionicons "add" icon)
    const addIcon = page.locator('path[d*="M256 112v288"]');
    await expect(addIcon).toBeVisible({ timeout: 5000 });
  });

  test('log outfit flow — select outfit and submit', async ({ page }) => {
    // Navigate directly to log-today (tests the screen in isolation)
    await page.goto('/calendar/log-today');
    await page.waitForLoadState('networkidle');

    // Log-today screen loaded with title
    await expect(
      page.getByText(/select outfit|seleccionar/i).first(),
    ).toBeVisible({ timeout: 10000 });

    // Date banner shows today's formatted date
    const dateStr = now.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
    await expect(
      page.getByText(dateStr, { exact: true }),
    ).toBeVisible({ timeout: 5000 });

    // Outfit grid shows both outfits
    await expect(
      page.getByText('Casual Monday'),
    ).toBeVisible({ timeout: 5000 });
    await expect(
      page.getByText('Elegant Evening'),
    ).toBeVisible({ timeout: 5000 });

    // Select "Elegant Evening" outfit
    await page.getByText('Elegant Evening').click();

    // Log button becomes enabled (selected outfit)
    // Use getByRole to target the button root (has role="button" from Button.tsx)
    const logButton = page.getByRole('button', { name: /log outfit|registrar/i });
    await expect(logButton).toBeVisible({ timeout: 5000 });

    // Set up request watcher BEFORE clicking
    const postRequest = page.waitForRequest(
      (req) =>
        req.url().includes('/api/calendar/log') &&
        req.method() === 'POST',
    );

    // Click the log button
    await logButton.click();

    // Wait for the POST request to be made
    const fulfilled = await postRequest;
    expect(fulfilled).toBeTruthy();

    // The POST body should contain the outfit ID
    const postBody = fulfilled.postDataJSON();
    expect(postBody.outfitId).toBe('outfit-2');
    expect(postBody.date).toBeTruthy();
  });
});

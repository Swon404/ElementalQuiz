import { expect, test, type Page } from '@playwright/test';

const testProfile = {
  id: 'playwright-player',
  name: 'Playwright',
  progress: { totalEP: 0, streak: 0, bestStreak: 0, elementsCollected: [], quizHistory: [] },
  createdAt: '2026-01-01T00:00:00.000Z',
};

async function openApp(page: Page) {
  await page.addInitScript(profile => {
    localStorage.clear();
    localStorage.setItem('elementalquiz_intro_seen', '1');
    localStorage.setItem('elementalquiz_profiles', JSON.stringify([profile]));
    localStorage.setItem('elementalquiz_active_profile', profile.id);
  }, testProfile);
  await page.goto('./');
  await expect(page.getByRole('button', { name: /Play Games/ })).toBeVisible();
}

async function openSoloGame(page: Page, gameName: string) {
  await page.getByRole('button', { name: /Play Games/ }).click();
  await page.locator('.play-format-card').filter({ hasText: 'Solo' }).click();
  await page.locator('.game-mode-btn').filter({ has: page.locator('.gm-name', { hasText: gameName }) }).click();
}

function boxesOverlap(a: { x: number; y: number; width: number; height: number }, b: { x: number; y: number; width: number; height: number }) {
  return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
}

test('all solo games open their setup screen', async ({ page }) => {
  await openApp(page);
  await page.getByRole('button', { name: /Play Games/ }).click();
  await page.locator('.play-format-card').filter({ hasText: 'Solo' }).click();

  for (const gameName of ['Family Finder', 'Quiz Battle', 'True or False Blitz', 'Element Match', 'Clue Duel', 'Symbol Pick', 'Atomic Order', 'Atom Quiz']) {
    await page.locator('.game-mode-btn').filter({ has: page.locator('.gm-name', { hasText: gameName }) }).click();
    await expect(page.locator('.quiz-setup, .two-player-setup').first()).toBeVisible();
    await page.locator('.back-btn').first().click();
    await expect(page.getByRole('heading', { name: 'Choose a game' })).toBeVisible();
  }
});

test('Quiz Battle always presents at least four choices and its exit control does not overlap the score', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await openApp(page);
  await openSoloGame(page, 'Quiz Battle');
  await page.getByRole('button', { name: 'Start Quiz!' }).click();

  await expect(page.locator('.choice-btn')).toHaveCount(4);
  const exitBox = await page.locator('.quiz-exit-btn').boundingBox();
  const scoreBox = await page.locator('.score-display').boundingBox();
  expect(exitBox).not.toBeNull();
  expect(scoreBox).not.toBeNull();
  expect(boxesOverlap(exitBox!, scoreBox!)).toBe(false);
  expect(exitBox!.x + exitBox!.width).toBeLessThanOrEqual(390);
});

test('Family Finder setup gives short play instructions without grid-size detail', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await openApp(page);
  await openSoloGame(page, 'Family Finder');

  await expect(page.getByText('Find an element from the family named in the question. Tap one tile, then check your answer.')).toBeVisible();
  await expect(page.getByText(/3 × 3|4 × 4|5 × 5/)).toHaveCount(0);
});

for (const mode of ['Hunt', 'Time Trial'] as const) {
  test(`${mode} rewind restarts the complete timed go`, async ({ page }) => {
    await openApp(page);
    await openSoloGame(page, 'Element Match');
    await page.getByRole('button', { name: mode, exact: true }).click();
    if (mode === 'Hunt') await page.getByRole('button', { name: 'On', exact: true }).click();
    await page.getByRole('button', { name: 'Start Game!' }).click();
    await page.getByRole('button', { name: 'Start Timer' }).click();

    const firstCard = page.locator('.match-card').first();
    await firstCard.click();
    await expect(firstCard).toHaveClass(/flipped/);
    await page.getByRole('button', { name: /Rewind/ }).click();

    await expect(page.getByRole('button', { name: 'Start Timer' })).toBeVisible();
    await expect(page.locator('.match-card')).toHaveCount(0);
    await expect(page.getByText('0 points · 0 moves')).toBeVisible();
  });
}

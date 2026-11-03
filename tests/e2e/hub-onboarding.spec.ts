import { expect, test } from '@playwright/test';

test.describe('hub onboarding', () => {
  test('guided steps then catalog cards', async ({ page }) => {
    await page.addInitScript(() => {
      Object.defineProperty(navigator, 'clipboard', {
        configurable: true,
        value: { writeText: async () => undefined },
      });
    });

    await page.goto('./');
    await expect(page.getByRole('heading', { name: 'ConsoleHelper' })).toBeVisible();
    await expect(page.getByText(/Что это|меню на любой странице/i).first()).toBeVisible();

    await page.getByRole('button', { name: 'Начать' }).click();
    const copyShort = page.getByRole('button', { name: 'Скопировать', exact: true });
    await expect(copyShort).toBeVisible();
    await expect(page.getByRole('button', { name: 'Продолжить' })).toBeHidden();

    await copyShort.click();
    await expect(page.getByRole('button', { name: 'Продолжить' })).toBeVisible();
    await page.getByRole('button', { name: 'Продолжить' }).click();

    await expect(page.getByRole('heading', { name: 'Сделай закладку' })).toBeVisible();

    await page.getByRole('button', { name: 'Продолжить' }).click();
    await expect(page.getByRole('heading', { name: /Открой меню/ })).toBeVisible();
    await expect(page.getByText(/пустой/i).first()).toBeVisible();

    await expect(page.getByRole('heading', { name: /Failed to fetch/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /полную закладку/i })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Что умеет меню' })).toBeVisible();
    await expect(page.getByText('Что делает').first()).toBeVisible();
    await expect(page.getByText('Когда брать').first()).toBeVisible();
    await expect(page.locator('.card-title')).toHaveCount(4);
    await expect(page.locator('.card-title').first()).toContainText(/таблица/i);
  });
});

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
    await expect(page.getByRole('button', { name: 'Скопировать' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Продолжить' })).toBeHidden();

    await page.getByRole('button', { name: 'Скопировать' }).click();
    await expect(page.getByRole('button', { name: 'Продолжить' })).toBeVisible();
    await page.getByRole('button', { name: 'Продолжить' }).click();

    await expect(page.getByRole('heading', { name: 'Сделай закладку' })).toBeVisible();

    await page.getByRole('button', { name: 'Продолжить' }).click();
    await expect(page.getByRole('heading', { name: /Открой меню/ })).toBeVisible();
    await expect(page.getByText(/пустой/i).first()).toBeVisible();

    await expect(page.getByRole('heading', { name: 'Что умеет меню' })).toBeVisible();
    await expect(page.getByText('Что делает').first()).toBeVisible();
    await expect(page.getByText('Когда брать').first()).toBeVisible();
    await expect(page.locator('.card-title')).toHaveCount(3);
    await expect(page.locator('.card-title').first()).toContainText(/таблица/i);
  });
});

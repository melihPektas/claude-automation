import { test, expect } from '../src/fixtures/pages';
import { searchTerms } from '../src/data/testData';

test.describe('Arama (Autocomplete)', () => {
  test.beforeEach(async ({ home }) => {
    await home.open();
  });

  test('geçerli terim yazınca öneriler listeleniyor', async ({ home, page }) => {
    await home.header.search(searchTerms.valid);
    // Autocomplete "iphone" içeren en az bir öneri göstermeli
    await expect(
      page.getByRole('link', { name: /iphone/i }).first(),
    ).toBeVisible();
  });

  test('öneriye tıklayınca ilgili sayfaya yönlendiriyor', async ({ home, page }) => {
    await home.header.search(searchTerms.valid);
    await home.header.selectFirstSuggestion(searchTerms.valid);
    await expect(page).toHaveURL(/getmobil\.com\/.+/);
    await expect(page.getByRole('heading').first()).toBeVisible();
  });

  test('marka araması sonuç öneriyor', async ({ home, page }) => {
    await home.header.search(searchTerms.brand);
    await expect(
      page.getByRole('link', { name: /samsung|galaxy/i }).first(),
    ).toBeVisible();
  });
});

import { test as base, expect } from '@playwright/test';
import { HomePage } from '../pages/HomePage';
import { CategoryPage } from '../pages/CategoryPage';
import { ProductPage } from '../pages/ProductPage';
import { CartPage } from '../pages/CartPage';
import { SellDevicePage } from '../pages/SellDevicePage';
import { FaqPage } from '../pages/FaqPage';
import { StaticPage } from '../pages/StaticPage';

/**
 * Tüm sayfa nesnelerini hazır enjekte eden özel Playwright fixture'ı.
 * Testlerde `import { test, expect } from '@fixtures/pages'` yeter.
 */
type Pages = {
  home: HomePage;
  category: CategoryPage;
  product: ProductPage;
  cart: CartPage;
  sell: SellDevicePage;
  faq: FaqPage;
  static: StaticPage;
};

export const test = base.extend<Pages>({
  home: async ({ page }, use) => use(new HomePage(page)),
  category: async ({ page }, use) => use(new CategoryPage(page)),
  product: async ({ page }, use) => use(new ProductPage(page)),
  cart: async ({ page }, use) => use(new CartPage(page)),
  sell: async ({ page }, use) => use(new SellDevicePage(page)),
  faq: async ({ page }, use) => use(new FaqPage(page)),
  static: async ({ page }, use) => use(new StaticPage(page)),
});

export { expect };

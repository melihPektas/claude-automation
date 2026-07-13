import { test, expect } from '../src/fixtures/pages';
import { paths } from '../src/data/urls';

test.describe('Sepet', () => {
  test('boş sepet sayfası açılıyor', async ({ cart }) => {
    await cart.open();
    await cart.expectLoaded();
  });

  test('ürün eklenince sepette görünüyor (uçtan uca)', async ({ product, cart, page }) => {
    // 1) Ürün detayına git ve sepete ekle
    await product.open(paths.sampleProduct);
    await product.addToCart();

    // 2) Onay modalındaki "Sepete Git" ile sepete geç ve ürünü doğrula
    await product.goToCartFromConfirmation();
    await cart.expectLoaded();
    await expect(page).toHaveURL(/\/sepetim\//);
    expect(await cart.itemCount()).toBeGreaterThan(0);
  });
});

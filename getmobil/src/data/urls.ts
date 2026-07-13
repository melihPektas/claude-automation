/**
 * Getmobil.com üzerinde test edilen tüm yol (path) tanımları.
 * baseURL playwright.config.ts içinde tanımlıdır; burada yalnızca göreli yollar tutulur.
 */
export const paths = {
  home: '/',

  // Kategori / listeleme sayfaları
  phones: '/satin-al/cep-telefonu/',
  watches: '/satin-al/akilli-saat-ve-bileklik/akilli-saat/',
  computers: '/satin-al/bilgisayar-tablet/',
  accessories: '/satin-al/aksesuar/',
  dealSeries: '/firsat-serisi/cep-telefonu/',
  advantageous: '/avantajli-urunler/',

  // Marka kırılımları
  apple: '/satin-al/cep-telefonu/iphone-ios-telefonlar/apple/',
  samsung: '/satin-al/cep-telefonu/android-telefonlar/samsung/',
  xiaomi: '/satin-al/cep-telefonu/android-telefonlar/xiaomi/',

  // Örnek ürün detay sayfası (add-to-cart senaryosu için sabit, stok garantisi yüksek model)
  sampleProduct:
    '/satin-al/cep-telefonu/iphone-ios-telefonlar/apple/iphone-13/apple-iphone-13-128-gb-yildiz-isigi-837/',

  // İşlemsel sayfalar
  cart: '/sepetim/',
  sellPhone: '/sat/telefon/',
  profile: '/profil/',

  // Kurumsal / statik sayfalar
  faq: '/sikca-sorulan-sorular/',
  about: '/hakkimizda/',
  contact: '/iletisim/',
  blog: '/blog/',
  stores: '/magazalarimiz/',
  documents: '/belgelerimiz/',
  trust: '/getmobil-guvenilir-mi/',
  cosmeticCondition: '/kozmetik-durumu/',
  campaigns: '/tum-kampanyalar/',
  career: '/kariyer/',
  agreements: '/sozlesmeler/',

  // Harici (sadece link doğrulaması amacıyla)
  partnerSignup: 'https://partner.getmobil.com/kayit-ol',
} as const;

export type PathKey = keyof typeof paths;

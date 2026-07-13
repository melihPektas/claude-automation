/**
 * Testlerde kullanılan sabit veriler. Tek yerden yönetilir ki
 * site içeriği değiştiğinde güncelleme kolay olsun.
 */
export const searchTerms = {
  valid: 'iphone 13',
  brand: 'samsung',
  noResult: 'zzzxyxqweasdf123',
};

export const navItems = [
  { label: 'Yenilenmiş Telefon', path: '/satin-al/cep-telefonu/' },
  { label: 'Akıllı Saat ve Bileklik', path: '/satin-al/akilli-saat-ve-bileklik/akilli-saat/' },
  { label: 'Bilgisayar / Tablet', path: '/satin-al/bilgisayar-tablet/' },
  { label: 'Aksesuar', path: '/satin-al/aksesuar/' },
  { label: 'Fırsat Serisi', path: '/firsat-serisi/cep-telefonu/' },
] as const;

// Login modalında kullanılacak örnek (gerçek OTP gönderilmez; sadece istemci-tarafı doğrulama)
export const login = {
  validPhone: '5551234567',
  invalidPhone: '123',
};

// Kozmetik durum etiketleri (ürün detay sayfası)
export const cosmeticGrades = ['Mükemmel', 'Çok İyi', 'İyi', 'Outlet'];

// Ürün listeleme sayfasındaki filtre başlıkları
export const filterGroups = ['Marka', 'Model', 'Fiyat', 'Depolama', 'Renk', 'Satıcı'];

export const ROL_ETIKETLERI = {
  yonetici: 'Yönetici',
  satinalma: 'Satın Alma',
  muayene_kabul: 'Muayene Kabul',
  tasinir_kayit: 'Taşınır Kayıt',
  muhasebe: 'Muhasebe',
  birim_kullanici: 'Birim Kullanıcısı',
};

export const DURUM_ETIKETLERI = {
  ihtiyac_listesi: 'İhtiyaç Listesi',
  teknik_sartname: 'Teknik Şartname',
  teklif_toplama: 'Teklif Toplama',
  siparis: 'Sipariş',
  muayene_kabul: 'Muayene Kabul',
  kayit: 'Sarf/Demirbaş Kaydı',
  muhasebe: 'Muhasebeleştirme',
  tamamlandi: 'Tamamlandı',
  iptal: 'İptal',
};

export const DURUM_SIRASI = [
  'ihtiyac_listesi',
  'teknik_sartname',
  'teklif_toplama',
  'siparis',
  'muayene_kabul',
  'kayit',
  'muhasebe',
  'tamamlandi',
];

export const EVRAK_TURU_ETIKETLERI = {
  ihtiyac_listesi: 'İhtiyaç Listesi',
  teknik_sartname: 'Teknik Şartname',
  yaklasik_maliyet: 'Yaklaşık Maliyet Cetveli',
  onay_belgesi: 'Onay Belgesi',
  teklif_mektubu: 'Teklif Mektubu',
  piyasa_arastirma_tutanagi: 'Piyasa Araştırma Tutanağı',
  siparis_mektubu: 'Sipariş Mektubu',
  muayene_kabul_tutanagi: 'Muayene Kabul Tutanağı',
  tasinir_islem_fisi: 'Taşınır İşlem Fişi',
  fatura: 'Fatura',
  diger: 'Diğer',
};

export const TEKLIF_DURUM_ETIKETLERI = {
  beklemede: 'Beklemede',
  secildi: 'Seçildi (En Avantajlı)',
  elendi: 'Elendi',
};

export const BIRIMLER = [
  'adet', 'kg', 'gr', 'ton', 'lt', 'metre', 'm²', 'm³',
  'paket', 'kutu', 'koli', 'rulo', 'takım', 'çift', 'saat', 'gün', 'ay', 'hizmet',
];

export const tarihFormatla = (t) =>
  t ? new Date(t).toLocaleString('tr-TR', { dateStyle: 'short', timeStyle: 'short' }) : '-';

export const tutarFormatla = (t) =>
  t == null
    ? '-'
    : Number(t).toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' });

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

export const tarihFormatla = (t) =>
  t ? new Date(t).toLocaleString('tr-TR', { dateStyle: 'short', timeStyle: 'short' }) : '-';

export const tutarFormatla = (t) =>
  t == null
    ? '-'
    : Number(t).toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' });

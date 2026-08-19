import 'dotenv/config';

export const config = {
  port: parseInt(process.env.PORT || '3001', 10),
  databaseUrl:
    process.env.DATABASE_URL ||
    'postgres://satinalma:satinalma@localhost:5432/satinalma_takip',
  jwtSecret: process.env.JWT_SECRET || 'gizli-anahtar-degistirin',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '8h',
};

export const ROLLER = [
  'yonetici',
  'satinalma',
  'muayene_kabul',
  'tasinir_kayit',
  'muhasebe',
  'birim_kullanici',
];

export const DURUMLAR = [
  'ihtiyac_listesi',
  'teknik_sartname',
  'teklif_toplama',
  'siparis',
  'muayene_kabul',
  'kayit',
  'muhasebe',
  'tamamlandi',
  'iptal',
];

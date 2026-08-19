-- Aşama 1: Temel şema — kullanıcılar, roller, alım dosyaları, dosya yetkileri

BEGIN;

CREATE TABLE IF NOT EXISTS kullanicilar (
    id              SERIAL PRIMARY KEY,
    kullanici_adi   VARCHAR(50)  NOT NULL UNIQUE,
    ad_soyad        VARCHAR(100) NOT NULL,
    eposta          VARCHAR(150),
    parola_hash     VARCHAR(100) NOT NULL,
    rol             VARCHAR(30)  NOT NULL DEFAULT 'birim_kullanici'
                    CHECK (rol IN ('yonetici', 'satinalma', 'muayene_kabul',
                                   'tasinir_kayit', 'muhasebe', 'birim_kullanici')),
    birim           VARCHAR(100),
    aktif           BOOLEAN      NOT NULL DEFAULT TRUE,
    olusturma_tarihi TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Alım dosyası: doğrudan temin sürecinin ana kaydı
CREATE TABLE IF NOT EXISTS alim_dosyalari (
    id              SERIAL PRIMARY KEY,
    dosya_no        VARCHAR(50)  NOT NULL UNIQUE,
    konu            VARCHAR(255) NOT NULL,
    aciklama        TEXT,
    talep_birimi    VARCHAR(100),
    butce_kalemi    VARCHAR(100),
    tahmini_tutar   NUMERIC(14,2),
    durum           VARCHAR(30)  NOT NULL DEFAULT 'ihtiyac_listesi'
                    CHECK (durum IN ('ihtiyac_listesi', 'teknik_sartname', 'teklif_toplama',
                                     'siparis', 'muayene_kabul', 'kayit', 'muhasebe',
                                     'tamamlandi', 'iptal')),
    olusturan_id    INTEGER      NOT NULL REFERENCES kullanicilar(id),
    olusturma_tarihi TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    guncelleme_tarihi TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Dosya yetkileri: yönetici dışındaki kullanıcılar yalnızca atandıkları dosyada işlem yapar
CREATE TABLE IF NOT EXISTS dosya_yetkileri (
    id          SERIAL PRIMARY KEY,
    dosya_id    INTEGER NOT NULL REFERENCES alim_dosyalari(id) ON DELETE CASCADE,
    kullanici_id INTEGER NOT NULL REFERENCES kullanicilar(id) ON DELETE CASCADE,
    atayan_id   INTEGER REFERENCES kullanicilar(id),
    atama_tarihi TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (dosya_id, kullanici_id)
);

-- Dosya hareket geçmişi: durum değişiklikleri ve önemli işlemler
CREATE TABLE IF NOT EXISTS dosya_hareketleri (
    id          SERIAL PRIMARY KEY,
    dosya_id    INTEGER NOT NULL REFERENCES alim_dosyalari(id) ON DELETE CASCADE,
    kullanici_id INTEGER REFERENCES kullanicilar(id),
    islem       VARCHAR(50) NOT NULL,
    aciklama    TEXT,
    tarih       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_dosya_yetkileri_kullanici ON dosya_yetkileri(kullanici_id);
CREATE INDEX IF NOT EXISTS idx_dosya_hareketleri_dosya ON dosya_hareketleri(dosya_id);
CREATE INDEX IF NOT EXISTS idx_alim_dosyalari_durum ON alim_dosyalari(durum);

COMMIT;

-- Aşama 3: Firmalar, teklifler ve sipariş

BEGIN;

-- Firma kartları: teklif veren / sipariş verilen tedarikçiler
CREATE TABLE IF NOT EXISTS firmalar (
    id              SERIAL PRIMARY KEY,
    unvan           VARCHAR(255) NOT NULL,
    vergi_no        VARCHAR(20),
    vergi_dairesi   VARCHAR(100),
    yetkili         VARCHAR(100),
    telefon         VARCHAR(30),
    eposta          VARCHAR(150),
    adres           TEXT,
    aktif           BOOLEAN NOT NULL DEFAULT TRUE,
    olusturan_id    INTEGER REFERENCES kullanicilar(id),
    olusturma_tarihi TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Teklifler: dosya başına firma teklifleri (bir firma bir dosyaya tek teklif verir)
CREATE TABLE IF NOT EXISTS teklifler (
    id              SERIAL PRIMARY KEY,
    dosya_id        INTEGER NOT NULL REFERENCES alim_dosyalari(id) ON DELETE CASCADE,
    firma_id        INTEGER NOT NULL REFERENCES firmalar(id),
    toplam_tutar    NUMERIC(14,2) NOT NULL CHECK (toplam_tutar > 0),
    teklif_tarihi   DATE NOT NULL DEFAULT CURRENT_DATE,
    gecerlilik_tarihi DATE,
    aciklama        TEXT,
    durum           VARCHAR(20) NOT NULL DEFAULT 'beklemede'
                    CHECK (durum IN ('beklemede', 'secildi', 'elendi')),
    olusturan_id    INTEGER REFERENCES kullanicilar(id),
    olusturma_tarihi TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (dosya_id, firma_id)
);

-- Sipariş: dosya başına tek sipariş, seçilen teklife bağlıdır
CREATE TABLE IF NOT EXISTS siparisler (
    id              SERIAL PRIMARY KEY,
    dosya_id        INTEGER NOT NULL UNIQUE REFERENCES alim_dosyalari(id) ON DELETE CASCADE,
    teklif_id       INTEGER NOT NULL REFERENCES teklifler(id),
    firma_id        INTEGER NOT NULL REFERENCES firmalar(id),
    siparis_no      VARCHAR(50),
    siparis_tarihi  DATE NOT NULL DEFAULT CURRENT_DATE,
    teslim_suresi_gun INTEGER,
    tutar           NUMERIC(14,2) NOT NULL,
    aciklama        TEXT,
    olusturan_id    INTEGER REFERENCES kullanicilar(id),
    olusturma_tarihi TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_teklifler_dosya ON teklifler(dosya_id);
CREATE INDEX IF NOT EXISTS idx_teklifler_firma ON teklifler(firma_id);

COMMIT;

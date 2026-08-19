-- Aşama 2: İhtiyaç listesi kalemleri ve dosya evrakları (teknik şartname vb.)

BEGIN;

-- İhtiyaç listesi kalemleri: alım dosyasındaki mal/hizmet satırları
CREATE TABLE IF NOT EXISTS ihtiyac_kalemleri (
    id              SERIAL PRIMARY KEY,
    dosya_id        INTEGER NOT NULL REFERENCES alim_dosyalari(id) ON DELETE CASCADE,
    sira_no         INTEGER NOT NULL DEFAULT 1,
    mal_hizmet_adi  VARCHAR(255) NOT NULL,
    miktar          NUMERIC(14,3) NOT NULL DEFAULT 1,
    birim           VARCHAR(30)  NOT NULL DEFAULT 'adet',
    ozellikler      TEXT,
    olusturan_id    INTEGER REFERENCES kullanicilar(id),
    olusturma_tarihi TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Dosya evrakları: teknik şartname, onay belgesi, teklif mektubu vb. yüklenen belgeler
CREATE TABLE IF NOT EXISTS dosya_evraklari (
    id              SERIAL PRIMARY KEY,
    dosya_id        INTEGER NOT NULL REFERENCES alim_dosyalari(id) ON DELETE CASCADE,
    evrak_turu      VARCHAR(40) NOT NULL DEFAULT 'diger'
                    CHECK (evrak_turu IN ('ihtiyac_listesi', 'teknik_sartname', 'yaklasik_maliyet',
                                          'onay_belgesi', 'teklif_mektubu', 'piyasa_arastirma_tutanagi',
                                          'siparis_mektubu', 'muayene_kabul_tutanagi',
                                          'tasinir_islem_fisi', 'fatura', 'diger')),
    baslik          VARCHAR(255) NOT NULL,
    orijinal_ad     VARCHAR(255) NOT NULL,
    saklama_adi     VARCHAR(255) NOT NULL UNIQUE,
    mime_turu       VARCHAR(150),
    boyut           BIGINT NOT NULL DEFAULT 0,
    yukleyen_id     INTEGER REFERENCES kullanicilar(id),
    yukleme_tarihi  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ihtiyac_kalemleri_dosya ON ihtiyac_kalemleri(dosya_id);
CREATE INDEX IF NOT EXISTS idx_dosya_evraklari_dosya ON dosya_evraklari(dosya_id);

COMMIT;

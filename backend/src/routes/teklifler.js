import { Router } from 'express';
import { query } from '../db.js';

// /api/dosyalar/:id/teklifler altına bağlanır; dosyaErisimi üst router'da çalışır.
const router = Router({ mergeParams: true });

async function hareketEkle(dosyaId, kullaniciId, islem, aciklama) {
  await query(
    'INSERT INTO dosya_hareketleri (dosya_id, kullanici_id, islem, aciklama) VALUES ($1, $2, $3, $4)',
    [dosyaId, kullaniciId, islem, aciklama || null]
  );
}

async function siparisVarMi(dosyaId) {
  const { rowCount } = await query('SELECT 1 FROM siparisler WHERE dosya_id = $1', [dosyaId]);
  return rowCount > 0;
}

// GET /api/dosyalar/:id/teklifler
router.get('/', async (req, res, next) => {
  try {
    const { rows } = await query(
      `SELECT t.*, f.unvan AS firma_unvan, k.ad_soyad AS olusturan_ad
       FROM teklifler t
       JOIN firmalar f ON f.id = t.firma_id
       LEFT JOIN kullanicilar k ON k.id = t.olusturan_id
       WHERE t.dosya_id = $1
       ORDER BY t.toplam_tutar ASC`,
      [req.dosya.id]
    );
    res.json({ teklifler: rows });
  } catch (err) {
    next(err);
  }
});

// POST /api/dosyalar/:id/teklifler
router.post('/', async (req, res, next) => {
  try {
    if (await siparisVarMi(req.dosya.id)) {
      return res.status(400).json({ hata: 'Sipariş verilmiş dosyaya yeni teklif eklenemez.' });
    }
    const { firma_id, toplam_tutar, teklif_tarihi, gecerlilik_tarihi, aciklama } = req.body || {};
    if (!firma_id || toplam_tutar == null) {
      return res.status(400).json({ hata: 'Firma ve toplam tutar zorunludur.' });
    }
    if (Number.isNaN(Number(toplam_tutar)) || Number(toplam_tutar) <= 0) {
      return res.status(400).json({ hata: 'Toplam tutar sıfırdan büyük olmalıdır.' });
    }
    const firma = await query('SELECT unvan FROM firmalar WHERE id = $1 AND aktif = TRUE', [
      firma_id,
    ]);
    if (firma.rowCount === 0) {
      return res.status(404).json({ hata: 'Firma bulunamadı veya pasif durumda.' });
    }
    const { rows } = await query(
      `INSERT INTO teklifler (dosya_id, firma_id, toplam_tutar, teklif_tarihi, gecerlilik_tarihi, aciklama, olusturan_id)
       VALUES ($1, $2, $3, COALESCE($4, CURRENT_DATE), $5, $6, $7)
       RETURNING *`,
      [
        req.dosya.id,
        firma_id,
        toplam_tutar,
        teklif_tarihi || null,
        gecerlilik_tarihi || null,
        aciklama || null,
        req.user.id,
      ]
    );
    await hareketEkle(
      req.dosya.id,
      req.user.id,
      'teklif_eklendi',
      `${firma.rows[0].unvan} — ${Number(toplam_tutar).toLocaleString('tr-TR')} ₺`
    );
    res.status(201).json({ teklif: rows[0] });
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ hata: 'Bu firmanın bu dosyada zaten teklifi var.' });
    }
    next(err);
  }
});

// PUT /api/dosyalar/:id/teklifler/:teklifId
router.put('/:teklifId', async (req, res, next) => {
  try {
    if (await siparisVarMi(req.dosya.id)) {
      return res.status(400).json({ hata: 'Sipariş verilmiş dosyada teklif güncellenemez.' });
    }
    const teklifId = parseInt(req.params.teklifId, 10);
    const { toplam_tutar, teklif_tarihi, gecerlilik_tarihi, aciklama } = req.body || {};
    if (
      toplam_tutar != null &&
      (Number.isNaN(Number(toplam_tutar)) || Number(toplam_tutar) <= 0)
    ) {
      return res.status(400).json({ hata: 'Toplam tutar sıfırdan büyük olmalıdır.' });
    }
    const { rows } = await query(
      `UPDATE teklifler SET
         toplam_tutar      = COALESCE($1, toplam_tutar),
         teklif_tarihi     = COALESCE($2, teklif_tarihi),
         gecerlilik_tarihi = COALESCE($3, gecerlilik_tarihi),
         aciklama          = COALESCE($4, aciklama)
       WHERE id = $5 AND dosya_id = $6
       RETURNING *`,
      [
        toplam_tutar ?? null,
        teklif_tarihi ?? null,
        gecerlilik_tarihi ?? null,
        aciklama ?? null,
        teklifId,
        req.dosya.id,
      ]
    );
    if (rows.length === 0) {
      return res.status(404).json({ hata: 'Teklif bulunamadı.' });
    }
    await hareketEkle(req.dosya.id, req.user.id, 'teklif_guncellendi', null);
    res.json({ teklif: rows[0] });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/dosyalar/:id/teklifler/:teklifId
router.delete('/:teklifId', async (req, res, next) => {
  try {
    if (await siparisVarMi(req.dosya.id)) {
      return res.status(400).json({ hata: 'Sipariş verilmiş dosyada teklif silinemez.' });
    }
    const teklifId = parseInt(req.params.teklifId, 10);
    const { rows } = await query(
      `DELETE FROM teklifler WHERE id = $1 AND dosya_id = $2
       RETURNING (SELECT unvan FROM firmalar WHERE id = firma_id) AS firma_unvan`,
      [teklifId, req.dosya.id]
    );
    if (rows.length === 0) {
      return res.status(404).json({ hata: 'Teklif bulunamadı.' });
    }
    await hareketEkle(req.dosya.id, req.user.id, 'teklif_silindi', rows[0].firma_unvan);
    res.json({ mesaj: 'Teklif silindi.' });
  } catch (err) {
    next(err);
  }
});

// POST /api/dosyalar/:id/teklifler/:teklifId/sec — en avantajlı teklifi belirle
router.post('/:teklifId/sec', async (req, res, next) => {
  try {
    if (await siparisVarMi(req.dosya.id)) {
      return res.status(400).json({ hata: 'Sipariş verilmiş dosyada teklif seçimi değiştirilemez.' });
    }
    const teklifId = parseInt(req.params.teklifId, 10);
    const { gerekce } = req.body || {};
    const teklif = await query(
      `SELECT t.*, f.unvan AS firma_unvan FROM teklifler t
       JOIN firmalar f ON f.id = t.firma_id
       WHERE t.id = $1 AND t.dosya_id = $2`,
      [teklifId, req.dosya.id]
    );
    if (teklif.rowCount === 0) {
      return res.status(404).json({ hata: 'Teklif bulunamadı.' });
    }
    await query(
      `UPDATE teklifler SET durum = CASE WHEN id = $1 THEN 'secildi' ELSE 'elendi' END
       WHERE dosya_id = $2`,
      [teklifId, req.dosya.id]
    );
    const secilen = teklif.rows[0];
    await hareketEkle(
      req.dosya.id,
      req.user.id,
      'teklif_secildi',
      `${secilen.firma_unvan} — ${Number(secilen.toplam_tutar).toLocaleString('tr-TR')} ₺` +
        (gerekce ? ` (Gerekçe: ${gerekce})` : '')
    );
    res.json({ mesaj: 'Teklif en avantajlı olarak seçildi.' });
  } catch (err) {
    next(err);
  }
});

export default router;

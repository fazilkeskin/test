import { Router } from 'express';
import { query } from '../db.js';

// /api/dosyalar/:id/kalemler altına bağlanır; dosyaErisimi middleware'i
// üst router'da çalıştığı için req.dosya ve req.user hazırdır.
const router = Router({ mergeParams: true });

async function hareketEkle(dosyaId, kullaniciId, islem, aciklama) {
  await query(
    'INSERT INTO dosya_hareketleri (dosya_id, kullanici_id, islem, aciklama) VALUES ($1, $2, $3, $4)',
    [dosyaId, kullaniciId, islem, aciklama || null]
  );
}

// GET /api/dosyalar/:id/kalemler
router.get('/', async (req, res, next) => {
  try {
    const { rows } = await query(
      'SELECT * FROM ihtiyac_kalemleri WHERE dosya_id = $1 ORDER BY sira_no, id',
      [req.dosya.id]
    );
    res.json({ kalemler: rows });
  } catch (err) {
    next(err);
  }
});

// POST /api/dosyalar/:id/kalemler
router.post('/', async (req, res, next) => {
  try {
    const { mal_hizmet_adi, miktar, birim, ozellikler } = req.body || {};
    if (!mal_hizmet_adi) {
      return res.status(400).json({ hata: 'Mal/hizmet adı zorunludur.' });
    }
    if (miktar != null && (Number.isNaN(Number(miktar)) || Number(miktar) <= 0)) {
      return res.status(400).json({ hata: 'Miktar sıfırdan büyük bir sayı olmalıdır.' });
    }
    const siraSonuc = await query(
      'SELECT COALESCE(MAX(sira_no), 0) + 1 AS sonraki FROM ihtiyac_kalemleri WHERE dosya_id = $1',
      [req.dosya.id]
    );
    const { rows } = await query(
      `INSERT INTO ihtiyac_kalemleri (dosya_id, sira_no, mal_hizmet_adi, miktar, birim, ozellikler, olusturan_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [
        req.dosya.id,
        siraSonuc.rows[0].sonraki,
        mal_hizmet_adi,
        miktar || 1,
        birim || 'adet',
        ozellikler || null,
        req.user.id,
      ]
    );
    await hareketEkle(req.dosya.id, req.user.id, 'kalem_eklendi', mal_hizmet_adi);
    res.status(201).json({ kalem: rows[0] });
  } catch (err) {
    next(err);
  }
});

// PUT /api/dosyalar/:id/kalemler/:kalemId
router.put('/:kalemId', async (req, res, next) => {
  try {
    const kalemId = parseInt(req.params.kalemId, 10);
    const { mal_hizmet_adi, miktar, birim, ozellikler } = req.body || {};
    if (miktar != null && (Number.isNaN(Number(miktar)) || Number(miktar) <= 0)) {
      return res.status(400).json({ hata: 'Miktar sıfırdan büyük bir sayı olmalıdır.' });
    }
    const { rows } = await query(
      `UPDATE ihtiyac_kalemleri SET
         mal_hizmet_adi = COALESCE($1, mal_hizmet_adi),
         miktar         = COALESCE($2, miktar),
         birim          = COALESCE($3, birim),
         ozellikler     = COALESCE($4, ozellikler)
       WHERE id = $5 AND dosya_id = $6
       RETURNING *`,
      [mal_hizmet_adi ?? null, miktar ?? null, birim ?? null, ozellikler ?? null, kalemId, req.dosya.id]
    );
    if (rows.length === 0) {
      return res.status(404).json({ hata: 'Kalem bulunamadı.' });
    }
    await hareketEkle(req.dosya.id, req.user.id, 'kalem_guncellendi', rows[0].mal_hizmet_adi);
    res.json({ kalem: rows[0] });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/dosyalar/:id/kalemler/:kalemId
router.delete('/:kalemId', async (req, res, next) => {
  try {
    const kalemId = parseInt(req.params.kalemId, 10);
    const { rows } = await query(
      'DELETE FROM ihtiyac_kalemleri WHERE id = $1 AND dosya_id = $2 RETURNING mal_hizmet_adi',
      [kalemId, req.dosya.id]
    );
    if (rows.length === 0) {
      return res.status(404).json({ hata: 'Kalem bulunamadı.' });
    }
    await hareketEkle(req.dosya.id, req.user.id, 'kalem_silindi', rows[0].mal_hizmet_adi);
    res.json({ mesaj: 'Kalem silindi.' });
  } catch (err) {
    next(err);
  }
});

export default router;

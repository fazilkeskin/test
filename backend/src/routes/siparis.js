import { Router } from 'express';
import { query } from '../db.js';

// /api/dosyalar/:id/siparis altına bağlanır; dosyaErisimi üst router'da çalışır.
const router = Router({ mergeParams: true });

async function hareketEkle(dosyaId, kullaniciId, islem, aciklama) {
  await query(
    'INSERT INTO dosya_hareketleri (dosya_id, kullanici_id, islem, aciklama) VALUES ($1, $2, $3, $4)',
    [dosyaId, kullaniciId, islem, aciklama || null]
  );
}

// GET /api/dosyalar/:id/siparis
router.get('/', async (req, res, next) => {
  try {
    const { rows } = await query(
      `SELECT s.*, f.unvan AS firma_unvan, f.yetkili, f.telefon, f.eposta,
              k.ad_soyad AS olusturan_ad
       FROM siparisler s
       JOIN firmalar f ON f.id = s.firma_id
       LEFT JOIN kullanicilar k ON k.id = s.olusturan_id
       WHERE s.dosya_id = $1`,
      [req.dosya.id]
    );
    res.json({ siparis: rows[0] || null });
  } catch (err) {
    next(err);
  }
});

// POST /api/dosyalar/:id/siparis — seçilen teklif üzerinden sipariş oluşturur
router.post('/', async (req, res, next) => {
  try {
    const { siparis_no, siparis_tarihi, teslim_suresi_gun, aciklama } = req.body || {};
    const secilen = await query(
      `SELECT t.*, f.unvan AS firma_unvan FROM teklifler t
       JOIN firmalar f ON f.id = t.firma_id
       WHERE t.dosya_id = $1 AND t.durum = 'secildi'`,
      [req.dosya.id]
    );
    if (secilen.rowCount === 0) {
      return res
        .status(400)
        .json({ hata: 'Önce en avantajlı teklifi seçmelisiniz.' });
    }
    if (teslim_suresi_gun != null && (!Number.isInteger(Number(teslim_suresi_gun)) || Number(teslim_suresi_gun) <= 0)) {
      return res.status(400).json({ hata: 'Teslim süresi pozitif tam sayı (gün) olmalıdır.' });
    }
    const teklif = secilen.rows[0];
    const { rows } = await query(
      `INSERT INTO siparisler
         (dosya_id, teklif_id, firma_id, siparis_no, siparis_tarihi, teslim_suresi_gun, tutar, aciklama, olusturan_id)
       VALUES ($1, $2, $3, $4, COALESCE($5, CURRENT_DATE), $6, $7, $8, $9)
       RETURNING *`,
      [
        req.dosya.id,
        teklif.id,
        teklif.firma_id,
        siparis_no || null,
        siparis_tarihi || null,
        teslim_suresi_gun || null,
        teklif.toplam_tutar,
        aciklama || null,
        req.user.id,
      ]
    );
    await query(
      "UPDATE alim_dosyalari SET durum = 'siparis', guncelleme_tarihi = NOW() WHERE id = $1",
      [req.dosya.id]
    );
    await hareketEkle(
      req.dosya.id,
      req.user.id,
      'siparis_verildi',
      `${teklif.firma_unvan} — ${Number(teklif.toplam_tutar).toLocaleString('tr-TR')} ₺`
    );
    res.status(201).json({ siparis: rows[0] });
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ hata: 'Bu dosya için zaten sipariş oluşturulmuş.' });
    }
    next(err);
  }
});

// DELETE /api/dosyalar/:id/siparis — sipariş iptali (yalnızca yönetici)
router.delete('/', async (req, res, next) => {
  try {
    if (req.user.rol !== 'yonetici') {
      return res.status(403).json({ hata: 'Siparişi yalnızca yönetici iptal edebilir.' });
    }
    const { rows } = await query('DELETE FROM siparisler WHERE dosya_id = $1 RETURNING id', [
      req.dosya.id,
    ]);
    if (rows.length === 0) {
      return res.status(404).json({ hata: 'Sipariş bulunamadı.' });
    }
    await query(
      "UPDATE alim_dosyalari SET durum = 'teklif_toplama', guncelleme_tarihi = NOW() WHERE id = $1",
      [req.dosya.id]
    );
    await hareketEkle(req.dosya.id, req.user.id, 'siparis_iptal', null);
    res.json({ mesaj: 'Sipariş iptal edildi, dosya teklif toplama aşamasına döndü.' });
  } catch (err) {
    next(err);
  }
});

export default router;

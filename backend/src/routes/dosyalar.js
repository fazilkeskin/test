import { Router } from 'express';
import { DURUMLAR } from '../config.js';
import { query } from '../db.js';
import { authRequired, rolGerekli, dosyaErisimi } from '../middleware/auth.js';
import kalemlerRouter from './kalemler.js';
import evraklarRouter from './evraklar.js';

const router = Router();

router.use(authRequired);

// Alt kaynaklar: erişim kontrolü dosyaErisimi ile yapılır
router.use('/:id/kalemler', dosyaErisimi, kalemlerRouter);
router.use('/:id/evraklar', dosyaErisimi, evraklarRouter);

async function hareketEkle(dosyaId, kullaniciId, islem, aciklama) {
  await query(
    'INSERT INTO dosya_hareketleri (dosya_id, kullanici_id, islem, aciklama) VALUES ($1, $2, $3, $4)',
    [dosyaId, kullaniciId, islem, aciklama || null]
  );
}

// GET /api/dosyalar — yönetici tüm dosyaları, diğerleri yalnızca atandıklarını görür
router.get('/', async (req, res, next) => {
  try {
    let rows;
    if (req.user.rol === 'yonetici') {
      ({ rows } = await query(
        `SELECT d.*, k.ad_soyad AS olusturan_ad
         FROM alim_dosyalari d
         JOIN kullanicilar k ON k.id = d.olusturan_id
         ORDER BY d.olusturma_tarihi DESC`
      ));
    } else {
      ({ rows } = await query(
        `SELECT d.*, k.ad_soyad AS olusturan_ad
         FROM alim_dosyalari d
         JOIN kullanicilar k ON k.id = d.olusturan_id
         JOIN dosya_yetkileri y ON y.dosya_id = d.id AND y.kullanici_id = $1
         ORDER BY d.olusturma_tarihi DESC`,
        [req.user.id]
      ));
    }
    res.json({ dosyalar: rows });
  } catch (err) {
    next(err);
  }
});

// POST /api/dosyalar — yalnızca yönetici yeni alım dosyası açar
router.post('/', rolGerekli(), async (req, res, next) => {
  try {
    const { dosya_no, konu, aciklama, talep_birimi, butce_kalemi, tahmini_tutar } =
      req.body || {};
    if (!dosya_no || !konu) {
      return res.status(400).json({ hata: 'Dosya no ve konu zorunludur.' });
    }
    const { rows } = await query(
      `INSERT INTO alim_dosyalari
         (dosya_no, konu, aciklama, talep_birimi, butce_kalemi, tahmini_tutar, olusturan_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [
        dosya_no,
        konu,
        aciklama || null,
        talep_birimi || null,
        butce_kalemi || null,
        tahmini_tutar || null,
        req.user.id,
      ]
    );
    await hareketEkle(rows[0].id, req.user.id, 'dosya_olusturuldu', `Dosya açıldı: ${konu}`);
    res.status(201).json({ dosya: rows[0] });
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ hata: 'Bu dosya numarası zaten kayıtlı.' });
    }
    next(err);
  }
});

// GET /api/dosyalar/:id — dosya detayı, atanan kullanıcılar ve hareket geçmişi
router.get('/:id', dosyaErisimi, async (req, res, next) => {
  try {
    const [yetkiler, hareketler] = await Promise.all([
      query(
        `SELECT y.id, y.kullanici_id, k.ad_soyad, k.rol, k.birim, y.atama_tarihi
         FROM dosya_yetkileri y
         JOIN kullanicilar k ON k.id = y.kullanici_id
         WHERE y.dosya_id = $1
         ORDER BY k.ad_soyad`,
        [req.dosya.id]
      ),
      query(
        `SELECT h.*, k.ad_soyad
         FROM dosya_hareketleri h
         LEFT JOIN kullanicilar k ON k.id = h.kullanici_id
         WHERE h.dosya_id = $1
         ORDER BY h.tarih DESC`,
        [req.dosya.id]
      ),
    ]);
    res.json({
      dosya: req.dosya,
      atanan_kullanicilar: yetkiler.rows,
      hareketler: hareketler.rows,
    });
  } catch (err) {
    next(err);
  }
});

// PUT /api/dosyalar/:id — dosya bilgilerini ve durumunu güncelle
router.put('/:id', dosyaErisimi, async (req, res, next) => {
  try {
    const { konu, aciklama, talep_birimi, butce_kalemi, tahmini_tutar, durum } = req.body || {};
    if (durum && !DURUMLAR.includes(durum)) {
      return res.status(400).json({ hata: 'Geçersiz dosya durumu.' });
    }
    const { rows } = await query(
      `UPDATE alim_dosyalari SET
         konu          = COALESCE($1, konu),
         aciklama      = COALESCE($2, aciklama),
         talep_birimi  = COALESCE($3, talep_birimi),
         butce_kalemi  = COALESCE($4, butce_kalemi),
         tahmini_tutar = COALESCE($5, tahmini_tutar),
         durum         = COALESCE($6, durum),
         guncelleme_tarihi = NOW()
       WHERE id = $7
       RETURNING *`,
      [
        konu ?? null,
        aciklama ?? null,
        talep_birimi ?? null,
        butce_kalemi ?? null,
        tahmini_tutar ?? null,
        durum ?? null,
        req.dosya.id,
      ]
    );
    if (durum && durum !== req.dosya.durum) {
      await hareketEkle(
        req.dosya.id,
        req.user.id,
        'durum_degisti',
        `${req.dosya.durum} → ${durum}`
      );
    }
    res.json({ dosya: rows[0] });
  } catch (err) {
    next(err);
  }
});

// POST /api/dosyalar/:id/yetkiler — dosyaya kullanıcı atama (yalnızca yönetici)
router.post('/:id/yetkiler', rolGerekli(), dosyaErisimi, async (req, res, next) => {
  try {
    const { kullanici_id } = req.body || {};
    if (!kullanici_id) {
      return res.status(400).json({ hata: 'Kullanıcı seçimi zorunludur.' });
    }
    const kullanici = await query(
      'SELECT id, ad_soyad FROM kullanicilar WHERE id = $1 AND aktif = TRUE',
      [kullanici_id]
    );
    if (kullanici.rowCount === 0) {
      return res.status(404).json({ hata: 'Kullanıcı bulunamadı veya pasif durumda.' });
    }
    await query(
      `INSERT INTO dosya_yetkileri (dosya_id, kullanici_id, atayan_id)
       VALUES ($1, $2, $3)
       ON CONFLICT (dosya_id, kullanici_id) DO NOTHING`,
      [req.dosya.id, kullanici_id, req.user.id]
    );
    await hareketEkle(
      req.dosya.id,
      req.user.id,
      'kullanici_atandi',
      `${kullanici.rows[0].ad_soyad} dosyaya atandı`
    );
    res.status(201).json({ mesaj: 'Kullanıcı dosyaya atandı.' });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/dosyalar/:id/yetkiler/:kullaniciId — atamayı kaldır (yalnızca yönetici)
router.delete('/:id/yetkiler/:kullaniciId', rolGerekli(), dosyaErisimi, async (req, res, next) => {
  try {
    const kullaniciId = parseInt(req.params.kullaniciId, 10);
    const { rowCount } = await query(
      'DELETE FROM dosya_yetkileri WHERE dosya_id = $1 AND kullanici_id = $2',
      [req.dosya.id, kullaniciId]
    );
    if (rowCount === 0) {
      return res.status(404).json({ hata: 'Atama bulunamadı.' });
    }
    await hareketEkle(req.dosya.id, req.user.id, 'atama_kaldirildi', null);
    res.json({ mesaj: 'Atama kaldırıldı.' });
  } catch (err) {
    next(err);
  }
});

export default router;

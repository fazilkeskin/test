import { Router } from 'express';
import multer from 'multer';
import crypto from 'node:crypto';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { query } from '../db.js';

// /api/dosyalar/:id/evraklar altına bağlanır; dosyaErisimi üst router'da çalışır.
const router = Router({ mergeParams: true });

export const EVRAK_TURLERI = [
  'ihtiyac_listesi',
  'teknik_sartname',
  'yaklasik_maliyet',
  'onay_belgesi',
  'teklif_mektubu',
  'piyasa_arastirma_tutanagi',
  'siparis_mektubu',
  'muayene_kabul_tutanagi',
  'tasinir_islem_fisi',
  'fatura',
  'diger',
];

const uploadsDir = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
  '..',
  'uploads'
);
fs.mkdirSync(uploadsDir, { recursive: true });

const IZINLI_UZANTILAR = new Set([
  '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.odt', '.ods',
  '.png', '.jpg', '.jpeg', '.txt', '.csv', '.zip',
]);

const storage = multer.diskStorage({
  destination: uploadsDir,
  filename: (req, file, cb) => {
    const uzanti = path.extname(file.originalname).toLowerCase();
    cb(null, `${crypto.randomUUID()}${uzanti}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 20 * 1024 * 1024 }, // 20 MB
  fileFilter: (req, file, cb) => {
    const uzanti = path.extname(file.originalname).toLowerCase();
    if (!IZINLI_UZANTILAR.has(uzanti)) {
      return cb(new Error('UZANTI_IZINSIZ'));
    }
    cb(null, true);
  },
});

async function hareketEkle(dosyaId, kullaniciId, islem, aciklama) {
  await query(
    'INSERT INTO dosya_hareketleri (dosya_id, kullanici_id, islem, aciklama) VALUES ($1, $2, $3, $4)',
    [dosyaId, kullaniciId, islem, aciklama || null]
  );
}

// GET /api/dosyalar/:id/evraklar
router.get('/', async (req, res, next) => {
  try {
    const { rows } = await query(
      `SELECT e.id, e.evrak_turu, e.baslik, e.orijinal_ad, e.mime_turu, e.boyut,
              e.yukleme_tarihi, k.ad_soyad AS yukleyen_ad
       FROM dosya_evraklari e
       LEFT JOIN kullanicilar k ON k.id = e.yukleyen_id
       WHERE e.dosya_id = $1
       ORDER BY e.yukleme_tarihi DESC`,
      [req.dosya.id]
    );
    res.json({ evraklar: rows });
  } catch (err) {
    next(err);
  }
});

// POST /api/dosyalar/:id/evraklar — multipart/form-data: evrak (dosya), evrak_turu, baslik
router.post('/', (req, res, next) => {
  upload.single('evrak')(req, res, async (err) => {
    if (err) {
      if (err.message === 'UZANTI_IZINSIZ') {
        return res.status(400).json({ hata: 'Bu dosya türüne izin verilmiyor.' });
      }
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ hata: 'Dosya boyutu 20 MB sınırını aşıyor.' });
      }
      return next(err);
    }
    try {
      if (!req.file) {
        return res.status(400).json({ hata: 'Yüklenecek dosya seçilmedi.' });
      }
      const { evrak_turu, baslik } = req.body || {};
      if (evrak_turu && !EVRAK_TURLERI.includes(evrak_turu)) {
        fs.unlink(req.file.path, () => {});
        return res.status(400).json({ hata: 'Geçersiz evrak türü.' });
      }
      // Tarayıcı orijinal dosya adını latin1 olarak gönderir; UTF-8'e çevir
      const orijinalAd = Buffer.from(req.file.originalname, 'latin1').toString('utf8');
      const { rows } = await query(
        `INSERT INTO dosya_evraklari
           (dosya_id, evrak_turu, baslik, orijinal_ad, saklama_adi, mime_turu, boyut, yukleyen_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING id, evrak_turu, baslik, orijinal_ad, mime_turu, boyut, yukleme_tarihi`,
        [
          req.dosya.id,
          evrak_turu || 'diger',
          baslik || orijinalAd,
          orijinalAd,
          req.file.filename,
          req.file.mimetype,
          req.file.size,
          req.user.id,
        ]
      );
      await hareketEkle(req.dosya.id, req.user.id, 'evrak_yuklendi', rows[0].baslik);
      res.status(201).json({ evrak: rows[0] });
    } catch (dbErr) {
      fs.unlink(req.file.path, () => {});
      next(dbErr);
    }
  });
});

// GET /api/dosyalar/:id/evraklar/:evrakId/indir
router.get('/:evrakId/indir', async (req, res, next) => {
  try {
    const evrakId = parseInt(req.params.evrakId, 10);
    const { rows } = await query(
      'SELECT * FROM dosya_evraklari WHERE id = $1 AND dosya_id = $2',
      [evrakId, req.dosya.id]
    );
    if (rows.length === 0) {
      return res.status(404).json({ hata: 'Evrak bulunamadı.' });
    }
    const evrak = rows[0];
    const yol = path.join(uploadsDir, evrak.saklama_adi);
    if (!fs.existsSync(yol)) {
      return res.status(410).json({ hata: 'Evrak dosyası sunucuda bulunamadı.' });
    }
    res.download(yol, evrak.orijinal_ad);
  } catch (err) {
    next(err);
  }
});

// DELETE /api/dosyalar/:id/evraklar/:evrakId
router.delete('/:evrakId', async (req, res, next) => {
  try {
    const evrakId = parseInt(req.params.evrakId, 10);
    // Evrakı yalnızca yükleyen kullanıcı veya yönetici silebilir
    const { rows } = await query(
      'SELECT * FROM dosya_evraklari WHERE id = $1 AND dosya_id = $2',
      [evrakId, req.dosya.id]
    );
    if (rows.length === 0) {
      return res.status(404).json({ hata: 'Evrak bulunamadı.' });
    }
    if (req.user.rol !== 'yonetici' && rows[0].yukleyen_id !== req.user.id) {
      return res.status(403).json({ hata: 'Yalnızca evrakı yükleyen kullanıcı veya yönetici silebilir.' });
    }
    await query('DELETE FROM dosya_evraklari WHERE id = $1', [evrakId]);
    fs.unlink(path.join(uploadsDir, rows[0].saklama_adi), () => {});
    await hareketEkle(req.dosya.id, req.user.id, 'evrak_silindi', rows[0].baslik);
    res.json({ mesaj: 'Evrak silindi.' });
  } catch (err) {
    next(err);
  }
});

export default router;

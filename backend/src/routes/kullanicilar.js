import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { ROLLER } from '../config.js';
import { query } from '../db.js';
import { authRequired, rolGerekli } from '../middleware/auth.js';

const router = Router();

// Kullanıcı yönetimi yalnızca yönetici içindir
router.use(authRequired, rolGerekli());

const KULLANICI_ALANLARI =
  'id, kullanici_adi, ad_soyad, eposta, rol, birim, aktif, olusturma_tarihi';

// GET /api/kullanicilar
router.get('/', async (req, res, next) => {
  try {
    const { rows } = await query(
      `SELECT ${KULLANICI_ALANLARI} FROM kullanicilar ORDER BY ad_soyad`
    );
    res.json({ kullanicilar: rows });
  } catch (err) {
    next(err);
  }
});

// POST /api/kullanicilar
router.post('/', async (req, res, next) => {
  try {
    const { kullanici_adi, ad_soyad, eposta, parola, rol, birim } = req.body || {};
    if (!kullanici_adi || !ad_soyad || !parola) {
      return res.status(400).json({ hata: 'Kullanıcı adı, ad soyad ve parola zorunludur.' });
    }
    if (parola.length < 6) {
      return res.status(400).json({ hata: 'Parola en az 6 karakter olmalıdır.' });
    }
    if (rol && !ROLLER.includes(rol)) {
      return res.status(400).json({ hata: 'Geçersiz rol.' });
    }
    const hash = await bcrypt.hash(parola, 10);
    const { rows } = await query(
      `INSERT INTO kullanicilar (kullanici_adi, ad_soyad, eposta, parola_hash, rol, birim)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING ${KULLANICI_ALANLARI}`,
      [kullanici_adi, ad_soyad, eposta || null, hash, rol || 'birim_kullanici', birim || null]
    );
    res.status(201).json({ kullanici: rows[0] });
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ hata: 'Bu kullanıcı adı zaten kayıtlı.' });
    }
    next(err);
  }
});

// PUT /api/kullanicilar/:id
router.put('/:id', async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    const { ad_soyad, eposta, rol, birim, aktif, parola } = req.body || {};
    if (rol && !ROLLER.includes(rol)) {
      return res.status(400).json({ hata: 'Geçersiz rol.' });
    }
    // Yönetici kendi hesabını pasifleştiremez ve rolünü düşüremez
    if (id === req.user.id && (aktif === false || (rol && rol !== 'yonetici'))) {
      return res.status(400).json({ hata: 'Kendi hesabınızı pasifleştiremez veya rolünüzü değiştiremezsiniz.' });
    }
    const { rows } = await query(
      `UPDATE kullanicilar SET
         ad_soyad = COALESCE($1, ad_soyad),
         eposta   = COALESCE($2, eposta),
         rol      = COALESCE($3, rol),
         birim    = COALESCE($4, birim),
         aktif    = COALESCE($5, aktif)
       WHERE id = $6
       RETURNING ${KULLANICI_ALANLARI}`,
      [ad_soyad ?? null, eposta ?? null, rol ?? null, birim ?? null, aktif ?? null, id]
    );
    if (rows.length === 0) {
      return res.status(404).json({ hata: 'Kullanıcı bulunamadı.' });
    }
    if (parola) {
      if (parola.length < 6) {
        return res.status(400).json({ hata: 'Parola en az 6 karakter olmalıdır.' });
      }
      const hash = await bcrypt.hash(parola, 10);
      await query('UPDATE kullanicilar SET parola_hash = $1 WHERE id = $2', [hash, id]);
    }
    res.json({ kullanici: rows[0] });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/kullanicilar/:id — kalıcı silme yerine pasifleştirme
router.delete('/:id', async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (id === req.user.id) {
      return res.status(400).json({ hata: 'Kendi hesabınızı pasifleştiremezsiniz.' });
    }
    const { rowCount } = await query(
      'UPDATE kullanicilar SET aktif = FALSE WHERE id = $1',
      [id]
    );
    if (rowCount === 0) {
      return res.status(404).json({ hata: 'Kullanıcı bulunamadı.' });
    }
    res.json({ mesaj: 'Kullanıcı pasifleştirildi.' });
  } catch (err) {
    next(err);
  }
});

export default router;

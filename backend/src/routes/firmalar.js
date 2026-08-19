import { Router } from 'express';
import { query } from '../db.js';
import { authRequired, rolGerekli } from '../middleware/auth.js';

const router = Router();

router.use(authRequired);

// GET /api/firmalar — teklif girişinde kullanılacağı için tüm oturumlu kullanıcılar listeleyebilir
router.get('/', async (req, res, next) => {
  try {
    const { rows } = await query('SELECT * FROM firmalar ORDER BY unvan');
    res.json({ firmalar: rows });
  } catch (err) {
    next(err);
  }
});

// Firma kartı yönetimi: satın alma birimi ve yönetici
router.post('/', rolGerekli('satinalma'), async (req, res, next) => {
  try {
    const { unvan, vergi_no, vergi_dairesi, yetkili, telefon, eposta, adres } = req.body || {};
    if (!unvan) {
      return res.status(400).json({ hata: 'Firma unvanı zorunludur.' });
    }
    const { rows } = await query(
      `INSERT INTO firmalar (unvan, vergi_no, vergi_dairesi, yetkili, telefon, eposta, adres, olusturan_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [
        unvan,
        vergi_no || null,
        vergi_dairesi || null,
        yetkili || null,
        telefon || null,
        eposta || null,
        adres || null,
        req.user.id,
      ]
    );
    res.status(201).json({ firma: rows[0] });
  } catch (err) {
    next(err);
  }
});

router.put('/:id', rolGerekli('satinalma'), async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    const { unvan, vergi_no, vergi_dairesi, yetkili, telefon, eposta, adres, aktif } =
      req.body || {};
    const { rows } = await query(
      `UPDATE firmalar SET
         unvan         = COALESCE($1, unvan),
         vergi_no      = COALESCE($2, vergi_no),
         vergi_dairesi = COALESCE($3, vergi_dairesi),
         yetkili       = COALESCE($4, yetkili),
         telefon       = COALESCE($5, telefon),
         eposta        = COALESCE($6, eposta),
         adres         = COALESCE($7, adres),
         aktif         = COALESCE($8, aktif)
       WHERE id = $9
       RETURNING *`,
      [
        unvan ?? null,
        vergi_no ?? null,
        vergi_dairesi ?? null,
        yetkili ?? null,
        telefon ?? null,
        eposta ?? null,
        adres ?? null,
        aktif ?? null,
        id,
      ]
    );
    if (rows.length === 0) {
      return res.status(404).json({ hata: 'Firma bulunamadı.' });
    }
    res.json({ firma: rows[0] });
  } catch (err) {
    next(err);
  }
});

// Silme yerine pasifleştirme: geçmiş teklif/sipariş kayıtları korunur
router.delete('/:id', rolGerekli('satinalma'), async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    const { rowCount } = await query('UPDATE firmalar SET aktif = FALSE WHERE id = $1', [id]);
    if (rowCount === 0) {
      return res.status(404).json({ hata: 'Firma bulunamadı.' });
    }
    res.json({ mesaj: 'Firma pasifleştirildi.' });
  } catch (err) {
    next(err);
  }
});

export default router;

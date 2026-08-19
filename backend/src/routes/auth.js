import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { config } from '../config.js';
import { query } from '../db.js';
import { authRequired } from '../middleware/auth.js';

const router = Router();

// POST /api/auth/login
router.post('/login', async (req, res, next) => {
  try {
    const { kullanici_adi, parola } = req.body || {};
    if (!kullanici_adi || !parola) {
      return res.status(400).json({ hata: 'Kullanıcı adı ve parola zorunludur.' });
    }
    const { rows } = await query(
      'SELECT * FROM kullanicilar WHERE kullanici_adi = $1',
      [kullanici_adi]
    );
    const kullanici = rows[0];
    if (!kullanici || !kullanici.aktif || !(await bcrypt.compare(parola, kullanici.parola_hash))) {
      return res.status(401).json({ hata: 'Kullanıcı adı veya parola hatalı.' });
    }
    const token = jwt.sign({ sub: kullanici.id, rol: kullanici.rol }, config.jwtSecret, {
      expiresIn: config.jwtExpiresIn,
    });
    res.json({
      token,
      kullanici: {
        id: kullanici.id,
        kullanici_adi: kullanici.kullanici_adi,
        ad_soyad: kullanici.ad_soyad,
        rol: kullanici.rol,
        birim: kullanici.birim,
      },
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/auth/me — oturum açmış kullanıcının bilgileri
router.get('/me', authRequired, (req, res) => {
  res.json({ kullanici: req.user });
});

// PUT /api/auth/parola — kullanıcının kendi parolasını değiştirmesi
router.put('/parola', authRequired, async (req, res, next) => {
  try {
    const { mevcut_parola, yeni_parola } = req.body || {};
    if (!mevcut_parola || !yeni_parola || yeni_parola.length < 6) {
      return res
        .status(400)
        .json({ hata: 'Mevcut parola ve en az 6 karakterlik yeni parola zorunludur.' });
    }
    const { rows } = await query('SELECT parola_hash FROM kullanicilar WHERE id = $1', [
      req.user.id,
    ]);
    if (!(await bcrypt.compare(mevcut_parola, rows[0].parola_hash))) {
      return res.status(400).json({ hata: 'Mevcut parola hatalı.' });
    }
    const hash = await bcrypt.hash(yeni_parola, 10);
    await query('UPDATE kullanicilar SET parola_hash = $1 WHERE id = $2', [hash, req.user.id]);
    res.json({ mesaj: 'Parola güncellendi.' });
  } catch (err) {
    next(err);
  }
});

export default router;

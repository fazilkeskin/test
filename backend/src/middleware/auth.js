import jwt from 'jsonwebtoken';
import { config } from '../config.js';
import { query } from '../db.js';

// JWT doğrulaması: geçerli token yoksa 401 döner
export async function authRequired(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) {
    return res.status(401).json({ hata: 'Oturum bulunamadı, lütfen giriş yapın.' });
  }
  try {
    const payload = jwt.verify(token, config.jwtSecret);
    const { rows } = await query(
      'SELECT id, kullanici_adi, ad_soyad, rol, birim, aktif FROM kullanicilar WHERE id = $1',
      [payload.sub]
    );
    if (rows.length === 0 || !rows[0].aktif) {
      return res.status(401).json({ hata: 'Kullanıcı bulunamadı veya pasif durumda.' });
    }
    req.user = rows[0];
    next();
  } catch {
    return res.status(401).json({ hata: 'Oturum geçersiz veya süresi dolmuş.' });
  }
}

// Belirli rollere izin verir; yönetici her zaman geçer
export function rolGerekli(...roller) {
  return (req, res, next) => {
    if (req.user.rol === 'yonetici' || roller.includes(req.user.rol)) {
      return next();
    }
    return res.status(403).json({ hata: 'Bu işlem için yetkiniz yok.' });
  };
}

// Dosya erişim kontrolü: yönetici tüm dosyalara, diğerleri yalnızca atandıkları dosyalara erişir
export async function dosyaErisimi(req, res, next) {
  const dosyaId = parseInt(req.params.id, 10);
  if (Number.isNaN(dosyaId)) {
    return res.status(400).json({ hata: 'Geçersiz dosya numarası.' });
  }
  const { rows } = await query('SELECT * FROM alim_dosyalari WHERE id = $1', [dosyaId]);
  if (rows.length === 0) {
    return res.status(404).json({ hata: 'Dosya bulunamadı.' });
  }
  if (req.user.rol !== 'yonetici') {
    const yetki = await query(
      'SELECT 1 FROM dosya_yetkileri WHERE dosya_id = $1 AND kullanici_id = $2',
      [dosyaId, req.user.id]
    );
    if (yetki.rowCount === 0) {
      return res.status(403).json({ hata: 'Bu dosyaya erişim yetkiniz yok.' });
    }
  }
  req.dosya = rows[0];
  next();
}

import bcrypt from 'bcryptjs';
import { pool } from '../src/db.js';

async function seed() {
  const { rowCount } = await pool.query(
    "SELECT 1 FROM kullanicilar WHERE kullanici_adi = 'admin'"
  );
  if (rowCount > 0) {
    console.log('Yönetici hesabı zaten mevcut, atlanıyor.');
  } else {
    const hash = await bcrypt.hash('admin123', 10);
    await pool.query(
      `INSERT INTO kullanicilar (kullanici_adi, ad_soyad, parola_hash, rol, birim)
       VALUES ('admin', 'Sistem Yöneticisi', $1, 'yonetici', 'Bilgi İşlem')`,
      [hash]
    );
    console.log("Yönetici hesabı oluşturuldu (admin / admin123). İlk girişte parolayı değiştirin.");
  }
  await pool.end();
}

seed().catch((err) => {
  console.error('Seed hatası:', err);
  process.exit(1);
});

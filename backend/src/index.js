import express from 'express';
import cors from 'cors';
import { config } from './config.js';
import authRouter from './routes/auth.js';
import kullanicilarRouter from './routes/kullanicilar.js';
import dosyalarRouter from './routes/dosyalar.js';
import firmalarRouter from './routes/firmalar.js';

const app = express();

app.use(cors());
app.use(express.json());

app.get('/api/saglik', (req, res) => res.json({ durum: 'calisiyor' }));
app.use('/api/auth', authRouter);
app.use('/api/kullanicilar', kullanicilarRouter);
app.use('/api/dosyalar', dosyalarRouter);
app.use('/api/firmalar', firmalarRouter);

app.use((req, res) => res.status(404).json({ hata: 'Kayıt bulunamadı.' }));

// Genel hata yakalayıcı
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ hata: 'Sunucu hatası oluştu.' });
});

app.listen(config.port, () => {
  console.log(`Satın alma takip API'si ${config.port} portunda çalışıyor.`);
});

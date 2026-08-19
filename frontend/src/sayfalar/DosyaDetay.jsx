import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api, hataMesaji } from '../api.js';
import { useAuth } from '../AuthContext.jsx';
import {
  DURUM_ETIKETLERI,
  DURUM_SIRASI,
  ROL_ETIKETLERI,
  tarihFormatla,
  tutarFormatla,
} from '../sabitler.js';

export default function DosyaDetay() {
  const { id } = useParams();
  const { kullanici } = useAuth();
  const yonetici = kullanici.rol === 'yonetici';

  const [veri, setVeri] = useState(null);
  const [hata, setHata] = useState('');
  const [tumKullanicilar, setTumKullanicilar] = useState([]);
  const [secilenKullanici, setSecilenKullanici] = useState('');

  const yukle = async () => {
    try {
      const { data } = await api.get(`/dosyalar/${id}`);
      setVeri(data);
      setHata('');
    } catch (err) {
      setHata(hataMesaji(err));
    }
  };

  useEffect(() => {
    yukle();
    if (yonetici) {
      api
        .get('/kullanicilar')
        .then(({ data }) => setTumKullanicilar(data.kullanicilar.filter((k) => k.aktif)))
        .catch(() => {});
    }
  }, [id]);

  if (hata) {
    return (
      <div>
        <div className="hata">{hata}</div>
        <Link to="/">← Dosya listesine dön</Link>
      </div>
    );
  }
  if (!veri) return <p>Yükleniyor…</p>;

  const { dosya, atanan_kullanicilar, hareketler } = veri;
  const durumIndeksi = DURUM_SIRASI.indexOf(dosya.durum);
  const sonrakiDurum =
    durumIndeksi >= 0 && durumIndeksi < DURUM_SIRASI.length - 1
      ? DURUM_SIRASI[durumIndeksi + 1]
      : null;

  const durumGuncelle = async (durum) => {
    try {
      await api.put(`/dosyalar/${id}`, { durum });
      yukle();
    } catch (err) {
      setHata(hataMesaji(err));
    }
  };

  const kullaniciAta = async (e) => {
    e.preventDefault();
    if (!secilenKullanici) return;
    try {
      await api.post(`/dosyalar/${id}/yetkiler`, { kullanici_id: Number(secilenKullanici) });
      setSecilenKullanici('');
      yukle();
    } catch (err) {
      setHata(hataMesaji(err));
    }
  };

  const atamaKaldir = async (kullaniciId) => {
    try {
      await api.delete(`/dosyalar/${id}/yetkiler/${kullaniciId}`);
      yukle();
    } catch (err) {
      setHata(hataMesaji(err));
    }
  };

  const atanmamislar = tumKullanicilar.filter(
    (k) => !atanan_kullanicilar.some((a) => a.kullanici_id === k.id)
  );

  return (
    <div>
      <Link to="/">← Dosya listesine dön</Link>
      <div className="sayfa-baslik">
        <h1>
          {dosya.dosya_no} — {dosya.konu}
        </h1>
        <span className={`durum durum-${dosya.durum}`}>{DURUM_ETIKETLERI[dosya.durum]}</span>
      </div>

      <div className="kart">
        <h2>Dosya Bilgileri</h2>
        <div className="bilgi-izgara">
          <div>
            <strong>Talep Eden Birim:</strong> {dosya.talep_birimi || '-'}
          </div>
          <div>
            <strong>Bütçe Kalemi:</strong> {dosya.butce_kalemi || '-'}
          </div>
          <div>
            <strong>Tahmini Tutar:</strong> {tutarFormatla(dosya.tahmini_tutar)}
          </div>
          <div>
            <strong>Açılış Tarihi:</strong> {tarihFormatla(dosya.olusturma_tarihi)}
          </div>
          <div className="tam-satir">
            <strong>Açıklama:</strong> {dosya.aciklama || '-'}
          </div>
        </div>
        {sonrakiDurum && dosya.durum !== 'iptal' && (
          <div className="durum-islemleri">
            <button className="btn btn-birincil" onClick={() => durumGuncelle(sonrakiDurum)}>
              Sonraki Aşamaya Geçir: {DURUM_ETIKETLERI[sonrakiDurum]}
            </button>
            {yonetici && dosya.durum !== 'tamamlandi' && (
              <button className="btn btn-tehlike" onClick={() => durumGuncelle('iptal')}>
                Dosyayı İptal Et
              </button>
            )}
          </div>
        )}
      </div>

      <div className="kart">
        <h2>Atanan Kullanıcılar</h2>
        {atanan_kullanicilar.length === 0 ? (
          <p className="bos-mesaj">Bu dosyaya henüz kullanıcı atanmamış.</p>
        ) : (
          <table className="tablo">
            <thead>
              <tr>
                <th>Ad Soyad</th>
                <th>Rol</th>
                <th>Birim</th>
                <th>Atama Tarihi</th>
                {yonetici && <th>İşlem</th>}
              </tr>
            </thead>
            <tbody>
              {atanan_kullanicilar.map((a) => (
                <tr key={a.id}>
                  <td>{a.ad_soyad}</td>
                  <td>{ROL_ETIKETLERI[a.rol]}</td>
                  <td>{a.birim || '-'}</td>
                  <td>{tarihFormatla(a.atama_tarihi)}</td>
                  {yonetici && (
                    <td>
                      <button className="btn btn-kucuk" onClick={() => atamaKaldir(a.kullanici_id)}>
                        Kaldır
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {yonetici && atanmamislar.length > 0 && (
          <form className="atama-formu" onSubmit={kullaniciAta}>
            <select value={secilenKullanici} onChange={(e) => setSecilenKullanici(e.target.value)}>
              <option value="">Kullanıcı seçin…</option>
              {atanmamislar.map((k) => (
                <option key={k.id} value={k.id}>
                  {k.ad_soyad} ({ROL_ETIKETLERI[k.rol]})
                </option>
              ))}
            </select>
            <button className="btn btn-birincil" disabled={!secilenKullanici}>
              Dosyaya Ata
            </button>
          </form>
        )}
      </div>

      <div className="kart">
        <h2>Hareket Geçmişi</h2>
        {hareketler.length === 0 ? (
          <p className="bos-mesaj">Hareket kaydı yok.</p>
        ) : (
          <ul className="hareket-listesi">
            {hareketler.map((h) => (
              <li key={h.id}>
                <span className="hareket-tarih">{tarihFormatla(h.tarih)}</span>
                <span>
                  <strong>{h.ad_soyad || 'Sistem'}</strong> — {h.islem.replaceAll('_', ' ')}
                  {h.aciklama ? `: ${h.aciklama}` : ''}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

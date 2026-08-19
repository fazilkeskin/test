import { useEffect, useState } from 'react';
import { api, hataMesaji } from '../api.js';
import { ROL_ETIKETLERI, tarihFormatla } from '../sabitler.js';

const BOS_FORM = {
  kullanici_adi: '',
  ad_soyad: '',
  eposta: '',
  parola: '',
  rol: 'birim_kullanici',
  birim: '',
};

export default function Kullanicilar() {
  const [kullanicilar, setKullanicilar] = useState([]);
  const [hata, setHata] = useState('');
  const [formAcik, setFormAcik] = useState(false);
  const [form, setForm] = useState(BOS_FORM);
  const [duzenlenenId, setDuzenlenenId] = useState(null);
  const [formHata, setFormHata] = useState('');

  const yukle = async () => {
    try {
      const { data } = await api.get('/kullanicilar');
      setKullanicilar(data.kullanicilar);
    } catch (err) {
      setHata(hataMesaji(err));
    }
  };

  useEffect(() => {
    yukle();
  }, []);

  const alanDegistir = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const yeniAc = () => {
    setForm(BOS_FORM);
    setDuzenlenenId(null);
    setFormHata('');
    setFormAcik(true);
  };

  const duzenleAc = (k) => {
    setForm({
      kullanici_adi: k.kullanici_adi,
      ad_soyad: k.ad_soyad,
      eposta: k.eposta || '',
      parola: '',
      rol: k.rol,
      birim: k.birim || '',
    });
    setDuzenlenenId(k.id);
    setFormHata('');
    setFormAcik(true);
  };

  const kaydet = async (e) => {
    e.preventDefault();
    setFormHata('');
    try {
      if (duzenlenenId) {
        const govde = {
          ad_soyad: form.ad_soyad,
          eposta: form.eposta || null,
          rol: form.rol,
          birim: form.birim || null,
        };
        if (form.parola) govde.parola = form.parola;
        await api.put(`/kullanicilar/${duzenlenenId}`, govde);
      } else {
        await api.post('/kullanicilar', form);
      }
      setFormAcik(false);
      yukle();
    } catch (err) {
      setFormHata(hataMesaji(err));
    }
  };

  const durumDegistir = async (k) => {
    try {
      if (k.aktif) {
        await api.delete(`/kullanicilar/${k.id}`);
      } else {
        await api.put(`/kullanicilar/${k.id}`, { aktif: true });
      }
      yukle();
    } catch (err) {
      setHata(hataMesaji(err));
    }
  };

  return (
    <div>
      <div className="sayfa-baslik">
        <h1>Kullanıcı Yönetimi</h1>
        <button className="btn btn-birincil" onClick={formAcik ? () => setFormAcik(false) : yeniAc}>
          {formAcik ? 'Vazgeç' : '+ Yeni Kullanıcı'}
        </button>
      </div>

      {formAcik && (
        <form className="kart form-izgara" onSubmit={kaydet}>
          <label>
            Kullanıcı Adı *
            <input
              name="kullanici_adi"
              value={form.kullanici_adi}
              onChange={alanDegistir}
              disabled={!!duzenlenenId}
              required
            />
          </label>
          <label>
            Ad Soyad *
            <input name="ad_soyad" value={form.ad_soyad} onChange={alanDegistir} required />
          </label>
          <label>
            E-posta
            <input name="eposta" type="email" value={form.eposta} onChange={alanDegistir} />
          </label>
          <label>
            {duzenlenenId ? 'Yeni Parola (boş bırakılırsa değişmez)' : 'Parola *'}
            <input
              name="parola"
              type="password"
              value={form.parola}
              onChange={alanDegistir}
              minLength={6}
              required={!duzenlenenId}
            />
          </label>
          <label>
            Rol
            <select name="rol" value={form.rol} onChange={alanDegistir}>
              {Object.entries(ROL_ETIKETLERI).map(([deger, etiket]) => (
                <option key={deger} value={deger}>
                  {etiket}
                </option>
              ))}
            </select>
          </label>
          <label>
            Birim
            <input name="birim" value={form.birim} onChange={alanDegistir} />
          </label>
          {formHata && <div className="hata tam-satir">{formHata}</div>}
          <div className="tam-satir">
            <button className="btn btn-birincil">{duzenlenenId ? 'Güncelle' : 'Kaydet'}</button>
          </div>
        </form>
      )}

      {hata && <div className="hata">{hata}</div>}
      <table className="tablo">
        <thead>
          <tr>
            <th>Kullanıcı Adı</th>
            <th>Ad Soyad</th>
            <th>Rol</th>
            <th>Birim</th>
            <th>Durum</th>
            <th>Kayıt Tarihi</th>
            <th>İşlem</th>
          </tr>
        </thead>
        <tbody>
          {kullanicilar.map((k) => (
            <tr key={k.id} className={k.aktif ? '' : 'pasif-satir'}>
              <td>{k.kullanici_adi}</td>
              <td>{k.ad_soyad}</td>
              <td>{ROL_ETIKETLERI[k.rol]}</td>
              <td>{k.birim || '-'}</td>
              <td>{k.aktif ? 'Aktif' : 'Pasif'}</td>
              <td>{tarihFormatla(k.olusturma_tarihi)}</td>
              <td className="islem-hucre">
                <button className="btn btn-kucuk" onClick={() => duzenleAc(k)}>
                  Düzenle
                </button>
                <button className="btn btn-kucuk" onClick={() => durumDegistir(k)}>
                  {k.aktif ? 'Pasifleştir' : 'Aktifleştir'}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

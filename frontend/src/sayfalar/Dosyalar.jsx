import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, hataMesaji } from '../api.js';
import { useAuth } from '../AuthContext.jsx';
import { DURUM_ETIKETLERI, tarihFormatla, tutarFormatla } from '../sabitler.js';

const BOS_FORM = {
  dosya_no: '',
  konu: '',
  aciklama: '',
  talep_birimi: '',
  butce_kalemi: '',
  tahmini_tutar: '',
};

export default function Dosyalar() {
  const { kullanici } = useAuth();
  const [dosyalar, setDosyalar] = useState([]);
  const [yukleniyor, setYukleniyor] = useState(true);
  const [hata, setHata] = useState('');
  const [formAcik, setFormAcik] = useState(false);
  const [form, setForm] = useState(BOS_FORM);
  const [formHata, setFormHata] = useState('');

  const yukle = async () => {
    setYukleniyor(true);
    try {
      const { data } = await api.get('/dosyalar');
      setDosyalar(data.dosyalar);
      setHata('');
    } catch (err) {
      setHata(hataMesaji(err));
    } finally {
      setYukleniyor(false);
    }
  };

  useEffect(() => {
    yukle();
  }, []);

  const alanDegistir = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const kaydet = async (e) => {
    e.preventDefault();
    setFormHata('');
    try {
      await api.post('/dosyalar', {
        ...form,
        tahmini_tutar: form.tahmini_tutar ? Number(form.tahmini_tutar) : null,
      });
      setForm(BOS_FORM);
      setFormAcik(false);
      yukle();
    } catch (err) {
      setFormHata(hataMesaji(err));
    }
  };

  return (
    <div>
      <div className="sayfa-baslik">
        <h1>Alım Dosyaları</h1>
        {kullanici.rol === 'yonetici' && (
          <button className="btn btn-birincil" onClick={() => setFormAcik(!formAcik)}>
            {formAcik ? 'Vazgeç' : '+ Yeni Alım Dosyası'}
          </button>
        )}
      </div>

      {formAcik && (
        <form className="kart form-izgara" onSubmit={kaydet}>
          <label>
            Dosya No *
            <input name="dosya_no" value={form.dosya_no} onChange={alanDegistir} required />
          </label>
          <label>
            Konu *
            <input name="konu" value={form.konu} onChange={alanDegistir} required />
          </label>
          <label>
            Talep Eden Birim
            <input name="talep_birimi" value={form.talep_birimi} onChange={alanDegistir} />
          </label>
          <label>
            Bütçe Kalemi
            <input name="butce_kalemi" value={form.butce_kalemi} onChange={alanDegistir} />
          </label>
          <label>
            Tahmini Tutar (₺)
            <input
              name="tahmini_tutar"
              type="number"
              step="0.01"
              min="0"
              value={form.tahmini_tutar}
              onChange={alanDegistir}
            />
          </label>
          <label className="tam-satir">
            Açıklama
            <textarea name="aciklama" rows={2} value={form.aciklama} onChange={alanDegistir} />
          </label>
          {formHata && <div className="hata tam-satir">{formHata}</div>}
          <div className="tam-satir">
            <button className="btn btn-birincil">Dosyayı Aç</button>
          </div>
        </form>
      )}

      {hata && <div className="hata">{hata}</div>}
      {yukleniyor ? (
        <p>Yükleniyor…</p>
      ) : dosyalar.length === 0 ? (
        <p className="bos-mesaj">
          {kullanici.rol === 'yonetici'
            ? 'Henüz alım dosyası açılmamış.'
            : 'Size atanmış bir alım dosyası bulunmuyor.'}
        </p>
      ) : (
        <table className="tablo">
          <thead>
            <tr>
              <th>Dosya No</th>
              <th>Konu</th>
              <th>Talep Birimi</th>
              <th>Tahmini Tutar</th>
              <th>Durum</th>
              <th>Açılış</th>
            </tr>
          </thead>
          <tbody>
            {dosyalar.map((d) => (
              <tr key={d.id}>
                <td>
                  <Link to={`/dosyalar/${d.id}`}>{d.dosya_no}</Link>
                </td>
                <td>{d.konu}</td>
                <td>{d.talep_birimi || '-'}</td>
                <td>{tutarFormatla(d.tahmini_tutar)}</td>
                <td>
                  <span className={`durum durum-${d.durum}`}>{DURUM_ETIKETLERI[d.durum]}</span>
                </td>
                <td>{tarihFormatla(d.olusturma_tarihi)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

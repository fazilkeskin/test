import { useEffect, useState } from 'react';
import { api, hataMesaji } from '../api.js';
import { tarihFormatla } from '../sabitler.js';

const BOS_FORM = {
  unvan: '',
  vergi_no: '',
  vergi_dairesi: '',
  yetkili: '',
  telefon: '',
  eposta: '',
  adres: '',
};

export default function Firmalar() {
  const [firmalar, setFirmalar] = useState([]);
  const [hata, setHata] = useState('');
  const [formAcik, setFormAcik] = useState(false);
  const [form, setForm] = useState(BOS_FORM);
  const [duzenlenenId, setDuzenlenenId] = useState(null);
  const [formHata, setFormHata] = useState('');

  const yukle = async () => {
    try {
      const { data } = await api.get('/firmalar');
      setFirmalar(data.firmalar);
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

  const duzenleAc = (f) => {
    setForm({
      unvan: f.unvan,
      vergi_no: f.vergi_no || '',
      vergi_dairesi: f.vergi_dairesi || '',
      yetkili: f.yetkili || '',
      telefon: f.telefon || '',
      eposta: f.eposta || '',
      adres: f.adres || '',
    });
    setDuzenlenenId(f.id);
    setFormHata('');
    setFormAcik(true);
  };

  const kaydet = async (e) => {
    e.preventDefault();
    setFormHata('');
    try {
      if (duzenlenenId) {
        await api.put(`/firmalar/${duzenlenenId}`, form);
      } else {
        await api.post('/firmalar', form);
      }
      setFormAcik(false);
      yukle();
    } catch (err) {
      setFormHata(hataMesaji(err));
    }
  };

  const durumDegistir = async (f) => {
    try {
      if (f.aktif) {
        await api.delete(`/firmalar/${f.id}`);
      } else {
        await api.put(`/firmalar/${f.id}`, { aktif: true });
      }
      yukle();
    } catch (err) {
      setHata(hataMesaji(err));
    }
  };

  return (
    <div>
      <div className="sayfa-baslik">
        <h1>Firma Kartları</h1>
        <button className="btn btn-birincil" onClick={formAcik ? () => setFormAcik(false) : yeniAc}>
          {formAcik ? 'Vazgeç' : '+ Yeni Firma'}
        </button>
      </div>

      {formAcik && (
        <form className="kart form-izgara" onSubmit={kaydet}>
          <label className="tam-satir">
            Firma Unvanı *
            <input name="unvan" value={form.unvan} onChange={alanDegistir} required />
          </label>
          <label>
            Vergi No
            <input name="vergi_no" value={form.vergi_no} onChange={alanDegistir} />
          </label>
          <label>
            Vergi Dairesi
            <input name="vergi_dairesi" value={form.vergi_dairesi} onChange={alanDegistir} />
          </label>
          <label>
            Yetkili
            <input name="yetkili" value={form.yetkili} onChange={alanDegistir} />
          </label>
          <label>
            Telefon
            <input name="telefon" value={form.telefon} onChange={alanDegistir} />
          </label>
          <label>
            E-posta
            <input name="eposta" type="email" value={form.eposta} onChange={alanDegistir} />
          </label>
          <label className="tam-satir">
            Adres
            <textarea name="adres" rows={2} value={form.adres} onChange={alanDegistir} />
          </label>
          {formHata && <div className="hata tam-satir">{formHata}</div>}
          <div className="tam-satir">
            <button className="btn btn-birincil">{duzenlenenId ? 'Güncelle' : 'Kaydet'}</button>
          </div>
        </form>
      )}

      {hata && <div className="hata">{hata}</div>}
      {firmalar.length === 0 ? (
        <p className="bos-mesaj">Henüz firma kaydı yok.</p>
      ) : (
        <table className="tablo">
          <thead>
            <tr>
              <th>Unvan</th>
              <th>Vergi No</th>
              <th>Yetkili</th>
              <th>Telefon</th>
              <th>E-posta</th>
              <th>Durum</th>
              <th>Kayıt</th>
              <th>İşlem</th>
            </tr>
          </thead>
          <tbody>
            {firmalar.map((f) => (
              <tr key={f.id} className={f.aktif ? '' : 'pasif-satir'}>
                <td>{f.unvan}</td>
                <td>{f.vergi_no || '-'}</td>
                <td>{f.yetkili || '-'}</td>
                <td>{f.telefon || '-'}</td>
                <td>{f.eposta || '-'}</td>
                <td>{f.aktif ? 'Aktif' : 'Pasif'}</td>
                <td>{tarihFormatla(f.olusturma_tarihi)}</td>
                <td className="islem-hucre">
                  <button className="btn btn-kucuk" onClick={() => duzenleAc(f)}>Düzenle</button>
                  <button className="btn btn-kucuk" onClick={() => durumDegistir(f)}>
                    {f.aktif ? 'Pasifleştir' : 'Aktifleştir'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

import { useEffect, useState } from 'react';
import { api, hataMesaji } from '../api.js';
import { BIRIMLER } from '../sabitler.js';

const BOS_FORM = { mal_hizmet_adi: '', miktar: '1', birim: 'adet', ozellikler: '' };

export default function KalemListesi({ dosyaId }) {
  const [kalemler, setKalemler] = useState([]);
  const [hata, setHata] = useState('');
  const [formAcik, setFormAcik] = useState(false);
  const [form, setForm] = useState(BOS_FORM);
  const [duzenlenenId, setDuzenlenenId] = useState(null);

  const yukle = async () => {
    try {
      const { data } = await api.get(`/dosyalar/${dosyaId}/kalemler`);
      setKalemler(data.kalemler);
      setHata('');
    } catch (err) {
      setHata(hataMesaji(err));
    }
  };

  useEffect(() => {
    yukle();
  }, [dosyaId]);

  const alanDegistir = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const yeniAc = () => {
    setForm(BOS_FORM);
    setDuzenlenenId(null);
    setFormAcik(true);
  };

  const duzenleAc = (k) => {
    setForm({
      mal_hizmet_adi: k.mal_hizmet_adi,
      miktar: String(k.miktar),
      birim: k.birim,
      ozellikler: k.ozellikler || '',
    });
    setDuzenlenenId(k.id);
    setFormAcik(true);
  };

  const kaydet = async (e) => {
    e.preventDefault();
    setHata('');
    try {
      const govde = { ...form, miktar: Number(form.miktar) };
      if (duzenlenenId) {
        await api.put(`/dosyalar/${dosyaId}/kalemler/${duzenlenenId}`, govde);
      } else {
        await api.post(`/dosyalar/${dosyaId}/kalemler`, govde);
      }
      setFormAcik(false);
      yukle();
    } catch (err) {
      setHata(hataMesaji(err));
    }
  };

  const sil = async (k) => {
    if (!window.confirm(`"${k.mal_hizmet_adi}" kalemi silinsin mi?`)) return;
    try {
      await api.delete(`/dosyalar/${dosyaId}/kalemler/${k.id}`);
      yukle();
    } catch (err) {
      setHata(hataMesaji(err));
    }
  };

  return (
    <div className="kart">
      <div className="kart-baslik">
        <h2>İhtiyaç Listesi</h2>
        <button className="btn btn-kucuk" onClick={formAcik ? () => setFormAcik(false) : yeniAc}>
          {formAcik ? 'Vazgeç' : '+ Kalem Ekle'}
        </button>
      </div>

      {formAcik && (
        <form className="form-izgara ic-form" onSubmit={kaydet}>
          <label className="tam-satir">
            Mal / Hizmet Adı *
            <input name="mal_hizmet_adi" value={form.mal_hizmet_adi} onChange={alanDegistir} required />
          </label>
          <label>
            Miktar *
            <input name="miktar" type="number" step="0.001" min="0.001" value={form.miktar} onChange={alanDegistir} required />
          </label>
          <label>
            Birim
            <select name="birim" value={form.birim} onChange={alanDegistir}>
              {BIRIMLER.map((b) => (
                <option key={b} value={b}>{b}</option>
              ))}
            </select>
          </label>
          <label className="tam-satir">
            Teknik Özellikler / Açıklama
            <textarea name="ozellikler" rows={2} value={form.ozellikler} onChange={alanDegistir} />
          </label>
          <div className="tam-satir">
            <button className="btn btn-birincil">{duzenlenenId ? 'Güncelle' : 'Ekle'}</button>
          </div>
        </form>
      )}

      {hata && <div className="hata">{hata}</div>}
      {kalemler.length === 0 ? (
        <p className="bos-mesaj">Henüz kalem eklenmemiş.</p>
      ) : (
        <table className="tablo">
          <thead>
            <tr>
              <th>Sıra</th>
              <th>Mal / Hizmet</th>
              <th>Miktar</th>
              <th>Birim</th>
              <th>Özellikler</th>
              <th>İşlem</th>
            </tr>
          </thead>
          <tbody>
            {kalemler.map((k) => (
              <tr key={k.id}>
                <td>{k.sira_no}</td>
                <td>{k.mal_hizmet_adi}</td>
                <td>{Number(k.miktar).toLocaleString('tr-TR')}</td>
                <td>{k.birim}</td>
                <td className="kisitli-metin">{k.ozellikler || '-'}</td>
                <td className="islem-hucre">
                  <button className="btn btn-kucuk" onClick={() => duzenleAc(k)}>Düzenle</button>
                  <button className="btn btn-kucuk" onClick={() => sil(k)}>Sil</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

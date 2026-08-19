import { useEffect, useRef, useState } from 'react';
import { api, hataMesaji } from '../api.js';
import { useAuth } from '../AuthContext.jsx';
import { EVRAK_TURU_ETIKETLERI, tarihFormatla } from '../sabitler.js';

const boyutFormatla = (b) => {
  if (b == null) return '-';
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / (1024 * 1024)).toFixed(1)} MB`;
};

export default function EvrakListesi({ dosyaId }) {
  const { kullanici } = useAuth();
  const [evraklar, setEvraklar] = useState([]);
  const [hata, setHata] = useState('');
  const [formAcik, setFormAcik] = useState(false);
  const [baslik, setBaslik] = useState('');
  const [tur, setTur] = useState('teknik_sartname');
  const [yukleniyor, setYukleniyor] = useState(false);
  const dosyaGirdisi = useRef(null);

  const yukle = async () => {
    try {
      const { data } = await api.get(`/dosyalar/${dosyaId}/evraklar`);
      setEvraklar(data.evraklar);
      setHata('');
    } catch (err) {
      setHata(hataMesaji(err));
    }
  };

  useEffect(() => {
    yukle();
  }, [dosyaId]);

  const gonder = async (e) => {
    e.preventDefault();
    const secilen = dosyaGirdisi.current?.files?.[0];
    if (!secilen) {
      setHata('Yüklenecek dosya seçin.');
      return;
    }
    setHata('');
    setYukleniyor(true);
    try {
      const veri = new FormData();
      veri.append('evrak', secilen);
      veri.append('evrak_turu', tur);
      if (baslik) veri.append('baslik', baslik);
      await api.post(`/dosyalar/${dosyaId}/evraklar`, veri);
      setBaslik('');
      dosyaGirdisi.current.value = '';
      setFormAcik(false);
      yukle();
    } catch (err) {
      setHata(hataMesaji(err));
    } finally {
      setYukleniyor(false);
    }
  };

  const indir = async (evrak) => {
    try {
      const { data } = await api.get(`/dosyalar/${dosyaId}/evraklar/${evrak.id}/indir`, {
        responseType: 'blob',
      });
      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = evrak.orijinal_ad;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setHata(hataMesaji(err));
    }
  };

  const sil = async (evrak) => {
    if (!window.confirm(`"${evrak.baslik}" evrakı silinsin mi?`)) return;
    try {
      await api.delete(`/dosyalar/${dosyaId}/evraklar/${evrak.id}`);
      yukle();
    } catch (err) {
      setHata(hataMesaji(err));
    }
  };

  return (
    <div className="kart">
      <div className="kart-baslik">
        <h2>Evraklar</h2>
        <button className="btn btn-kucuk" onClick={() => setFormAcik(!formAcik)}>
          {formAcik ? 'Vazgeç' : '+ Evrak Yükle'}
        </button>
      </div>

      {formAcik && (
        <form className="form-izgara ic-form" onSubmit={gonder}>
          <label>
            Evrak Türü
            <select value={tur} onChange={(e) => setTur(e.target.value)}>
              {Object.entries(EVRAK_TURU_ETIKETLERI).map(([deger, etiket]) => (
                <option key={deger} value={deger}>{etiket}</option>
              ))}
            </select>
          </label>
          <label>
            Başlık (boşsa dosya adı kullanılır)
            <input value={baslik} onChange={(e) => setBaslik(e.target.value)} />
          </label>
          <label className="tam-satir">
            Dosya * (PDF, Office, resim — en fazla 20 MB)
            <input type="file" ref={dosyaGirdisi} required />
          </label>
          <div className="tam-satir">
            <button className="btn btn-birincil" disabled={yukleniyor}>
              {yukleniyor ? 'Yükleniyor…' : 'Yükle'}
            </button>
          </div>
        </form>
      )}

      {hata && <div className="hata">{hata}</div>}
      {evraklar.length === 0 ? (
        <p className="bos-mesaj">Henüz evrak yüklenmemiş.</p>
      ) : (
        <table className="tablo">
          <thead>
            <tr>
              <th>Tür</th>
              <th>Başlık</th>
              <th>Boyut</th>
              <th>Yükleyen</th>
              <th>Tarih</th>
              <th>İşlem</th>
            </tr>
          </thead>
          <tbody>
            {evraklar.map((e) => (
              <tr key={e.id}>
                <td>{EVRAK_TURU_ETIKETLERI[e.evrak_turu] || e.evrak_turu}</td>
                <td>{e.baslik}</td>
                <td>{boyutFormatla(Number(e.boyut))}</td>
                <td>{e.yukleyen_ad || '-'}</td>
                <td>{tarihFormatla(e.yukleme_tarihi)}</td>
                <td className="islem-hucre">
                  <button className="btn btn-kucuk" onClick={() => indir(e)}>İndir</button>
                  <button className="btn btn-kucuk" onClick={() => sil(e)}>Sil</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

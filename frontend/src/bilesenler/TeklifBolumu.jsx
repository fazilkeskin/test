import { useEffect, useState } from 'react';
import { api, hataMesaji } from '../api.js';
import { TEKLIF_DURUM_ETIKETLERI, tarihFormatla, tutarFormatla } from '../sabitler.js';

const BOS_TEKLIF = { firma_id: '', toplam_tutar: '', gecerlilik_tarihi: '', aciklama: '' };
const BOS_SIPARIS = { siparis_no: '', teslim_suresi_gun: '', aciklama: '' };

const sadeTarih = (t) => (t ? new Date(t).toLocaleDateString('tr-TR') : '-');

export default function TeklifBolumu({ dosyaId, dosyaYenile }) {
  const [teklifler, setTeklifler] = useState([]);
  const [siparis, setSiparis] = useState(null);
  const [firmalar, setFirmalar] = useState([]);
  const [hata, setHata] = useState('');
  const [teklifFormAcik, setTeklifFormAcik] = useState(false);
  const [teklifForm, setTeklifForm] = useState(BOS_TEKLIF);
  const [siparisFormAcik, setSiparisFormAcik] = useState(false);
  const [siparisForm, setSiparisForm] = useState(BOS_SIPARIS);

  const yukle = async () => {
    try {
      const [teklifSonuc, siparisSonuc] = await Promise.all([
        api.get(`/dosyalar/${dosyaId}/teklifler`),
        api.get(`/dosyalar/${dosyaId}/siparis`),
      ]);
      setTeklifler(teklifSonuc.data.teklifler);
      setSiparis(siparisSonuc.data.siparis);
      setHata('');
    } catch (err) {
      setHata(hataMesaji(err));
    }
  };

  useEffect(() => {
    yukle();
    api
      .get('/firmalar')
      .then(({ data }) => setFirmalar(data.firmalar.filter((f) => f.aktif)))
      .catch(() => {});
  }, [dosyaId]);

  const teklifKaydet = async (e) => {
    e.preventDefault();
    setHata('');
    try {
      await api.post(`/dosyalar/${dosyaId}/teklifler`, {
        ...teklifForm,
        firma_id: Number(teklifForm.firma_id),
        toplam_tutar: Number(teklifForm.toplam_tutar),
        gecerlilik_tarihi: teklifForm.gecerlilik_tarihi || null,
      });
      setTeklifForm(BOS_TEKLIF);
      setTeklifFormAcik(false);
      yukle();
    } catch (err) {
      setHata(hataMesaji(err));
    }
  };

  const teklifSec = async (t) => {
    if (!window.confirm(`"${t.firma_unvan}" teklifi en avantajlı olarak seçilsin mi?`)) return;
    try {
      await api.post(`/dosyalar/${dosyaId}/teklifler/${t.id}/sec`, {});
      yukle();
    } catch (err) {
      setHata(hataMesaji(err));
    }
  };

  const teklifSil = async (t) => {
    if (!window.confirm(`"${t.firma_unvan}" teklifi silinsin mi?`)) return;
    try {
      await api.delete(`/dosyalar/${dosyaId}/teklifler/${t.id}`);
      yukle();
    } catch (err) {
      setHata(hataMesaji(err));
    }
  };

  const siparisVer = async (e) => {
    e.preventDefault();
    setHata('');
    try {
      await api.post(`/dosyalar/${dosyaId}/siparis`, {
        ...siparisForm,
        teslim_suresi_gun: siparisForm.teslim_suresi_gun
          ? Number(siparisForm.teslim_suresi_gun)
          : null,
      });
      setSiparisFormAcik(false);
      yukle();
      dosyaYenile?.();
    } catch (err) {
      setHata(hataMesaji(err));
    }
  };

  const secilenTeklif = teklifler.find((t) => t.durum === 'secildi');
  const enDusukTutar =
    teklifler.length > 0 ? Math.min(...teklifler.map((t) => Number(t.toplam_tutar))) : null;
  const teklifliFirmaIdleri = new Set(teklifler.map((t) => t.firma_id));
  const teklifVerebilecekler = firmalar.filter((f) => !teklifliFirmaIdleri.has(f.id));

  return (
    <>
      <div className="kart">
        <div className="kart-baslik">
          <h2>Teklifler</h2>
          {!siparis && teklifVerebilecekler.length > 0 && (
            <button className="btn btn-kucuk" onClick={() => setTeklifFormAcik(!teklifFormAcik)}>
              {teklifFormAcik ? 'Vazgeç' : '+ Teklif Ekle'}
            </button>
          )}
        </div>

        {teklifFormAcik && !siparis && (
          <form className="form-izgara ic-form" onSubmit={teklifKaydet}>
            <label>
              Firma *
              <select
                value={teklifForm.firma_id}
                onChange={(e) => setTeklifForm({ ...teklifForm, firma_id: e.target.value })}
                required
              >
                <option value="">Firma seçin…</option>
                {teklifVerebilecekler.map((f) => (
                  <option key={f.id} value={f.id}>{f.unvan}</option>
                ))}
              </select>
            </label>
            <label>
              Toplam Tutar (₺) *
              <input
                type="number"
                step="0.01"
                min="0.01"
                value={teklifForm.toplam_tutar}
                onChange={(e) => setTeklifForm({ ...teklifForm, toplam_tutar: e.target.value })}
                required
              />
            </label>
            <label>
              Geçerlilik Tarihi
              <input
                type="date"
                value={teklifForm.gecerlilik_tarihi}
                onChange={(e) =>
                  setTeklifForm({ ...teklifForm, gecerlilik_tarihi: e.target.value })
                }
              />
            </label>
            <label className="tam-satir">
              Açıklama
              <textarea
                rows={2}
                value={teklifForm.aciklama}
                onChange={(e) => setTeklifForm({ ...teklifForm, aciklama: e.target.value })}
              />
            </label>
            <div className="tam-satir">
              <button className="btn btn-birincil">Teklifi Kaydet</button>
            </div>
          </form>
        )}

        {hata && <div className="hata">{hata}</div>}
        {teklifler.length === 0 ? (
          <p className="bos-mesaj">
            Henüz teklif girilmemiş.
            {firmalar.length === 0 && ' Önce Firmalar sayfasından firma kaydı oluşturun.'}
          </p>
        ) : (
          <table className="tablo">
            <thead>
              <tr>
                <th>Firma</th>
                <th>Toplam Tutar</th>
                <th>Teklif Tarihi</th>
                <th>Geçerlilik</th>
                <th>Durum</th>
                {!siparis && <th>İşlem</th>}
              </tr>
            </thead>
            <tbody>
              {teklifler.map((t) => (
                <tr key={t.id} className={t.durum === 'secildi' ? 'secili-satir' : ''}>
                  <td>{t.firma_unvan}</td>
                  <td>
                    {tutarFormatla(t.toplam_tutar)}
                    {Number(t.toplam_tutar) === enDusukTutar && teklifler.length > 1 && (
                      <span className="rozet rozet-yesil">en düşük</span>
                    )}
                  </td>
                  <td>{sadeTarih(t.teklif_tarihi)}</td>
                  <td>{sadeTarih(t.gecerlilik_tarihi)}</td>
                  <td>
                    <span className={`durum teklif-${t.durum}`}>
                      {TEKLIF_DURUM_ETIKETLERI[t.durum]}
                    </span>
                  </td>
                  {!siparis && (
                    <td className="islem-hucre">
                      {t.durum !== 'secildi' && (
                        <button className="btn btn-kucuk" onClick={() => teklifSec(t)}>
                          En Avantajlı Seç
                        </button>
                      )}
                      <button className="btn btn-kucuk" onClick={() => teklifSil(t)}>Sil</button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="kart">
        <div className="kart-baslik">
          <h2>Sipariş</h2>
          {!siparis && secilenTeklif && (
            <button className="btn btn-kucuk" onClick={() => setSiparisFormAcik(!siparisFormAcik)}>
              {siparisFormAcik ? 'Vazgeç' : 'Sipariş Ver'}
            </button>
          )}
        </div>

        {siparis ? (
          <div className="bilgi-izgara">
            <div><strong>Firma:</strong> {siparis.firma_unvan}</div>
            <div><strong>Tutar:</strong> {tutarFormatla(siparis.tutar)}</div>
            <div><strong>Sipariş No:</strong> {siparis.siparis_no || '-'}</div>
            <div><strong>Sipariş Tarihi:</strong> {sadeTarih(siparis.siparis_tarihi)}</div>
            <div><strong>Teslim Süresi:</strong> {siparis.teslim_suresi_gun ? `${siparis.teslim_suresi_gun} gün` : '-'}</div>
            <div><strong>Oluşturan:</strong> {siparis.olusturan_ad || '-'}</div>
            {siparis.aciklama && (
              <div className="tam-satir"><strong>Açıklama:</strong> {siparis.aciklama}</div>
            )}
          </div>
        ) : siparisFormAcik && secilenTeklif ? (
          <form className="form-izgara ic-form" onSubmit={siparisVer}>
            <div className="tam-satir bilgi-notu">
              Sipariş, seçilen teklife verilecek: <strong>{secilenTeklif.firma_unvan}</strong> —{' '}
              {tutarFormatla(secilenTeklif.toplam_tutar)}
            </div>
            <label>
              Sipariş No
              <input
                value={siparisForm.siparis_no}
                onChange={(e) => setSiparisForm({ ...siparisForm, siparis_no: e.target.value })}
              />
            </label>
            <label>
              Teslim Süresi (gün)
              <input
                type="number"
                min="1"
                value={siparisForm.teslim_suresi_gun}
                onChange={(e) =>
                  setSiparisForm({ ...siparisForm, teslim_suresi_gun: e.target.value })
                }
              />
            </label>
            <label className="tam-satir">
              Açıklama
              <textarea
                rows={2}
                value={siparisForm.aciklama}
                onChange={(e) => setSiparisForm({ ...siparisForm, aciklama: e.target.value })}
              />
            </label>
            <div className="tam-satir">
              <button className="btn btn-birincil">Siparişi Oluştur</button>
            </div>
          </form>
        ) : (
          <p className="bos-mesaj">
            {secilenTeklif
              ? 'Seçilen teklif için sipariş oluşturabilirsiniz.'
              : 'Sipariş verebilmek için önce en avantajlı teklifi seçin.'}
          </p>
        )}
      </div>
    </>
  );
}

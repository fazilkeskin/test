import { useState } from 'react';
import { api, hataMesaji } from '../api.js';

export default function ParolaDegistir() {
  const [mevcut, setMevcut] = useState('');
  const [yeni, setYeni] = useState('');
  const [mesaj, setMesaj] = useState('');
  const [hata, setHata] = useState('');

  const gonder = async (e) => {
    e.preventDefault();
    setMesaj('');
    setHata('');
    try {
      await api.put('/auth/parola', { mevcut_parola: mevcut, yeni_parola: yeni });
      setMesaj('Parolanız güncellendi.');
      setMevcut('');
      setYeni('');
    } catch (err) {
      setHata(hataMesaji(err));
    }
  };

  return (
    <div className="dar-form">
      <h1>Parola Değiştir</h1>
      <form onSubmit={gonder}>
        <label>
          Mevcut Parola
          <input type="password" value={mevcut} onChange={(e) => setMevcut(e.target.value)} required />
        </label>
        <label>
          Yeni Parola (en az 6 karakter)
          <input type="password" value={yeni} onChange={(e) => setYeni(e.target.value)} minLength={6} required />
        </label>
        {mesaj && <div className="basari">{mesaj}</div>}
        {hata && <div className="hata">{hata}</div>}
        <button className="btn btn-birincil">Kaydet</button>
      </form>
    </div>
  );
}

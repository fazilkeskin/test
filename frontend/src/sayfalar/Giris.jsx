import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../AuthContext.jsx';
import { hataMesaji } from '../api.js';

export default function Giris() {
  const { girisYap } = useAuth();
  const navigate = useNavigate();
  const [kullaniciAdi, setKullaniciAdi] = useState('');
  const [parola, setParola] = useState('');
  const [hata, setHata] = useState('');
  const [yukleniyor, setYukleniyor] = useState(false);

  const gonder = async (e) => {
    e.preventDefault();
    setHata('');
    setYukleniyor(true);
    try {
      await girisYap(kullaniciAdi, parola);
      navigate('/');
    } catch (err) {
      setHata(hataMesaji(err));
    } finally {
      setYukleniyor(false);
    }
  };

  return (
    <div className="giris-kutusu">
      <h1>Satın Alma Takip Programı</h1>
      <p className="alt-baslik">Belediye doğrudan temin alımları takip sistemi</p>
      <form onSubmit={gonder}>
        <label>
          Kullanıcı Adı
          <input
            value={kullaniciAdi}
            onChange={(e) => setKullaniciAdi(e.target.value)}
            autoFocus
            required
          />
        </label>
        <label>
          Parola
          <input
            type="password"
            value={parola}
            onChange={(e) => setParola(e.target.value)}
            required
          />
        </label>
        {hata && <div className="hata">{hata}</div>}
        <button className="btn btn-birincil" disabled={yukleniyor}>
          {yukleniyor ? 'Giriş yapılıyor…' : 'Giriş Yap'}
        </button>
      </form>
    </div>
  );
}

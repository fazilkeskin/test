import { Routes, Route, Navigate, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from './AuthContext.jsx';
import { ROL_ETIKETLERI } from './sabitler.js';
import Giris from './sayfalar/Giris.jsx';
import Dosyalar from './sayfalar/Dosyalar.jsx';
import DosyaDetay from './sayfalar/DosyaDetay.jsx';
import Kullanicilar from './sayfalar/Kullanicilar.jsx';
import Firmalar from './sayfalar/Firmalar.jsx';
import ParolaDegistir from './sayfalar/ParolaDegistir.jsx';

function Korumali({ children, roller }) {
  const { kullanici } = useAuth();
  if (!kullanici) return <Navigate to="/giris" replace />;
  if (roller && kullanici.rol !== 'yonetici' && !roller.includes(kullanici.rol)) {
    return <Navigate to="/" replace />;
  }
  return children;
}

function UstMenu() {
  const { kullanici, cikisYap } = useAuth();
  const navigate = useNavigate();
  if (!kullanici) return null;
  return (
    <header className="ust-menu">
      <div className="ust-menu-ic">
        <span className="logo">Satın Alma Takip</span>
        <nav>
          <NavLink to="/">Alım Dosyaları</NavLink>
          {['yonetici', 'satinalma'].includes(kullanici.rol) && (
            <NavLink to="/firmalar">Firmalar</NavLink>
          )}
          {kullanici.rol === 'yonetici' && <NavLink to="/kullanicilar">Kullanıcılar</NavLink>}
        </nav>
        <div className="kullanici-alani">
          <span>
            {kullanici.ad_soyad} <em>({ROL_ETIKETLERI[kullanici.rol]})</em>
          </span>
          <NavLink to="/parola">Parola</NavLink>
          <button
            className="btn btn-kucuk"
            onClick={() => {
              cikisYap();
              navigate('/giris');
            }}
          >
            Çıkış
          </button>
        </div>
      </div>
    </header>
  );
}

export default function App() {
  return (
    <>
      <UstMenu />
      <main className="icerik">
        <Routes>
          <Route path="/giris" element={<Giris />} />
          <Route
            path="/"
            element={
              <Korumali>
                <Dosyalar />
              </Korumali>
            }
          />
          <Route
            path="/dosyalar/:id"
            element={
              <Korumali>
                <DosyaDetay />
              </Korumali>
            }
          />
          <Route
            path="/firmalar"
            element={
              <Korumali roller={['satinalma']}>
                <Firmalar />
              </Korumali>
            }
          />
          <Route
            path="/kullanicilar"
            element={
              <Korumali roller={[]}>
                <Kullanicilar />
              </Korumali>
            }
          />
          <Route
            path="/parola"
            element={
              <Korumali>
                <ParolaDegistir />
              </Korumali>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </>
  );
}

import { createContext, useContext, useState } from 'react';
import { api } from './api.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [kullanici, setKullanici] = useState(() => {
    const kayit = localStorage.getItem('kullanici');
    return kayit ? JSON.parse(kayit) : null;
  });

  const girisYap = async (kullanici_adi, parola) => {
    const { data } = await api.post('/auth/login', { kullanici_adi, parola });
    localStorage.setItem('token', data.token);
    localStorage.setItem('kullanici', JSON.stringify(data.kullanici));
    setKullanici(data.kullanici);
  };

  const cikisYap = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('kullanici');
    setKullanici(null);
  };

  return (
    <AuthContext.Provider value={{ kullanici, girisYap, cikisYap }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);

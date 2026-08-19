# Belediye Doğrudan Temin Satın Alma Takip Programı

Belediye doğrudan temin alımlarının uçtan uca takibi için web tabanlı uygulama.

## Süreç Akışı

1. **İhtiyaç Listesi** – Talep eden birim ihtiyaç listesini oluşturur
2. **Teknik Şartname** – Teknik şartname ve satın alma evrakları hazırlanır
3. **Teklif Toplama** – Satın alma birimi teklifleri toplar, en avantajlı teklif belirlenir
4. **Sipariş** – Seçilen firmaya sipariş geçilir
5. **Muayene Kabul** – Ürünler teslim alınır, muayene kabul işlemleri yapılır
6. **Sarf / Demirbaş Kaydı** – Kabul edilen ürünler taşınır kayıtlarına işlenir
7. **Muhasebeleştirme** – Evrak muhasebeleştirilir, dosya tamamlanır

## Teknolojiler

- **Backend:** Node.js, Express, PostgreSQL
- **Frontend:** React (Vite), React Router, Axios
- **Kimlik Doğrulama:** JWT (JSON Web Token)

## Rol Mantığı

| Rol | Yetki |
|-----|-------|
| `yonetici` | Tüm dosyalara ve yönetim paneline tam erişim |
| `satinalma` | Atandığı dosyalarda teklif/sipariş aşamaları |
| `muayene_kabul` | Atandığı dosyalarda muayene kabul aşaması |
| `tasinir_kayit` | Atandığı dosyalarda sarf/demirbaş kayıt aşaması |
| `muhasebe` | Atandığı dosyalarda muhasebeleştirme aşaması |
| `birim_kullanici` | Atandığı dosyalarda ihtiyaç listesi/şartname aşamaları |

Yönetici dışındaki kullanıcılar **yalnızca kendilerine atanan dosyalar** üzerinde işlem yapabilir.

## Kurulum

### Backend

```bash
cd backend
cp .env.example .env        # ayarları düzenleyin
npm install
npm run migrate             # veritabanı tablolarını oluşturur
npm run seed                # varsayılan yönetici hesabını oluşturur
npm run dev                 # http://localhost:3001
```

Varsayılan yönetici: kullanıcı adı `admin`, parola `admin123` (ilk girişten sonra değiştirin).

### Frontend

```bash
cd frontend
npm install
npm run dev                 # http://localhost:5173
```

## Geliştirme Aşamaları

- [x] **Aşama 1:** Proje iskeleti, kimlik doğrulama, rol tabanlı kullanıcı yönetimi, yönetim paneli, alım dosyası oluşturma ve kullanıcı atama
- [x] **Aşama 2:** İhtiyaç listesi kalemleri ve teknik şartname/evrak yönetimi (yükleme/indirme)
- [ ] **Aşama 3:** Teklif toplama, karşılaştırma ve sipariş
- [ ] **Aşama 4:** Muayene kabul işlemleri
- [ ] **Aşama 5:** Sarf/demirbaş kayıtları ve muhasebeleştirme
- [ ] **Aşama 6:** Raporlama ve dosya arşivi

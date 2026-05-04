# Santiye Operasyon Merkezi

Github Pages uzerinde yayinlanmak ve Google Sheets ile beslenmek uzere hazirlanan tek urunluk santiye yonetim arayuzu.

## Ilk Surum Kapsami

- Dashboard
- Gunluk saha raporu girisi
- Puantaj girisi
- Kayit listeleme ve filtreleme
- JSON ve CSV disa aktarim
- Google Apps Script uzerinden Google Sheets baglantisina hazir ayarlar

## Dosya Yapisi

- `index.html`: uygulamanin ana kabugu
- `assets/styles/main.css`: tek tema ve responsive arayuz
- `assets/scripts/app.js`: ekran mantigi, local demo veri ve API entegrasyon noktasi
- `google-apps-script.gs`: Google Sheets yazma/okuma katmani icin Apps Script sablonu
- `GOOGLE_SHEETS_SETUP.md`: Sheet sekmeleri, kolonlar ve deployment adimlari

## Github Pages Yayini

1. Bu klasoru bir GitHub reposuna gonderin.
2. GitHub uzerinde `Settings` -> `Pages` bolumune girin.
3. `Build and deployment` altinda `Deploy from a branch` secin.
4. Branch olarak `main`, klasor olarak `/ (root)` secin.
5. Bir iki dakika sonra site yayinlanir.

## Google Sheets Entegrasyon Modeli

Uygulama dogrudan `.xlsx` dosyasina yazmak yerine `Google Sheets + Apps Script Web App` modeliyle calismak uzere hazirlandi. Bu, Github Pages gibi statik yayinlarda daha guvenli ve daha kolay yonetilir.

### Beklenen Endpointler

- `GET {WEB_APP_URL}?resource=bootstrap`
  - donus:
  ```json
  {
    "projects": [],
    "reports": [],
    "puantaj": []
  }
  ```

- `POST {WEB_APP_URL}`
  - ornek `saveReport`:
  ```json
  {
    "action": "saveReport",
    "payload": {
      "projectId": "P-001",
      "date": "2026-05-04"
    }
  }
  ```

- `POST {WEB_APP_URL}`
  - ornek `savePuantaj`:
  ```json
  {
    "action": "savePuantaj",
    "payload": {
      "chief": "Ahmet Usta",
      "date": "2026-05-04",
      "workers": []
    }
  }
  ```

## Onerilen Google Sheet Sekmeleri

- `Projects`
- `Reports`
- `Puantaj`
- `Workers`

## Sonraki Adimlar

1. Arkadasinizin GitHub reposunu baglayalim.
2. [GOOGLE_SHEETS_SETUP.md](/Users/mirkanemirsancak/Documents/New%20project%203/GOOGLE_SHEETS_SETUP.md) dosyasindaki sekme ve kolon yapisini olusturalim.
3. [google-apps-script.gs](/Users/mirkanemirsancak/Documents/New%20project%203/google-apps-script.gs) dosyasini Apps Script'e deploy edelim.
4. Cikan Web App URL degerini uygulamanin `Ayarlar` ekranina girelim.
5. Github Pages uzerinden canli test yapalim.

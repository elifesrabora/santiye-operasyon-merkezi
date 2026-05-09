# Şantiye Operasyon Merkezi

Projeler, şantiyeler, günlük raporlar, hakediş, personel yoklama, malzeme listeleri, fotoğraf/PDF arşivi ve takvim/Gantt takibi için web paneli.

## Mevcut bağlantılar

- Google Sheet: `1brBxxE6agOvAhTSp26nkN7NrtoWRyQygce5sRcE3ZyI`
- Google Drive klasörü: `1kay5Ri3t_vLbRMuG22_tXslRsmwk4lg4`
- Apps Script Web App: `https://script.google.com/macros/s/AKfycbyr8CyvG1ubgI9xUCR9esVIf7GLoSBFBtfXZCN3fNXB94QsvThEx6MX0qjVeO4nFZB3jw/exec`

## Dosyalar

- `index.html`: Panel ekranı.
- `styles.css`: Panel tasarımı.
- `app.js`: Formlar, tablolar, Gantt/takvim, yerel kayıt ve Google Apps Script senkronizasyonu.
- `apps-script/Code.gs`: Google Sheets ve Drive backend kodu.

## GitHub Pages yayını

1. Repoyu GitHub'a gönder.
2. GitHub'da repo ayarlarına gir: `Settings > Pages`.
3. Source olarak `Deploy from a branch` seç.
4. Branch: `main`, folder: `/root`.
5. Kaydet. Birkaç dakika sonra site GitHub Pages adresinde açılır.

## Google Apps Script kurulumu

1. [script.google.com](https://script.google.com/) adresinde yeni proje oluştur.
2. `apps-script/Code.gs` içeriğini Apps Script editörüne yapıştır.
3. `setup` fonksiyonunu bir kere çalıştır. İzin isterse onayla.
4. `Deploy > New deployment` seç.
5. Type: `Web app`.
6. Execute as: `Me`.
7. Who has access: ilk test için `Anyone with the link`; gerçek kullanımda erişim modelini netleştirince kısıtlanmalı.
8. Deploy sonrası verilen Web app URL'sini kopyala.
9. Web panelinde `Ayarlar` bölümüne bu URL'yi yapıştır ve kaydet. Bu repo için mevcut URL varsayılan olarak koda eklenmiştir.

## Google Sheet sekmeleri

Apps Script `setup` çalışınca şu sekmeleri oluşturur:

- `projects`
- `sites`
- `tasks`
- `reports`
- `payments`
- `personnel`
- `materials`
- `documents`
- `users`

`users` sekmesi ileride kullanıcı yetkilendirme için kullanılacak. İlk yapı:

| email | name | role | status | permissions |
| --- | --- | --- | --- | --- |
| admin@example.com | Admin | admin | active | * |

## Yetki modeli

İlk sürümde panelde `admin`, `editor`, `viewer` rol alanları hazırlandı. Kalıcı ve güvenli kullanıcı girişi için sonraki aşamada şu seçeneklerden biri seçilmeli:

- Firebase Authentication + Firestore/Cloud Functions
- Google Workspace hesapları ile kısıtlı Apps Script
- Cloudflare Access ile GitHub Pages önünde giriş ekranı

Sadece statik GitHub Pages üzerinde güvenli parola kontrolü yapmak doğru değildir; kullanıcı izinlerini gerçekten güvenli yapmak için backend tarafında kimlik doğrulama gerekir.

## Ayazlar Excel aktarımı

`/Users/elifesrabora/Downloads/ayazlarapp.xlsx` dosyasındaki verileri mevcut Google Sheet'e aktarmak için:

```bash
/Users/elifesrabora/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 scripts/import_ayazlarapp.py
```

İlk canlı Apps Script sürümü `tasks` tablosunu bilmediği için görevler ancak `apps-script/Code.gs` güncel haliyle tekrar dağıtıldıktan sonra aktarılır.

## Yerel deneme

Bu klasörde basit bir web sunucusu başlat:

```bash
python3 -m http.server 5173
```

Sonra tarayıcıda aç:

```text
http://localhost:5173
```

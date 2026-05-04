# Google Sheets Kurulumu

Baglanacak ana tablo:

- [Google Sheet](https://docs.google.com/spreadsheets/d/17WZGVKxZ2cfSxEGkLPRQazHNFU4iYBAqMDYy99ZfErM/edit?usp=sharing)

## Olusturulacak Sekmeler

Bu dosya icinde su sekmeleri acin:

1. `Projects`
2. `Reports`
3. `Puantaj`
4. `Workers`

## Kolon Yapilari

### `Projects`

1. `id`
2. `name`
3. `location`
4. `progress`
5. `budget`

### `Reports`

1. `id`
2. `projectId`
3. `date`
4. `shift`
5. `weather`
6. `temperature`
7. `workingHours`
8. `workSummary`
9. `nextPlan`
10. `safetyPpe`
11. `toolboxTalk`
12. `incident`
13. `notes`

### `Puantaj`

1. `id`
2. `date`
3. `chief`
4. `defaultProjectId`

### `Workers`

1. `puantajId`
2. `name`
3. `projectId`
4. `job`
5. `status`

## Apps Script Kurulumu

1. Google Sheet icinde `Extensions` -> `Apps Script` acin.
2. Varsayilan kodu silin.
3. Repo icindeki [google-apps-script.gs](/Users/mirkanemirsancak/Documents/New%20project%203/google-apps-script.gs) dosyasini yapistirin.
4. `Deploy` -> `New deployment` -> `Web app` secin.
5. `Execute as`: `Me`
6. `Who has access`: ilk test icin `Anyone`
7. Cikan `Web app URL` degerini uygulamadaki `Ayarlar` ekranina girin.

## Not

Bu sheet linkinin herkese acik olmasi goruntuleme icin yeterli olabilir, ama yazma islemi icin asil kontrol Apps Script deployment ayarlarinda olacak.

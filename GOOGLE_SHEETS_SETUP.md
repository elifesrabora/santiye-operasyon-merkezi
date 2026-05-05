# Google Sheets Kurulumu

Baglanacak ana tablo:

- [Google Sheet](https://docs.google.com/spreadsheets/d/17WZGVKxZ2cfSxEGkLPRQazHNFU4iYBAqMDYy99ZfErM/edit?usp=sharing)

## Olusturulacak Sekmeler

Bu dosya icinde su sekmeleri acin:

1. `Projects`
2. `Users`
3. `Reports`
4. `Puantaj`
5. `Workers`
6. `Orders`
7. `Tasks`
8. `Documents`

## Kolon Yapilari

### `Projects`

1. `id`
2. `name`
3. `location`
4. `startDate`
5. `endDate`
6. `budget`

### `Users`

1. `id`
2. `name`
3. `username`
4. `passwordHash`
5. `role`
6. `active`

### `Reports`

1. `id`
2. `projectId`
3. `date`
4. `workingHours`
5. `workSummary`
6. `nextPlan`
7. `incident`
8. `notes`
9. `createdById`
10. `createdAt`

### `Puantaj`

1. `id`
2. `date`
3. `chiefId`
4. `createdById`
5. `createdAt`

### `Workers`

1. `puantajId`
2. `name`
3. `projectId`
4. `job`
5. `status`

### `Orders`

1. `id`
2. `projectId`
3. `date`
4. `material`
5. `spec`
6. `quantity`
7. `unit`
8. `supplier`
9. `unitPrice`
10. `total`
11. `priceSource`
12. `orderedById`
13. `status`
14. `note`
15. `createdAt`

### `Tasks`

1. `id`
2. `projectId`
3. `title`
4. `assignedToId`
5. `dueDate`
6. `status`
7. `note`
8. `createdById`
9. `createdAt`

### `Documents`

1. `id`
2. `projectId`
3. `title`
4. `type`
5. `url`
6. `note`
7. `createdById`
8. `createdAt`

## Apps Script Kurulumu

1. Google Sheet icinde `Extensions` -> `Apps Script` acin.
2. Varsayilan kodu silin.
3. Repo icindeki [google-apps-script.gs](/Users/mirkanemirsancak/Documents/New%20project%203/google-apps-script.gs) dosyasini yapistirin.
4. Kodun en ustundeki `API_TOKEN` degeri uygulamadaki varsayilan ayarla aynidir: `AYAZLAR_SANTIYE_2026`.
5. `Deploy` -> `New deployment` -> `Web app` secin.
6. `Execute as`: `Me`
7. `Who has access`: ilk test icin `Anyone`
8. Cikan `Web app URL` degerini uygulamadaki `Ayarlar` ekranina girin. Varsayilan token: `AYAZLAR_SANTIYE_2026`.

## Not

Bu sheet linkinin herkese acik olmasi goruntuleme icin yeterli olabilir, ama yazma islemi icin asil kontrol Apps Script deployment ayarlari ve `API_TOKEN` kontrolu ile yapilir.

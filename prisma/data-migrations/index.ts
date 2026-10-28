// @ts-nocheck
/**
 * Sürümlü VERİ taşımaları (şema değişikliklerinden sonra eski kayıtları yeni yapıya getirir).
 *
 * Kurallar:
 *  - Şema yalnızca EKLEMELİ değişir (yeni tablo/sütun, varsayılan değerli). Eski sütun hemen silinmez.
 *  - Büyük değişiklik 3 adımdır: (1) yeni sütunu ekle, (2) burada veriyi taşı, (3) eski sütunu SONRAKİ sürümde kaldır.
 *  - Her taşıma tekrar çalışsa da zarar vermemeli (idempotent) ve mümkünse tek `prisma.$transaction` içinde olmalı.
 *  - `id` tarih-sıra biçiminde olur (YYYY-MM-DD-NNNN-ad); id sırasına göre çalışır, bir kez uygulanır.
 *  - `critical: true` ise başarısız olunca uygulama başlamaz (varsayılan: hata yazılır, uygulama açılır, bir sonraki açılışta tekrar denenir).
 */
export type DataMigration = {
  id: string;
  name: string;
  critical?: boolean;
  run: (prisma: any) => Promise<string | void>;
};

export const DATA_MIGRATIONS: DataMigration[] = [
  {
    id: "2026-10-28-0001-baseline",
    name: "Başlangıç noktası (veri taşıma altyapısı devreye alındı)",
    run: async () => "Taşınacak veri yok; mevcut kurulum bu noktadan sonra izlenir.",
  },
];

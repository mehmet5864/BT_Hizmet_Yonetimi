# BT Hizmet Yönetimi

Kurumsal BT varlık (ITAM), konfigürasyon (CMDB) ve ITIL hizmet yönetimi. Sürüm **1.0.0**.

Arayüz dilleri: Türkçe (varsayılan), İngilizce, Arapça, İspanyolca, Azerbaycan. Dil, sağ üstteki bayraklardan seçilir; menü formlarındaki alan adları ve seçenekler de seçilen dile uyar.

Kurulum: **[KURULUM.md](KURULUM.md)**. Önerilen: Docker Desktop + `install-docker.bat`, sonraki açılış `baslat-docker.bat`. Güncelleme (veriler kalır): `guncelle-docker.bat`. 2.0.0’dan 1.3.0 veri geri alma: `restore-1.3.0.sh` (volume silmeyin). Node alternatifi: `install.bat` → `baslat.bat`. Paket: `npm run package`. İndirme sayfası: [http://127.0.0.1:43130/indir](http://127.0.0.1:43130/indir) (`BT-Hizmet-Yonetimi-1.0.0.zip`).

Sürüm notları: **[SURUM.md](SURUM.md)**.

Arayüz, [Bluedox](https://demo.templatemonster.com/tr/demo/296919.html) admin paneli düzenine göre tasarlandı: koyu kenar çubuğu, açık pano, mavi vurgu ve dairesel istatistik simgeleri. Varsayılan tema **Bluedox**; diğer temalar Ayarlar’dan seçilir.

## Docker ile çalıştırma

```bash
docker compose up --build -d
```

Uygulama `http://localhost:43130` adresinde açılır. İlk açılışta şema PostgreSQL'e uygulanır ve örnek veri yüklenir. Ayrıntı: [KURULUM.md](KURULUM.md), sunucu kurulumu: [ON-PREMISE-KURULUM.md](ON-PREMISE-KURULUM.md).

| Komut | Ne yapar |
| --- | --- |
| `install-docker.bat` / `docker compose up --build -d` | Kurulum veya güncelleme |
| `baslat-docker.bat` / `docker compose up -d` | Yeniden derlemeden açar |
| `durdur-docker.bat` / `docker compose stop` | Durdurur (veri volume'da kalır) |
| `docker compose down -v` | **Veritabanını siler** (kullanmayın) |
| `SEED_ON_START=false docker compose up --build` | Boş veritabanıyla açar |

# BT Hizmet Yönetimi 1.0.0 — kurulum

Docker Desktop ile kurulur (Node.js gerekmez). Veritabanı **PostgreSQL 16**'dır; ayrı bir konteyner olarak otomatik kalkar.
Sunucu (on-premise) kurulumu için **[ON-PREMISE-KURULUM.md](ON-PREMISE-KURULUM.md)**. Değişiklik listesi: **[SURUM.md](SURUM.md)**.

Uygulama adresi: [http://127.0.0.1:43130](http://127.0.0.1:43130) (3.0.0 ile yan yana çalışabilir; o 43128'dedir.)
Örnek giriş: kullanıcı `ahmet.yilmaz` · parola `Kurum123!` (ilk girişte değiştirin)

## Windows

1. [Docker Desktop](https://www.docker.com/products/docker-desktop/) kurun (WSL 2 işaretli). Linux containers açık olsun.
2. Docker Desktop'ı açın; balina sabitlenene kadar bekleyin.
3. Zip'i bir klasöre çıkarın (örnek: `C:\BT-Hizmet-Yonetimi`). Zip'i Docker penceresine sürüklemeyin.
4. `install-docker.bat` dosyasına çift tıklayın. İlk derleme birkaç dakika sürer.

| Dosya | Ne yapar |
| --- | --- |
| `install-docker.bat` / `yukle-docker.bat` / `guncelle-docker.bat` | İlk kurulum veya güncelleme (derler, veriler kalır) |
| `baslat-docker.bat` | Sonraki açılış (derlemez) |
| `durdur-docker.bat` | Durdurur; veri volume'larda kalır |

## macOS / Linux

```bash
chmod +x *.sh scripts/*.sh
./install-docker.sh
```
Sonraki açılış: `./baslat-docker.sh`

## Ne kurulur

- `bt-postgres-v4` (PostgreSQL 16, volume `pgdata`) ve `envanter-yonetim-v4` (uygulama) konteynerleri
- Örnek personel, envanter, talep ve olay kayıtları (ilk kurulumda bir kez; `SEED_ON_START=false` ile kapatılır)
- `.env` ilk kurulumda üretilir (`SESSION_SECRET`, `POSTGRES_PASSWORD`); var olan değerlere dokunulmaz. Dosyayı paylaşmayın.

**`docker compose down -v` yazmayın**: tüm kayıtları siler.

## Lisans

Ayarlar → Lisans'tan imzalı anahtar yüklenir (çevrimdışı doğrulanır). Anahtar yoksa deneme sürümü en çok 25 kullanıcıya izin verir. Süre dolarsa mevcut kullanıcılar çalışmaya devam eder, yeni kullanıcı eklenemez.

## 3.0.0'dan geçiş

4.0.0 SQLite yerine PostgreSQL kullanır; 3.0.0 verileri otomatik taşınmaz. 3.0.0 yan yana çalışmaya devam eder (ayrı port ve volume). Veri aktarımı gerekiyorsa geliştirici ile planlayın.

## Sorun giderme

- Günlük: `docker compose logs -f envanter` / `docker compose logs db`
- Durum: `docker compose ps`
- Derleme hatası: pencerede `error TS` veya `Failed to compile` satırlarını kaydedin.

## Yedek, lisans ve güvenlik 

- Yedek: `yedekle-docker.bat` → `yedekler/` (veritabanı + lisans + yüklemeler). Geri yükleme: `geri-yukle-docker.bat yedekler\db-….sql.gz [yedekler\dosyalar-….tar.gz]`.
- Lisans: Ayarlar → Lisans. Anahtar yoksa kısıtlı mod (25 kullanıcı, çekirdek modüller). Anahtar modül listesi taşır.
- Parola/oturum politikası: Ayarlar → Güvenlik.

## İş akışları 

Ayarlar → İş akışları: talep/değişiklik/yama için onay zinciri çizin, "Etkin" işaretleyin. Bekleyen adımlar: `/is-akisi`.

## Canlı ortam: Active Directory, SIEM, e-posta (1.0.0)

Ayarlar → Bağlantılar bölümünden girilir; her sekmede **Bağlantıyı dene** düğmesi vardır.

- **Active Directory:** sunucu (FQDN/IP), port 389 (LDAP) veya 636 (LDAPS), Base DN (örn. `DC=kurum,DC=local`). Kullanıcı giriş yaptığında kendi kullanıcı adı/parolasıyla bind edilir ve `memberOf` grupları Ayarlar → Yetki ve roller eşlemesine göre role çevrilir. Servis hesabı (Bind DN/parola) yalnızca bağlantı testi içindir. Konteynerden AD sunucusuna ağ erişimi (389/636) açık olmalıdır.
- **SIEM:** adres, port (514 UDP/TCP veya 6514 TLS), biçim CEF ya da Syslog. Sunucuya ulaşılamazsa uygulama çalışmaya devam eder, hata etkinlik günlüğüne `SIEM_ERROR` yazılır.
- **E-posta (SMTP):** 25 / 587 (STARTTLS) / 465 (SSL). Gönderim hatası kayıt işlemini engellemez (`MAIL_ERROR`).
- **Sertifikalar:** varsayılan olarak kurum içi/kendinden imzalı sertifika kabul edilir. Sıkı doğrulama için `.env` dosyasına `INTEGRATION_TLS_STRICT=true` ekleyip `baslat-docker`'ı yeniden çalıştırın (kurum CA'sı konteynerde güvenilir olmalı).
- **API:** `/api/v1` uçları ve örnekler uygulamada **API arayüzü** sayfasında; OpenAPI tanımı `/api/v1/openapi.json`.

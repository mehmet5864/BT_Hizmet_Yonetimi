# BT Hizmet Yönetimi 1.0.1 — On-premise (sunucu) kurulumu

Kurum içi Linux sunucuda Docker ile çalıştırmak için. Windows'ta Docker Desktop kurulumu için bkz. KURULUM.md.
Mimari: `envanter-yonetim-v4` (uygulama) + `bt-postgres-v4` (PostgreSQL 16). Veriler `pgdata`, yüklemeler `envanter-uploads` volume'larındadır.

## Gereksinimler
- Linux sunucu (Ubuntu 22.04+, Debian 12+, RHEL/Alma 9+); 50.000 kullanıcı hedefi için önerilen: 8 CPU, 16 GB RAM, SSD disk
- Docker Engine 24+ ve Compose V2 (`docker compose version`)
- İlk derleme için internet (npm paketleri, Docker imajları). İnternetsiz sunucu için bölüm 6.
- Kullanıcıların sunucunun 43130 portuna (veya ters vekil üzerinden 443) erişimi

## 1. Kurulum
```bash
unzip BT-Hizmet-Yonetimi-1.0.1.zip && cd BT-Hizmet-Yonetimi-kurulum
{
  echo "SESSION_SECRET=$(openssl rand -hex 32)"
  echo "POSTGRES_PASSWORD=$(openssl rand -hex 24)"
  echo "SESSION_SECURE=true"
  echo "APP_URL=https://bt.kurum.local"
  echo "SEED_ON_START=true"
  echo "SEED_DEMO_EXTRA=false"
  echo "DB_POOL_MAX=30"
} > .env
docker compose up -d --build
```
`.env` dosyasını paylaşmayın ve yedeğinizi alın (parola kaybolursa veritabanına erişilemez).
- `SESSION_SECURE=true` yalnızca HTTPS ile erişimde. HTTP ile erişecekseniz `false`.
- `SEED_DEMO_EXTRA=false`: demo veri yüklenmez. Örnek hiyerarşi ve süreç verisi için `true`.
- `install-docker.sh` de kullanılabilir; var olan `.env` değerlerine dokunmaz, yalnızca eksikleri ekler.

Sonraki açılış `docker compose up -d`, durdurma `docker compose stop` (**`down -v` yazmayın**).
Açılış: `http://SUNUCU:43130` — ilk açılış şemayı kurar, 1–2 dakika sürebilir.

## 2. İlk giriş, lisans ve güvenlik
- Örnek kullanıcı `ahmet.yilmaz` / `Kurum123!` — **hemen parolayı değiştirin** (veya kendi süper yöneticinizi tanımlayıp bunu devre dışı bırakın).
- **Lisans:** Ayarlar → Lisans'tan satıcıdan aldığınız `BTHY1…` anahtarını yükleyin. Yüklenmezse deneme sürümü 25 kullanıcıyla sınırlıdır. Anahtar volume'da (`/data/license.key`) saklanır; alternatif olarak `.env` içine `LICENSE_KEY=…` yazılabilir.
- Ayarlar yalnızca süper yöneticide görünür. Active Directory: Ayarlar → Active Directory.
- Güvenlik duvarında yalnızca gerekli portu açın. PostgreSQL portu dışarıya açılmaz (yalnızca iç ağ).

## 3. HTTPS (nginx ters vekil örneği)
```nginx
server {
  listen 443 ssl;
  server_name bt.kurum.local;
  ssl_certificate     /etc/ssl/bt.crt;
  ssl_certificate_key /etc/ssl/bt.key;
  client_max_body_size 50m;
  location / {
    proxy_pass http://127.0.0.1:43130;
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_set_header X-Forwarded-For $remote_addr;
  }
}
```
`.env` içinde `APP_URL=https://bt.kurum.local` ve `SESSION_SECURE=true` olmalı.

## 4. Yedek ve geri yükleme

4.1.0 ile hazır betikler gelir: `./yedekle-docker.sh` (Windows: `yedekle-docker.bat`) veritabanı + lisans + yüklemeleri `yedekler/` klasörüne alır; `./geri-yukle-docker.sh yedekler/db-….sql.gz [yedekler/dosyalar-….tar.gz]` geri yükler. Aşağıdaki elle komutlar da geçerlidir.
Veritabanı yedeği (uygulama çalışırken alınabilir):
```bash
mkdir -p /yedek
docker exec bt-postgres-v4 pg_dump -U bt -Fc bt > /yedek/bt-$(date +%F).dump
docker run --rm -v bt-hizmet-yonetimi-v4_envanter-uploads:/d -v /yedek:/y alpine tar czf /y/uploads-$(date +%F).tgz -C /d .
```
Günlük çalıştırmak için cron'a ekleyin. Geri yükleme (uygulama durdurulmuşken, db çalışırken):
```bash
docker compose stop envanter
docker exec -i bt-postgres-v4 pg_restore -U bt -d bt --clean --if-exists < /yedek/bt-2026-10-20.dump
docker compose start envanter
```
Ayarları ayrıca Ayarlar → Yedek ekranından JSON olarak alabilirsiniz.

## 5. Güncelleme
Önce yedek alın. Yeni zip'i ayrı klasöre açın, eski klasördeki `.env` dosyasını kopyalayın, yeni klasörde `docker compose up -d --build` çalıştırın. Compose proje adı sabit olduğundan volume'lar ve veriler aynı kalır. Şema ekleri açılışta otomatik uygulanır (silme gerektiren değişiklikler uygulanmaz ve günlükte uyarı verir).

## 6. Çevrimdışı (internetsiz) sunucu
İnternetli makinede kurulum klasöründe:
```bash
docker compose build
docker pull postgres:16-alpine
docker save envanter-yonetim:v4 postgres:16-alpine | gzip > bt-v4-imajlar.tar.gz
```
Dosyayı, `docker-compose.yml` ve `.env` ile sunucuya taşıyın:
```bash
gunzip -c bt-v4-imajlar.tar.gz | docker load
docker compose up -d --no-build
```

## 7. Ölçekleme notları (50.000 kullanıcı)
- PostgreSQL ayarları `docker-compose.yml` içindedir (`max_connections`, `shared_buffers`); donanıma göre artırın.
- Uygulama kopya başına `DB_POOL_MAX` kadar bağlantı açar; kopya sayısı × havuz < `max_connections` olmalıdır.
- Birden fazla uygulama kopyası için aynı `SESSION_SECRET` ve ortak `envanter-uploads` volume'u kullanılmalı, önüne yük dengeleyici konmalıdır. Bu yapı burada yük testiyle doğrulanmadı; üretimden önce kendi ortamınızda yük testi yapın.
- Sürekli yedek için PostgreSQL akışlı çoğaltma (replica) ve `pg_dump` zamanlaması önerilir.

## 8. Sorun giderme
- Günlük: `docker compose logs -f envanter` ve `docker compose logs db`
- Durum: `docker compose ps`
- Port çakışması: `docker-compose.yml` içinde `43130:43130` satırının soldaki değerini değiştirin, `APP_URL`'i güncelleyin.
- "password authentication failed": `.env` içindeki `POSTGRES_PASSWORD` ilk kurulumdakiyle aynı olmalı.

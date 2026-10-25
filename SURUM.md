# Sürümler

## 1.0.1 — standart raporlama

- **8 yeni rapor** (Raporlar sayfası): *Yönetici özeti (KPI panosu)*, *SLA uyum raporu*, *Çözüm süresi (MTTR) ve ilk yanıt (MTTA)*, *Açık kayıt yaşlandırma*, *Değişiklik ve yama başarı oranı*, *Zafiyet termin uyumu*, *Onay zinciri süreleri*, *Erişim ve lisans denetimi*. Önem derecesine, kaynağa ve türe göre kırılım; tarih filtresi (yaşlandırma anlık durumdur).
- **Standart çıktı düzeni** (PDF ve Word): rapor adı, rapor no, oluşturma zamanı, hazırlayan, kapsam/filtre metni, kayıt sayısı, **özet kutusu** (KPI), hesap/yöntem notları, **sayfa numarası** ve "kurum içi" altbilgisi. CSV yalnızca veri olarak kalır (makine okuması için).
- Önizleme artık özet kutusunu ve notları da gösterir.
- Erişim: yönetici özeti, onay süreleri ve erişim denetimi Ayarlar yetkisi olanlara; SLA/çözüm/yaşlandırma Olay, değişiklik başarısı Değişiklik, zafiyet termini Zafiyet modülü yetkisine bağlıdır. Veri kapsamı (birim/ACL) mevcut raporlardaki gibi uygulanır.
- Dil: yeni rapor adları, açıklamaları ve sütunları İngilizce karşılıklarıyla eklendi.
- Not: Docker derlemesi kullanıcıda doğrulanır; Prisma alan adları şemayla elle karşılaştırıldı.

- **Resimli Kullanıcı rehberi** (Kılavuzlar → Kullanıcı rehberi): her menü için ne işe yarar, ekran şeması (numaralı alanlar), çalışma adımları ve ITIL / Agile / DevSecOps'a göre nasıl olması gerektiği; uçtan uca olay örneği ve süreç akış şemaları.
- **Resimli Yönetici rehberi** (Kılavuzlar → Yönetici rehberi): e-posta (SMTP), Active Directory (servis hesabı, LDAPS, grup → rol), SIEM (CEF/Syslog, UDP/TCP/TLS), zafiyet tarayıcıları (Nessus, Tenable, Qualys, OpenVAS, Rapid7, genel REST; sınırlamalar ve API ile bulgu gönderme), onay ve iş akışları, API anahtarları, TLS, yedek; sorun giderme tabloları.
- Resimler **şematik SVG çizimlerdir** (`public/guides/`, `scripts/generate-guide-images.mjs` ile üretilir); gerçek ekran görüntüsü değildir. Kılavuz bloklarına `img` türü eklendi.
- Qualys isteğine zorunlu `X-Requested-With` başlığı eklendi.
- **Topoloji (Hizmet tasarımı → Topoloji, `/hizmetler/topoloji`)**: hizmet kataloğundan seçilen hizmetin topolojisi, Visio tarzı şekillerle: kullanıcı grupları → güvenlik duvarı → hizmetin çalıştığı sunucular (işletim sistemiyle) → hizmet → eriştiği sistemler (veritabanı vb.), oklarda port/protokol. Örn. "Tüm istemciler → HTTPS/443", "Administrator → HTTPS/443 · SSH/22 · RDP/3389". Kritiklik çerçeve rengi, açık zafiyet rozeti, tıklayınca bağlantı vurgusu, yakınlaştırma/kaydırma, SVG indirme.
- **Yeni tablo `ServiceAccessRule`** (hizmet → kullanıcı grubu → portlar) ve `AssetRelation` tablosuna `port`, `protocol`, `note` alanları. Sayfanın altındaki "Erişim kuralları" ve "Bağlantılar ve portlar" bölümlerinden girilir; etkinlik günlüğüne yazılır. Envanter formundaki "çalıştığı sunucu" seçimi artık mevcut bağlantıların port bilgisini silmez.
- Hizmet ve varlık seçimi **arama kutusuyla** yapılır (`/api/topoloji/ara`, en çok 15 sonuç); tüm liste önceden yüklenmez.
- Önceki taslaktaki kişi/genel/varlık/konum görünümleri kaldırıldı. `AccessGrant` tablosu kullanılmıyor; `prisma db push` veri kaybı uyarısı vermesin diye tanımı şemada bırakıldı.
- Topoloji yalnızca **Süper yönetici, Sistem yöneticisi ve Bilgi güvenliği yöneticisi** rollerine açıktır.
- Not: Topoloji arayüzü bulutta çalıştırılıp görülemedi; Docker derlemesi ve ekran kullanıcıda doğrulanır.

## 1.0.0 — ilk kararlı yayın

Bu sürüm 4.x geliştirme hattının son hâlidir; sürüm numarası ilk resmi yayın olarak 1.0.0'a sıfırlandı. Docker proje/volume adları (`bt-hizmet-yonetimi-v4`, `pgdata`, `envanter-data`, `envanter-uploads`) **değişmedi**, mevcut veriler korunur: `guncelle-docker.bat` yeterlidir.

**Canlı ortam (entegrasyonlar)**
- **Active Directory girişi yeniden yazıldı:** bind yanıtı gelince hemen sonuçlanır (eskiden zaman aşımını bekliyordu), uzun LDAP mesajları (çok baytlı uzunluk) desteklenir, kullanıcının `memberOf` grupları okunur ve rol eşlemesine verilir, oturum düzgünce kapatılır (unbind). Hata iletileri açık: yanlış parola, yetki yok, LDAPS gerekli, zaman aşımı.
- **AD bağlantı testi:** TCP denemesine ek olarak Bind DN / parola doluysa servis hesabıyla gerçek oturum açar.
- **SIEM:** UDP gönderimine hata ve zaman aşımı yakalama eklendi (sunucu kapalıyken uygulama düşmez), TLS'te SNI, IPv6 UDP. SIEM/e-posta/AD hataları kullanıcı işlemini bozmaz; etkinlik günlüğüne `SIEM_ERROR` / `MAIL_ERROR` yazılır.
- **Sertifika doğrulaması:** varsayılan olarak kurum içi (kendinden imzalı) sertifikalara izin verilir. Ortam değişkeni `INTEGRATION_TLS_STRICT=true` ile LDAPS/SIEM-TLS sertifikaları sıkı doğrulanır.

**Onay / e-posta / yetki sadeleştirmesi**
- Onay zinciri çalışırken eski paralel onay e-postaları gönderilmez; yalnızca sırası gelen onaycıya gider.
- API ile zincir çalışan talebin durumu değiştirilemez (409); karar onay adımındadır.
- Bildirim işlemleri hata verse bile kayıt işlemi tamamlanır.

**API**
- Yeni: `GET /api/v1/talepler/:id/onay` (onay zinciri durumu/geçmişi), `GET /api/v1/is-akisi/bekleyen` (onayımı bekleyenler), `GET /api/v1/lisans` (yalnızca süper yönetici).
- Talep yanıtına `assigneeId`, `assignee`, `assignedAt` alanları eklendi. API'den açılan talep de onay zincirini başlatır.
- Anahtar/oturum, lisansta etkin olmayan modülün uçlarını kullanamaz (403).

**Dil:** Türkçe ve İngilizce eksik metinler tamamlandı (iş akışları, lisans, güvenlik, süreç yöneticileri, bağlantı ayarları).

**Not:** Bu paket bulut ortamında tür taraması ve AD protokol denemesinden geçti; Docker derlemesi sizin bilgisayarınızda yapılır. Hata çıkarsa `error TS` satırlarını iletin.

## 4.3.3

- Düzeltme: Docker derlemesi `src/lib/workflow/engine.ts` içindeki tür hatasıyla (`Property 'nodeId' does not exist on type AdvanceResult`) düşüyordu; onay zinciri adım kimliği yerel değişkene alındı. İşlev değişmedi.

## 4.3.2

- **Süreç yöneticileri ekranı yeniden düzenlendi** (Ayarlar → Tanımlar → Süreç yöneticileri): 30 alan tek listede değil, üç öncelik grubunda.
  1. **Önce bunları atayın (8):** Sistem, Network, Siber güvenlik, Yazılım, Veritabanı, Servis masası şube yöneticileri (talep onayları), Bilgi güvenliği ve Envanter yöneticisi.
  2. **Önerilen (2):** Değişiklik ve Yama yöneticisi (yeni kayıtta varsayılan talep amiri).
  3. **İsteğe bağlı (20):** diğerleri; kapalı bir bölümde, kurumunuzda sorumlu varsa açılıp doldurulur. Boş kalanlar rolüne uygun biriyle otomatik doldurulur.
- İlerleme göstergesi ve Ayarlar sayfasındaki kutu artık **temel yönetici sayısını (x/8)** gösterir.
- Davranış değişmedi: bir kişi yalnızca bir modülün yöneticisi olabilir; sıralı talep onayındaki "Karşılayan amir" adımı talebin türüne göre buradaki şube yöneticisini kullanır.

## 4.3.1

- **Hizmet masası: sıralı amir onayı.** Talep için hazır şablon: talep eden birim amiri → karşılayan amir (Ayarlar → İş akışları → "Talep akışı oluştur", varsayılan olarak etkin gelir). Akış etkinse e-posta herkese aynı anda gitmez; **sırası gelen onaycıya** Onayla/Reddet bağlantılı e-posta gider, o onaylayınca bir sonrakine geçer. Onaycı tanımlı değilse süper yöneticilere gider.
- **Aynı kişi iki adımda ise** (ör. amir hem talep eden hem karşılayan) ikinci adım otomatik geçilir; zincirin son adımı yine de gerçek onay ister.
- **Gerçekleştirecek birimde otomatik atama:** talep son onayı alınca işleyen birimdeki en az açık işi olan kişiye (talep eden ve birim amiri hariç) atanır; kimse yoksa birim amirine. Atanan kişiye ve birim amirine e-posta, talepte "Atanan kişi" alanı ve hareket kaydı. Akış kullanılmasa da tek adımlı onayda da çalışır.
- **Sonuç e-postası:** talep, değişiklik ve yama onaylanınca/reddedilince talep edene gerekçeyle e-posta gider.
- Talep detayında **Onay zinciri** paneli (adımlar, kim ne zaman onayladı, sıradaki adım).
- Şema: `ServiceRequest.assigneeId`, `assignedAt` (açılışta `db push` ile eklenir).
- Not: e-posta için Ayarlar → E-posta (SMTP) açık ve "onay bildirimi" işaretli olmalı; kişilerin e-posta adresi dolu olmalı.

## 4.3.0

- **Onay zincirleri ve görsel süreç tasarımcısı** (Ayarlar → İş akışları, süper yönetici): talep, değişiklik ve yama için çok adımlı onay akışları sürükle-bırak tasarım alanında çizilir. Düğümler: Başlangıç, Onay adımı (talep eden/işleyen birim amiri, bilgi güvenliği yöneticisi, belirli kişi ya da roldeki herhangi biri), Koşul (ör. önem = CRITICAL → üst yönetici de onaylasın), Bitiş (onay/red). Onay ve red için ayrı yollar, canlı denetim (döngü, eksik bağlantı, ulaşılamayan düğüm). Etkin akış, o türde eski tek adımlı onayın yerine geçer; aynı türde tek akış etkin olur.
- **İş akışı onaylarım** (`/is-akisi`): sırası size gelen adımlar; ana sayfada bildirim bandı. Mevcut Onayla/Reddet düğmeleri, hızlı menü ve e-posta onay bağlantıları zincire işler.
- Zincir tamamlanınca kayıt eski akıştaki gibi onaylanır/reddedilir; CAB notu ve geri dönüş planı kuralları aynen geçerlidir (başarısız olursa adım geri alınır). Akış tanımı sonradan değişse de çalışan örnek kendi kopyasıyla devam eder. Karar geçmişi örnekte saklanır.
- Şema: `WorkflowDefinition`, `WorkflowInstance` tabloları (açılışta `db push` ile eklenir).
- Not: 4.2.0 (SLA/bildirim/e-postayla talep) henüz yapılmadı, sürüm numarası atlandı. Zincirdeki yeni adım için ayrı e-posta bildirimi henüz yok.

## 4.1.1

- **Görsel hareketlilik**: göstergelerde sayıların sayarak yükselmesi, sayfa geçişlerinde yükleme iskeleti (`loading.tsx`), tablo satırlarının sırayla belirmesi, ilerleme çubuklarında süzülen parıltı, kenar çubuğu bağlantılarında hafif kayma, uyarı/tehlike göstergelerinde yumuşak nabız, açılır pencerelerde giriş animasyonu. Windows'ta "hareketi azalt" açıksa tümü kapanır.

## 4.1.0

- **Lisans: modül bazlı açma/kapama.** Lisans anahtarı artık açık modülleri taşır (`--modules personel,envanter,olay,...` ya da `all`). Kapalı modüle girilince "Bu modül lisansınızda yok" sayfası açılır, menüden de gizlenir. Eski (modül listesiz) lisanslar tüm modülleri açar. Ayarlar → Lisans sayfasında modül listesi görünür.
- **Lisans: kısıtlı mod.** Lisans yok, geçersiz ya da süresi + 30 gün ek süre dolmuşsa: en çok 25 kullanıcı ve yalnızca çekirdek modüller (Personel, Envanter, Talepler, Olay, Audit log; Genel bakış, Kılavuzlar, Ayarlar her zaman açık). Mevcut veri silinmez. Not: API (`/api/v1`) modül kontrolüne henüz bağlı değildir.
- **Parola ve oturum politikası** (Ayarlar → Güvenlik, süper yönetici): en az parola uzunluğu, büyük/küçük harf + rakam zorunluluğu, hatalı girişte hesap kilidi (sayı ve süre), oturum süresi. Kilit yerel girişte uygulanır (`Person.failedLogins`, `Person.lockedUntil`). Politika `SystemConfig` içinde `security` kaydıdır.
- **Yedekleme araçları**: `yedekle-docker.bat/.sh` (PostgreSQL `pg_dump` + lisans ve yüklemeler → `yedekler/`), `geri-yukle-docker.bat/.sh`.
- Ayarlar sayfasının üstüne **Lisans** ve **Güvenlik** düğmeleri eklendi.
- Lisans üretici: `--modules` seçeneği (lisans-uretici.zip güncellendi).
- Şema: `Person` tablosuna `failedLogins`, `lockedUntil` eklendi (açılışta `db push` ile uygulanır, veri korunur).
- Henüz yok: SLA/bildirim/e-postayla talep, görsel iş akışı, zamanlanmış rapor, entegrasyonlar, otomatik testler (sonraki sürümler).

## 4.0.0

- Düzeltme: Prisma 7 `db push --skip-generate` seçeneğini tanımıyor; konteyner başlangıçta döngüye giriyordu. Seçenek kaldırıldı.

- Düzeltme: Docker derlemesi `/_not-found` sayfasını üretirken veritabanına bağlanmaya çalışıp düşüyordu. Kök düzen artık `force-dynamic`, AppChrome veritabanı hazır değilse çökmüyor.

- **PostgreSQL 16** (SQLite yerine): bağlantı havuzu (`DB_POOL_MAX`), ayrı veritabanı konteyneri, sağlık denetimi. Şema açılışta `prisma db push` ile uygulanır. Arama alanları büyük/küçük harf duyarsız (`mode: insensitive`).
- **Lisanslama**: çevrimdışı doğrulanan imzalı (Ed25519) lisans anahtarı; kullanıcı sayısı ve süre sınırı (ör. 50.000 kullanıcı). Ayarlar → Lisans (yalnızca süper yönetici). Lisanssız deneme: 25 kullanıcı. Süre dolunca 30 gün ek süre; sonra yeni kullanıcı eklenemez. Lisans üretici ve özel anahtar paket dışındadır (`lisans-uretici/`).
- **Port ve adlar**: 43130, `bt-hizmet-yonetimi-v4`; 3.0.0 ile yan yana çalışır.
- **Kaldırıldı**: Node (Docker'sız) kurulum ve güncelleme betikleri, SQLite onarım/geri yükleme araçları. `.env` yeniden yazılmaz; yalnız eksik anahtarlar eklenir.
- Not: 3.0.0 verileri otomatik taşınmaz.

## 3.0.0

- **Kurumsal hiyerarşi (örnek veri)**: Bakanlık → 2 Bakan Yardımcılığı → 4 Genel Müdürlük (Bilgi İşlem, Strateji Geliştirme, Personel, Mali Hizmetler) → her birinde 2 Genel Müdür Yardımcılığı → Daire Başkanlıkları (Siber Güvenlik, Yazılım, Destek Hizmetleri, Kurumsal Gelişim, Sosyal Hizmetler, Satın Alma vb.) → Şube Müdürlükleri. Mevcut kişi ve birimler korunur; boş kadrolara rolüne uygun yeni kişi eklenir (Bakan / Bakan Yrd. / GM / GMY → Üst yönetici, Daire Başkanı / Şube Müdürü → Birim amiri; Bilgi güvenliği yöneticisi amir kadrosuna atanmaz). `prisma/seed-org-hierarchy.ts`, işaret: `.org-hierarchy` (SEED_DEMO_EXTRA).
- **On-premise kurulum kılavuzu** (`ON-PREMISE-KURULUM.md`): Linux sunucu, .env ayarları, HTTPS ters vekil, yedek / geri yükleme, güncelleme, çevrimdışı sunucu.
- **Çevik çalışma (Agile)** modülü (`/cevik`): ürün/ekip (Scrum veya Kanban), backlog, sprint (başlat/kapat), Kanban panosu, burndown ve velocity, retrospektif notu, Olay / Problem / Değişiklik / Talep / Zafiyet / Yama detayından "Çevik iş aç", sürükle-bırak pano, iş yorumları, toplantı kayıtları, epik ve yol haritası, puanlama ve iki yeni rapor
- **Personel puanlama sistemi**: Ayarlar → Puanlama (süper yönetici), kişi kartında performans, geriye dönük puan, negatif puan, performans raporları
- **Çevik çalışma kılavuzu** (Kılavuzlar menüsünde okuma + PDF), 5 çevik rapor ve genel görsel cila (animasyonlar, hover efektleri; "hareketi azalt" tercihine uyar)
- Olay formunda sandbox raporu; Reddet seçilince zorunlu gerekçe
- 2.1.2 ile yan yana çalışır: port **43128**, ayrı Docker proje adı (`bt-hizmet-yonetimi-v3`), ayrı veri ve yükleme hacimleri

## 2.1.2

- **Kılavuzlar** menüsüne ayrıntılı ITIL 4 kılavuzu eklendi (uygulamada okuma + PDF)
- Belge: hizmet değer sistemi, dört boyut, değer zinciri, 17 pratik ve ekran eşlemesi, senaryolar, sözlük
- Kurulum zip’i: `http://127.0.0.1:43128/indir` — **2.1.2 paketini indir**

## 2.1.1

- Menü içindeki formlar (envanter, personel, talep, ITIL süreçleri, değişiklik, firma/SLA) seçilen dile göre alan adı, seçenek, düğme ve sayfa başlığı gösterir
- Dil seçilince Türkçe etiketler yedek kalır; eksik çeviride Türkçe görünür
- Formdaki görsel / dosya yükleme düğmeleri de seçilen dili izler

## 2.1.0

- Arayüz dilleri: Türkçe, İngilizce, Arapça, İspanyolca, Azerbaycan
- Sağ üstte ülke bayraklarıyla dil seçimi; seçim `bt_lang` çerezinde saklanır
- Arapça için sağdan sola (RTL) düzen ve Arapça yazı tipi

## 2.0.0

- 17 ITIL pratiği menüde: katalog, tasarım, SLA, kullanılabilirlik, kapasite, süreklilik, doğrulama/test, varlık, CMDB, hizmet masası, olay, problem, talep, değişiklik, sürüm, izleme, değerlendirme
- 1.3.0 ekranları durur (envanter, talep, olay, problem, değişiklik, yama, CMDB, firma/SLA)
- Yeni süreçler 1.3.0 form kalıbında (kilitli kaydeden kişi/birim, örnek alanlar)
- Hizmet kataloğu: ad, erişim şartı, hizmet saati, SLA hedefleri
- Geri alma: Ayarlar → Görünüm → **ITIL 2.0 süreç menüsü** kapatılırsa 1.3.0 menüsü gelir; kayıt silinmez
- Docker ilk 2.0.0 açılışında `envanter-1.3.0.bak` kopyası alınır (`restore-1.3.0.sh`). `docker compose down -v` yazmayın

## 1.3.0

- Talep, değişiklik, yama, SLA, olay ve problem formlarında talep eden kişi oturumdaki kullanıcıdır; değiştirilemez
- Talep eden birim personel kartından seçili gelir; formda kilitlidir
- Kayıt güncellemede açan kişi ve birimi korunur (formdan başkası yazılamaz)

## 1.2.9

- Ayarlar → Tanımlar altında **Talep şubeleri** sekmesi
- Talep yönetimindeki şube tam adı ve menü adı buradan değiştirilir

## 1.2.8

- Talep formlarından işlem yapan birim ve amir alanları kalktı
- Karşılayan ofis ve amir, talep türü ile Ayarlar’daki şube yöneticisinden atanır

## 1.2.7

- Kişisel hareketler ana menüden alındı; Personel yönetimi içinde filtrelenir
- Personel sayfasındaki düğme **Personel işlemleri** (personel ekle ve hareketlerim)

## 1.2.6

- Hızlı işlemler ve e-posta onayında Reddet
- Her kullanıcı kendi hareketlerini görür (Hareketlerim)
- Zimmetli cihaz doğrudan başkasına verilemez; önce boşa çıkarılır veya zimmet yöneticisine alınır

## 1.2.5

- Formlarda kişi seçilince birim ve birim amiri otomatik dolar (Ahmet Yılmaz → Bilgi İşlem)
- Envanter, talep, değişiklik, konfigürasyon, zafiyet, olay, personel ve SLA formları aynı kuralı kullanır
- Birim seçilince amir / üst birim alanları da güncellenir
- Bozuk JSON veya geçersiz tarih artık sayfayı düşürmez

## 1.2.4

- Zimmet formu: yalnızca kişi seçilir; zimmetindeki kayıtlar listelenir, istenenler işaretlenir
- Başkasının üzerindeki demirbaş tutanağa yazılmaz; önce zimmeti boşa çıkarın uyarısı
- Tek kayıt / kişi ayrımı kaldırıldı

## 1.2.3

- Envanter yönetimi: **Zimmet formu** — kişinin zimmetindeki tüm kayıtlar veya tek demirbaş
- Çıktı PDF ve Word; düzen Taşınır Mal Yönetmeliği Örnek 6/A (yatay A4, üst üste binmeyen tablo)
- Docker imajına DejaVu yazı tipi eklendi; Türkçe karakterler bozulmaz
- Teslim alan / teslim eden, taahhütname, imza blokları ve iki nüsha notu

## 1.2.2

- Docker Desktop: `unknown docker command: "compose up --build --detach"` düzeltildi
- `yukle-docker.bat` artık `docker.exe` / Compose eklentisini ayrı argümanlarla çağırır (tek string yapmaz)
- Compose V2 kapalıysa açık mesaj: Settings → Use Docker Compose V2, sonra Restart

## 1.2.1

- Docker Desktop: `yukle-docker.bat` — zip’i Docker’a sürüklemeyin, bu dosyaya çift tıklayın
- Güncelleme Node.js ve eski 1.1.x klasör yolu istemez; volume aynı kalır
- `guncelle-docker.bat` yol sormaz, `node` çağırmaz

## 1.2.0

- Ayarlar’daki şube yöneticileri (sistem, network, siber, yazılım, veritabanı, servis) kendi ofislerindeki talepleri onaylar
- Onaydan sonra talep / değişiklik / yama **işlemde (açıkta)** devam eder (`IN_PROGRESS`)
- Onay bekleyen her kayıt için onaycıya e-posta gider; **Onayla** / **Reddet** bağlantısı giriş gerektirmez
- Yeni kayıtlarda yönetici alanı: önce Ayarlar’daki süreç yöneticisi, yoksa personel rolü, yoksa talep edenin amiri
- Ürün listeleri ailelerine ayrıldı: Nessus/Acunetix yalnızca zafiyet; VMware yalnızca sanallaştırma; OpenShift yalnızca yazılım ortamı
- E-posta bağlantıları `APP_URL` (varsayılan `http://127.0.0.1:43128`) üzerinden üretilir

## 1.1.9

- PowerShell `-d` yutması: kurulum artık `--detach` ile arka planda kalır (CMD log’a kilitlenmez)
- Prisma “Update available” bildirimi kapatıldı; 8.x’e yükseltmeyin

## 1.1.8

- Docker Desktop: `failed to get console` / Bake kapatıldı; `docker compose --progress plain`
- `.bat` içinden kurulum artık TTY gerektirmez

## 1.1.7

- Docker Compose `.env` okuma hatası düzeltildi (tırnaklı `SESSION_SECRET` satırı bozuluyordu)
- Kurulum bozuk `.env` dosyasını tırnaksız satırlarla onarır

## 1.1.6

- Docker Desktop: motor kapalıysa `install-docker.bat` / `baslat-docker.bat` uygulamayı açıp bekler
- Compose V2 (`docker compose`); eski `docker-compose` yedek
- `baslat-docker.bat` — yeniden derlemeden açar
- WSL 2 / Linux containers notu

## 1.1.5

- Docker ilk kurulum: `install-docker.bat` (oturum anahtarı, sağlık kontrolü)
- Docker sürüm güncelleme: `guncelle-docker.bat` mevcut klasöre; volume’lar korunur
- `durdur-docker.bat` — `down -v` yok
- Compose proje adı `bt-hizmet-yonetimi` — volume’lar klasör adından bağımsız
- İlk açılışta örnek veri yüklenir; mevcut volume’da seed tekrarlanmaz
- Konteyner açılışında ApiKey şema onarımı (yalnızca mevcut veritabanında)

## 1.1.4

- Giriş ekranındaki kurulum hesabı uyarısı kaldırıldı

## 1.1.3

- `P3018` / `ApiKey` tablosu yok hatası: `onar.bat` ve güncelleme/kurulum öncesi otomatik onarım
- Envanter onay tablosu eski veritabanlarına eklenir; kayıtlar silinmez

## 1.1.2

- Yerel HTTP kurulumunda oturum çerezi artık düşmez (`Secure` yalnızca `SESSION_SECURE=true` iken)
- Parolası boş kalan hesaplara kurulum parolası yazılır
- Giriş ekranında örnek hesap ve adres notu

## 1.1.1

- Ayarlar → Yedek: **Export config** / **Import config**
- Ayarlar (AD, SIEM, SMTP, tarama, onay, yetki, tema, süreç yöneticileri) JSON olarak yedeklenir ve yüklenir
- İçe aktarma envanter ve talep kayıtlarını silmez; önceki ayar `yedek/config` altına yazılır

## 1.1.0

- `guncelle.bat` / `guncelle.sh`: eski kurulumu veri kaybetmeden güncelleme
- Güncelleme öncesi `yedek\` (veritabanı, `.env`, yüklemeler)
- `geri-yukle.bat` ile son yedeğe dönüş
- Docker: `guncelle-docker.bat` (`docker compose down -v` kullanmayın)

## 3.0.0 — menü ve canlı görseller
- Çevik çalışma kenar çubuğunda ayrı başlık
- Hizmetler sayfasında canlı süreç akışı (otomatik yenilenir)
- İlişki haritası: /hizmetler/harita
- Süreç akışları: şablondan akış başlatma ve canlı ilerleme takibi (/hizmetler/akis)
- ITIL: olay önceliği ve SLA süreleri, büyük olay, değişiklik sınıfı/risk/CAB, bilgi bankası, kayıtlar arası bağlar, atama bildirimleri
- Agile: yetki ve denetim, WIP sınırı, sprint devri ve özeti, alt görev, kabul ölçütü, engel, etiket, dosya eki, ITIL ile çift yönlü bağ
- Düzeltmeler: durum doğrulama, onay atlama, puan istismarı, düzenlemede silinen varlık/olay bağı
- Durum alanı: yeni kayıt formlarında (olay, problem, değişiklik, yama, zafiyet, SLA, talep, süreç kaydı) durum seçilmez; başlangıç durumunu süreç akışı verir (olay/problem/zafiyet/talep AÇIK, değişiklik/yama onay bekliyor veya onay politikası). Durum yalnızca düzenlemede görünür; sunucu yeni kayıtta gelen durumu yok sayar.
- Envanter: seri no alanı eklendi (form, liste, arama, toplu yükleme, zimmet formu, rapor, API); örnek veriler seri no ile güncellendi
- Envanter: "Uygulama" türü (ortam, URL, kullanıcı sayısı, RTO, çalıştığı sunucular, servis verdiği hizmetler); örnek uygulamalar eklendi
- Envanter: Mobil telefon türü; "Aktif" yerine "Kullanımda"; sahipsiz cihaz kullanımda olamaz
- Envanter: işletim sistemi ve sürüm filtresi
- Tema: açık gri, açık mavi, açık yeşil ve krem temaları eklendi (toplam 17)
- Kişi kartı ve Çalışma özetim sayfası: onaylar, işler, Çevik görevler, sprintler ve diğer yapılacaklar; rapor indirme ve iki yeni rapor
- Menü: "Envanter yönetimi" artık "ITIL süreçleri > Varlık" grubunun altında (üst menüden kaldırıldı)
- Widget: ITIL süreç listeleri, Bilgi bankası, Süreç akışları, Envanter onayları, Hareketlerim ve Raporlar sayfalarına özet widget'ları eklendi
- İngilizce tamamlama: `phrases-en.ts` (~1000 ifade + kalıp) ve `EnPhraseTranslator`; EN alan/seçenek metinleri düzeltildi.
- Çevik görsel: renkli sütunlar, öncelik şeridi, baş harf avatarı, ilerleme çubukları, ürün kartlarında tamamlanma oranı, burndown alan dolgusu + gösterge.
- Süreç yöneticileri: 16 yeni modül sorumlusu (envanter, zimmet, personel, katalog, bilgi bankası, süreç akışı, tasarım, kullanılabilirlik, kapasite, süreklilik, test, sürüm, izleme, değerlendirme, Çevik, rapor). ITIL süreçleri kendi sorumlusunu kullanır.
- Örnek veri 2. paket: `prisma/seed-demo-processes.ts` (olay, problem, değişiklik, yama, zafiyet, talep, SLA, katalog, 18 ITIL süreç kaydı, bilgi bankası, süreç akışı, Çevik işler; her modüle sorumlu atanır). Docker açılışında bir kez çalışır (`.demo-processes`).
- Menü: Bilgi bankası ve Süreç akışları ITIL > Operasyon altına eklendi.
- Süreç yöneticileri: bir kişi yalnızca tek modülün yöneticisi olabilir (formda başka modülde seçilenler listelenmez, kayıtta sunucu da reddeder; eski çift atamalar açılışta temizlenir). Örnek veri 16 yeni personel ekler, her modüle farklı kişi atar.
- Örnek veri: boş kalan süreç yöneticisi alanı olmaz; kişi yetmezse yeni personel eklenip atanır (seed-demo-processes.ts completeOfficers).
- Örnek veri: 30 ek kullanıcı (seed-demo-processes.ts, addMorePeople); açılışta boş süreç yöneticisi alanı kalırsa tamamlanır.
- Raporlar: sade liste görünümü, Filtre aç/kapa, İndir menüsü (PDF/Word/CSV) ve "Önizle" ile A4 kâğıt küçük resmi (ilk 6 satır, 6 sütun; /api/raporlar/[id]?format=json). Widget satırı kaldırıldı.
- Ayarlar: ikonlu sekmeler, süreç yöneticileri 5 gruba bölündü + atama ilerleme çubuğu, bağlantı durumları tek satırlık çip şeridi, üst widget sayısı 7 → 3.
- Envanter ekleme yetkisi: yalnızca süper admin ve envanter yöneticisi (Yönetici düzeyi) yeni envanter ekleyebilir. Diğer kullanıcılarda "Yeni envanter" düğmesi gizlenir, /envanter/yeni yetkisiz sayfasına yönlenir, saveAsset sunucuda reddeder. Düzenleme ve silme isteği davranışı aynı kaldı.
- Yetkilendirme: Ayarlar > Süreç yöneticileri'nde bir modüle atanan kişi, o modülde otomatik "Modül yöneticisi" olur (envanter/zimmet sorumlusu envanter yöneticisidir; değişiklik, yama, zafiyet, olay, problem, katalog/bilgi/akış, Çevik, rapor, ITIL süreçleri vb. aynı kural). Şube/ofis sorumluları (sistem, network…) ek yetki almaz. Süper admin her modülde yöneticidir. Kod: acl.ts OFFICER_MODULE / officerGroupsFor, viewer.ts.
- Yetkilendirme yeniden düzenlendi (rol bazlı kapsam): Düz kullanıcı ve birim amiri Ayarlar ile API hariç tüm modülleri görür ve işlem yapar; sistem yöneticisi Ayarlar hariç hepsini. Kayıtlar satır düzeyinde süzülür (`src/lib/auth/data-scope.ts`, `getScopedDb`): düz kullanıcı yalnızca kendine atanan / kendisinin açtığı kayıtları; birim amiri kendisi + birim personelininkileri; sistem yöneticisi bunlara ek olarak kendi ofisinin (requestOffice, yoksa Sistem) kayıtlarını ve sahibi kendisi/birim personeli olan envantere bağlı kayıtları görür (Siber'deki sistem yöneticisi Network talebini göremez). Personel: düz kullanıcı yalnızca kendini, birim amiri / sistem yöneticisi kendisi + birim personelini görür; düz kullanıcı personel kaydı ekleyemez/düzenleyemez. Envanter: yalnızca zimmetindeki (birim amiri/sistem yöneticisi için birim personelinin) cihazlar görünür; ekleme yalnızca süper admin ve envanter yöneticisinde. Diğer roller (üst amir, bilgi güvenliği, süper admin) değişmedi. Panel sayaçları, raporlar, liste/detay/düzenleme sayfaları ve kayıt eylemleri aynı kapsamla çalışır. Sunucu eylemleri artık "İşle" düzeyi ister. Eski kurulumlarda rol tabanlı modül yetkileri (Ayarlar > Erişim) açılışta yeni varsayılanlarla yenilenir (AD grubu yetkileri korunur); sonraki kayıtlarda özelleştirmeler kalıcıdır.
- Düzeltme: kapsam filtresi tekil sorgularda (findUnique/update) benzersiz alanı üst düzeyde bırakır; standart kullanıcının kendi personel kartı ve tüm detay/düzenleme sayfaları hata vermesin diye (data-scope.ts).
- Çevik: standart kullanıcı yalnızca kendisine görev düştüğü (atanan/açan) veya sahibi olduğu ürün ve sprintleri görür; hiç görevi yoksa "Ürünler / ekipler" bölümü gizlenir, görev atandığında kendiliğinden görünür. Ürün/sprint/yol haritası sayfaları aynı kapsamla açılır.
- Ayarlar > Süreç yöneticileri/Birimler (Şubeler sekmesi) > Birim ekle: üst birim ve birim amiri seçimi eklendi (AD olmadan elle birim/Başkanlık tanımı).
- Ayarlar > Şubeler > Birim ekle listesinde her birimin yanında Sil düğmesi (deleteUnit): personeli, alt birimi veya envanteri olan birim silinmez, nedeni yazılır.
- Ayarlar > Şubeler: birim Düzenle (ad, tür, üst birim, amir; hiyerarşi döngüsü ve çift ad engellenir) ve Sil (unit-row.tsx, updateUnit).
- Temizlik: eski 1.3.0 geri yükleme betikleri (restore-1.3.0.*), üretilmiş tsconfig.tsbuildinfo ve geçici dosyalar kaldırıldı. `.ps1` dosyaları Windows `.bat` başlatıcılarının asıl kodudur, bu yüzden korunur.

- Topoloji (hizmet seçilince otomatik): ağ yolu (kenar anahtar → güvenlik duvarı → omurga/yük dengeleyici/DMZ → sunucu → SAN/depolama) varlık ilişkilerinden bulunur; kullanıcı ağları olay/süreç kayıtlarından ve erişim kurallarından gelir; kesikli oklar tahmindir; oklarda port/protokol.
- Topoloji: Hizmet masası talepleri (güvenlik duvarı FW_INTRANET/FW_INTERNET, WAF, yük dengeleyici) hizmete bağlı sunuculara göre okunur; kaynak IP + port/protokol kullanıcı ağı olarak, güvenlik duvarı/WAF/LB katman olarak çizilir. Hizmet seçimi açılır liste.
- Topoloji: nesneler sürüklenip yerleştirilir (hizmet başına kaydedilir, "Düzeni sıfırla"), nesneye not eklenir; "Genel topoloji (referans)" bölümünden resim/PDF yüklenir (yeni tablolar: TopologyLayout, TopologyNote, TopologyReference).
- Talep: 10 yeni tür (DNAT, SNAT, IPSEC-VPN, SSL-VPN, kural silme/kapatma, statik rota/BGP/OSPF, DHCP kapsamı, e-posta güvenliği istisnası, sızma testi, SFTP hesabı).
- Talep: ürün/platform seçim alanları (güvenlik duvarı, WAF, yük dengeleyici, NAC, yedekleme, SIEM, VPN, AV, PAM, DB motoru vb.) yalnızca envanterde kayıtlı varlıklardan dolar; envanterde yoksa liste boş kalır ve alan zorunlu olmaz.
- Talep: Ayarlar → Talep grupları: her talep türü için AD güvenlik grubu (örn. firewall_admins, Nac_admins, DC_admins). Grup üyeleri o türdeki talepleri görür/işler; onaylanan talep otomatik olarak grup üyelerinden en az işi olana atanır. Topoloji, talepte seçilen güvenlik duvarı/WAF/yük dengeleyici envanter kaydını çizer.
- Talep: AD güvenlik grubu artık kategori bazında (örn. Güvenlik duvarı → fw_admins); kategorideki tüm türlere uygulanır. Mail relay (yeni/değişiklik/iptal) ve Sunucu (yeni/güncelleme/kaldırma) talepleri tek forma birleşti; eski türler menüden kalktı, eski kayıtlar açılır.
- Görünüm: talep seçim ekranı kategori kartları + AD grubu rozeti + ikonlar; talep formunda başlık bandı; talep panosunda birim kartları renkli ve ikonlu.
- Talep formlarından marka/ürün adları (Infoblox, VMware, Cisco vb.) kaldırıldı; alan adları, açıklamalar, ipucu metinleri ve seçenekler nötr.
- Ayarlar → Talep grupları: AD grupları servis hesabıyla AD'den okunur (ve kişilerin girişte gelen gruplarıyla birleştirilir); kategori başına açılır listeden seçilir. Active Directory sekmesinden sayfaya bağlantı eklendi.
- Talep: 13 yeni tür — Siber: web gateway/proxy erişimi, sandbox analizi, IOC engelleme; Network: anahtar portu, hat/bağlantı; Sistem: disk genişletme, zamanlanmış görev; Yazılım: yayın adresi (FQDN), log erişimi; Veritabanı: replikasyon/HA, veri maskeleme; Servis masası: yazıcı, yeni/ayrılan personel paketi.
- Yetki ve roller tek yerde: yeni sayfa Ayarlar → Yetki ve roller (/ayarlar/yetkiler, yalnızca Süper yönetici) — 1 Özet (etkin yetki matrisi rol × modül, süreç yöneticisi → modül yöneticisi dökümü, tutarlılık uyarıları), 2 Rol ve AD grubu eşlemesi, 3 Modül yetkileri, 4 Talep grupları. Ayarlar'daki "Yetkilendirme" ve "Modül yetkileri" sekmeleri ve /ayarlar/talep-gruplari bu sayfaya yönlenir (eski bağlantılar çalışır). Yetki kontrol mantığı, ayar JSON'u ve veritabanı değişmedi (geriye uyumlu).
- Yetki: "Rol varsayılanı" tablosu (eski, sabit liste) kaldırıldı; yerine gerçek yetkilerden hesaplanan etkin matris geldi. Modül yetkisi kaydında aynı modül+grup mükerrer satırlar birleşir (en yüksek düzey). Grup kutularında AD grupları, role:* ve office:* önerilir. Kullanılmayan canViewAllInventory ve isL1RequestType kaldırıldı.
- Rapor: Raporlar → Denetim → "Yetki matrisi" (modül yetkileri, AD grubu → rol, talep türü → AD grubu dökümü). API sayfasına yetki kapsamı notu, yönetici/kullanıcı/çevik kılavuz metinleri ve İngilizce metinler güncellendi. Not: public/docs altındaki PDF kılavuzlar hazır dosyadır, ayrıca yeniden üretilmelidir.
- Yetki ve roller: "Süreç yöneticileri" ve "Talep birimleri" (birim ekleme, birim adları) Ayarlar → Tanımlar sekmesinden bu sayfaya taşındı (5 ve 6. sekme); Tanımlar sekmesi kalktı, eski bağlantılar yönlenir. Kayıt mantığı değişmedi.
- Yetki kuralları sıkılaştırıldı (ACL sürümü 3): Personel yönetimi yalnızca Süper yönetici; diğer roller yalnızca kendini görür (birim amiri ve üst amir kendisi + birim personeli) — kapsam artık Bilgi güvenliği/Üst amir için de personel kayıtlarına uygulanır. Düz kullanıcı ITIL süreç modüllerini (değişiklik, yama, konfigürasyon, zafiyet, firma/SLA, olay, problem, çevik, ITIL süreçleri) yalnızca ilgili modülde kendisine kayıt atandığında görür (otomatik "assigned:<modül>" grubu); hizmet masası herkese açık. Envanter: tümü yalnızca envanter yöneticisi + süper yönetici; diğerleri kendi zimmeti (birim amiri: birimi), ekleme onaya düşer (davranış aynı, Yetki ve roller > Özet'e "Kapsam kuralları" eklendi). Güncellemede rol (role:*) satırları yeni varsayılana döner; AD grubu/ofis satırları korunur.
- Yazdırma: ITIL kayıt/form sayfalarının (talep, olay, problem, değişiklik, yama, konfigürasyon, zafiyet, firma/SLA, ITIL süreçleri, çevik, katalog) üst çubuğuna "Yazdır" düğmesi eklendi; çıktıda menü ve üst çubuk gizlenir, başlıkta tarih/kullanıcı yazar.
- Yetki ve roller yeniden tasarlandı (3 sekme): 1 Yetki matrisi — hücreye tıklayarak rol × modül düzeyi değiştirilir (— → Gör → İşle → Yön), AD grubu / office:* / assigned:* etiketleri sürükle-bırak ile modül kartlarına eklenir, Süreç yöneticileri aynı sekmededir; 2 AD grupları — AD grupları sürükle-bırak (veya tıkla-tıkla) ile role ve talep kategorisine eşlenir, tek kayıtla; 3 Talep birimleri. "Özet", "Modül yetkileri", "Rol ve AD grubu", "Talep grupları" ve "Süreç yöneticileri" sekmeleri birleşti; eski sekme bağlantıları yeni sekmelere yönlenir. Kayıt mantığı (ACL, AD rol eşlemesi, talep grupları) ve veri biçimi değişmedi.
- Yetki ve roller sadeleştirildi: matris sekmesinde yalnızca matris açık; "AD grubuna göre yetki ver" ve "Süreç yöneticileri" kapalı bölümlerde; AD gruplarında talep kategorileri birim başına kapalı, açıklamalar kısaltıldı.
- Yetki matrisi: "AD grubuna göre yetki ver" bölümü ekrandan kaldırıldı (assigned:*, office:* ve GG_Envanter satırları kayıtlı kalır ve çalışır).
- Sadeleştirme: menü/pano/Hizmetler/rapor listeleri artık yalnızca Yetki matrisini (ACL) kullanır; koddaki eski sabit rol tablosu (canAccess) kaldırıldı — matristeki değişiklik her yerde aynı etkiyi verir. Yeni kurulumda varsayılan AD eşlemesinden "GG_Envanter → Birim amiri" satırı çıkarıldı (mevcut kurulumlar etkilenmez; AD grupları sekmesinden silinebilir). Ayarlar ana sayfasında yinelenen "Temel süreç yöneticileri" kutusu ve "API anahtarlarına git" düğmesi kaldırıldı. Yönetici kılavuzuna talep görünürlüğü ve onay mekanizması notları eklendi.
- Yetki matrisi ızgara yapısı: üstte Düzey (Yetkisiz/Gör/İşle/Yönet) ve Kapsam (Kendi verisi, Alt çalışan verisi, Talep birimi çalışanı, Tam yetkili) etiketleri; etiketler hücrelere sürüklenir (veya tıkla-tıkla). Kapsam yetki kaydında isteğe bağlı `scopes` alanıdır (geriye uyumlu, şema değişmedi). Kapsamı açıkça seçilen hücrelerde kayıt süzmesi artık matristen gelir (personel, envanter, olay, problem, değişiklik, yama, zafiyet, firma/SLA, konfigürasyon, çevik, ITIL süreçleri); seçilmeyen hücreler eski rol kuralıyla aynen çalışır. Talep yönetimi (talepler) kapsamı bu adımda hâlâ rol + talep birimi + AD grubu kurallarıyla belirlenir. "Talep eden" kapsamı "Kendi verisi"ne dahildir. Rapor: Yetki matrisi raporuna Kapsam sütunu eklendi.

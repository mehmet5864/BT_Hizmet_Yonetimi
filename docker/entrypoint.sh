#!/bin/sh
set -eu

DATA_DIR="${DATA_DIR:-/data}"
UPLOAD_DIR="${UPLOAD_DIR:-/app/public/uploads}"
PORT="${PORT:-43130}"

mkdir -p "$DATA_DIR" "$UPLOAD_DIR"

export PRISMA_HIDE_UPDATE_MESSAGE="${PRISMA_HIDE_UPDATE_MESSAGE:-true}"
export NPM_CONFIG_UPDATE_NOTIFIER="${NPM_CONFIG_UPDATE_NOTIFIER:-false}"

# Çoklu kopyada yalnızca bir kopya şemayı uygular (PostgreSQL danışma kilidi yerine basit yeniden deneme).
echo "Veritabanı şeması uygulanıyor (PostgreSQL)…"
tries=0
until npx prisma db push; do
  tries=$((tries + 1))
  if [ "$tries" -ge 10 ]; then
    echo "Şema uygulanamadı. Günlüğe bakın: docker compose logs envanter"
    echo "VERİ SİLİNMEDİ: şema değişikliği mevcut veriyle uyumsuz olduğu için uygulama başlatılmadı."
    echo "Önceki sürüme dönmek için: geri-yukle-docker (yedekler klasöründeki son yedek). Hatayı bize iletin."
    exit 1
  fi
  echo "Yeniden deneniyor ($tries/10)…"
  sleep 3
done

if [ "${SEED_ON_START:-true}" = "true" ] && [ ! -f "${DATA_DIR}/.seeded" ]; then
  echo "Örnek veriler yükleniyor…"
  npx tsx prisma/seed.ts
  touch "${DATA_DIR}/.seeded"
fi

# 2.0.0: katalog boşsa örnek ITIL kayıtları (1.3.0 personel/envanter durur)
if [ "${SEED_ON_START:-true}" = "true" ] && [ -f /app/prisma/seed-itil-v2.ts ]; then
  echo "ITIL 2.0 örnek kayıtları (katalog boşsa)…"
  npx tsx prisma/seed-itil-v2.ts || true
fi

# Ek örnek (test) veri: mevcut kayıtlara dokunmaz, yalnızca ekler; bir kez çalışır.
# Kapatmak için SEED_DEMO_EXTRA=false.
if [ "${SEED_DEMO_EXTRA:-false}" = "true" ] && [ -f /app/prisma/seed-demo-extra.ts ] && [ ! -f "${DATA_DIR}/.demo-extra" ]; then
  echo "Ek örnek veri yükleniyor…"
  if npx tsx prisma/seed-demo-extra.ts; then
    touch "${DATA_DIR}/.demo-extra"
  else
    echo "Ek örnek veri yüklenemedi (uygulama yine de başlatılıyor)."
  fi
fi
if [ "${SEED_DEMO_EXTRA:-false}" = "true" ] && [ -f /app/prisma/seed-demo-sandbox.ts ] && [ -f "${DATA_DIR}/.demo-extra" ] && [ ! -f "${DATA_DIR}/.demo-sandbox" ]; then
  echo "Örnek sandbox raporları bağlanıyor…"
  if npx tsx prisma/seed-demo-sandbox.ts; then touch "${DATA_DIR}/.demo-sandbox"; fi
fi

if [ "${SEED_DEMO_EXTRA:-false}" = "true" ] && [ -f /app/prisma/seed-demo-agile.ts ] && [ ! -f "${DATA_DIR}/.demo-agile" ]; then
  echo "Çevik çalışma örnek verisi yükleniyor…"
  if npx tsx prisma/seed-demo-agile.ts; then touch "${DATA_DIR}/.demo-agile"; fi
fi

if [ "${SEED_DEMO_EXTRA:-false}" = "true" ] && [ -f /app/prisma/seed-demo-processes.ts ] && [ ! -f "${DATA_DIR}/.demo-processes-2" ]; then
  echo "Süreç örnek verisi (2. paket) yükleniyor…"
  if npx tsx prisma/seed-demo-processes.ts; then touch "${DATA_DIR}/.demo-processes-2"; fi
fi

if [ "${SEED_DEMO_EXTRA:-false}" = "true" ] && [ -f /app/prisma/seed-org-hierarchy.ts ] && [ ! -f "${DATA_DIR}/.org-hierarchy" ]; then
  echo "Kurumsal hiyerarşi (Bakanlık > Genel Müdürlük > Daire > Şube) yükleniyor…"
  if npx tsx prisma/seed-org-hierarchy.ts; then touch "${DATA_DIR}/.org-hierarchy"; fi
fi

# Sürümlü veri taşımaları: her taşıma bir kez çalışır ve DataMigration tablosuna yazılır.
if [ -f /app/prisma/data-migrate.ts ]; then
  npx tsx prisma/data-migrate.ts || { echo "Veri taşıması başarısız (kritik): uygulama başlatılmadı. Yedekten dönebilirsiniz."; exit 1; }
fi

if [ -f /app/prisma/backfill-scores.ts ]; then
  npx tsx prisma/backfill-scores.ts || echo "Geriye dönük puanlama atlandı."
fi

if [ -f /app/prisma/backfill-itil.ts ]; then
  npx tsx prisma/backfill-itil.ts || echo "SLA hedefi işleme atlandı."
fi

echo "Envanter uygulaması ${PORT} portunda başlıyor…"
exec npx next start --hostname 0.0.0.0 --port "$PORT"

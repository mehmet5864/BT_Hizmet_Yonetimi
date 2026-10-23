#!/usr/bin/env bash
# Docker Compose için tırnaksız .env yazar. source ile yükleyin.
# Var olan değerlere dokunmaz; yalnızca eksik anahtarları ekler (sunucu ayarlarınız korunur).

new_secret() {
  if command -v openssl >/dev/null 2>&1; then
    openssl rand -hex 32
  else
    node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
  fi
}

ensure_key() {
  local path="$1" key="$2" value="$3"
  if ! grep -qE "^${key}=.+" "$path" 2>/dev/null; then
    sed -i "/^${key}=/d" "$path" 2>/dev/null || true
    printf '%s=%s\n' "$key" "$value" >> "$path"
    return 0
  fi
  return 1
}

write_app_env() {
  local root="${1:-.}"
  local path="$root/.env"
  local created=0
  if [ ! -f "$path" ]; then created=1; : > "$path"; fi
  ensure_key "$path" SESSION_SECRET "$(new_secret)" || true
  ensure_key "$path" POSTGRES_PASSWORD "$(new_secret)" || true
  ensure_key "$path" SESSION_SECURE false || true
  ensure_key "$path" APP_URL http://127.0.0.1:43130 || true
  ensure_key "$path" SEED_ON_START true || true
  if [ "$created" = 1 ]; then
    echo "Yerel .env oluşturuldu (oturum anahtarı ve veritabanı parolası üretildi)."
  fi
}

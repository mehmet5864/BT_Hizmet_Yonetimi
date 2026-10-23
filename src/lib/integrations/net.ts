import tls from "node:tls";

/**
 * Entegrasyon (AD/LDAPS, SIEM-TLS, SMTP) bağlantıları için TLS seçenekleri.
 * Varsayılan: kurum içi, kendinden imzalı sertifikalarla çalışır (doğrulama kapalı).
 * Sıkı mod: ortam değişkeni INTEGRATION_TLS_STRICT=true sertifika doğrulamasını açar.
 */
export function tlsVerifyOptions(): Pick<tls.ConnectionOptions, "rejectUnauthorized"> {
  return { rejectUnauthorized: process.env.INTEGRATION_TLS_STRICT === "true" };
}

/** Başlığı yok sayılan, hata atmayan arka plan işi: entegrasyon yavaşsa/çökerse kullanıcı işlemi etkilenmez. */
export function background(job: Promise<unknown> | (() => Promise<unknown>), label = "entegrasyon") {
  const run = typeof job === "function" ? job() : job;
  run.catch((error: unknown) => {
    const message = error instanceof Error ? error.message : String(error);
    console.warn(`[${label}] ${message}`);
  });
}

export function isIpAddress(host: string) {
  return /^[0-9.]+$/.test(host) || host.includes(":");
}

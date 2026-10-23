import { API_SCOPES, API_SCOPE_LABELS } from "./scopes";

export type ApiEndpoint = {
  method: "GET" | "POST" | "PATCH";
  path: string;
  scope: string | null;
  summary: string;
  body?: Record<string, unknown>;
};

export const API_ENDPOINTS: ApiEndpoint[] = [
  { method: "GET", path: "/api/v1", scope: null, summary: "Kimlik doğrulama bilgisi; tam katalog oturum veya anahtar ister" },
  { method: "GET", path: "/api/v1/health", scope: null, summary: "Sağlık kontrolü (herkese açık, ayrıntısız)" },
  { method: "GET", path: "/api/v1/openapi.json", scope: "oturum veya anahtar", summary: "OpenAPI 3 tanımı" },
  { method: "GET", path: "/api/v1/me", scope: null, summary: "Anahtar veya oturum kimliği ve kapsamlar" },
  { method: "GET", path: "/api/v1/katalog", scope: "talepler:read", summary: "Talep türleri ve ofisler" },
  { method: "GET", path: "/api/v1/envanter", scope: "envanter:read", summary: "Envanter listesi (q, type, status, limit)" },
  { method: "GET", path: "/api/v1/envanter/:id", scope: "envanter:read", summary: "Envanter kaydı" },
  { method: "GET", path: "/api/v1/talepler", scope: "talepler:read", summary: "Talepler (office, status, type, q, limit)" },
  {
    method: "POST",
    path: "/api/v1/talepler",
    scope: "talepler:write",
    summary: "Yeni talep aç",
    body: {
      requestType: "SD_SUPPORT",
      reason: "Yazıcı basmıyor",
      description: "2. kat koridor yazıcısı",
      severity: "MEDIUM",
      details: { category: "INCIDENT", affectedService: "Kat yazıcısı", sdProduct: "SDP" },
    },
  },
  { method: "GET", path: "/api/v1/talepler/:id", scope: "talepler:read", summary: "Talep detayı" },
  {
    method: "PATCH",
    path: "/api/v1/talepler/:id",
    scope: "talepler:write",
    summary: "Talep durumu güncelle (onay zinciri sürerken 409 döner)",
    body: { status: "IN_PROGRESS" },
  },
  { method: "GET", path: "/api/v1/talepler/:id/onay", scope: "talepler:read", summary: "Talebin onay zinciri durumu, geçmişi ve atanan kişi" },
  { method: "GET", path: "/api/v1/is-akisi/bekleyen", scope: "talepler:read", summary: "Onayınızı bekleyen iş akışı adımları (personele bağlı anahtar veya oturum)" },
  { method: "GET", path: "/api/v1/lisans", scope: "talepler:read", summary: "Lisans durumu: kullanıcı sayısı, süre, modüller (yalnızca süper yönetici)" },
  { method: "GET", path: "/api/v1/personel", scope: "personel:read", summary: "Personel listesi" },
  { method: "GET", path: "/api/v1/zafiyet", scope: "zafiyet:read", summary: "Zafiyet listesi (status, limit)" },
  {
    method: "POST",
    path: "/api/v1/zafiyet",
    scope: "zafiyet:write",
    summary: "Zafiyet kaydı aç (tarama/pipeline); aynı externalId tekrar gelirse yinelenmez",
    body: { cve: "CVE-2026-12345", deviceName: "web-01", deviceIp: "10.0.0.15", severity: "HIGH", dueDate: "2026-11-30", source: "SCANNER", scannerVendor: "SAST", externalId: "pipeline-1234-finding-7" },
  },
  { method: "GET", path: "/api/v1/olay", scope: "olay:read", summary: "Olay listesi" },
  {
    method: "POST",
    path: "/api/v1/olay",
    scope: "olay:write",
    summary: "Yeni olay kaydı",
    body: { title: "VPN kesintisi", description: "Dış erişim durdu", severity: "HIGH", l1AnalystId: "personel-id" },
  },
  { method: "GET", path: "/api/v1/problem", scope: "problem:read", summary: "Problem listesi" },
  { method: "GET", path: "/api/v1/degisiklik", scope: "degisiklik:read", summary: "Değişiklik listesi" },
  {
    method: "POST",
    path: "/api/v1/degisiklik",
    scope: "degisiklik:write",
    summary: "Değişiklik (yayın) kaydı aç; onay zinciri/onay politikası otomatik uygulanır",
    body: { description: "Portal v2.4 canlıya çıkış", changeType: "NORMAL", risk: "HIGH", rollbackPlan: "Önceki imaja dön", testPlan: "Smoke + güvenlik taraması geçti", workStartDate: "2026-11-02" },
  },
  { method: "GET", path: "/api/v1/yama", scope: "yama:read", summary: "Yama listesi" },
];

export function openApiDocument(origin: string) {
  const paths: Record<string, Record<string, unknown>> = {};
  for (const item of API_ENDPOINTS) {
    const path = item.path.replace(/:([A-Za-z]+)/g, "{$1}");
    paths[path] ??= {};
    paths[path][item.method.toLowerCase()] = {
      summary: item.summary,
      security: item.scope ? [{ bearerAuth: [] }, { apiKeyAuth: [] }] : [],
      ...(item.body
        ? {
            requestBody: {
              required: true,
              content: { "application/json": { example: item.body } },
            },
          }
        : {}),
      responses: {
        200: { description: "Başarılı" },
        401: { description: "Kimlik doğrulama gerekli" },
        403: { description: "Kapsam yetersiz" },
      },
    };
  }
  return {
    openapi: "3.0.3",
    info: {
      title: "BT Hizmet Yönetimi API",
      version: "1.0.0",
      description:
        "ITIL süreçleri ve envanter için REST arayüzü. Authorization: Bearer bth_… veya X-Api-Key. Yazma bağlı anahtar veya aynı kaynak oturumu ister.",
    },
    servers: [{ url: origin }],
    components: {
      securitySchemes: {
        bearerAuth: { type: "http", scheme: "bearer", bearerFormat: "API key" },
        apiKeyAuth: { type: "apiKey", in: "header", name: "X-Api-Key" },
      },
    },
    tags: [{ name: "v1" }],
    paths,
    "x-scopes": API_SCOPES.map((scope) => ({ scope, label: API_SCOPE_LABELS[scope] })),
  };
}

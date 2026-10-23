import type { FieldDef } from "@/lib/inventory/fields";
import {
  AGILE_MEETING_KIND_LABELS,
  AGILE_MEETING_KINDS,
  AGILE_METHODS,
  AGILE_METHOD_LABELS,
  AGILE_PRIORITIES,
  AGILE_PRIORITY_LABELS,
  AGILE_PRODUCT_STATUSES,
  AGILE_PRODUCT_STATUS_LABELS,
  AGILE_SPRINT_STATUSES,
  AGILE_SPRINT_STATUS_LABELS,
  AGILE_STATUSES,
  AGILE_STATUS_LABELS,
  AGILE_TYPES,
  AGILE_TYPE_LABELS,
} from "./constants";

const opt = (labels: Record<string, string>, keys: readonly string[]) => keys.map((value) => ({ value, label: labels[value] ?? value }));

export const AGILE_PRODUCT_FIELDS: FieldDef[] = [
  { id: "key", label: "Anahtar", kind: "text", required: true, row: "kimlik", hint: "Kısa kod (BT, PORTAL…). İş numaralarında kullanılır; sonradan değiştirilmez." },
  { id: "name", label: "Ürün / ekip adı", kind: "text", required: true, row: "kimlik", hint: "Üzerinde çalışılan ürün, hizmet veya ekip." },
  { id: "method", label: "Yöntem", kind: "select", required: true, row: "yontem", options: opt(AGILE_METHOD_LABELS, AGILE_METHODS), hint: "Scrum sprintli, Kanban sürekli akıştır." },
  { id: "status", label: "Durum", kind: "select", row: "yontem", options: opt(AGILE_PRODUCT_STATUS_LABELS, AGILE_PRODUCT_STATUSES) },
  { id: "ownerId", label: "Ürün sahibi", kind: "person", row: "sahip", hint: "Önceliklendirmeden sorumlu kişi." },
  { id: "serviceId", label: "Bağlı hizmet", kind: "catalog", row: "sahip", hint: "Hizmet kataloğundaki ilgili hizmet (isteğe bağlı)." },
  { id: "wipLimit", label: "Devam eden iş sınırı (WIP)", kind: "text", row: "wip", placeholder: "5", hint: "Aynı anda 'Devam ediyor' sütununda en fazla kaç iş olabilir. Boş = sınırsız." },
  { id: "description", label: "Açıklama", kind: "textarea", fullWidth: true },
];

export const AGILE_SPRINT_FIELDS: FieldDef[] = [
  { id: "name", label: "Sprint adı", kind: "text", required: true, row: "ad", placeholder: "Sprint 1" },
  { id: "status", label: "Durum", kind: "select", row: "ad", options: opt(AGILE_SPRINT_STATUS_LABELS, AGILE_SPRINT_STATUSES), hint: "Aktifleştirme ve kapatma sprint sayfasındaki düğmelerle yapılır." },
  { id: "startDate", label: "Başlangıç", kind: "date", row: "tarih" },
  { id: "endDate", label: "Bitiş", kind: "date", row: "tarih" },
  { id: "capacity", label: "Kapasite (puan)", kind: "text", row: "tarih", placeholder: "30", hint: "Sprintte hedeflenen toplam hikâye puanı." },
  { id: "goal", label: "Sprint hedefi", kind: "textarea", fullWidth: true },
  { id: "retro", label: "Retrospektif notları", kind: "textarea", fullWidth: true, hint: "Neler iyi gitti, neler geliştirilmeli?" },
];

export const AGILE_ITEM_FIELDS: FieldDef[] = [
  { id: "title", label: "Başlık", kind: "text", required: true, fullWidth: true },
  { id: "type", label: "Tür", kind: "select", required: true, row: "tur", options: opt(AGILE_TYPE_LABELS, AGILE_TYPES) },
  { id: "priority", label: "Öncelik", kind: "select", row: "tur", options: opt(AGILE_PRIORITY_LABELS, AGILE_PRIORITIES), hint: "Puanlamada önem derecesi olarak kullanılır." },
  { id: "points", label: "Hikâye puanı", kind: "text", row: "tur", placeholder: "3", hint: "Tahmini iş büyüklüğü (1, 2, 3, 5, 8…)." },
  { id: "assigneeId", label: "Sorumlu", kind: "person", row: "kisi" },
  { id: "status", label: "Durum", kind: "select", row: "kisi", options: opt(AGILE_STATUS_LABELS, AGILE_STATUSES) },
  { id: "description", label: "Açıklama", kind: "textarea", fullWidth: true },
  { id: "acceptance", label: "Kabul ölçütleri", kind: "textarea", fullWidth: true, hint: "İş ne zaman 'tamam' sayılır? Her satıra bir ölçüt." },
  { id: "labels", label: "Etiketler", kind: "text", row: "etiket", placeholder: "güvenlik, acil, altyapı", hint: "Virgülle ayırın (en fazla 8)." },
  { id: "blockedReason", label: "Engel", kind: "text", row: "etiket", hint: "Doluysa iş engelli görünür (pano ve listede). Engel kalkınca boşaltın." },
];

export const AGILE_MEETING_FIELDS: FieldDef[] = [
  { id: "title", label: "Başlık", kind: "text", required: true, fullWidth: true, placeholder: "Sprint 2 planlama" },
  { id: "kind", label: "Toplantı türü", kind: "select", required: true, row: "tur", options: opt(AGILE_MEETING_KIND_LABELS, AGILE_MEETING_KINDS) },
  { id: "meetingDate", label: "Tarih", kind: "date", required: true, row: "tur" },
  { id: "attendees", label: "Katılımcılar", kind: "text", fullWidth: true, placeholder: "Ahmet Yılmaz, Elif Demir…" },
  { id: "notes", label: "Notlar", kind: "textarea", fullWidth: true, hint: "Konuşulanlar, engeller, dünkü/bugünkü iş özeti." },
  { id: "decisions", label: "Kararlar / aksiyonlar", kind: "textarea", fullWidth: true, hint: "Kim, neyi, ne zamana kadar yapacak?" },
];

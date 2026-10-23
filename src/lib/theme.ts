export const THEMES = ["deniz", "gece", "orman", "gunbatimi", "acik", "lavanta", "gul", "turkuaz", "grafit", "kozmik", "zumrut", "komur", "kizil", "gri", "acikmavi", "acikyesil", "krem"] as const;

/** Koyu şemalı temalar (dark sınıfı ve color-scheme bunlarda açılır). */
export const DARK_THEMES: readonly string[] = ["gece", "kozmik", "zumrut", "komur", "kizil"];
export type ThemeId = (typeof THEMES)[number];

export const THEME_OPTIONS: { id: ThemeId; label: string; hint: string; swatches: [string, string, string] }[] = [
  { id: "deniz", label: "Bluedox", hint: "Koyu menü, açık pano, mavi vurgu", swatches: ["#276dd9", "#eff2f5", "#232f40"] },
  { id: "gece", label: "Gece", hint: "Koyu komuta merkezi", swatches: ["#0a0c12", "#7c9cff", "#1a1d27"] },
  { id: "orman", label: "Orman", hint: "Zeytin ve yeşil", swatches: ["#1c2b1f", "#86c38a", "#eef5ee"] },
  { id: "gunbatimi", label: "Günbatımı", hint: "Amber ve terracotta", swatches: ["#3b2214", "#e8a05a", "#fbf3ea"] },
  { id: "acik", label: "Açık kurumsal", hint: "Açık gri resmi görünüm", swatches: ["#f4f6f8", "#1f3a5f", "#ffffff"] },
  { id: "lavanta", label: "Lavanta", hint: "Mor ve eflatun", swatches: ["#5b3fa8", "#f4f0fb", "#2a1f45"] },
  { id: "gul", label: "Gül", hint: "Pembe ve bordo", swatches: ["#b03a5b", "#fbf0f3", "#43202b"] },
  { id: "turkuaz", label: "Turkuaz", hint: "Deniz yeşili ve petrol", swatches: ["#0e7c86", "#eef7f8", "#173a3f"] },
  { id: "grafit", label: "Grafit", hint: "Nötr gri, sade", swatches: ["#3f4650", "#f3f4f6", "#23272e"] },
  { id: "kozmik", label: "Kozmik", hint: "Koyu mor komuta merkezi", swatches: ["#0f0a1a", "#b58cff", "#241a3a"] },
  { id: "zumrut", label: "Zümrüt gecesi", hint: "Koyu yeşil ve nane", swatches: ["#08130f", "#5fd3a3", "#14291f"] },
  { id: "komur", label: "Kömür", hint: "Koyu nötr, düşük kontrast", swatches: ["#121315", "#9aa4b2", "#26282c"] },
  { id: "gri", label: "Açık gri", hint: "Yumuşak gri zemin, açık menü", swatches: ["#e4e6e9", "#4a5260", "#f7f8f9"] },
  { id: "acikmavi", label: "Açık mavi", hint: "Gökyüzü mavisi zemin", swatches: ["#e3effa", "#2f6fb3", "#f8fbfe"] },
  { id: "acikyesil", label: "Açık yeşil", hint: "Nane yeşili zemin", swatches: ["#e3f3e8", "#2f7a4d", "#f8fcf9"] },
  { id: "krem", label: "Krem", hint: "Sıcak bej zemin", swatches: ["#f3ede1", "#8a5a2b", "#fcfaf5"] },
  { id: "kizil", label: "Kızıl gece", hint: "Koyu bordo ve mercan", swatches: ["#150b0c", "#ff8a7a", "#33181a"] },
];

export const PATTERNS = ["yok", "izgara", "nokta", "capraz"] as const;
export type PatternId = (typeof PATTERNS)[number];
export const PATTERN_LABELS: Record<PatternId, string> = { yok: "Düz", izgara: "Izgara", nokta: "Noktalı", capraz: "Çapraz çizgi" };
export function isPatternId(value: string | null | undefined): value is PatternId {
  return !!value && (PATTERNS as readonly string[]).includes(value);
}

export function isThemeId(value: string): value is ThemeId {
  return (THEMES as readonly string[]).includes(value);
}

export function applyTheme(theme: ThemeId) {
  if (typeof document === "undefined") return;
  document.documentElement.dataset.theme = theme;
  document.documentElement.classList.toggle("dark", DARK_THEMES.includes(theme));
}

export function applyPattern(pattern: PatternId) {
  if (typeof document === "undefined") return;
  document.documentElement.dataset.pattern = pattern;
}

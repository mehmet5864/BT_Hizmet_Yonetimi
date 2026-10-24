export type GuideBlock =
  | { t: "h1"; text: string }
  | { t: "h2"; text: string }
  | { t: "p"; text: string }
  | { t: "ul"; items: string[] }
  | { t: "ol"; items: string[] }
  | { t: "table"; headers: string[]; rows: string[][] }
  | { t: "note"; title?: string; text: string }
  | { t: "img"; src: string; alt: string; caption?: string };

export type Guide = {
  file: string;
  title: string;
  subtitle: string;
  audience: string;
  version?: string;
  date?: string;
  intro?: string;
  blocks: GuideBlock[];
};

export function guideHeadingId(text: string) {
  return text
    .toLocaleLowerCase("tr")
    .replaceAll("ğ", "g")
    .replaceAll("ü", "u")
    .replaceAll("ş", "s")
    .replaceAll("ı", "i")
    .replaceAll("ö", "o")
    .replaceAll("ç", "c")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

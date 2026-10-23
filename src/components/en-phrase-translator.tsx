"use client";

import { useEffect } from "react";

import { useI18n } from "@/components/i18n-provider";
import { EN_PATTERNS, EN_PHRASES } from "@/lib/i18n/phrases-en";

const ATTRS = ["placeholder", "title", "aria-label", "alt"] as const;
const SKIP = new Set(["SCRIPT", "STYLE", "TEXTAREA", "CODE", "PRE", "NOSCRIPT"]);

function convert(raw: string): string | null {
  const core = raw.trim();
  if (!core || core.length < 2) return null;
  const direct = EN_PHRASES[core];
  if (direct !== undefined) return direct;
  for (const [pattern, replacement] of EN_PATTERNS) {
    if (pattern.test(core)) return core.replace(pattern, replacement);
  }
  return null;
}

function translateText(node: Text) {
  const parent = node.parentElement;
  if (!parent || SKIP.has(parent.tagName) || parent.closest("[data-no-translate]")) return;
  const value = node.nodeValue ?? "";
  const next = convert(value);
  if (next === null || next === value.trim()) return;
  const lead = value.match(/^\s*/)?.[0] ?? "";
  const tail = value.match(/\s*$/)?.[0] ?? "";
  node.nodeValue = `${lead}${next}${tail}`;
}

function translateAttrs(el: Element) {
  if (el.closest("[data-no-translate]")) return;
  for (const attr of ATTRS) {
    const value = el.getAttribute(attr);
    if (!value) continue;
    const next = convert(value);
    if (next !== null && next !== value.trim()) el.setAttribute(attr, next);
  }
}

function walk(root: Node) {
  if (root.nodeType === Node.TEXT_NODE) {
    translateText(root as Text);
    return;
  }
  if (root.nodeType !== Node.ELEMENT_NODE) return;
  const element = root as Element;
  if (SKIP.has(element.tagName)) return;
  translateAttrs(element);
  const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT);
  let current = walker.nextNode();
  while (current) {
    if (current.nodeType === Node.TEXT_NODE) translateText(current as Text);
    else translateAttrs(current as Element);
    current = walker.nextNode();
  }
}

/**
 * Dil İngilizce iken koda gömülü Türkçe metinleri (EN_PHRASES) ekranda çevirir.
 * Sözlükten (t) gelen metinlere dokunmaz; yalnızca tabloda eşleşenleri değiştirir.
 */
export function EnPhraseTranslator() {
  const { locale } = useI18n();

  useEffect(() => {
    if (locale !== "en") return;
    walk(document.body);
    const observer = new MutationObserver((records) => {
      observer.disconnect();
      for (const record of records) {
        if (record.type === "characterData") walk(record.target);
        else if (record.type === "attributes") translateAttrs(record.target as Element);
        else record.addedNodes.forEach((added) => walk(added));
      }
      observer.observe(document.body, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: [...ATTRS] });
    });
    observer.observe(document.body, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: [...ATTRS] });
    return () => observer.disconnect();
  }, [locale]);

  return null;
}

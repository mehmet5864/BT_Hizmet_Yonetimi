import { readFileSync, writeFileSync } from "node:fs";
import { globSync } from "node:fs";

const files = [
  "src/lib/inventory/fields.ts",
  "src/lib/itil/form-fields.ts",
  "src/lib/itil/processes.ts",
  "src/lib/itil/request-types.ts",
];

const fields = new Map();
const options = new Map();

const fieldBlock = /\{[^{}]*id:\s*"([^"]+)"[^{}]*\}/gs;
const labelRe = /label:\s*"([^"]+)"/;
const hintRe = /hint:\s*"([^"]+)"/;
const phRe = /placeholder:\s*"([^"]+)"/;
const optRe = /\{\s*value:\s*"([^"]+)"\s*,\s*label:\s*"([^"]+)"\s*\}/g;

for (const file of files) {
  const src = readFileSync(`/workspace/${file}`, "utf8");
  for (const m of src.matchAll(fieldBlock)) {
    const block = m[0];
    const id = m[1];
    const label = block.match(labelRe)?.[1];
    const hint = block.match(hintRe)?.[1];
    const placeholder = block.match(phRe)?.[1];
    const prev = fields.get(id) ?? {};
    fields.set(id, {
      id,
      label: label ?? prev.label,
      hint: hint ?? prev.hint,
      placeholder: placeholder ?? prev.placeholder,
    });
  }
  for (const m of src.matchAll(optRe)) {
    if (!options.has(m[1])) options.set(m[1], m[2]);
  }
}

const out = {
  fieldCount: fields.size,
  optionCount: options.size,
  fields: Object.fromEntries([...fields.entries()].sort()),
  options: Object.fromEntries([...options.entries()].sort()),
};
writeFileSync("/tmp/form-i18n-extract.json", JSON.stringify(out, null, 2));
console.log(out.fieldCount, "fields", out.optionCount, "options");

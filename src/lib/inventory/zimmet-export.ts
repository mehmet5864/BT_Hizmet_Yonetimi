import {
  AlignmentType,
  BorderStyle,
  Document,
  HeadingLevel,
  Packer,
  Paragraph,
  Table,
  TableCell,
  TableRow,
  TextRun,
  VerticalAlign,
  WidthType,
} from "docx";
import PDFDocument from "pdfkit";

import { APP_NAME } from "@/lib/app-version";
import { ZIMMET_COPIES, ZIMMET_PLEDGE, type ZimmetDocument, type ZimmetParty } from "@/lib/inventory/zimmet-form";
import { printFontPaths } from "@/lib/print-fonts";

const INK = "#111827";
const MUTED = "#4b5563";
const LINE = "#1f2937";
const HEAD = "#111827";
const ROW_ALT = "#f3f4f6";

const COLS = [
  { key: "index", label: "Sıra", width: 0.05 },
  { key: "stockNo", label: "Taşınır kodu", width: 0.13 },
  { key: "kind", label: "Cinsi", width: 0.11 },
  { key: "name", label: "Malzeme adı", width: 0.2 },
  { key: "brandModel", label: "Marka / model", width: 0.18 },
  { key: "serial", label: "Seri / cihaz no", width: 0.14 },
  { key: "quantity", label: "Adet", width: 0.05 },
  { key: "location", label: "Konum", width: 0.14 },
] as const;

function partyLines(party: ZimmetParty) {
  return [
    ["Adı soyadı", party.fullName],
    ["Unvan / görev", party.title],
    ["Sicil no", party.sicilNo],
    ["T.C. kimlik no", party.tcNo],
    ["Birim", party.department],
    ["Görev yeri", party.workplace],
    ["Telefon", party.phone],
    ["E-posta", party.email],
  ] as const;
}

function lineValues(line: ZimmetDocument["lines"][number]) {
  const brandModel = [line.brand, line.model].filter((part) => part && part !== "—").join(" / ") || "—";
  return [
    String(line.index),
    line.stockNo,
    line.kind,
    line.name,
    brandModel,
    line.serial,
    line.quantity,
    line.location,
  ];
}

function writeAt(
  pdf: PDFKit.PDFDocument,
  text: string,
  x: number,
  y: number,
  width: number,
  opts: { font?: string; size?: number; color?: string; align?: "left" | "center" | "justify"; maxH?: number } = {},
) {
  const prevX = pdf.x;
  const prevY = pdf.y;
  pdf.font(opts.font ?? "sans").fontSize(opts.size ?? 8).fillColor(opts.color ?? INK);
  pdf.text(text, x, y, {
    width,
    align: opts.align ?? "left",
    height: opts.maxH,
    ellipsis: Boolean(opts.maxH),
    lineGap: 1,
  });
  const used = Math.max(opts.size ?? 8, pdf.y - y);
  pdf.x = prevX;
  pdf.y = prevY;
  return used;
}

export function toZimmetPdf(doc: ZimmetDocument): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const fonts = printFontPaths();
    const pdf = new PDFDocument({
      size: "A4",
      layout: "landscape",
      margin: 28,
      info: { Title: `Taşınır Teslim Belgesi ${doc.documentNo}`, Author: APP_NAME },
    });
    const chunks: Buffer[] = [];
    pdf.on("data", (chunk) => chunks.push(chunk as Buffer));
    pdf.on("end", () => resolve(Buffer.concat(chunks)));
    pdf.on("error", reject);

    pdf.registerFont("sans", fonts.regular);
    pdf.registerFont("sans-bold", fonts.bold);

    const left = pdf.page.margins.left;
    const top = pdf.page.margins.top;
    const right = pdf.page.width - pdf.page.margins.right;
    const bottom = pdf.page.height - pdf.page.margins.bottom;
    const usable = right - left;
    let y = top;

    const ensure = (needed: number) => {
      if (y + needed > bottom) {
        pdf.addPage();
        y = pdf.page.margins.top;
      }
    };

    writeAt(pdf, "T.C.", left, y, usable, { font: "sans-bold", size: 10, align: "center" });
    y += 13;
    writeAt(pdf, doc.institution.toLocaleUpperCase("tr-TR"), left, y, usable, {
      font: "sans-bold",
      size: 12,
      align: "center",
    });
    y += 15;
    writeAt(pdf, "Bilgi İşlem / BT Hizmet Yönetimi", left, y, usable, {
      size: 9,
      color: MUTED,
      align: "center",
    });
    y += 14;
    writeAt(pdf, "TAŞINIR TESLİM BELGESİ", left, y, usable, { font: "sans-bold", size: 14, align: "center" });
    y += 16;
    writeAt(pdf, "(Zimmet Tutanağı)  ·  Taşınır Mal Yönetmeliği Örnek 6/A", left, y, usable, {
      size: 8,
      color: MUTED,
      align: "center",
    });
    y += 16;
    pdf.save();
    pdf.strokeColor(LINE).lineWidth(1.4).moveTo(left, y).lineTo(right, y).stroke();
    pdf.restore();
    y += 10;

    const metaW = usable / 3;
    writeAt(pdf, `Belge no: ${doc.documentNo}`, left, y, metaW - 8, { size: 8 });
    writeAt(pdf, `Tarih: ${doc.issuedAt}`, left + metaW, y, metaW - 8, { size: 8 });
    writeAt(pdf, `Birim: ${doc.unitTitle}`, left + metaW * 2, y, metaW, { size: 8 });
    y += 18;

    const colW = usable / 2 - 6;
    const boxH = 108;
    ensure(boxH + 12);
    const drawPartyBox = (title: string, party: ZimmetParty, x: number) => {
      pdf.save();
      pdf.rect(x, y, colW, boxH).fillAndStroke("#f9fafb", LINE);
      pdf.restore();
      writeAt(pdf, title, x + 8, y + 6, colW - 16, { font: "sans-bold", size: 8 });
      let rowY = y + 22;
      for (const [label, value] of partyLines(party)) {
        writeAt(pdf, `${label}:`, x + 8, rowY, 88, { size: 7.5, color: MUTED });
        writeAt(pdf, value, x + 98, rowY, colW - 110, { size: 7.5, maxH: 10 });
        rowY += 10.5;
      }
    };
    drawPartyBox("TESLİM ALAN (zimmetli personel)", doc.recipient, left);
    drawPartyBox("TESLİM EDEN (taşınır kayıt yetkilisi)", doc.issuer, left + usable / 2 + 6);
    y += boxH + 12;

    writeAt(pdf, "Zimmetindeki taşınırlar", left, y, usable, { font: "sans-bold", size: 9 });
    y += 16;

    const drawRow = (values: string[], bold: boolean) => {
      let height = 18;
      values.forEach((value, index) => {
        const width = usable * COLS[index].width - 6;
        pdf.font(bold ? "sans-bold" : "sans").fontSize(7);
        height = Math.max(height, Math.min(pdf.heightOfString(value || "—", { width }) + 8, 40));
      });
      ensure(height + 2);
      values.forEach((value, index) => {
        const width = usable * COLS[index].width;
        const x0 = left + COLS.slice(0, index).reduce((sum, col) => sum + usable * col.width, 0);
        pdf.save();
        pdf.rect(x0, y, width, height).fillAndStroke(bold ? HEAD : index % 2 ? ROW_ALT : "#ffffff", LINE);
        pdf.restore();
        writeAt(pdf, value || "—", x0 + 3, y + 4, width - 6, {
          font: bold ? "sans-bold" : "sans",
          size: 7,
          color: bold ? "#ffffff" : INK,
          maxH: height - 6,
        });
      });
      y += height;
    };

    drawRow(
      COLS.map((col) => col.label),
      true,
    );
    for (const line of doc.lines) drawRow(lineValues(line), false);

    y += 12;
    ensure(70);
    writeAt(pdf, "Taahhütname / maddi sorumluluk", left, y, usable, { font: "sans-bold", size: 8 });
    y += 12;
    const pledgeH = writeAt(pdf, ZIMMET_PLEDGE, left, y, usable, { size: 8, align: "justify" });
    y += pledgeH + 6;
    writeAt(pdf, ZIMMET_COPIES, left, y, usable, { size: 7.5, color: MUTED });
    y += 18;

    ensure(78);
    const signW = usable / 3;
    const signH = 72;
    const blocks = [
      ["TESLİM EDEN", doc.issuer.fullName, doc.issuer.title],
      ["TESLİM ALAN", doc.recipient.fullName, doc.recipient.title],
      ["BİRİM YETKİLİSİ", doc.managerName, "Onay"],
    ];
    blocks.forEach(([role, name, title], index) => {
      const x = left + index * signW;
      pdf.save();
      pdf.rect(x + 4, y, signW - 8, signH).strokeColor(LINE).lineWidth(0.8).stroke();
      pdf.restore();
      writeAt(pdf, role, x + 8, y + 6, signW - 16, { font: "sans-bold", size: 7.5, align: "center" });
      writeAt(pdf, name, x + 8, y + 20, signW - 16, { size: 7.5, align: "center" });
      writeAt(pdf, title, x + 8, y + 32, signW - 16, { size: 7, color: MUTED, align: "center" });
      pdf.save();
      pdf.strokeColor(LINE).moveTo(x + 22, y + 52).lineTo(x + signW - 22, y + 52).stroke();
      pdf.restore();
      writeAt(pdf, "İmza / tarih", x + 8, y + 56, signW - 16, { size: 7, color: MUTED, align: "center" });
    });

    pdf.end();
  });
}

const thin = { style: BorderStyle.SINGLE, size: 8, color: "1F2937" };
const borders = { top: thin, bottom: thin, left: thin, right: thin };

function cell(text: string, opts?: { bold?: boolean; fill?: string; width?: number; center?: boolean }) {
  return new TableCell({
    borders,
    width: opts?.width ? { size: opts.width, type: WidthType.DXA } : undefined,
    shading: opts?.fill ? { fill: opts.fill } : undefined,
    verticalAlign: VerticalAlign.CENTER,
    margins: { top: 40, bottom: 40, left: 50, right: 50 },
    children: [
      new Paragraph({
        alignment: opts?.center ? AlignmentType.CENTER : AlignmentType.LEFT,
        children: [
          new TextRun({
            text,
            bold: opts?.bold,
            size: 16,
            font: "Calibri",
            color: opts?.fill === "111827" ? "FFFFFF" : "111827",
          }),
        ],
      }),
    ],
  });
}

export async function toZimmetDocx(doc: ZimmetDocument) {
  const headerRows = [
    new TableRow({
      children: COLS.map((col) => cell(col.label, { bold: true, fill: "111827", center: true })),
    }),
  ];
  const bodyRows = doc.lines.map(
    (line) =>
      new TableRow({
        children: lineValues(line).map((value, index) =>
          cell(value, { center: index === 0 || index === 6 }),
        ),
      }),
  );

  const infoRows = partyLines(doc.recipient).map(
    ([label, value], index) =>
      new TableRow({
        children: [
          cell(label, { bold: true, width: 2200 }),
          cell(value, { width: 2500 }),
          cell(partyLines(doc.issuer)[index][0], { bold: true, width: 2200 }),
          cell(partyLines(doc.issuer)[index][1], { width: 2500 }),
        ],
      }),
  );

  const document = new Document({
    sections: [
      {
        properties: {
          page: {
            size: { orientation: "landscape" },
            margin: { top: 560, bottom: 560, left: 560, right: 560 },
          },
        },
        children: [
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [new TextRun({ text: "T.C.", bold: true, size: 22 })],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [new TextRun({ text: doc.institution.toLocaleUpperCase("tr-TR"), bold: true, size: 26 })],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [new TextRun({ text: "Bilgi İşlem / BT Hizmet Yönetimi", size: 18, color: "4B5563" })],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { before: 160 },
            heading: HeadingLevel.HEADING_1,
            children: [new TextRun({ text: "TAŞINIR TESLİM BELGESİ", bold: true, size: 28 })],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 200 },
            children: [
              new TextRun({
                text: "(Zimmet Tutanağı)  ·  Taşınır Mal Yönetmeliği Örnek 6/A",
                italics: true,
                size: 16,
                color: "4B5563",
              }),
            ],
          }),
          new Paragraph({
            children: [
              new TextRun({ text: `Belge no: ${doc.documentNo}    `, size: 18 }),
              new TextRun({ text: `Tarih: ${doc.issuedAt}    `, size: 18 }),
              new TextRun({ text: `Birim: ${doc.unitTitle}`, size: 18 }),
            ],
          }),
          new Paragraph({
            spacing: { before: 200, after: 80 },
            children: [new TextRun({ text: "Teslim alan  /  Teslim eden", bold: true, size: 20 })],
          }),
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              new TableRow({
                children: [
                  cell("TESLİM ALAN", { bold: true, fill: "111827", center: true }),
                  cell("", { fill: "111827" }),
                  cell("TESLİM EDEN", { bold: true, fill: "111827", center: true }),
                  cell("", { fill: "111827" }),
                ],
              }),
              ...infoRows,
            ],
          }),
          new Paragraph({
            spacing: { before: 280, after: 80 },
            children: [
              new TextRun({
                text: "Zimmetindeki taşınırlar",
                bold: true,
                size: 20,
              }),
            ],
          }),
          new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows: [...headerRows, ...bodyRows] }),
          new Paragraph({
            spacing: { before: 280, after: 80 },
            children: [new TextRun({ text: "Taahhütname / maddi sorumluluk", bold: true, size: 20 })],
          }),
          new Paragraph({
            alignment: AlignmentType.JUSTIFIED,
            children: [new TextRun({ text: ZIMMET_PLEDGE, size: 18 })],
          }),
          new Paragraph({
            spacing: { before: 80, after: 240 },
            children: [new TextRun({ text: ZIMMET_COPIES, italics: true, size: 16, color: "4B5563" })],
          }),
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              new TableRow({
                children: [
                  cell("TESLİM EDEN — İmza / tarih", { center: true, bold: true }),
                  cell("TESLİM ALAN — İmza / tarih", { center: true, bold: true }),
                  cell("BİRİM YETKİLİSİ — İmza / tarih", { center: true, bold: true }),
                ],
              }),
              new TableRow({
                children: [
                  cell(`${doc.issuer.fullName} · ${doc.issuer.title}`, { center: true }),
                  cell(`${doc.recipient.fullName} · ${doc.recipient.title}`, { center: true }),
                  cell(`${doc.managerName} · Onay`, { center: true }),
                ],
              }),
            ],
          }),
        ],
      },
    ],
  });

  return Buffer.from(await Packer.toBuffer(document));
}

export async function exportZimmetForm(doc: ZimmetDocument, format: "pdf" | "docx") {
  if (format === "pdf") {
    return { body: await toZimmetPdf(doc), contentType: "application/pdf", ext: "pdf" as const };
  }
  return {
    body: await toZimmetDocx(doc),
    contentType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ext: "docx" as const,
  };
}

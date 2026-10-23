import { AlignmentType, Document, Footer, HeadingLevel, PageNumber, Packer, Paragraph, Table, TableCell, TableRow, TextRun, WidthType } from "docx";
import PDFDocument from "pdfkit";

import { printFontPaths } from "@/lib/print-fonts";

import type { ReportFormat, ReportTable } from "./types";

function csvEscape(value: string) {
  if (/[",\n;]/.test(value)) return `"${value.replaceAll('"', '""')}"`;
  return value;
}

export function toCsv(report: ReportTable) {
  const header = report.columns.map((column) => csvEscape(column.label)).join(";");
  const lines = report.rows.map((row) => report.columns.map((column) => csvEscape(row[column.key] ?? "")).join(";"));
  return `\uFEFF${header}\n${lines.join("\n")}\n`;
}

export function toPdf(report: ReportTable): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: "A4", layout: "landscape", margin: 36, info: { Title: report.title, Author: report.generatedBy ?? "BT Hizmet Yönetimi", Subject: report.scope ?? report.description }, bufferPages: true });
    const chunks: Buffer[] = [];
    doc.on("data", (chunk) => chunks.push(chunk as Buffer));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    const fonts = printFontPaths();
    doc.registerFont("sans", fonts.regular);
    doc.registerFont("sans-bold", fonts.bold);
    doc.font("sans-bold").fontSize(16).fillColor("#0f766e").text(report.title);
    doc.font("sans").fontSize(9).fillColor("#334155").text(report.scope ?? report.description);
    doc.moveDown(0.3);
    const meta = [
      `Rapor no: ${reportNo(report)}`,
      `Oluşturulma: ${report.generatedAt}`,
      report.generatedBy ? `Hazırlayan: ${report.generatedBy}` : "",
      `Kayıt sayısı: ${report.rows.length}`,
    ].filter(Boolean);
    doc.fontSize(8).fillColor("#64748b").text(meta.join("  ·  "));
    doc.moveDown(0.5);
    if (report.summary?.length) {
      const boxW = Math.min(180, (doc.page.width - doc.page.margins.left - doc.page.margins.right) / report.summary.length - 6);
      const top = doc.y;
      report.summary.forEach((item, index) => {
        const x = doc.page.margins.left + index * (boxW + 6);
        doc.rect(x, top, boxW, 40).fillAndStroke("#f0fdfa", "#99f6e4");
        doc.fillColor("#64748b").font("sans").fontSize(7).text(item.label, x + 6, top + 6, { width: boxW - 12, height: 10, ellipsis: true });
        doc.fillColor("#0f766e").font("sans-bold").fontSize(12).text(item.value, x + 6, top + 18, { width: boxW - 12, height: 16, ellipsis: true });
      });
      doc.y = top + 48;
      doc.x = doc.page.margins.left;
    }

    const startX = doc.page.margins.left;
    const usable = doc.page.width - doc.page.margins.left - doc.page.margins.right;
    const colWidth = usable / Math.max(report.columns.length, 1);
    const maxRows = Math.min(report.rows.length, 400);

    const drawRow = (values: string[], bold: boolean, y: number) => {
      let height = 16;
      values.forEach((value) => {
        doc.font(bold ? "sans-bold" : "sans").fontSize(7).fillColor("#0f172a");
        const h = doc.heightOfString(value || "—", { width: colWidth - 6 });
        height = Math.max(height, Math.min(h + 6, 36));
      });
      if (y + height > doc.page.height - doc.page.margins.bottom) {
        doc.addPage();
        y = doc.page.margins.top;
      }
      values.forEach((value, index) => {
        const x0 = startX + index * colWidth;
        doc.rect(x0, y, colWidth, height).fillAndStroke(bold ? "#0f766e" : index % 2 ? "#f8fafc" : "#ffffff", "#cbd5e1");
        doc
          .fillColor(bold ? "#ffffff" : "#0f172a")
          .font(bold ? "sans-bold" : "sans")
          .fontSize(7)
          .text(value || "—", x0 + 3, y + 3, { width: colWidth - 6, height: height - 4, ellipsis: true });
      });
      return y + height;
    };

    let y = doc.y;
    y = drawRow(
      report.columns.map((column) => column.label),
      true,
      y,
    );
    for (let i = 0; i < maxRows; i += 1) {
      y = drawRow(
        report.columns.map((column) => report.rows[i][column.key] ?? ""),
        false,
        y,
      );
    }
    if (report.rows.length > maxRows) {
      doc.font("sans").fontSize(8).fillColor("#64748b").text(`… ve ${report.rows.length - maxRows} satır daha. Tam liste için CSV indirin.`, startX, y + 8);
    }
    if (report.notes?.length) {
      doc.font("sans").fontSize(7.5).fillColor("#475569");
      let ny = y + 10;
      for (const note of report.notes) {
        if (ny + 14 > doc.page.height - doc.page.margins.bottom) {
          doc.addPage();
          ny = doc.page.margins.top;
        }
        doc.text(`Not: ${note}`, startX, ny, { width: usable });
        ny = doc.y + 2;
      }
    }
    const range = doc.bufferedPageRange();
    for (let i = range.start; i < range.start + range.count; i += 1) {
      doc.switchToPage(i);
      const bottom = doc.page.margins.bottom;
      doc.page.margins.bottom = 0;
      doc
        .font("sans")
        .fontSize(7)
        .fillColor("#94a3b8")
        .text(`${report.title} · Kurum içi — gizlilik: dahili kullanım`, startX, doc.page.height - 26, { width: usable - 90, lineBreak: false });
      doc.text(`Sayfa ${i - range.start + 1} / ${range.count}`, startX + usable - 80, doc.page.height - 26, { width: 80, align: "right", lineBreak: false });
      doc.page.margins.bottom = bottom;
    }
    doc.end();
  });
}

function reportNo(report: ReportTable) {
  const stamp = report.generatedAt.replace(/\D/g, "").slice(0, 12);
  return `${report.id.toUpperCase()}-${stamp}`;
}

export async function toDocx(report: ReportTable) {
  const header = new TableRow({
    children: report.columns.map(
      (column) =>
        new TableCell({
          width: { size: Math.round(9000 / report.columns.length), type: WidthType.DXA },
          children: [new Paragraph({ children: [new TextRun({ text: column.label, bold: true, color: "FFFFFF" })] })],
          shading: { fill: "0F766E" },
        }),
    ),
  });
  const body = report.rows.slice(0, 400).map(
    (row) =>
      new TableRow({
        children: report.columns.map(
          (column) =>
            new TableCell({
              width: { size: Math.round(9000 / report.columns.length), type: WidthType.DXA },
              children: [new Paragraph(row[column.key] || "—")],
            }),
        ),
      }),
  );

  const document = new Document({
    sections: [
      {
        properties: { page: { size: { orientation: "landscape" } } },
        footers: {
          default: new Footer({
            children: [
              new Paragraph({
                alignment: AlignmentType.RIGHT,
                children: [
                  new TextRun({ text: `${report.title} · Kurum içi · Sayfa `, size: 14, color: "94A3B8" }),
                  new TextRun({ children: [PageNumber.CURRENT], size: 14, color: "94A3B8" }),
                  new TextRun({ text: " / ", size: 14, color: "94A3B8" }),
                  new TextRun({ children: [PageNumber.TOTAL_PAGES], size: 14, color: "94A3B8" }),
                ],
              }),
            ],
          }),
        },
        children: [
          new Paragraph({ text: report.title, heading: HeadingLevel.HEADING_1 }),
          new Paragraph({ children: [new TextRun({ text: report.scope ?? report.description, italics: true })] }),
          new Paragraph({
            children: [
              new TextRun({
                text: [`Rapor no: ${reportNo(report)}`, `Oluşturulma: ${report.generatedAt}`, report.generatedBy ? `Hazırlayan: ${report.generatedBy}` : "", `Kayıt sayısı: ${report.rows.length}`]
                  .filter(Boolean)
                  .join("  ·  "),
                color: "64748B",
                size: 16,
              }),
            ],
          }),
          ...(report.summary?.length
            ? [
                new Paragraph({ text: "" }),
                new Paragraph({ children: report.summary.flatMap((item) => [new TextRun({ text: `${item.label}: `, color: "64748B" }), new TextRun({ text: `${item.value}     `, bold: true, color: "0F766E" })]) }),
              ]
            : []),
          new Paragraph({ text: "" }),
          new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows: [header, ...body] }),
          ...(report.notes ?? []).map((note) => new Paragraph({ children: [new TextRun({ text: `Not: ${note}`, italics: true, size: 16, color: "475569" })] })),
        ],
      },
    ],
  });
  return Buffer.from(await Packer.toBuffer(document));
}

export async function exportReport(report: ReportTable, format: ReportFormat) {
  if (format === "csv") {
    return { body: Buffer.from(toCsv(report), "utf8"), contentType: "text/csv; charset=utf-8", ext: "csv" };
  }
  if (format === "pdf") {
    return { body: await toPdf(report), contentType: "application/pdf", ext: "pdf" };
  }
  return {
    body: await toDocx(report),
    contentType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ext: "docx",
  };
}

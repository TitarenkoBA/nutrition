import ptRegularUrl from "../../assets/fonts/PTSans_400Regular.ttf?url";
import ptBoldUrl from "../../assets/fonts/PTSans_700Bold.ttf?url";
import { steps, isVisible, str, type Values } from "./schema";
import { CONSENT_TITLE, consentParagraphs, formatConsentDate, type Operator } from "./consent";

const COLORS = {
  ink: [46, 42, 38] as const,
  muted: [122, 113, 104] as const,
  sage: [79, 107, 86] as const,
  band: [227, 235, 224] as const,
  line: [220, 214, 205] as const,
};

async function fontBase64(src: string): Promise<string> {
  const buffer = await (await fetch(src)).arrayBuffer();
  const bytes = new Uint8Array(buffer);
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

function formatDate(value: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const [y, m, d] = value.split("-");
  return `${d}.${m}.${y}`;
}

export function pdfFileName(values: Values): string {
  const name = str(values, "fullName").trim().split(/\s+/).slice(0, 2).join("_") || "клиента";
  const date = new Date().toISOString().slice(0, 10);
  return `Анкета_${name}_${date}.pdf`.replace(/[\\/:*?"<>|]/g, "");
}

/** Пары «вопрос — ответ» для раздела анкеты (пустые ответы помечаются тире). */
function rowsForStep(stepIndex: number, values: Values): Array<{ q: string; a: string; empty: boolean; sub?: boolean }> {
  const step = steps[stepIndex];
  const rows: Array<{ q: string; a: string; empty: boolean; sub?: boolean }> = [];

  for (const field of step.fields) {
    if (!isVisible(field, values)) continue;
    switch (field.kind) {
      case "heading":
        rows.push({ q: field.label, a: "", empty: false, sub: true });
        break;
      case "note":
        break;
      case "yesno": {
        const answer = str(values, field.id);
        const details = str(values, `${field.id}_details`).trim();
        const yn = answer === "yes" ? "Да" : answer === "no" ? "Нет" : "";
        const a = [yn, details].filter(Boolean).join(". ");
        rows.push({ q: `${field.num}. ${field.label}`, a: a || "—", empty: !a });
        break;
      }
      case "survey-text": {
        const a = str(values, field.id).trim();
        rows.push({ q: `${field.num}. ${field.label}`, a: a || "—", empty: !a });
        break;
      }
      case "checkbox":
        if (values[field.id] === true) rows.push({ q: field.label, a: "Да", empty: false });
        break;
      case "choice": {
        const value = str(values, field.id);
        const label = field.options.find((o) => o.value === value)?.label ?? "";
        rows.push({ q: field.label, a: label || "—", empty: !label });
        break;
      }
      case "number": {
        const a = str(values, field.id).trim();
        rows.push({ q: field.label, a: a ? `${a} ${field.unit ?? ""}`.trim() : "—", empty: !a });
        break;
      }
      case "date": {
        const a = str(values, field.id).trim();
        rows.push({ q: field.label, a: a ? formatDate(a) : "—", empty: !a });
        break;
      }
      default: {
        const a = str(values, field.id).trim();
        rows.push({ q: field.label, a: a || "—", empty: !a });
      }
    }
  }

  // Подзаголовок без единого заполненного поля после него не нужен.
  return rows.filter((row, i) => !row.sub || rows.slice(i + 1).some((r) => !r.sub));
}

export async function buildPdf(values: Values, operator: Operator): Promise<Blob> {
  const { jsPDF } = await import("jspdf");
  const [regular, bold] = await Promise.all([fontBase64(ptRegularUrl), fontBase64(ptBoldUrl)]);

  const doc = new jsPDF({ unit: "pt", format: "a4", compress: true });
  doc.addFileToVFS("PTSans-Regular.ttf", regular);
  doc.addFont("PTSans-Regular.ttf", "PTSans", "normal");
  doc.addFileToVFS("PTSans-Bold.ttf", bold);
  doc.addFont("PTSans-Bold.ttf", "PTSans", "bold");
  doc.setFont("PTSans", "normal");

  const fullName = str(values, "fullName").trim() || "Без имени";
  doc.setProperties({ title: `Анкета — ${fullName}`, subject: "Анкета клиента нутрициолога" });

  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 48;
  const width = pageW - margin * 2;
  const bottom = pageH - 56;
  let y = margin;

  const ensure = (height: number) => {
    if (y + height > bottom) {
      doc.addPage();
      y = margin;
    }
  };

  const write = (text: string, size: number, style: "normal" | "bold", color: readonly number[], gap = 1.35) => {
    doc.setFont("PTSans", style);
    doc.setFontSize(size);
    doc.setTextColor(color[0], color[1], color[2]);
    const lines = doc.splitTextToSize(text, width) as string[];
    const lineH = size * gap;
    for (const line of lines) {
      ensure(lineH);
      doc.text(line, margin, y + size);
      y += lineH;
    }
  };

  // Шапка
  write("Анкета клиента", 24, "bold", COLORS.ink, 1.2);
  y += 4;
  write(fullName, 14, "normal", COLORS.sage);
  y += 2;
  const filled = new Date().toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit", year: "numeric" });
  write(`Дата заполнения: ${filled}  ·  Конфиденциально`, 10, "normal", COLORS.muted);
  const consentAt = formatConsentDate(str(values, "consentAt"));
  if (values.consent === true && consentAt) {
    write(`Согласие на обработку персональных данных дано ${consentAt} — текст на последней странице.`, 10, "normal", COLORS.muted);
  }
  y += 14;

  steps.forEach((step, index) => {
    const rows = rowsForStep(index, values);
    if (!rows.some((r) => !r.sub)) return;

    // Заголовок раздела — цветная плашка
    ensure(60);
    y += 8;
    doc.setFillColor(COLORS.band[0], COLORS.band[1], COLORS.band[2]);
    doc.roundedRect(margin - 10, y, width + 20, 28, 6, 6, "F");
    doc.setFont("PTSans", "bold");
    doc.setFontSize(13);
    doc.setTextColor(COLORS.sage[0], COLORS.sage[1], COLORS.sage[2]);
    doc.text(`${index + 1}. ${step.title}`, margin, y + 19);
    y += 40;

    for (const row of rows) {
      if (row.sub) {
        ensure(40);
        y += 6;
        write(row.q, 11.5, "bold", COLORS.sage);
        y += 2;
        continue;
      }
      ensure(34);
      write(row.q, 9.5, "bold", COLORS.muted, 1.3);
      write(row.a, 11, "normal", row.empty ? COLORS.line : COLORS.ink);
      y += 6;
      doc.setDrawColor(COLORS.line[0], COLORS.line[1], COLORS.line[2]);
      doc.setLineWidth(0.5);
      doc.line(margin, y, margin + width, y);
      y += 8;
    }
  });

  // Согласие на обработку персональных данных — отдельной страницей в конце
  doc.addPage();
  y = margin;
  write(CONSENT_TITLE, 16, "bold", COLORS.ink, 1.25);
  write("(включая сведения о состоянии здоровья)", 10, "normal", COLORS.muted);
  y += 12;
  const birthDate = formatDate(str(values, "birthDate").trim());
  for (const paragraph of consentParagraphs({ fullName: str(values, "fullName"), birthDate }, operator)) {
    write(paragraph, 10.5, "normal", COLORS.ink, 1.45);
    y += 8;
  }

  y += 10;
  ensure(120);
  doc.setDrawColor(COLORS.line[0], COLORS.line[1], COLORS.line[2]);
  doc.setLineWidth(0.5);
  doc.line(margin, y, margin + width, y);
  y += 14;
  const rows: Array<[string, string]> = [
    ["ФИО", fullName],
    ["Дата и время дачи согласия", consentAt || "—"],
    [
      "Способ",
      "отметка о согласии в электронной форме анкеты на сайте и направление настоящего файла Оператору по электронной почте или через мессенджер",
    ],
  ];
  for (const [label, value] of rows) {
    write(label, 9.5, "bold", COLORS.muted, 1.3);
    write(value, 11, "normal", COLORS.ink);
    y += 6;
  }
  y += 18;
  ensure(30);
  write("Подпись (при распечатке): ____________________ / ____________________", 10.5, "normal", COLORS.ink);

  // Нумерация страниц
  const total = doc.getNumberOfPages();
  for (let i = 1; i <= total; i++) {
    doc.setPage(i);
    doc.setFont("PTSans", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(COLORS.muted[0], COLORS.muted[1], COLORS.muted[2]);
    doc.text(`${fullName} · анкета`, margin, pageH - 28);
    doc.text(`стр. ${i} из ${total}`, pageW - margin, pageH - 28, { align: "right" });
  }

  return doc.output("blob");
}

import PDFDocument from "pdfkit";

export function renderContractPdf(markdown: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: "LETTER",
      margins: { top: 56, bottom: 56, left: 64, right: 64 },
    });
    const chunks: Buffer[] = [];
    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
    writeMarkdown(doc, markdown);
    doc.end();
  });
}

function writeMarkdown(doc: PDFKit.PDFDocument, markdown: string) {
  const width = doc.page.width - doc.page.margins.left - doc.page.margins.right;
  const blocks = markdown.replace(/\r\n/g, "\n").trim().split(/\n{2,}/);

  for (const block of blocks) {
    const lines = block.split("\n").map((line) => line.trim()).filter(Boolean);
    if (lines.length === 0) continue;

    if (lines.length === 1 && isHeading(lines[0])) {
      doc.moveDown(0.55);
      writeRich(doc, unwrap(lines[0]), { width, align: "center", heading: true });
      doc.moveDown(0.15);
      continue;
    }

    if (lines.every(isListItem)) {
      for (const line of lines) {
        writeRich(doc, formatListItem(line), { width: width - 16, align: "left", indent: 16 });
      }
      doc.moveDown(0.25);
      continue;
    }

    writeRich(doc, lines.join(" "), { width, align: "justify" });
    doc.moveDown(0.3);
  }
}

function writeRich(
  doc: PDFKit.PDFDocument,
  text: string,
  options: { width: number; align: "left" | "center" | "justify"; indent?: number; heading?: boolean },
) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g).filter((part) => part.length > 0);
  doc.fontSize(options.heading ? 12 : 10.5);
  parts.forEach((part, index) => {
    const bold = options.heading || (part.startsWith("**") && part.endsWith("**"));
    const value = part.startsWith("**") && part.endsWith("**") ? part.slice(2, -2) : part;
    doc.font(bold ? "Helvetica-Bold" : "Helvetica");
    doc.text(value, {
      width: options.width,
      align: options.align,
      indent: options.indent ?? 0,
      lineGap: 2,
      continued: index < parts.length - 1,
    });
  });
}

function isHeading(line: string): boolean {
  return /^\*\*.+\*\*$/.test(line);
}

function isListItem(line: string): boolean {
  return /^([-*]|\d+\.)\s+/.test(line);
}

function formatListItem(line: string): string {
  if (/^\d+\.\s+/.test(line)) return line;
  return `• ${line.replace(/^[-*]\s+/, "")}`;
}

function unwrap(line: string): string {
  return line.replace(/^\*\*/, "").replace(/\*\*$/, "");
}

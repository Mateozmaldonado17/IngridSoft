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
  let contractTitle = true;

  for (const block of blocks) {
    const lines = block.split("\n").map((line) => line.trim()).filter(Boolean);
    if (lines.length === 0) continue;

    if (lines.length === 1 && isHeading(lines[0])) {
      if (doc.y > doc.page.margins.top + 8) doc.moveDown(0.7);
      writeRich(doc, unwrap(lines[0]), {
        width,
        align: contractTitle ? "center" : "left",
        heading: true,
      });
      contractTitle = false;
      doc.moveDown(1);
      continue;
    }

    for (const line of lines) {
      writeRich(doc, line.replace(/^[-*]\s+/, ""), { width, align: "justify" });
    }
    doc.moveDown(0.35);
  }
}

function writeRich(
  doc: PDFKit.PDFDocument,
  text: string,
  options: {
    width: number;
    align: "left" | "center" | "justify";
    indent?: number;
    heading?: boolean;
  },
) {
  const fontSize = options.heading ? 12 : 10.5;
  const lineGap = options.heading ? 3 : 2;
  doc.font("Helvetica").fontSize(fontSize);
  const lineHeight = doc.currentLineHeight(true) + lineGap;
  const spaceWidth = doc.widthOfString(" ");
  const pieces = piecesOf(text, Boolean(options.heading));
  const left = doc.page.margins.left + (options.indent ?? 0);
  const lines = wrapPieces(doc, pieces, options.width, spaceWidth, fontSize);

  let y = doc.y;
  lines.forEach((line, index) => {
    y = ensureRoom(doc, y, lineHeight);
    const widths = line.map((piece) => measurePiece(doc, piece, fontSize));
    const wordsWidth = widths.reduce((sum, width) => sum + width, 0);
    const naturalWidth = wordsWidth + spaceWidth * Math.max(line.length - 1, 0);
    const stretch =
      options.align === "justify" && index < lines.length - 1 && line.length > 1;
    const gap = stretch ? (options.width - wordsWidth) / (line.length - 1) : spaceWidth;
    let x = left;
    if (options.align === "center") x = left + Math.max(0, (options.width - naturalWidth) / 2);

    line.forEach((piece, wordIndex) => {
      doc.font(piece.bold ? "Helvetica-Bold" : "Helvetica").fontSize(fontSize);
      doc.text(piece.word, x, y, { lineBreak: false });
      x += widths[wordIndex] + gap;
    });
    y += lineHeight;
  });

  doc.x = doc.page.margins.left;
  doc.y = y;
  doc.font("Helvetica").fontSize(10.5);
}

function piecesOf(text: string, heading: boolean): Array<{ word: string; bold: boolean }> {
  const pieces: Array<{ word: string; bold: boolean }> = [];
  for (const part of text.split(/(\*\*[^*]+\*\*)/g)) {
    if (!part) continue;
    const marked = part.startsWith("**") && part.endsWith("**") && part.length > 4;
    const value = marked ? part.slice(2, -2) : part;
    for (const word of value.split(/\s+/)) {
      if (!word) continue;
      const bold = heading || marked;
      const previous = pieces[pieces.length - 1];
      if (previous && /^[,.;:)\]»]/.test(word)) {
        previous.word += word;
        continue;
      }
      pieces.push({ word, bold });
    }
  }
  return pieces;
}

function wrapPieces(
  doc: PDFKit.PDFDocument,
  pieces: Array<{ word: string; bold: boolean }>,
  box: number,
  spaceWidth: number,
  fontSize: number,
): Array<Array<{ word: string; bold: boolean }>> {
  const lines: Array<Array<{ word: string; bold: boolean }>> = [];
  let line: Array<{ word: string; bold: boolean }> = [];
  let lineWidth = 0;
  for (const piece of pieces) {
    const width = measurePiece(doc, piece, fontSize);
    const next = line.length === 0 ? width : lineWidth + spaceWidth + width;
    if (line.length > 0 && next > box) {
      lines.push(line);
      line = [piece];
      lineWidth = width;
    } else {
      line.push(piece);
      lineWidth = next;
    }
  }
  if (line.length > 0) lines.push(line);
  return lines;
}

function measurePiece(
  doc: PDFKit.PDFDocument,
  piece: { word: string; bold: boolean },
  fontSize: number,
): number {
  doc.font(piece.bold ? "Helvetica-Bold" : "Helvetica").fontSize(fontSize);
  return doc.widthOfString(piece.word);
}

function ensureRoom(doc: PDFKit.PDFDocument, y: number, lineHeight: number): number {
  if (y + lineHeight <= doc.page.height - doc.page.margins.bottom) return y;
  doc.addPage();
  return doc.page.margins.top;
}

function isHeading(line: string): boolean {
  return /^\*\*.+\*\*$/.test(line);
}

function unwrap(line: string): string {
  return line.replace(/^\*\*/, "").replace(/\*\*$/, "");
}

import { PDFDocument } from "pdf-lib";

export interface FieldPlacement {
  page: number;
  xPct: number;
  yPct: number;
  widthPct: number;
  heightPct: number;
  signedImageUrl: string;
}

/**
 * Embeds signature images at field coordinates into the original PDF.
 * Returns Uint8Array of the signed PDF.
 */
export async function assemblePdf(
  pdfBytes: Uint8Array,
  fields: FieldPlacement[],
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.load(pdfBytes);
  const pages = pdfDoc.getPages();

  for (const field of fields) {
    const pageIdx = field.page - 1;
    if (pageIdx < 0 || pageIdx >= pages.length) continue;

    const page = pages[pageIdx];
    const { width, height } = page.getSize();

    // Convert data URL to bytes
    const base64 = field.signedImageUrl.split(",")[1];
    if (!base64) continue;

    const imgBytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));

    let image;
    if (field.signedImageUrl.includes("image/png")) {
      image = await pdfDoc.embedPng(imgBytes);
    } else {
      image = await pdfDoc.embedJpg(imgBytes);
    }

    const x = (field.xPct / 100) * width;
    const y = height - (field.yPct / 100) * height - (field.heightPct / 100) * height;
    const w = (field.widthPct / 100) * width;
    const h = (field.heightPct / 100) * height;

    page.drawImage(image, { x, y, width: w, height: h });
  }

  return pdfDoc.save();
}

/**
 * Creates a blank PDF for testing purposes.
 */
export async function createBlankPdf(): Promise<string> {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([612, 792]);
  page.drawText("Sample Document for Signing", {
    x: 50,
    y: 700,
    size: 24,
  });
  page.drawText("This is a sample document created for testing the digital signature flow.", {
    x: 50,
    y: 660,
    size: 12,
  });
  page.drawText("Please sign in the designated areas below.", {
    x: 50,
    y: 630,
    size: 12,
  });
  const bytes = await pdfDoc.save();
  const blob = new Blob([bytes as unknown as BlobPart], { type: "application/pdf" });
  return URL.createObjectURL(blob);
}

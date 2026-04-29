import "server-only";
import QRCode from "qrcode";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

type PosterInput = {
  url: string;
  merchantName: string;
  cdlName: string;
  tagline?: string;
};

const A4_WIDTH = 595.28;
const A4_HEIGHT = 841.89;

function hexToRgb(hex: string) {
  const v = hex.replace("#", "");
  const num = parseInt(v.length === 3 ? v.split("").map((c) => c + c).join("") : v, 16);
  return rgb(((num >> 16) & 255) / 255, ((num >> 8) & 255) / 255, (num & 255) / 255);
}

export async function generatePosterPDF({
  url,
  merchantName,
  cdlName,
  tagline = "Escaneie. Identifique-se. Acumule selos e prêmios.",
}: PosterInput): Promise<Uint8Array> {
  const qrPng = await QRCode.toBuffer(url, {
    errorCorrectionLevel: "H",
    margin: 1,
    width: 1024,
    color: { dark: "#0f172a", light: "#FFFFFF" },
  });

  const pdf = await PDFDocument.create();
  const page = pdf.addPage([A4_WIDTH, A4_HEIGHT]);
  const fontBold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const font = await pdf.embedFont(StandardFonts.Helvetica);

  const primary = hexToRgb("#1d3a8c");
  const muted = hexToRgb("#475569");

  // Top banner
  page.drawRectangle({
    x: 0,
    y: A4_HEIGHT - 90,
    width: A4_WIDTH,
    height: 90,
    color: primary,
  });
  page.drawText(cdlName, {
    x: 48,
    y: A4_HEIGHT - 50,
    size: 22,
    font: fontBold,
    color: rgb(1, 1, 1),
  });
  page.drawText("Plataforma de campanhas", {
    x: 48,
    y: A4_HEIGHT - 75,
    size: 12,
    font,
    color: rgb(1, 1, 1),
  });

  // QR centered
  const qrImage = await pdf.embedPng(qrPng);
  const qrSize = 380;
  const qrX = (A4_WIDTH - qrSize) / 2;
  const qrY = (A4_HEIGHT - qrSize) / 2 + 20;
  page.drawImage(qrImage, { x: qrX, y: qrY, width: qrSize, height: qrSize });

  // Merchant name under QR
  const nameSize = 24;
  const nameWidth = fontBold.widthOfTextAtSize(merchantName, nameSize);
  page.drawText(merchantName, {
    x: (A4_WIDTH - nameWidth) / 2,
    y: qrY - 50,
    size: nameSize,
    font: fontBold,
    color: primary,
  });

  // Tagline
  const taglineSize = 14;
  const taglineWidth = font.widthOfTextAtSize(tagline, taglineSize);
  page.drawText(tagline, {
    x: (A4_WIDTH - taglineWidth) / 2,
    y: qrY - 80,
    size: taglineSize,
    font,
    color: muted,
  });

  // Footer
  page.drawText("Powered by Fielize · fielize.com", {
    x: 48,
    y: 36,
    size: 9,
    font,
    color: muted,
  });

  return await pdf.save();
}

import jsPDF from "jspdf";
import JsBarcode from "jsbarcode";
import {
  ACTIVE_SHIPMENT_STATUSES,
  BRAND_LOGO_URL,
  FAILED_DELIVERY_STATUSES,
  RETURN_SHIPMENT_STATUSES,
} from "./constants";

// ─── Real Scannable Barcode DataURL Generator (JsBarcode) ─────────────────────
function getBarcodeDataURL(text) {
  try {
    const canvas = document.createElement("canvas");
    JsBarcode(canvas, text || "FLX93820428", {
      format: "CODE128",
      displayValue: false,
      margin: 2,
      height: 50,
      width: 2,
      background: "#ffffff",
      lineColor: "#000000",
    });
    return canvas.toDataURL("image/png");
  } catch (e) {
    console.error("Barcode generation error:", e);
    return null;
  }
}

// Fallback manual barcode renderer if image fails
function drawBarcodeFallback(doc, x, y, width, height) {
  const pattern = [3,1,2,1,4,1,2,2,1,3,2,1,4,1,2,1,3,2,1,4,1,2,3,1,2,1,4,2,1,3,1,2,1];
  const totalUnits = pattern.reduce((a, b) => a + b, 0) + pattern.length * 0.6;
  const unit = width / totalUnits;
  let xPos = x;
  doc.setFillColor(0, 0, 0);
  pattern.forEach((w, i) => {
    if (i % 2 === 0) {
      doc.rect(xPos, y, w * unit, height, "F");
    }
    xPos += w * unit + 0.6 * unit;
  });
}

function drawRect(doc, x, y, w, h, fill = false) {
  doc.setDrawColor(0);
  doc.setLineWidth(0.35);
  if (fill) {
    doc.setFillColor(0, 0, 0);
    doc.rect(x, y, w, h, "FD");
  } else {
    doc.rect(x, y, w, h, "S");
  }
}

function drawTextLogo(doc, companyName, x, y, width, height, settings = {}) {
  const navy = settings.primaryColor || "#0A2342";
  doc.setTextColor(navy);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text(String(companyName || "FLAX COURIERS").toUpperCase(), x, y + height / 2, {
    maxWidth: width,
    baseline: "middle",
  });
}

function decodeSvgDataUrl(dataUrl) {
  const commaIndex = dataUrl.indexOf(",");
  const payload = dataUrl.slice(commaIndex + 1);
  if (!dataUrl.slice(0, commaIndex).includes(";base64")) {
    return decodeURIComponent(payload);
  }
  const bytes = Uint8Array.from(atob(payload), (character) => character.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

const logoDataUrlCache = new Map();

async function getLogoDataUrl(source) {
  if (source.startsWith("data:image/")) return source;
  if (logoDataUrlCache.has(source)) return logoDataUrlCache.get(source);

  const response = await fetch(source);
  if (!response.ok) throw new Error(`Could not load logo image (${response.status}).`);
  const blob = await response.blob();
  const dataUrl = await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(reader.error || new Error("Could not read the logo image."));
    reader.readAsDataURL(blob);
  });
  logoDataUrlCache.set(source, dataUrl);
  return dataUrl;
}

async function addBrandLogo(doc, settings, companyName, x, y, width, height) {
  const logo = settings.logoUrl || BRAND_LOGO_URL;

  try {
    const logoDataUrl = await getLogoDataUrl(logo);
    if (logoDataUrl.startsWith("data:image/svg+xml")) {
      const svg = decodeSvgDataUrl(logoDataUrl);
      const viewBox = /viewBox=["']\s*[\d.-]+\s+[\d.-]+\s+([\d.]+)\s+([\d.]+)\s*["']/i.exec(svg);
      const svgWidth = viewBox ? Number(viewBox[1]) : width;
      const svgHeight = viewBox ? Number(viewBox[2]) : height;
      const scale = Math.min(width / svgWidth, height / svgHeight);
      const imageWidth = svgWidth * scale;
      const imageHeight = svgHeight * scale;
      await doc.addSvgAsImage(
        svg,
        x + (width - imageWidth) / 2,
        y + (height - imageHeight) / 2,
        imageWidth,
        imageHeight
      );
      return;
    }

    const dimensions = doc.getImageProperties(logoDataUrl);
    const scale = Math.min(width / dimensions.width, height / dimensions.height);
    const imageWidth = dimensions.width * scale;
    const imageHeight = dimensions.height * scale;
    doc.addImage(
      logoDataUrl,
      x + (width - imageWidth) / 2,
      y + (height - imageHeight) / 2,
      imageWidth,
      imageHeight
    );
  } catch (error) {
    console.error("Could not render the configured company logo:", error);
    drawTextLogo(doc, companyName, x, y, width, height, settings);
  }
}

function drawMinimalAWB(doc, shipment, settings, barcodeDataUrl, top = 4) {
  const companyName = settings.companyName || "Flax Couriers";
  const trackingId = shipment.id || shipment.trackingId || "-";
  const codAmount = Number(shipment.codAmount || String(shipment.cod || "").replace(/[^\d.-]/g, "")) || 0;
  const pageWidth = doc.internal.pageSize.getWidth();
  const left = 7;
  const width = pageWidth - left * 2;
  const headerHeight = 20;
  const detailsHeaderHeight = 7;
  const detailsHeight = 32;
  const shipperHeaderHeight = 7;
  const shipperHeight = 11;
  const detailsY = top + headerHeight;
  const detailsBodyY = detailsY + detailsHeaderHeight;
  const shipperHeaderY = detailsBodyY + detailsHeight;
  const shipperBodyY = shipperHeaderY + shipperHeaderHeight;
  const paymentWidth = 40;
  const consigneeWidth = width - paymentWidth;
  const sourceInstructions = String(shipment.instructions || "");
  const productMatch = /\bProduct:\s*(.*?)(?:\.\s|$)/i.exec(sourceInstructions);
  const product = shipment.productDesc || (productMatch && productMatch[1]) || "—";
  const remarks = sourceInstructions
    .replace(/\bProduct:\s*.*?(?:\.\s|$)/i, "")
    .trim() || "—";
  const createdAt = Number(shipment.createdAt);
  const createdDate = Number.isFinite(createdAt) && createdAt > 0 ? new Date(createdAt) : null;
  const bookingDate = createdDate
    ? createdDate.toISOString().slice(0, 10)
    : shipment.bookingDate || shipment.date || new Date().toISOString().slice(0, 10);
  const originCity = shipment.originCity || shipment.senderCity || "—";
  const destinationCity = shipment.city || "—";
  const cell = (x, y, cellWidth, cellHeight) => {
    doc.setDrawColor(0);
    doc.setLineWidth(0.35);
    doc.rect(x, y, cellWidth, cellHeight);
  };
  const centeredText = (text, x, y, cellWidth, size, bold = false) => {
    doc.setFont("helvetica", bold ? "bold" : "normal");
    doc.setFontSize(size);
    doc.setTextColor(0, 0, 0);
    doc.text(String(text || "—"), x + cellWidth / 2, y, {
      align: "center",
      maxWidth: cellWidth - 3,
    });
  };

  return addBrandLogo(doc, settings, companyName, left + 2, top + 2, 34, 16).then(() => {
    const logoWidth = 37;
    const trackingWidth = 58;
    const originWidth = 54;
    const destinationWidth = width - logoWidth - trackingWidth - originWidth;
    const trackingX = left + logoWidth;
    const originX = trackingX + trackingWidth;
    const destinationX = originX + originWidth;
    const metadataY = top + 11;

    cell(left, top, logoWidth, headerHeight);
    cell(trackingX, top, trackingWidth, headerHeight);
    cell(originX, top, originWidth, headerHeight);
    cell(destinationX, top, destinationWidth, headerHeight);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.text("ID :", trackingX + 4, top + 5);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text(String(trackingId), trackingX + 13, top + 5, { maxWidth: trackingWidth - 16 });
    if (barcodeDataUrl) {
      doc.addImage(barcodeDataUrl, "PNG", trackingX + 4, top + 7, trackingWidth - 8, 11);
    } else {
      drawBarcodeFallback(doc, trackingX + 4, top + 7, trackingWidth - 8, 11);
    }

    const metadataHalf = originWidth / 2;
    doc.line(originX, metadataY, destinationX + destinationWidth, metadataY);
    doc.line(originX + metadataHalf, metadataY, originX + metadataHalf, top + headerHeight);
    doc.line(destinationX + destinationWidth / 2, metadataY, destinationX + destinationWidth / 2, top + headerHeight);
    centeredText("Origin", originX, top + 4.5, originWidth, 8);
    centeredText(originCity, originX, top + 10, originWidth, 10, true);
    centeredText("Destination", destinationX, top + 4.5, destinationWidth, 8);
    centeredText(destinationCity, destinationX, top + 10, destinationWidth, 10, true);
    centeredText("Date", originX, metadataY + 3.5, metadataHalf, 7);
    centeredText(bookingDate, originX, metadataY + 8, metadataHalf, 8, true);
    centeredText("Type", originX + metadataHalf, metadataY + 3.5, metadataHalf, 7);
    centeredText(codAmount > 0 ? "COD" : "Non COD", originX + metadataHalf, metadataY + 8, metadataHalf, 8, true);
    const destinationHalf = destinationWidth / 2;
    centeredText("Piece", destinationX, metadataY + 3.5, destinationHalf, 7);
    centeredText(`${shipment.pieces || 1} Pcs`, destinationX, metadataY + 8, destinationHalf, 8, true);
    centeredText("Weight", destinationX + destinationHalf, metadataY + 3.5, destinationHalf, 7);
    centeredText(`${shipment.weight || 1} Kg`, destinationX + destinationHalf, metadataY + 8, destinationHalf, 8, true);

    cell(left, detailsY, consigneeWidth, detailsHeaderHeight);
    cell(left + consigneeWidth, detailsY, paymentWidth, detailsHeaderHeight);
    centeredText("Consignee Details", left, detailsY + 5, consigneeWidth, 9);
    centeredText("Payment Details", left + consigneeWidth, detailsY + 5, paymentWidth, 9);
    cell(left, detailsBodyY, consigneeWidth, detailsHeight);
    cell(left + consigneeWidth, detailsBodyY, paymentWidth, detailsHeight);

    const textX = left + 1.5;
    const textWidth = consigneeWidth - 3;
    const consignee = shipment.cust || shipment.recipient || shipment.receiverName || "—";
    const addressLines = doc.splitTextToSize(`Address: ${shipment.receiverAddress || "—"}`, textWidth);
    doc.setTextColor(0, 0, 0);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.text(`Name: ${consignee}`, textX, detailsBodyY + 5, { maxWidth: textWidth });
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.text(addressLines.slice(0, 2), textX, detailsBodyY + 9);
    doc.text(`Mobile: ${shipment.receiverPhone || "—"}`, textX, detailsBodyY + 17);
    doc.text(`City: ${destinationCity}`, textX, detailsBodyY + 21);

    const paymentX = left + consigneeWidth;
    if (barcodeDataUrl) {
      doc.addImage(barcodeDataUrl, "PNG", paymentX + 7, detailsBodyY + 3, paymentWidth - 14, 8);
    } else {
      drawBarcodeFallback(doc, paymentX + 7, detailsBodyY + 3, paymentWidth - 14, 8);
    }
    centeredText("Amount Payable", paymentX, detailsBodyY + 16, paymentWidth, 8);
    centeredText(`Rs ${codAmount.toLocaleString()}/-`, paymentX, detailsBodyY + 22, paymentWidth, 10, true);
    centeredText(codAmount > 0 ? "Cash on Delivery" : "Prepaid", paymentX, detailsBodyY + 28, paymentWidth, 8);

    cell(left, shipperHeaderY, width, shipperHeaderHeight);
    centeredText("Shipper Details / Return Address", left, shipperHeaderY + 5, width, 9);
    cell(left, shipperBodyY, width, shipperHeight);
    centeredText(shipment.sender || companyName, left, shipperBodyY + 4, width, 9, true);
    centeredText(
      `${shipment.senderAddress || shipment.returnAddress || "—"}  Mobile: ${shipment.senderPhone || "—"}`,
      left,
      shipperBodyY + 9,
      width,
      7.5
    );
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. AIR WAYBILL (ONE COPY PER PARCEL)
// ─────────────────────────────────────────────────────────────────────────────
function drawSingleAWBBlock(doc, startY, shipment, settings, qrDataUrl, barcodeDataUrl) {
  const companyName = (settings.companyName || "FLAX COURIER").toUpperCase();
  const trackingId = (shipment.id || "FLX93820428").toUpperCase();
  const serviceType = (shipment.serviceType || "OVERNIGHT").toUpperCase();
  const codNum = parseInt((shipment.cod || "0").replace(/[^\d]/g, "")) || 0;
  const hasCOD = codNum > 0;
  const codLabel = hasCOD ? "COD PARCEL" : "NON-COD PARCEL";
  const codFormatted = codNum > 0 ? `PKR ${codNum.toLocaleString()}` : "PKR 0";

  const M = 6; // Margin Left (mm)
  const CW = 198; // Total width (mm)
  let Y = startY;

  // ── 1. HEADER (Logo on left, Big Service Title in Center) ──
  doc.setDrawColor(0);
  doc.setLineWidth(0.5);
  doc.line(M, Y, M + CW, Y);

  // Logo (Left side)
  doc.setFillColor(10, 35, 66); // Navy accent
  doc.rect(M, Y + 1, 48, 16, "F");
  doc.setTextColor(244, 196, 48); // Yellow
  doc.setFont("helvetica", "bold");
  doc.setFontSize(15);
  doc.text("FLAX", M + 3, Y + 8);
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(10);
  doc.text("COURIERS", M + 3, Y + 12.5);
  doc.setFontSize(5.5);
  doc.setFont("helvetica", "normal");
  doc.text("There for You", M + 3, Y + 15.5);

  // Title: OVERNIGHT / COD PARCEL
  doc.setTextColor(0, 0, 0);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(24);
  const titleW = doc.getTextWidth(serviceType);
  doc.text(serviceType, M + 48 + (CW - 48) / 2 - titleW / 2, Y + 9);

  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  const subW = doc.getTextWidth(codLabel);
  doc.text(codLabel, M + 48 + (CW - 48) / 2 - subW / 2, Y + 14.5);

  Y += 17;

  // ── 2. THREE-COLUMN MAIN GRID (46mm tall) ──
  const C1W = 58;
  const C2W = 34;
  const C3W = CW - C1W - C2W; // 106mm
  const C1X = M;
  const C2X = M + C1W;
  const C3X = M + C1W + C2W;

  const GRID_H = 46;
  drawRect(doc, C1X, Y, C1W, GRID_H);
  drawRect(doc, C2X, Y, C2W, GRID_H);
  drawRect(doc, C3X, Y, C3W, GRID_H);

  // --- Col 1: COD Amount & Consignee Info ---
  doc.setFillColor(0, 0, 0);
  doc.rect(C1X, Y, C1W, 5.5, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.text("COD AMOUNT", C1X + 2, Y + 4);

  doc.setTextColor(0, 0, 0);
  let cy = Y + 9;
  doc.setFontSize(7);
  doc.setFont("helvetica", "bold");
  doc.text("Consignee :", C1X + 2, cy);
  doc.setFont("helvetica", "normal");
  doc.text(shipment.cust || "MIAN ZEESHAN", C1X + 17, cy);

  cy += 4;
  doc.setFont("helvetica", "bold");
  doc.text("Contact    :", C1X + 2, cy);
  doc.setFont("helvetica", "normal");
  doc.text(shipment.receiverPhone || "03001015516", C1X + 17, cy);

  cy += 4.5;
  doc.setFont("helvetica", "bold");
  doc.text("Destination:", C1X + 2, cy);
  doc.setFontSize(11);
  doc.text((shipment.city || "FAISALABAD").toUpperCase(), C1X + 18, cy);

  cy += 5;
  doc.setFontSize(7);
  doc.setFont("helvetica", "bold");
  doc.text("Hub        :", C1X + 2, cy);
  cy += 3.5;
  doc.text("Area       :", C1X + 2, cy);

  // Barcode in Col 1
  if (barcodeDataUrl) {
    doc.addImage(barcodeDataUrl, "PNG", C1X + 2, Y + 31, C1W - 4, 7);
  } else {
    drawBarcodeFallback(doc, C1X + 2, Y + 31, C1W - 4, 7);
  }

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.text(codFormatted, C1X + 2, Y + 43);

  // --- Col 2: Real Scannable QR Codes ---
  doc.setFont("helvetica", "bold");
  doc.setFontSize(6.5);
  doc.text("Scan To Pay", C2X + (C2W - doc.getTextWidth("Scan To Pay")) / 2, Y + 4.5);

  if (qrDataUrl) {
    doc.addImage(qrDataUrl, "PNG", C2X + (C2W - 17) / 2, Y + 5.5, 17, 17);
    doc.addImage(qrDataUrl, "PNG", C2X + (C2W - 17) / 2, Y + 25, 17, 17);
  }

  // --- Col 3: Large Real Barcode + Spaced Text + Order Info Grid ---
  if (barcodeDataUrl) {
    doc.addImage(barcodeDataUrl, "PNG", C3X + 6, Y + 3, C3W - 12, 17);
  } else {
    drawBarcodeFallback(doc, C3X + 6, Y + 3, C3W - 12, 17);
  }

  const spacedId = trackingId.split("").join(" ");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  const spW = doc.getTextWidth(spacedId);
  doc.text(spacedId, C3X + (C3W - spW) / 2, Y + 23.5);

  doc.setDrawColor(0);
  doc.line(C3X, Y + 25, C3X + C3W, Y + 25);

  // Info Grid inside Col 3
  const dtX = C3X + 2;
  let dY = Y + 28.5;
  doc.setFontSize(6.5);

  const todayStr = new Date().toISOString().slice(0, 10);
  const printLeft = (k, v) => {
    doc.setFont("helvetica", "bold");
    doc.text(k, dtX, dY);
    doc.text(":", dtX + 15, dY);
    doc.setFont("helvetica", "normal");
    doc.text(v, dtX + 17, dY);
    dY += 3.2;
  };

  printLeft("Tracking#", trackingId);
  printLeft("Order ID", "0166");
  printLeft("Book Date", todayStr);
  printLeft("Print Date", todayStr);
  printLeft("Origin City", (shipment.senderCity || "KARACHI").toUpperCase());

  let rY = Y + 28.5;
  const printRight = (k, v) => {
    doc.setFont("helvetica", "bold");
    doc.text(k, dtX + 54, rY);
    doc.text(":", dtX + 65, rY);
    doc.setFont("helvetica", "normal");
    doc.text(v, dtX + 67, rY);
    rY += 3.5;
  };

  printRight("Pieces", `${shipment.pieces || 1} PCS (1/1)`);
  printRight("Weight", `${((parseFloat(shipment.weight) || 1.0) * 1000).toFixed(2)} (g)`);
  printRight("User", "941748");

  Y += 46;

  // ── 3. ADDRESS (13mm tall) ──
  drawRect(doc, M, Y, CW, 13);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  doc.text("Address:", M + 2, Y + 4.5);
  doc.setFont("helvetica", "normal");
  const addrStr = shipment.receiverAddress || "Sargodha Road Dawood Textile k pass Ghafoor Town 2";
  const wrappedAddr = doc.splitTextToSize(addrStr, 175);
  doc.text(wrappedAddr, M + 16, Y + 4.5);

  Y += 13;

  // ── 4. BUSINESS ADDRESS (11mm tall) ──
  drawRect(doc, M, Y, CW, 11);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  doc.text("Business Address:", M + 2, Y + 4.5);
  doc.setFont("helvetica", "normal");
  const bizStr = shipment.senderAddress || "HOUSE NUMBER 755 AREA 37 B LANDHI NUMBER 1 KARACHI";
  const wrappedBiz = doc.splitTextToSize(bizStr, 165);
  doc.text(wrappedBiz, M + 28, Y + 4.5);

  Y += 11;

  // ── 5. SHIPPER AC / NAME & CONTACT (7.5mm tall) ──
  const HALF = CW / 2;
  drawRect(doc, M, Y, HALF, 7.5);
  drawRect(doc, M + HALF, Y, HALF, 7.5);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  doc.text("Shipper AC / Name:", M + 2, Y + 5);
  doc.setFont("helvetica", "normal");
  doc.text(`575181 / ${companyName}`, M + 30, Y + 5);

  doc.setFont("helvetica", "bold");
  doc.text("Shipper Contact:", M + HALF + 2, Y + 5);
  doc.setFont("helvetica", "normal");
  doc.text(shipment.senderPhone || "0341-7901147", M + HALF + 26, Y + 5);

  Y += 7.5;

  // ── 6. SHIPPER ADDRESS (6.5mm tall) ──
  drawRect(doc, M, Y, CW, 6.5);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  doc.text("Shipper Address:", M + 2, Y + 4.5);
  doc.setFont("helvetica", "normal");
  doc.text(bizStr, M + 26, Y + 4.5);

  Y += 6.5;

  // ── 7. RETURN ADDRESS (6.5mm tall) ──
  drawRect(doc, M, Y, CW, 6.5);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  doc.text("Return Address:", M + 2, Y + 4.5);
  doc.setFont("helvetica", "normal");
  doc.text(bizStr.toLowerCase(), M + 24, Y + 4.5);

  Y += 6.5;

  // ── 8. SPECIAL INSTRUCTION (6.5mm tall) ──
  drawRect(doc, M, Y, CW, 6.5);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  doc.text("Special Instruction:", M + 2, Y + 4.5);
  doc.setFont("helvetica", "normal");
  doc.text(shipment.instructions || "Need Urgently Products from Fashion Shooter", M + 28, Y + 4.5);

  Y += 6.5;

  // ── 9. FOOTER BAR (6mm tall) ──
  drawRect(doc, M, Y, CW, 6);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.text("www.flaxcouriers.com", M + 8, Y + 4);

  const waText = "WhatsApp: 0345 536 7273";
  const waW = doc.getTextWidth(waText);
  doc.text(waText, M + CW / 2 - waW / 2, Y + 4);

  doc.text("UAN: 111 300 786", M + CW - 32, Y + 4);
}

async function createAWBDocument(shipments, settings, sheetLayout = false) {
  const pageFormat = "a4";
  const orientation = "portrait";
  const labelsPerPage = sheetLayout ? 3 : 1;
  const doc = new jsPDF({ orientation, unit: "mm", format: pageFormat });
  for (const [index, shipment] of shipments.entries()) {
    const positionOnPage = index % labelsPerPage;
    if (index > 0 && positionOnPage === 0) {
      doc.addPage(pageFormat, orientation);
    }
    const trackingId = shipment.id || shipment.trackingId || `shipment-${index + 1}`;
    const barcodeDataUrl = getBarcodeDataURL(trackingId);
    const top = 11 + positionOnPage * 99;
    await drawMinimalAWB(doc, shipment, settings, barcodeDataUrl, top);
  }
  return doc;
}

export async function generateAWB(shipment = {}, settings = {}) {
  try {
    const trackingId = shipment.id || shipment.trackingId || "shipment";
    const doc = await createAWBDocument([shipment], settings);
    doc.save(`AWB_${trackingId}.pdf`);
  } catch (err) {
    console.error("Critical generateAWB error:", err);
    alert("Could not generate PDF: " + err.message);
  }
}

export async function generateAWBs(shipments = [], settings = {}) {
  if (shipments.length === 0) {
    alert("Select at least one parcel to download AWBs.");
    return;
  }

  try {
    const doc = await createAWBDocument(shipments, settings, true);
    doc.save(`AWBs_Selected_${new Date().toISOString().slice(0, 10)}.pdf`);
  } catch (err) {
    console.error("Critical generateAWBs error:", err);
    alert("Could not generate AWBs: " + err.message);
  }
}

// Barcode-only label sheet: QR/barcode + consignee name, many per page
export function generateBarcodeSheet(shipments = [], settings = {}) {
  if (!shipments.length) {
    alert("No parcels to print.");
    return;
  }
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const cols = 4;
  const rows = 6;
  const perPage = cols * rows;
  const margin = 8;
  const gap = 3;
  const cellW = (pageWidth - margin * 2 - gap * (cols - 1)) / cols;
  const cellH = (pageHeight - margin * 2 - gap * (rows - 1)) / rows;

  shipments.forEach((shipment, index) => {
    const pos = index % perPage;
    if (index > 0 && pos === 0) doc.addPage();
    const col = pos % cols;
    const row = Math.floor(pos / cols);
    const x = margin + col * (cellW + gap);
    const y = margin + row * (cellH + gap);

    doc.setDrawColor(170, 178, 190);
    doc.setLineWidth(0.25);
    doc.rect(x, y, cellW, cellH);

    const name = shipment.cust || shipment.recipient || shipment.receiverName || "—";
    const id = shipment.id || shipment.trackingId || "";

    doc.setFont("helvetica", "bold");
    doc.setFontSize(7);
    doc.setTextColor(10, 35, 66);
    doc.text(String(name).slice(0, 26), x + cellW / 2, y + 5.5, { align: "center", maxWidth: cellW - 3 });

    const barcode = getBarcodeDataURL(id);
    const barcodeY = y + 8;
    const barcodeH = cellH - 17;
    if (barcode) {
      doc.addImage(barcode, "PNG", x + 3, barcodeY, cellW - 6, barcodeH);
    } else {
      drawBarcodeFallback(doc, x + 3, barcodeY, cellW - 6, barcodeH);
    }

    doc.setFont("helvetica", "normal");
    doc.setFontSize(5.5);
    doc.setTextColor(60, 70, 82);
    doc.text(id, x + cellW / 2, y + cellH - 2.5, { align: "center" });
  });

  doc.save(`Barcode_Labels_${new Date().toISOString().slice(0, 10)}.pdf`);
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. LOAD SHEET (PORTRAIT)
// ─────────────────────────────────────────────────────────────────────────────
export async function generateLoadSheet(shipments = [], settings = {}) {
  try {
    if (!shipments.length) {
      alert("There are no parcels to include in this load sheet.");
      return;
    }

    const companyName = settings.companyName || "Flax Couriers";
    const now = new Date();
    const challanNumber = Math.floor(7000000 + Math.random() * 999999);
    const amount = (shipment) => {
      const raw = shipment.codAmount ?? shipment.cod ?? 0;
      return Number(String(raw).replace(/[^\d.-]/g, "")) || 0;
    };
    const totalPieces = shipments.reduce((sum, shipment) => sum + (Number(shipment.pieces) || 1), 0);
    const totalCOD = shipments.reduce((sum, shipment) => sum + amount(shipment), 0);

    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 12;
    const contentWidth = pageWidth - margin * 2;
    const rowHeight = 8;
    const columns = [
      { title: "#", width: 8 },
      { title: "Tracking ID", width: 34 },
      { title: "Destination", width: 24 },
      { title: "Consignee", width: 38 },
      { title: "Phone", width: 28 },
      { title: "Pieces", width: 14 },
      { title: "Weight", width: 16 },
      { title: "COD (PKR)", width: 30 },
    ];

    const truncate = (text, maxWidth) => {
      let output = String(text || "-");
      while (output.length > 1 && doc.getTextWidth(output) > maxWidth) {
        output = `${output.slice(0, -2)}...`;
      }
      return output;
    };

    const drawPageHeader = async (pageNumber) => {
      await addBrandLogo(doc, settings, companyName, margin, 10, 48, 18);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(18);
      doc.setTextColor(10, 35, 66);
      doc.text("LOAD SHEET", margin + 56, 18);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8.5);
      doc.setTextColor(100, 110, 122);
      doc.text(`Challan ${challanNumber}  |  ${now.toLocaleString()}`, pageWidth - margin, 16, { align: "right" });
      doc.text(`Page ${pageNumber}`, pageWidth - margin, 22, { align: "right" });

      doc.setFillColor(246, 248, 250);
      const summaryY = 34;
      doc.roundedRect(margin, summaryY, contentWidth, 14, 2, 2, "F");
      doc.setTextColor(10, 35, 66);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.text(`Parcels  ${shipments.length}`, margin + 5, summaryY + 9);
      doc.text(`Pieces  ${totalPieces}`, margin + 75, summaryY + 9);
      doc.text(`Total COD  PKR ${totalCOD.toLocaleString()}`, pageWidth - margin - 5, summaryY + 9, { align: "right" });

      const headerY = 50;
      doc.setFillColor(240, 243, 247);
      doc.rect(margin, headerY - 5, contentWidth, 9, "F");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(7.5);
      doc.setTextColor(70, 80, 92);
      let x = margin;
      columns.forEach((column) => {
        doc.text(column.title, x + 1.5, headerY);
        x += column.width;
      });
      return headerY + 7;
    };

    let y = await drawPageHeader(1);
    let pageNumber = 1;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);

    for (let index = 0; index < shipments.length; index += 1) {
      if (y + rowHeight > pageHeight - 47) {
        doc.addPage();
        pageNumber += 1;
        y = await drawPageHeader(pageNumber);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(7.5);
      }

      const shipment = shipments[index];
      const values = [
        String(index + 1),
        shipment.id || shipment.trackingId,
        shipment.city,
        shipment.cust || shipment.recipient || shipment.receiverName,
        shipment.receiverPhone || shipment.phone || "—",
        shipment.pieces || 1,
        shipment.weight || 0,
        amount(shipment).toLocaleString(),
      ];
      let x = margin;
      doc.setDrawColor(226, 230, 235);
      doc.line(margin, y + rowHeight - 1, pageWidth - margin, y + rowHeight - 1);
      values.forEach((cell, columnIndex) => {
        const column = columns[columnIndex];
        doc.setTextColor(35, 45, 58);
        doc.text(truncate(cell, column.width - 3), x + 1.5, y + 4.5);
        x += column.width;
      });
      y += rowHeight;
    }

    if (y + 22 > pageHeight - 8) {
      doc.addPage();
      pageNumber += 1;
      y = await drawPageHeader(pageNumber);
    }
    y += 3;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(10, 35, 66);
    doc.text(`Total parcels: ${shipments.length}`, margin, y);
    doc.text(`Total pieces: ${totalPieces}`, margin + 75, y);
    doc.text(`Total COD: PKR ${totalCOD.toLocaleString()}`, pageWidth - margin, y, { align: "right" });

    const signatureY = Math.min(pageHeight - 10, y + 18);
    doc.setDrawColor(180, 188, 198);
    doc.line(margin, signatureY, margin + 60, signatureY);
    doc.line(pageWidth - margin - 60, signatureY, pageWidth - margin, signatureY);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(110, 120, 132);
    doc.text("Prepared by", margin, signatureY + 4);
    doc.text("Received by", pageWidth - margin - 60, signatureY + 4);

    doc.save(`Flax_LoadSheet_${now.toISOString().slice(0, 10)}.pdf`);
  } catch (err) {
    console.error("Critical generateLoadSheet error:", err);
    alert("Could not generate Load Sheet: " + err.message);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. INVOICE PDF
// ─────────────────────────────────────────────────────────────────────────────
export async function generateInvoicePDF(invoice, settings = {}) {
  const companyName = settings.companyName || "Flax Couriers";
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const left = 15;
  const right = 195;
  const isSettlement = Boolean(invoice.shipperId);
  const cod = Number(invoice.totalCODAmount) || 0;
  const charges = Number(invoice.deliveryCharges) || 0;
  const net = Number(invoice.netPayable ?? invoice.totalCODAmount - invoice.deliveryCharges) || 0;

  await addBrandLogo(doc, settings, companyName, left, 12, 58, 20);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.setTextColor(10, 35, 66);
  doc.text("INVOICE", right, 17, { align: "right" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(100, 110, 122);
  doc.text(`No. ${invoice.id || "-"}`, right, 25, { align: "right" });
  doc.text(`Date ${invoice.date || new Date().toLocaleDateString()}`, right, 31, { align: "right" });
  doc.text(`Status ${(invoice.status || "Pending").toUpperCase()}`, right, 37, { align: "right" });

  doc.setDrawColor(220, 225, 230);
  doc.line(left, 45, right, 45);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(100, 110, 122);
  doc.text("BILLED TO", left, 58);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(10, 35, 66);
  doc.text(invoice.cust || "Valued Client", left, 66);
  if (invoice.shipperAccount) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(100, 110, 122);
    doc.text(`Account #${invoice.shipperAccount}`, left, 73);
  }

  doc.setFillColor(246, 248, 250);
  doc.rect(left, 87, right - left, 9, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(80, 90, 102);
  doc.text("DESCRIPTION", left + 3, 93);
  doc.text("QTY", 135, 93, { align: "right" });
  doc.text("AMOUNT (PKR)", right - 3, 93, { align: "right" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(35, 45, 58);
  if (isSettlement) {
    doc.text("Delivered parcels - COD collected", left + 3, 108);
    doc.text(String(invoice.deliveredParcelCount || 0), 135, 108, { align: "right" });
    doc.text(cod.toLocaleString(), right - 3, 108, { align: "right" });
    doc.text("Delivery charges deduction", left + 3, 120);
    doc.text("-", 135, 120, { align: "right" });
    doc.text(`- ${charges.toLocaleString()}`, right - 3, 120, { align: "right" });
  } else {
    doc.text(`Courier services - ${invoice.id || "Invoice"}`, left + 3, 108);
    doc.text("1", 135, 108, { align: "right" });
    doc.text(invoice.amount || "Rs 0", right - 3, 108, { align: "right" });
  }

  doc.setDrawColor(220, 225, 230);
  doc.line(left, 130, right, 130);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(10, 35, 66);
  doc.text(isSettlement && net < 0 ? "Amount due from shipper" : "Net payable", left + 3, 143);
  doc.setTextColor(isSettlement && net < 0 ? 185 : 10, isSettlement && net < 0 ? 28 : 35, isSettlement && net < 0 ? 28 : 66);
  doc.text(
    isSettlement ? `PKR ${Math.abs(net).toLocaleString()}` : (invoice.amount || "Rs 0"),
    right - 3,
    143,
    { align: "right" }
  );

  doc.setDrawColor(220, 225, 230);
  doc.line(left, 274, right, 274);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(110, 120, 132);
  doc.text(companyName, left, 281);
  doc.text("Thank you for shipping with us.", right, 281, { align: "right" });

  doc.save(`Invoice_${invoice.id}.pdf`);
}

export async function generateShipmentInvoicePDF(invoiceRequest, settings = {}) {
  const { date, shipments = [], shipperName = "Shipper", shipperAccount = "" } = invoiceRequest;
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const companyName = settings.companyName || "Flax Couriers";
  const invoiceDate = new Date(`${date}T00:00:00`).toLocaleDateString();
  const invoiceNumber = `INV-${String(date).replace(/-/g, "")}-${shipperAccount || "SHIPPER"}`;
  const statusCounts = shipments.reduce((counts, shipment) => {
    const status = String(shipment.status || "Unknown").trim();
    counts[status] = (counts[status] || 0) + 1;
    return counts;
  }, {});

  await addBrandLogo(doc, settings, companyName, 15, 10, 56, 20);
  doc.setTextColor(10, 35, 66);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text("PARCEL SUMMARY", 195, 17, { align: "right" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(100, 110, 122);
  doc.text(`Invoice ${invoiceNumber}`, 195, 24, { align: "right" });
  doc.text(`Date ${invoiceDate}`, 195, 30, { align: "right" });
  doc.setDrawColor(220, 225, 230);
  doc.line(15, 38, 195, 38);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(100, 110, 122);
  doc.text(`Shipper  ${shipperName}${shipperAccount ? `  |  Account #${shipperAccount}` : ""}`, 15, 50);
  doc.text(`Parcels  ${shipments.length}`, 15, 58);

  let y = 71;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(100, 110, 122);
  doc.text("STATUS SUMMARY", 15, y);
  y += 6;
  doc.setFont("helvetica", "normal");
  Object.entries(statusCounts).forEach(([status, count], index) => {
    const x = 15 + (index % 4) * 45;
    const rowY = y + Math.floor(index / 4) * 6;
    doc.setTextColor(35, 45, 58);
    doc.text(`${status}: ${count}`, x, rowY);
  });
  y += Math.ceil(Object.keys(statusCounts).length / 4) * 6 + 8;

  const drawTableHeader = () => {
    doc.setFillColor(240, 244, 248);
    doc.rect(15, y - 5, 180, 9, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.setTextColor(70, 80, 92);
    doc.text("Tracking ID", 17, y);
    doc.text("Consignee", 55, y);
    doc.text("City", 105, y);
    doc.text("Status", 132, y);
    doc.text("COD", 178, y);
    doc.setFont("helvetica", "normal");
    y += 9;
  };

  drawTableHeader();
  shipments.forEach((shipment) => {
    if (y > 280) {
      doc.addPage();
      y = 20;
      drawTableHeader();
    }

    doc.setFontSize(8);
    doc.text(String(shipment.id || "-").slice(0, 20), 17, y);
    doc.text(String(shipment.cust || "-").slice(0, 26), 55, y);
    doc.text(String(shipment.city || "-").slice(0, 14), 105, y);
    doc.text(String(shipment.status || "Unknown").slice(0, 22), 132, y);
    doc.text(String(shipment.cod || "Rs 0").slice(0, 16), 178, y);
    y += 7;
  });

  const fileShipper = String(shipperAccount || shipperName)
    .replace(/[^\w-]/g, "_");
  doc.save(`Invoice_${date}_${fileShipper}.pdf`);
}

export async function generateDeliverySheetPDF(sheet = {}, settings = {}) {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const companyName = settings.companyName || "Flax Couriers";
  const parcels = sheet.parcels || [];
  const width = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const left = 12;
  const right = width - 12;
  const contentWidth = right - left;
  const parseAmount = (value) => Number(String(value || 0).replace(/[^\d.-]/g, "")) || 0;
  const totalCOD = parcels.reduce((sum, parcel) => sum + (Number(parcel.codAmount) || parseAmount(parcel.cod)), 0);
  const deliveredCOD = parcels.reduce((sum, parcel) => {
    if (parcel.status === "Delivered") return sum + (Number(parcel.codAmount) || 0);
    if (parcel.status === "Partial Delivery") return sum + (Number(parcel.receivedAmount) || 0);
    return sum;
  }, 0);
  const balance = Number.isFinite(Number(sheet.balance))
    ? Number(sheet.balance)
    : deliveredCOD - Number(sheet.totalReceivedAmount || 0) - Number(sheet.totalFuelCharges || 0);
  const columns = [
    { title: "CN #", x: left + 1 },
    { title: "Consignee", x: left + 31 },
    { title: "Status", x: left + 79 },
    { title: "COD", x: left + 124 },
    { title: "Received", x: left + 155 },
  ];
  const rowHeight = 17;
  const truncate = (text, maxWidth) => {
    let output = String(text || "—");
    while (output.length > 1 && doc.getTextWidth(output) > maxWidth) {
      output = `${output.slice(0, -2)}...`;
    }
    return output;
  };
  let pageNumber = 1;
  const drawPageHeader = async () => {
    doc.setFillColor(10, 35, 66);
    doc.rect(0, 0, width, 31, "F");
    await addBrandLogo(doc, settings, companyName, left, 2, 40, 27);
    doc.setTextColor(244, 196, 48);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.text(companyName.toUpperCase(), left + 48, 12, { maxWidth: width - left - 60 });
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(10);
    doc.text(`DELIVERY SHEET · ${sheet.id || "UNSAVED"}`, left + 48, 22);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.text(`Page ${pageNumber}`, right, 27, { align: "right" });

    doc.setTextColor(10, 35, 66);
    doc.setFontSize(8);
    doc.text(`Rider: ${sheet.riderName || "—"}  ·  ${sheet.riderPhone || ""}`, left, 40);
    doc.text(`${sheet.branch || "—"}  ·  ${sheet.area || "—"}  ·  ${sheet.date || "—"}`, left, 46);
    doc.setFontSize(7.5);
    doc.text(`${parcels.length} parcels  ·  COD Rs ${totalCOD.toLocaleString()}  ·  Balance Rs ${balance.toLocaleString()}`, left, 52);

    doc.setFillColor(240, 244, 248);
    doc.rect(left, 58, contentWidth, 8, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    columns.forEach((column) => doc.text(column.title, column.x, 63.5));
    doc.setFont("helvetica", "normal");
    return 68;
  };

  let y = await drawPageHeader();
  for (const [index, parcel] of parcels.entries()) {
    if (y + rowHeight > pageHeight - 12) {
      doc.addPage();
      pageNumber += 1;
      y = await drawPageHeader();
    }
    if (index % 2 === 1) {
      doc.setFillColor(248, 250, 252);
      doc.rect(left, y - 2, contentWidth, rowHeight, "F");
    }

    const values = [
      parcel.trackingId || parcel.shipmentId || "—",
      parcel.cust || "Consignee",
      parcel.status || "Out for Delivery",
      `Rs ${Number(parcel.codAmount || parseAmount(parcel.cod)).toLocaleString()}`,
      `Rs ${Number(parcel.receivedAmount || 0).toLocaleString()}`,
    ];
    const maxWidths = [28, 46, 43, 29, 29];
    doc.setFontSize(7.5);
    values.forEach((value, valueIndex) => {
      doc.text(truncate(value, maxWidths[valueIndex]), columns[valueIndex].x, y + 3);
    });
    const details = [
      parcel.receiverPhone && `Phone: ${parcel.receiverPhone}`,
      parcel.city && `City: ${parcel.city}`,
      `Payment: ${parcel.paymentStatus || "Unpaid"}`,
      parcel.reason && `Reason: ${parcel.reason}`,
    ].filter(Boolean).join("  |  ") || "—";
    doc.setFontSize(6.5);
    doc.text(doc.splitTextToSize(details, contentWidth - 3), left + 1, y + 8);
    doc.setDrawColor(230, 234, 239);
    doc.line(left, y + rowHeight - 1, right, y + rowHeight - 1);
    y += rowHeight;
  }

  const safeId = String(sheet.id || "Delivery_Sheet").replace(/[^\w-]/g, "_");
  doc.save(`${safeId}.pdf`);
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. COD STATEMENT PDF
// ─────────────────────────────────────────────────────────────────────────────
export async function generateCODStatement(codRows = [], stats = {}, settings = {}) {
  const companyName = settings.companyName || "Flax Couriers";
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

  doc.setFillColor(10, 35, 66);
  doc.rect(0, 0, 210, 35, "F");
  await addBrandLogo(doc, settings, companyName, 15, 4, 42, 27);
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text("CASH ON DELIVERY SETTLEMENT STATEMENT", 64, 21);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.text(`Date: ${new Date().toLocaleDateString()}`, 195, 21, { align: "right" });

  doc.setTextColor(10, 35, 66);
  doc.setFontSize(10);
  doc.text(`COD Pending: ${stats.codPending || "Rs 0"}`, 15, 48);
  doc.text(`COD Released: ${stats.codCollected || "Rs 0"}`, 85, 48);
  doc.text(`Total Records: ${codRows.length}`, 160, 48);

  doc.setFillColor(240, 244, 248);
  doc.rect(15, 55, 180, 8, "F");
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.text("Tracking ID", 18, 61);
  doc.text("Customer", 55, 61);
  doc.text("Amount", 100, 61);
  doc.text("Delivery Status", 135, 61);
  doc.text("COD Status", 170, 61);

  doc.setFont("helvetica", "normal");
  let y = 70;
  codRows.forEach(r => {
    if (y > 270) { doc.addPage(); y = 20; }
    doc.text(r.id || "", 18, y);
    doc.text(r.cust || "", 55, y);
    doc.text(r.amount || "", 100, y);
    doc.text(r.deliveryStatus || "", 135, y);
    doc.text(r.status || "", 170, y);
    y += 8;
  });

  doc.save(`COD_Statement_${new Date().toISOString().slice(0, 10)}.pdf`);
}

// ─────────────────────────────────────────────────────────────────────────────
// 5. GENERIC REPORT PDF
// ─────────────────────────────────────────────────────────────────────────────
export async function generateReportPDF(reportType, shipments = [], settings = {}) {
  const companyName = (settings.companyName || "FLAX COURIERS").toUpperCase();
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const PW = 210;
  const PH = 297;
  const M = 12;
  const CW = PW - M * 2; // 186mm

  const reportTitles = {
    Daily: "DAILY SHIPMENT ACTIVITY REPORT",
    Weekly: "WEEKLY CONSIGNMENT OVERVIEW (7 DAYS)",
    Monthly: "MONTHLY CONSIGNMENT SUMMARY REPORT",
    Revenue: "FINANCIAL REVENUE & COD BREAKDOWN",
    Delivery_Performance: "DELIVERY PERFORMANCE & SLA METRICS",
    Failed_Deliveries: "FAILED DELIVERIES & UNDELIVERED PARCELS",
    Returned_Parcels: "RETURN TO SHIPPER (RTS) MANIFEST",
    City_Wise: "DESTINATION CITY DISTRIBUTION REPORT",
  };

  const titleText = reportTitles[reportType] || `${reportType.replace(/_/g, " ").toUpperCase()} REPORT`;

  // Calculate Summary Metrics
  const totalVolume = shipments.length;
  const deliveredCount = shipments.filter((s) => s.status === "Delivered").length;
  const inTransitCount = shipments.filter(
    (s) => ACTIVE_SHIPMENT_STATUSES.includes(s.status) && !RETURN_SHIPMENT_STATUSES.includes(s.status)
  ).length;
  const returnedCount = shipments.filter((s) => RETURN_SHIPMENT_STATUSES.includes(s.status)).length;
  let totalCodVal = 0;
  shipments.forEach((s) => {
    totalCodVal += parseInt((s.cod || "0").replace(/[^\d]/g, "")) || 0;
  });

  let Y = M;

  // 1. Header Banner (Navy Background)
  doc.setFillColor(10, 35, 66);
  doc.rect(M, Y, CW, 28, "F");

  await addBrandLogo(doc, settings, companyName, M + 4, Y + 3, 38, 22);

  // Report Title
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(255, 255, 255);
  doc.text(titleText, M + 55, Y + 12);

  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(200, 215, 235);
  doc.text(
    `Generated On: ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`,
    M + 55,
    Y + 18
  );
  doc.text(`Total Records: ${totalVolume} Consignments`, M + 55, Y + 23);

  Y += 33;

  // 2. Summary KPI Metric Boxes (3 Boxes Side-by-Side)
  const boxW = (CW - 8) / 3;

  // Box 1: Total Volume
  doc.setFillColor(245, 247, 250);
  doc.setDrawColor(220, 225, 230);
  doc.roundedRect(M, Y, boxW, 14, 2, 2, "FD");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  doc.setTextColor(100, 110, 120);
  doc.text("TOTAL VOLUME", M + 4, Y + 4.5);
  doc.setFontSize(11);
  doc.setTextColor(10, 35, 66);
  doc.text(`${totalVolume} Parcels`, M + 4, Y + 10.5);

  // Box 2: Delivered / Success
  doc.setFillColor(240, 253, 244);
  doc.setDrawColor(187, 247, 208);
  doc.roundedRect(M + boxW + 4, Y, boxW, 14, 2, 2, "FD");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  doc.setTextColor(22, 101, 52);
  doc.text("DELIVERED SUCCESS", M + boxW + 8, Y + 4.5);
  doc.setFontSize(11);
  doc.setTextColor(22, 163, 74);
  const rate = totalVolume > 0 ? Math.round((deliveredCount / totalVolume) * 100) : 0;
  doc.text(`${deliveredCount} (${rate}%)`, M + boxW + 8, Y + 10.5);

  // Box 3: Total COD Value
  doc.setFillColor(254, 252, 232);
  doc.setDrawColor(254, 240, 138);
  doc.roundedRect(M + (boxW + 4) * 2, Y, boxW, 14, 2, 2, "FD");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  doc.setTextColor(133, 77, 14);
  doc.text("TOTAL COD AMOUNT", M + (boxW + 4) * 2 + 4, Y + 4.5);
  doc.setFontSize(11);
  doc.setTextColor(180, 83, 9);
  doc.text(`PKR ${totalCodVal.toLocaleString()}`, M + (boxW + 4) * 2 + 4, Y + 10.5);

  Y += 19;

  // 3. Table Header & Data Columns
  let COLS = [
    { h: "Sr.", w: 10 },
    { h: "Tracking ID", w: 32 },
    { h: "Consignee Name", w: 42 },
    { h: "Destination City", w: 30 },
    { h: "COD Amount", w: 28 },
    { h: "Current Status", w: 44 },
  ];

  if (reportType === "City_Wise") {
    // City breakdown table
    const cityMap = {};
    shipments.forEach((s) => {
      const c = (s.city || "Karachi").toUpperCase();
      if (!cityMap[c]) cityMap[c] = { total: 0, delivered: 0, cod: 0 };
      cityMap[c].total += 1;
      if (s.status === "Delivered") cityMap[c].delivered += 1;
      cityMap[c].cod += parseInt((s.cod || "0").replace(/[^\d]/g, "")) || 0;
    });

    const cityRows = Object.keys(cityMap).map((c) => ({
      city: c,
      total: cityMap[c].total,
      delivered: cityMap[c].delivered,
      cod: cityMap[c].cod,
    }));

    COLS = [
      { h: "Sr.", w: 12 },
      { h: "City Name", w: 50 },
      { h: "Total Bookings", w: 38 },
      { h: "Delivered Count", w: 38 },
      { h: "Total COD Collected", w: 48 },
    ];

    // Render Table Header
    doc.setFillColor(10, 35, 66);
    doc.rect(M, Y, CW, 7, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);

    let xPos = M;
    COLS.forEach((col) => {
      doc.text(col.h, xPos + 2, Y + 4.5);
      xPos += col.w;
    });
    Y += 7;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    cityRows.forEach((r, idx) => {
      if (Y > PH - 20) {
        doc.addPage();
        Y = M;
      }
      if (idx % 2 === 1) {
        doc.setFillColor(248, 250, 252);
        doc.rect(M, Y, CW, 6.5, "F");
      }
      doc.setTextColor(0, 0, 0);
      doc.text(String(idx + 1), M + 2, Y + 4.5);
      doc.text(r.city, M + 14, Y + 4.5);
      doc.text(String(r.total), M + 64, Y + 4.5);
      doc.text(String(r.delivered), M + 102, Y + 4.5);
      doc.text(`PKR ${r.cod.toLocaleString()}`, M + 140, Y + 4.5);
      Y += 6.5;
    });
  } else {
    // Standard Consignment Table
    doc.setFillColor(10, 35, 66);
    doc.rect(M, Y, CW, 7, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);

    let xPos = M;
    COLS.forEach((col) => {
      doc.text(col.h, xPos + 2, Y + 4.5);
      xPos += col.w;
    });
    Y += 7;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);

    if (shipments.length === 0) {
      doc.setTextColor(120, 130, 140);
      doc.text("No consignment records found for this report criteria.", M + 4, Y + 6);
    } else {
      shipments.forEach((s, idx) => {
        if (Y > PH - 25) {
          doc.addPage();
          Y = M;
          // Re-draw header on new page
          doc.setFillColor(10, 35, 66);
          doc.rect(M, Y, CW, 7, "F");
          doc.setTextColor(255, 255, 255);
          doc.setFont("helvetica", "bold");
          let xP = M;
          COLS.forEach((col) => {
            doc.text(col.h, xP + 2, Y + 4.5);
            xP += col.w;
          });
          Y += 7;
          doc.setFont("helvetica", "normal");
        }

        if (idx % 2 === 1) {
          doc.setFillColor(248, 250, 252);
          doc.rect(M, Y, CW, 6.5, "F");
        }

        doc.setTextColor(0, 0, 0);
        doc.text(String(idx + 1), M + 2, Y + 4.5);
        doc.setFont("helvetica", "bold");
        doc.text(s.id || `FLX${idx}`, M + 12, Y + 4.5);
        doc.setFont("helvetica", "normal");
        doc.text(s.cust || "Walkin Consignee", M + 44, Y + 4.5);
        doc.text(s.city || "Karachi", M + 86, Y + 4.5);
        doc.text(s.cod || "Rs 0", M + 116, Y + 4.5);

        // Status coloring
        const st = s.status || "Booked";
        if (st === "Delivered") doc.setTextColor(22, 163, 74);
        else if (ACTIVE_SHIPMENT_STATUSES.includes(st)) doc.setTextColor(217, 119, 6);
        else if (FAILED_DELIVERY_STATUSES.includes(st) || RETURN_SHIPMENT_STATUSES.includes(st)) doc.setTextColor(220, 38, 38);
        else doc.setTextColor(37, 99, 235);

        doc.text(st, M + 144, Y + 4.5);
        Y += 6.5;
      });
    }
  }

  // 4. Footer Area
  const sigY = PH - 15;
  doc.setDrawColor(200, 210, 220);
  doc.line(M, sigY, PW - M, sigY);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(120, 130, 140);
  doc.text("Flax Couriers System Generated Official PDF Report · www.flaxcouriers.com", M, sigY + 5);
  doc.text("Page 1 of 1", PW - M - 20, sigY + 5);

  doc.save(`Flax_${reportType}_Report_${new Date().toISOString().slice(0, 10)}.pdf`);
}

// ─────────────────────────────────────────────────────────────────────────────
// 6. CSV EXPORT HELPER
// ─────────────────────────────────────────────────────────────────────────────
export function exportToCSV(filename, headers, rows) {
  const csvContent =
    "data:text/csv;charset=utf-8," +
    [
      headers.join(","),
      ...rows.map(r => r.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(",")),
    ].join("\n");
  const link = document.createElement("a");
  link.setAttribute("href", encodeURI(csvContent));
  link.setAttribute("download", filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

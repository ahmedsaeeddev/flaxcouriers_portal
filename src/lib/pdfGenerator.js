import jsPDF from "jspdf";
import QRCode from "qrcode";
import JsBarcode from "jsbarcode";
import {
  ACTIVE_SHIPMENT_STATUSES,
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

// ─── Real Scannable QR Code DataURL Generator (QRCode) ─────────────────────────
async function getQRCodeDataURL(text) {
  try {
    return await QRCode.toDataURL(text || "https://flaxcouriers.com", {
      margin: 1,
      width: 250,
      color: { dark: "#000000", light: "#ffffff" },
    });
  } catch (e) {
    console.error("QR generation error:", e);
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

// ─────────────────────────────────────────────────────────────────────────────
// 1. ELEGANT & EXACT LEOPARDS-STYLE AWB BILL (2 AWBs PER A4 PORTRAIT PAGE)
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

export async function generateAWB(shipment = {}, settings = {}) {
  try {
    const trackingId = shipment.id || "FLX93820428";
    
    // Generate real PNG Data URLs using JsBarcode and QRCode
    const barcodeDataUrl = getBarcodeDataURL(trackingId);
    let qrDataUrl = null;
    try {
      qrDataUrl = await getQRCodeDataURL(`https://flaxcouriers.com/track/${trackingId}`);
    } catch (e) {
      console.warn("QR creation warning:", e);
    }

    // A4 Portrait: 210mm x 297mm
    const doc = new jsPDF({ unit: "mm", format: "a4" });

    // Top Block (Copy #1: Customer Copy)
    drawSingleAWBBlock(doc, 5, shipment, settings, qrDataUrl, barcodeDataUrl);

    // Perforation / Cut Line
    doc.setDrawColor(150);
    doc.setLineDashPattern([2, 2], 0);
    doc.line(6, 143, 204, 143);
    doc.setFontSize(6.5);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(120);
    doc.text("- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - CUT HERE - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -", 14, 142.5);
    doc.setLineDashPattern([], 0);

    // Bottom Block (Copy #2: Operations Copy)
    drawSingleAWBBlock(doc, 146, shipment, settings, qrDataUrl, barcodeDataUrl);

    doc.save(`AWB_${trackingId}.pdf`);
  } catch (err) {
    console.error("Critical generateAWB error:", err);
    alert("Could not generate PDF: " + err.message);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. LOAD SHEET  (Booked Packets Summary Report — 3 Copies in ONE PDF)
// ─────────────────────────────────────────────────────────────────────────────
export async function generateLoadSheet(shipments = [], settings = {}) {
  try {
    const companyName = (settings.companyName || "FLAX COURIER").toUpperCase();

    const now        = new Date();
    const pickupDate = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,"0")}-${String(now.getDate()).padStart(2,"0")} ${String(now.getHours()).padStart(2,"0")}:${String(now.getMinutes()).padStart(2,"0")}:${String(now.getSeconds()).padStart(2,"0")}`;
    const printedOn  = `${String(now.getDate()).padStart(2,"0")}/${String(now.getMonth()+1).padStart(2,"0")}/${now.getFullYear()}`;
    const challanNum = Math.floor(7000000 + Math.random() * 999999);
    const accNum     = "575181";

    const COPIES = ["Customer Copy", "Operation Copy", "Courier Copy"];

    const dataRows = shipments.length > 0 ? shipments : [
      { id: "KI7539111862", city: "Faisalabad", cust: "MIAN ZEESHAN", pieces: 1, weight: 1.0, cod: "Rs 1410" },
      { id: "KI7539112008", city: "Gujrat", cust: "HASSAN NASIR", pieces: 1, weight: 0.69, cod: "Rs 2000" },
      { id: "KI7539112138", city: "Khairpur", cust: "FAISAL", pieces: 1, weight: 0.725, cod: "Rs 2300" }
    ];

    const totalPieces  = dataRows.reduce((a, s) => a + (parseInt(s.pieces) || 1), 0);
    const totalPackets = dataRows.length;
    const totalCOD     = dataRows.reduce((a, s) => a + (parseInt((s.cod || "0").replace(/[^\d]/g, "")) || 0), 0);

    const COLS = [
      { h: "Sr.",            w: 9  },
      { h: "CN #",           w: 30 },
      { h: "Destination",    w: 22 },
      { h: "Shipper Name",   w: 28 },
      { h: "No. of pieces",  w: 20 },
      { h: "Consignee Name", w: 31 },
      { h: "Order Id",       w: 16 },
      { h: "Weight",         w: 14 },
      { h: "COD Amount",     w: 16 },
    ];
    const totalRelW = COLS.reduce((a, c) => a + c.w, 0);

    const doc = new jsPDF({ unit: "mm", format: "a4" });
    const PW = 210;
    const PH = 297;
    const M  = 12;
    const CW = PW - M * 2;

    COLS.forEach(c => { c.w = (c.w / totalRelW) * CW; });

    COPIES.forEach((copyLabel, pageIdx) => {
      if (pageIdx > 0) doc.addPage();

      let Y = M;

      doc.setFont("helvetica", "bold");
      doc.setFontSize(12);
      doc.setTextColor(0, 0, 0);
      const tW = doc.getTextWidth(copyLabel);
      doc.text(copyLabel, PW / 2 - tW / 2, Y + 4);
      Y += 8;

      doc.setDrawColor(0);
      doc.setLineWidth(0.4);
      doc.line(M, Y, PW - M, Y);
      Y += 5;

      // Logo Block
      doc.setFillColor(10, 35, 66);
      doc.rect(M, Y, 42, 20, "F");
      doc.setTextColor(244, 196, 48);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(15);
      doc.text("FLAX", M + 3, Y + 11);
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(9);
      doc.text("COURIERS", M + 3, Y + 16.5);

      const RI = M + 85;
      doc.setTextColor(0, 0, 0);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.text("Booked Packets Summary Report", RI, Y + 4);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(8.5);

      const kv = (label, val, yOff) => {
        doc.text(label, RI, Y + yOff);
        doc.text(val,   RI + 30, Y + yOff);
      };
      kv("Pickup Date", pickupDate, 10);
      kv("Printed On",  printedOn,  15);
      kv("Challan#",    String(challanNum), 20);

      Y += 24;

      doc.setDrawColor(180);
      doc.setLineWidth(0.3);
      doc.line(M, Y, PW - M, Y);
      Y += 5;

      doc.setFont("helvetica", "normal");
      doc.setFontSize(8.5);
      doc.setTextColor(0, 0, 0);
      doc.text("Client", M, Y + 4);

      doc.text(`Acc # ${accNum}`, M + 35, Y + 4);
      Y += 5;
      doc.text("Company Name: ", M + 35, Y + 4);
      doc.setFont("helvetica", "bold");
      doc.text(companyName, M + 35 + doc.getTextWidth("Company Name: "), Y + 4);

      Y += 9;

      doc.setFont("helvetica", "normal");
      doc.text("Handed Over To:", M, Y + 4);
      doc.setFont("helvetica", "bold");
      doc.text("Code: ABC", M + 35, Y + 4);
      Y += 5;
      doc.setFont("helvetica", "bold");
      doc.text("Name: 123", M + 35, Y + 4);
      Y += 9;

      const ROW_H  = 6;
      const HEAD_H = 7;

      doc.setFillColor(255, 255, 255);
      doc.rect(M, Y, CW, HEAD_H, "S");
      doc.setTextColor(0, 0, 0);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(7.5);

      let xPos = M;
      COLS.forEach(col => {
        doc.text(col.h, xPos + 1, Y + 5);
        doc.line(xPos, Y, xPos, Y + HEAD_H);
        xPos += col.w;
      });
      doc.line(xPos, Y, xPos, Y + HEAD_H);
      Y += HEAD_H;

      doc.setFont("helvetica", "normal");
      doc.setFontSize(7.5);

      dataRows.forEach((s, idx) => {
        const orderIdNum = String(idx + 166).padStart(4, "0");
        const weightG    = ((parseFloat(s.weight) || 1) * 1000).toFixed(2);
        const codAmt     = String(parseInt((s.cod || "0").replace(/[^\d]/g, "")) || 0);

        const cells = [
          String(idx + 1),
          s.id || "",
          s.city || "",
          companyName,
          String(s.pieces || 1),
          s.cust || "",
          orderIdNum,
          weightG,
          codAmt,
        ];

        doc.rect(M, Y, CW, ROW_H, "S");

        xPos = M;
        cells.forEach((cell, ci) => {
          doc.text(String(cell), xPos + 1, Y + 4.5);
          if (ci < COLS.length - 1) {
            doc.line(xPos + COLS[ci].w, Y, xPos + COLS[ci].w, Y + ROW_H);
          }
          xPos += COLS[ci].w;
        });

        Y += ROW_H;
      });

      const summaries = [
        `Total No. Of Pieces: ${totalPieces}`,
        `Total No. Of Packets: ${totalPackets}`,
        `Total COD Amount: ${totalCOD}`,
      ];
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      summaries.forEach(text => {
        doc.rect(M, Y, CW, ROW_H, "S");
        doc.text(text, M + 1.5, Y + 4.5);
        Y += ROW_H;
      });

      const SIG_Y = PH - 25;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8.5);
      doc.setTextColor(0, 0, 0);
      doc.text("Client Signature: _______________________", M, SIG_Y);
      doc.text("Booking Staff Signature: _______________________", PW / 2 + 5, SIG_Y);
    });

    doc.save(`Flax_LoadSheet_${new Date().toISOString().slice(0, 10)}.pdf`);
  } catch (err) {
    console.error("Critical generateLoadSheet error:", err);
    alert("Could not generate Load Sheet: " + err.message);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. INVOICE PDF
// ─────────────────────────────────────────────────────────────────────────────
export function generateInvoicePDF(invoice, settings = {}) {
  const companyName = settings.companyName || "Flax Couriers";
  const doc = new jsPDF();

  doc.setFillColor(10, 35, 66);
  doc.rect(0, 0, 210, 40, "F");

  doc.setTextColor(244, 196, 48);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.text(companyName.toUpperCase(), 15, 22);
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(10);
  doc.text("OFFICIAL INVOICE", 15, 32);
  doc.setFontSize(12);
  doc.text(`INVOICE #: ${invoice.id}`, 140, 20);
  doc.setFontSize(10);
  doc.text(`Date: ${invoice.date || new Date().toLocaleDateString()}`, 140, 28);
  doc.text(`Status: ${(invoice.status || "Pending").toUpperCase()}`, 140, 34);

  doc.setTextColor(10, 35, 66);
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text("Billed To:", 15, 55);
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(`Customer Name: ${invoice.cust || "Valued Client"}`, 15, 63);

  doc.setFillColor(240, 244, 248);
  doc.rect(15, 85, 180, 10, "F");
  doc.setFont("helvetica", "bold");
  doc.text("Description", 20, 91.5);
  doc.text("Qty", 120, 91.5);
  doc.text("Amount", 160, 91.5);

  doc.setFont("helvetica", "normal");
  doc.text(`Courier Services — Invoice ${invoice.id}`, 20, 103);
  doc.text("1", 120, 103);
  doc.text(invoice.amount || "Rs 0", 160, 103);

  doc.setDrawColor(220, 225, 230);
  doc.line(15, 110, 195, 110);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("Total:", 110, 125);
  doc.setTextColor(22, 163, 74);
  doc.text(invoice.amount || "Rs 0", 165, 125);

  doc.setTextColor(140, 150, 160);
  doc.setFontSize(9);
  doc.setFont("helvetica", "italic");
  doc.text("Thank you for shipping with Flax Couriers. Contact: ops@flaxcouriers.com", 15, 160);

  doc.save(`Invoice_${invoice.id}.pdf`);
}

export function generateShipmentInvoicePDF(invoiceRequest, settings = {}) {
  const { date, shipments = [], shipperName = "Shipper", shipperAccount = "" } = invoiceRequest;
  const doc = new jsPDF();
  const companyName = settings.companyName || "Flax Couriers";
  const invoiceDate = new Date(`${date}T00:00:00`).toLocaleDateString();
  const invoiceNumber = `INV-${String(date).replace(/-/g, "")}-${shipperAccount || "SHIPPER"}`;
  const statusCounts = shipments.reduce((counts, shipment) => {
    const status = String(shipment.status || "Unknown").trim();
    counts[status] = (counts[status] || 0) + 1;
    return counts;
  }, {});

  doc.setTextColor(10, 35, 66);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text(companyName.toUpperCase(), 15, 20);
  doc.setFontSize(12);
  doc.text("SHIPMENT INVOICE", 15, 30);
  doc.setDrawColor(220, 225, 230);
  doc.line(15, 36, 195, 36);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text(`Invoice #: ${invoiceNumber}`, 15, 46);
  doc.text(`Booking date: ${invoiceDate}`, 15, 53);
  doc.text(`Shipper: ${shipperName}${shipperAccount ? ` (#${shipperAccount})` : ""}`, 15, 60);
  doc.text(`Total parcels: ${shipments.length}`, 15, 67);

  let y = 78;
  doc.setFont("helvetica", "bold");
  doc.text("STATUS SUMMARY", 15, y);
  y += 7;
  doc.setFont("helvetica", "normal");
  Object.entries(statusCounts).forEach(([status, count], index) => {
    const x = index % 2 === 0 ? 15 : 108;
    const rowY = y + Math.floor(index / 2) * 7;
    doc.text(`${status}: ${count}`, x, rowY);
  });
  y += Math.ceil(Object.keys(statusCounts).length / 2) * 7 + 7;

  const drawTableHeader = () => {
    doc.setFillColor(240, 244, 248);
    doc.rect(15, y - 5, 180, 9, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
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

export function generateDeliverySheetPDF(sheet = {}, settings = {}) {
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const companyName = settings.companyName || "Flax Couriers";
  const parcels = sheet.parcels || [];
  const width = doc.internal.pageSize.getWidth();
  const left = 12;
  const right = width - 12;
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

  doc.setFillColor(10, 35, 66);
  doc.rect(0, 0, width, 30, "F");
  doc.setTextColor(244, 196, 48);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text(companyName.toUpperCase(), left, 13);
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(11);
  doc.text(`DELIVERY SHEET · ${sheet.id || "UNSAVED"}`, left, 22);
  doc.setTextColor(10, 35, 66);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text(`Rider: ${sheet.riderName || "—"}  |  Phone: ${sheet.riderPhone || "—"}`, left, 39);
  doc.text(`Branch: ${sheet.branch || "—"}  |  Origin: ${sheet.origin || "—"}  |  Area: ${sheet.area || "—"}`, left, 46);
  doc.text(`Date: ${sheet.date || "—"}  ${sheet.time || ""}  |  Sheet status: ${sheet.status || "Open"}`, left, 53);
  doc.text(`Parcels: ${parcels.length}  |  Total COD: Rs ${totalCOD.toLocaleString()}  |  Fuel: Rs ${Number(sheet.totalFuelCharges || 0).toLocaleString()}  |  Received: Rs ${Number(sheet.totalReceivedAmount || 0).toLocaleString()}`, left, 60);
  doc.text(`Balance: Rs ${balance.toLocaleString()}`, left, 66);

  const columns = [
    { title: "CN #", x: 13, width: 31 },
    { title: "Consignee", x: 45, width: 39 },
    { title: "Phone / City", x: 85, width: 35 },
    { title: "Status", x: 121, width: 41 },
    { title: "Payment", x: 163, width: 22 },
    { title: "COD", x: 186, width: 19 },
    { title: "Received", x: 206, width: 22 },
    { title: "Reason", x: 229, width: 55 },
  ];
  let y = 77;
  const drawHeader = () => {
    doc.setFillColor(240, 244, 248);
    doc.rect(left, y - 5, right - left, 9, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7);
    columns.forEach((column) => doc.text(column.title, column.x, y));
    doc.setFont("helvetica", "normal");
    y += 9;
  };
  drawHeader();

  parcels.forEach((parcel) => {
    if (y > 190) {
      doc.addPage();
      y = 20;
      drawHeader();
    }
    const values = [
      parcel.trackingId || parcel.shipmentId || "—",
      parcel.cust || "Consignee",
      [parcel.receiverPhone, parcel.city].filter(Boolean).join(" / ") || "—",
      parcel.status || "Out for Delivery",
      parcel.paymentStatus || "Unpaid",
      `Rs ${Number(parcel.codAmount || parseAmount(parcel.cod)).toLocaleString()}`,
      `Rs ${Number(parcel.receivedAmount || 0).toLocaleString()}`,
      parcel.reason || "—",
    ];
    doc.setFontSize(7);
    values.forEach((value, index) => {
      doc.text(String(value).slice(0, index === 7 ? 35 : 26), columns[index].x, y);
    });
    doc.setDrawColor(230, 234, 239);
    doc.line(left, y + 3, right, y + 3);
    y += 8;
  });

  const safeId = String(sheet.id || "Delivery_Sheet").replace(/[^\w-]/g, "_");
  doc.save(`${safeId}.pdf`);
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. COD STATEMENT PDF
// ─────────────────────────────────────────────────────────────────────────────
export function generateCODStatement(codRows = [], stats = {}, settings = {}) {
  const companyName = settings.companyName || "Flax Couriers";
  const doc = new jsPDF();

  doc.setFillColor(10, 35, 66);
  doc.rect(0, 0, 210, 35, "F");
  doc.setTextColor(244, 196, 48);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text(companyName.toUpperCase(), 15, 18);
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(10);
  doc.text("CASH ON DELIVERY SETTLEMENT STATEMENT", 15, 27);
  doc.text(`Date: ${new Date().toLocaleDateString()}`, 150, 20);

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
export function generateReportPDF(reportType, shipments = [], settings = {}) {
  const companyName = (settings.companyName || "FLAX COURIERS").toUpperCase();
  const doc = new jsPDF({ unit: "mm", format: "a4" });
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

  // Logo text
  doc.setTextColor(244, 196, 48); // Yellow accent
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text("FLAX", M + 5, Y + 12);
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(10);
  doc.text("COURIERS", M + 5, Y + 18);
  doc.setFontSize(6);
  doc.setFont("helvetica", "normal");
  doc.text("Official Logistics Report", M + 5, Y + 22);

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

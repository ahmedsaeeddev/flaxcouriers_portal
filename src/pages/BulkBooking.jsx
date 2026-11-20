import React, { useState, useContext } from "react";
import { Upload, Download, FileText, ClipboardList, CheckCircle2 } from "lucide-react";
import Card from "../components/ui/Card";
import Button from "../components/ui/Button";
import { AppContext } from "../context/AppContext";
import { exportToCSV, generateAWB, generateLoadSheet } from "../lib/pdfGenerator";

const SAMPLE_CSV = `Receiver Name,Receiver Phone,City,Address,Weight (kg),Pieces,COD Amount,Service Type
MIAN ZEESHAN,03001015516,Faisalabad,Sargodha Road Dawood Textile k pass Ghafoor Town 2,1.0,1,1410,Overnight
HASSAN NASIR,03019876543,Gujrat,Gulberg III Main Blvd,0.69,1,2000,Overnight
FAISAL,03334455667,Khairpur,Sector F-7/2 Street 10,0.725,1,2300,Overnight`;

export default function BulkBooking({ go }) {
  const { addBulkShipments, shipments, settings } = useContext(AppContext);
  const [csvText, setCsvText] = useState("");
  const [parsedRows, setParsedRows] = useState([]);
  const [imported, setImported] = useState(false);

  const handleParse = (text) => {
    setCsvText(text);
    const lines = text.trim().split("\n");
    if (lines.length <= 1) {
      setParsedRows([]);
      return;
    }

    const rows = lines.slice(1).map((line) => {
      const parts = line.split(",").map((p) => p.trim());
      return {
        receiverName: parts[0] || "Client",
        receiverPhone: parts[1] || "",
        city: parts[2] || "Karachi",
        receiverAddress: parts[3] || "City Area",
        weight: parseFloat(parts[4]) || 1.0,
        pieces: parseInt(parts[5]) || 1,
        codAmount: parseFloat(parts[6]) || 0,
        serviceType: parts[7] || "Overnight",
      };
    });

    setParsedRows(rows);
  };

  const updateParsedRow = (rowIndex, field, value) => {
    setParsedRows((rows) =>
      rows.map((row, index) => index === rowIndex ? { ...row, [field]: value } : row)
    );
  };

  const handleBulkUpload = async () => {
    if (parsedRows.length === 0) {
      alert("Please paste CSV data or click 'Load Sample Template' first.");
      return;
    }
    await addBulkShipments(parsedRows);
    setImported(true);
    setTimeout(() => {
      setImported(false);
      go("shipments");
    }, 1200);
  };

  const handleExportCSV = () => {
    const headers = ["Tracking ID", "Customer", "City", "COD Amount", "Status", "Date"];
    const rows = shipments.map((s) => [s.id, s.cust, s.city, s.cod, s.status, s.date]);
    exportToCSV("FCS_Shipments_Export.csv", headers, rows);
  };

  const handlePrintAllAWBs = () => {
    if (shipments.length === 0) {
      alert("No shipments available to print.");
      return;
    }
    shipments.slice(0, 5).forEach((s) => generateAWB(s, settings));
  };

  const handlePrintLoadSheet = () => {
    generateLoadSheet(shipments, settings);
  };

  return (
    <div className="p-5 lg:p-8 space-y-5">
      <div>
        <h2 className="font-display font-bold text-[#0A2342] text-xl">Bulk Booking</h2>
        <p className="text-[12.5px] text-slate-400">Batch-import consignments via CSV or spreadsheet</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <Card className="p-6 lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-display font-bold text-[#0A2342] text-[15px]">Paste CSV Consignment Data</h3>
            <button
              onClick={() => handleParse(SAMPLE_CSV)}
              className="text-[12px] font-semibold text-[#0A2342] bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-lg transition"
            >
              Load Sample Template
            </button>
          </div>

          <textarea
            rows={8}
            value={csvText}
            onChange={(e) => handleParse(e.target.value)}
            placeholder="Paste CSV text here (Receiver Name, Phone, City, Address, Weight, Pieces, COD Amount, Service Type)..."
            className="w-full p-4 rounded-xl border border-slate-200 bg-slate-50 text-xs font-mono text-slate-700 outline-none focus:border-[#F4C430] focus:ring-2 focus:ring-[#F4C430]/20"
          />

          {imported && (
            <div className="p-3 bg-emerald-50 text-emerald-700 rounded-xl text-xs flex items-center gap-2 animate-fadeUp">
              <CheckCircle2 size={16} />
              <span>Bulk shipments imported successfully to Firestore! Redirecting to shipments...</span>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <Button variant="navy" onClick={handleBulkUpload} disabled={parsedRows.length === 0}>
              <Upload size={16} /> Import {parsedRows.length} Consignments
            </Button>
          </div>
        </Card>

        <Card className="p-6 space-y-4">
          <h3 className="font-display font-bold text-[#0A2342] text-[15px]">Batch Exports & Printing</h3>
          <p className="text-[12px] text-slate-400">Generate AWB bills or export load sheet manifest for active bookings.</p>

          <div className="space-y-2.5">
            <Button variant="outline" className="w-full justify-start !py-2.5" onClick={handlePrintAllAWBs}>
              <FileText size={15} /> Print All AWB Bills (2 Copies per Page)
            </Button>
            <Button variant="navy" className="w-full justify-start !py-2.5" onClick={handlePrintLoadSheet}>
              <ClipboardList size={15} /> Print Load Sheet (3 Copies)
            </Button>
            <Button variant="outline" className="w-full justify-start !py-2.5" onClick={handleExportCSV}>
              <Download size={15} /> Export Tracking Report (CSV)
            </Button>
          </div>
        </Card>
      </div>

      {parsedRows.length > 0 && (
        <Card className="p-5 animate-fadeUp">
          <h3 className="font-display font-bold text-[#0A2342] text-[14px] mb-3">
            Parsed Preview ({parsedRows.length} Rows)
          </h3>
          <div className="overflow-x-auto scrollbar-thin">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-left text-slate-400 border-b border-slate-100">
                  <th className="pb-2">Receiver</th>
                  <th className="pb-2">Phone</th>
                  <th className="pb-2">City</th>
                  <th className="pb-2">Address</th>
                  <th className="pb-2">Weight</th>
                  <th className="pb-2">Pieces</th>
                  <th className="pb-2">COD Amount</th>
                  <th className="pb-2">Service</th>
                </tr>
              </thead>
              <tbody>
                {parsedRows.map((r, i) => (
                  <tr key={i} className="border-b border-slate-50 hover:bg-slate-50">
                    <td className="py-2 pr-2">
                      <input
                        aria-label={`Receiver name, row ${i + 1}`}
                        value={r.receiverName}
                        onChange={(e) => updateParsedRow(i, "receiverName", e.target.value)}
                        className="w-full min-w-[130px] rounded-md border border-slate-200 px-2 py-1.5 font-semibold text-[#0A2342] outline-none focus:border-[#F4C430]"
                      />
                    </td>
                    <td className="py-2 pr-2">
                      <input
                        aria-label={`Receiver phone, row ${i + 1}`}
                        value={r.receiverPhone}
                        onChange={(e) => updateParsedRow(i, "receiverPhone", e.target.value)}
                        className="w-full min-w-[115px] rounded-md border border-slate-200 px-2 py-1.5 text-slate-600 outline-none focus:border-[#F4C430]"
                      />
                    </td>
                    <td className="py-2 pr-2">
                      <input
                        aria-label={`City, row ${i + 1}`}
                        value={r.city}
                        onChange={(e) => updateParsedRow(i, "city", e.target.value)}
                        className="w-full min-w-[100px] rounded-md border border-slate-200 px-2 py-1.5 text-slate-500 outline-none focus:border-[#F4C430]"
                      />
                    </td>
                    <td className="py-2 pr-2">
                      <input
                        aria-label={`Address, row ${i + 1}`}
                        value={r.receiverAddress}
                        onChange={(e) => updateParsedRow(i, "receiverAddress", e.target.value)}
                        className="w-full min-w-[230px] rounded-md border border-slate-200 px-2 py-1.5 text-slate-500 outline-none focus:border-[#F4C430]"
                      />
                    </td>
                    <td className="py-2 pr-2">
                      <input
                        aria-label={`Weight in kilograms, row ${i + 1}`}
                        type="number"
                        min="0"
                        step="0.01"
                        value={r.weight}
                        onChange={(e) => updateParsedRow(i, "weight", e.target.value)}
                        className="w-20 rounded-md border border-slate-200 px-2 py-1.5 text-slate-500 outline-none focus:border-[#F4C430]"
                      />
                    </td>
                    <td className="py-2 pr-2">
                      <input
                        aria-label={`Pieces, row ${i + 1}`}
                        type="number"
                        min="1"
                        step="1"
                        value={r.pieces}
                        onChange={(e) => updateParsedRow(i, "pieces", e.target.value)}
                        className="w-16 rounded-md border border-slate-200 px-2 py-1.5 text-slate-500 outline-none focus:border-[#F4C430]"
                      />
                    </td>
                    <td className="py-2 pr-2">
                      <input
                        aria-label={`COD amount, row ${i + 1}`}
                        type="number"
                        min="0"
                        step="1"
                        value={r.codAmount}
                        onChange={(e) => updateParsedRow(i, "codAmount", e.target.value)}
                        className="w-24 rounded-md border border-slate-200 px-2 py-1.5 font-medium text-emerald-700 outline-none focus:border-[#F4C430]"
                      />
                    </td>
                    <td className="py-2">
                      <input
                        aria-label={`Service type, row ${i + 1}`}
                        value={r.serviceType}
                        onChange={(e) => updateParsedRow(i, "serviceType", e.target.value)}
                        className="w-full min-w-[110px] rounded-md border border-slate-200 px-2 py-1.5 text-slate-600 outline-none focus:border-[#F4C430]"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}

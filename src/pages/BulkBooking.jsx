import React, { useState, useContext, useRef } from "react";
import { Upload, Download, FileText, ClipboardList, CheckCircle2, Barcode, FileUp, X, RefreshCw } from "lucide-react";
import Card from "../components/ui/Card";
import Button from "../components/ui/Button";
import { AppContext } from "../context/AppContext";
import { exportToCSV, generateAWB, generateLoadSheet, generateBarcodeSheet } from "../lib/pdfGenerator";

const SAMPLE_CSV = `Receiver Name,Receiver Phone,City,Address,Area,Weight (kg),Pieces,COD Amount,Service Type,Shopify Order ID
MIAN ZEESHAN,03001015516,Faisalabad,Sargodha Road Dawood Textile k pass Ghafoor Town 2,Ghafoor Town,1.0,1,1410,Overnight,#1001
HASSAN NASIR,03019876543,Gujrat,Gulberg III Main Blvd,Gulberg III,0.69,1,2000,Overnight,#1002
FAISAL,03334455667,Khairpur,Sector F-7/2 Street 10,Sector F-7/2,0.725,1,2300,Overnight,#1003`;

export default function BulkBooking({ go }) {
  const { addBulkShipments, shipments, settings } = useContext(AppContext);
  const [csvText, setCsvText] = useState("");
  const [parsedRows, setParsedRows] = useState([]);
  const [imported, setImported] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef(null);

  const handleParse = (text) => {
    setCsvText(text);
    const lines = text.trim().split("\n");
    if (lines.length <= 1) {
      setParsedRows([]);
      return;
    }

    // Simple CSV parser that handles quoted values with commas
    const parseCSVLine = (line) => {
      const result = [];
      let current = "";
      let inQuotes = false;
      
      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        const nextChar = line[i + 1];
        
        if (char === '"') {
          if (inQuotes && nextChar === '"') {
            current += '"';
            i++;
          } else {
            inQuotes = !inQuotes;
          }
        } else if (char === ',' && !inQuotes) {
          result.push(current.trim());
          current = "";
        } else {
          current += char;
        }
      }
      result.push(current.trim());
      return result;
    };

    // Detect CSV format based on header
    const header = lines[0].toLowerCase();
    const isExportFormat = header.includes("cn") && header.includes("status") && header.includes("consignee");

    const rows = lines.slice(1).map((line, lineIndex) => {
      const parts = parseCSVLine(line).map((p) => p.trim().replace(/^"|"$/g, ""));
      
      if (isExportFormat) {
        // Format: CN,Status,Consignee,Phone,City,Address,Area,Shipper,COD,Delivery Charges,Weight (kg),Date
        // 12 columns total
        return {
          receiverName: parts[2] || "", // Consignee
          receiverPhone: parts[3] || "", // Phone
          city: parts[4] || "", // City
          receiverAddress: parts[5] || "", // Address (index 5, not 4!)
          area: parts[6] || "", // Area (index 6)
          weight: parseFloat(parts[10]) || 0, // Weight (kg) at index 10, not 8!
          pieces: 1,
          codAmount: parseFloat(parts[8]?.replace(/[^\d.]/g, "")) || 0, // COD at index 8, not 6!
          serviceType: "",
          externalRef: parts[0] || "", // CN as external ref
        };
      } else {
        // Original format: Receiver Name,Receiver Phone,City,Address,Area,Weight (kg),Pieces,COD Amount,Service Type,Shopify Order ID
        return {
          receiverName: parts[0] || "",
          receiverPhone: parts[1] || "",
          city: parts[2] || "",
          receiverAddress: parts[3] || "",
          area: parts[4] || "",
          weight: parseFloat(parts[5]) || 0,
          pieces: parseInt(parts[6]) || 1,
          codAmount: parseFloat(parts[7]) || 0,
          serviceType: parts[8] || "",
          externalRef: parts[9] || "",
        };
      }
    });

    setParsedRows(rows);
  };

  const updateParsedRow = (rowIndex, field, value) => {
    setParsedRows((rows) =>
      rows.map((row, index) => index === rowIndex ? { ...row, [field]: value } : row)
    );
  };

  const deleteCell = (rowIndex, field) => {
    updateParsedRow(rowIndex, field, "");
  };

  const deleteRow = (rowIndex) => {
    setParsedRows((rows) => rows.filter((_, index) => index !== rowIndex));
  };

  const handleBulkUpload = async () => {
    if (parsedRows.length === 0) {
      alert("Please upload a CSV file or click 'Load Sample Template' first.");
      return;
    }
    setIsImporting(true);
    try {
      await addBulkShipments(parsedRows);
      setImported(true);
      setTimeout(() => {
        setImported(false);
        setIsImporting(false);
        go("shipments");
      }, 1200);
    } catch (error) {
      alert("Import failed: " + error.message);
      setIsImporting(false);
    }
  };

  const handleFileUpload = (file) => {
    if (!file) return;
    if (!file.name.endsWith(".csv")) {
      alert("Please upload a CSV file.");
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target.result;
      setCsvText(text);
      handleParse(text);
      setSelectedFile(file);
    };
    reader.readAsText(file);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      handleFileUpload(files[0]);
    }
  };

  const handleFileInputChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileUpload(file);
    }
  };

  const clearFile = () => {
    setSelectedFile(null);
    setCsvText("");
    setParsedRows([]);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
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
            <h3 className="font-display font-bold text-[#0A2342] text-[15px]">Upload CSV Consignment Data</h3>
            <button
              onClick={() => {
                setCsvText(SAMPLE_CSV);
                handleParse(SAMPLE_CSV);
                setSelectedFile({ name: "sample.csv" });
              }}
              className="text-[12px] font-semibold text-[#0A2342] bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-lg transition"
            >
              Load Sample Template
            </button>
          </div>

          {!selectedFile ? (
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`border-2 border-dashed rounded-xl p-8 text-center transition-all ${
                isDragging
                  ? "border-[#F4C430] bg-[#FDF3D3] scale-[1.02]"
                  : "border-slate-300 bg-slate-50 hover:border-slate-400 hover:bg-slate-100"
              }`}
            >
              <FileUp size={48} className={`mx-auto mb-4 ${isDragging ? "text-[#F4C430]" : "text-slate-400"}`} />
              <h4 className="font-semibold text-slate-700 mb-2">
                {isDragging ? "Drop your CSV file here" : "Drag & Drop CSV File Here"}
              </h4>
              <p className="text-sm text-slate-500 mb-4">or</p>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="px-6 py-2 bg-[#0A2342] hover:bg-[#123566] text-white font-semibold rounded-lg transition"
              >
                Click to Browse from Your Computer
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                onChange={handleFileInputChange}
                className="hidden"
              />
            </div>
          ) : (
            <div className="border border-slate-200 rounded-xl p-4 bg-slate-50">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <FileText size={24} className="text-[#0A2342]" />
                  <div>
                    <p className="font-semibold text-slate-700">{selectedFile.name}</p>
                    <p className="text-xs text-slate-500">
                      {parsedRows.length} rows parsed · {parsedRows.filter(r => r.receiverName && r.receiverAddress && r.area && r.weight > 0).length} valid
                    </p>
                  </div>
                </div>
                <button
                  onClick={clearFile}
                  className="p-2 text-slate-400 hover:text-red-500 transition"
                  title="Remove file"
                >
                  <X size={18} />
                </button>
              </div>
              <div className="mt-3 p-3 bg-white rounded-lg border border-slate-200 max-h-32 overflow-y-auto">
                <pre className="text-xs font-mono text-slate-600 whitespace-pre-wrap">{csvText}</pre>
              </div>
            </div>
          )}

          <p className="text-[11px] text-slate-400">
            Note: Shopify Order ID will be merged with the auto-generated tracking ID (e.g., FLX93820123-#1001 becomes FLX93820123-1001). You can track using either the full merged ID or just the Shopify Order ID.
          </p>

          {imported && (
            <div className="p-3 bg-emerald-50 text-emerald-700 rounded-xl text-xs flex items-center gap-2 animate-fadeUp">
              <CheckCircle2 size={16} />
              <span>Bulk shipments imported successfully to Firestore! Redirecting to shipments...</span>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <Button variant="navy" onClick={handleBulkUpload} disabled={parsedRows.filter(r => r.receiverName && r.receiverAddress && r.area && r.weight > 0).length === 0}>
              <Upload size={16} /> Import Valid Rows
            </Button>
          </div>
        </Card>

        <Card className="p-6 space-y-4">
          <h3 className="font-display font-bold text-[#0A2342] text-[15px]">Batch Exports & Printing</h3>
          <p className="text-[12px] text-slate-400">Generate AWB bills or export load sheet manifest for active bookings.</p>

          <div className="space-y-2.5">
            <Button variant="outline" className="w-full justify-start !py-2.5" onClick={handlePrintAllAWBs}>
              <FileText size={15} /> Print AWBs (one per parcel)
            </Button>
            <Button variant="outline" className="w-full justify-start !py-2.5" onClick={() => generateBarcodeSheet(shipments, settings)}>
              <Barcode size={15} /> Print Barcode Labels (name + QR)
            </Button>
            <Button variant="navy" className="w-full justify-start !py-2.5" onClick={handlePrintLoadSheet}>
              <ClipboardList size={15} /> Print Load Sheet
            </Button>
            <Button variant="outline" className="w-full justify-start !py-2.5" onClick={handleExportCSV}>
              <Download size={15} /> Export Tracking Report (CSV)
            </Button>
          </div>
        </Card>
      </div>

      {parsedRows.length > 0 && (
        <Card className="p-5 animate-fadeUp">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-display font-bold text-[#0A2342] text-[14px]">
              Editable Preview ({parsedRows.length} Rows)
            </h3>
            <p className="text-[11px] text-slate-400">Click any cell to edit · Right-click to delete cell · X to delete row · Missing fields will be empty</p>
          </div>
          <div className="overflow-x-auto scrollbar-thin">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-left text-slate-400 border-b border-slate-100 bg-slate-50">
                  <th className="pb-2 px-2 w-8">#</th>
                  <th className="pb-2 px-2">Shopify/Ext ID</th>
                  <th className="pb-2 px-2">Receiver Name *</th>
                  <th className="pb-2 px-2">Phone</th>
                  <th className="pb-2 px-2">Address</th>
                  <th className="pb-2 px-2">City</th>
                  <th className="pb-2 px-2">Area *</th>
                  <th className="pb-2 px-2">Weight (kg) *</th>
                  <th className="pb-2 px-2">Pieces</th>
                  <th className="pb-2 px-2">Service</th>
                  <th className="pb-2 px-2">COD Amount</th>
                  <th className="pb-2 px-2 w-10">Action</th>
                </tr>
              </thead>
              <tbody>
                {parsedRows.map((r, i) => {
                  return (
                    <tr key={i} className="border-b border-slate-50 hover:bg-slate-50">
                      <td className="py-2 px-2 text-slate-400 font-mono">{i + 1}</td>
                      <td className="py-2 px-2">
                        <input
                          aria-label={`Shopify/Ext ID, row ${i + 1}`}
                          value={r.externalRef || ""}
                          onChange={(e) => updateParsedRow(i, "externalRef", e.target.value)}
                          onContextMenu={(e) => {
                            e.preventDefault();
                            deleteCell(i, "externalRef");
                          }}
                          className="w-full min-w-[100px] rounded-md border border-slate-200 px-2 py-1.5 text-slate-600 outline-none focus:border-[#F4C430]"
                        />
                      </td>
                      <td className="py-2 px-2">
                        <input
                          aria-label={`Receiver name, row ${i + 1}`}
                          value={r.receiverName}
                          onChange={(e) => updateParsedRow(i, "receiverName", e.target.value)}
                          onContextMenu={(e) => {
                            e.preventDefault();
                            deleteCell(i, "receiverName");
                          }}
                          className="w-full min-w-[130px] rounded-md border border-slate-200 px-2 py-1.5 font-semibold text-[#0A2342] outline-none focus:border-[#F4C430]"
                        />
                      </td>
                      <td className="py-2 px-2">
                        <input
                          aria-label={`Receiver phone, row ${i + 1}`}
                          value={r.receiverPhone}
                          onChange={(e) => updateParsedRow(i, "receiverPhone", e.target.value)}
                          onContextMenu={(e) => {
                            e.preventDefault();
                            deleteCell(i, "receiverPhone");
                          }}
                          className="w-full min-w-[115px] rounded-md border border-slate-200 px-2 py-1.5 text-slate-600 outline-none focus:border-[#F4C430]"
                        />
                      </td>
                      <td className="py-2 px-2">
                        <input
                          aria-label={`Address, row ${i + 1}`}
                          value={r.receiverAddress}
                          onChange={(e) => updateParsedRow(i, "receiverAddress", e.target.value)}
                          onContextMenu={(e) => {
                            e.preventDefault();
                            deleteCell(i, "receiverAddress");
                          }}
                          className="w-full min-w-[230px] rounded-md border border-slate-200 px-2 py-1.5 text-slate-500 outline-none focus:border-[#F4C430]"
                        />
                      </td>
                      <td className="py-2 px-2">
                        <input
                          aria-label={`City, row ${i + 1}`}
                          value={r.city}
                          onChange={(e) => updateParsedRow(i, "city", e.target.value)}
                          onContextMenu={(e) => {
                            e.preventDefault();
                            deleteCell(i, "city");
                          }}
                          className="w-full min-w-[100px] rounded-md border border-slate-200 px-2 py-1.5 text-slate-500 outline-none focus:border-[#F4C430]"
                        />
                      </td>
                      <td className="py-2 px-2">
                        <input
                          aria-label={`Area, row ${i + 1}`}
                          value={r.area || ""}
                          onChange={(e) => updateParsedRow(i, "area", e.target.value)}
                          onContextMenu={(e) => {
                            e.preventDefault();
                            deleteCell(i, "area");
                          }}
                          className="w-full min-w-[100px] rounded-md border border-slate-200 px-2 py-1.5 text-slate-500 outline-none focus:border-[#F4C430]"
                        />
                      </td>
                      <td className="py-2 px-2">
                        <input
                          aria-label={`Weight in kilograms, row ${i + 1}`}
                          type="number"
                          min="0"
                          step="0.01"
                          value={r.weight}
                          onChange={(e) => updateParsedRow(i, "weight", e.target.value)}
                          onContextMenu={(e) => {
                            e.preventDefault();
                            deleteCell(i, "weight");
                          }}
                          className="w-20 rounded-md border border-slate-200 px-2 py-1.5 text-slate-500 outline-none focus:border-[#F4C430]"
                        />
                      </td>
                      <td className="py-2 px-2">
                        <input
                          aria-label={`Pieces, row ${i + 1}`}
                          type="number"
                          min="1"
                          step="1"
                          value={r.pieces}
                          onChange={(e) => updateParsedRow(i, "pieces", e.target.value)}
                          onContextMenu={(e) => {
                            e.preventDefault();
                            deleteCell(i, "pieces");
                          }}
                          className="w-16 rounded-md border border-slate-200 px-2 py-1.5 text-slate-500 outline-none focus:border-[#F4C430]"
                        />
                      </td>
                      <td className="py-2 px-2">
                        <input
                          aria-label={`Service type, row ${i + 1}`}
                          value={r.serviceType}
                          onChange={(e) => updateParsedRow(i, "serviceType", e.target.value)}
                          onContextMenu={(e) => {
                            e.preventDefault();
                            deleteCell(i, "serviceType");
                          }}
                          className="w-full min-w-[110px] rounded-md border border-slate-200 px-2 py-1.5 text-slate-600 outline-none focus:border-[#F4C430]"
                        />
                      </td>
                      <td className="py-2 px-2">
                        <input
                          aria-label={`COD amount, row ${i + 1}`}
                          type="number"
                          min="0"
                          step="1"
                          value={r.codAmount}
                          onChange={(e) => updateParsedRow(i, "codAmount", e.target.value)}
                          onContextMenu={(e) => {
                            e.preventDefault();
                            deleteCell(i, "codAmount");
                          }}
                          className="w-24 rounded-md border border-slate-200 px-2 py-1.5 font-medium text-emerald-700 outline-none focus:border-[#F4C430]"
                        />
                      </td>
                      <td className="py-2 px-2 text-center">
                        <button
                          onClick={() => deleteRow(i)}
                          className="p-1 text-slate-400 hover:text-red-500 transition"
                          title="Delete row"
                        >
                          <X size={14} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="mt-3 flex items-center justify-between">
            <p className="text-[11px] text-slate-400">
              {parsedRows.length} rows ready to import
            </p>
            <Button
              variant="navy"
              onClick={handleBulkUpload}
              disabled={isImporting || parsedRows.length === 0}
            >
              {isImporting ? (
                <>
                  <RefreshCw size={16} className="animate-spin" /> Importing...
                </>
              ) : (
                <>
                  <Upload size={16} /> Import {parsedRows.length} Rows
                </>
              )}
            </Button>
          </div>
        </Card>
      )}

      {/* Import Loading Modal */}
      {isImporting && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl p-8 max-w-sm w-full mx-4 shadow-2xl text-center max-h-[80vh] overflow-y-auto">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-[#FDF3D3] flex items-center justify-center">
              <RefreshCw size={32} className="text-[#0A2342] animate-spin" />
            </div>
            <h3 className="font-display font-bold text-[#0A2342] text-lg mb-2">Importing Shipments...</h3>
            <p className="text-sm text-slate-500 mb-4">
              Please wait while we process your CSV data and create shipments.
            </p>
            <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
              <div className="bg-[#F4C430] h-full animate-pulse" style={{ width: "70%" }}></div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

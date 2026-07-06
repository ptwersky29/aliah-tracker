import React, { useMemo, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import * as XLSX from "xlsx";
import { Upload, FileSpreadsheet, Check, AlertTriangle, X, Download, Loader2 } from "lucide-react";
import { toast } from "sonner";
import api from "../lib/api";
import { STANDARD_ALIYOS, fullName, classNames, getCurrentShabbos, getParshaForWeek } from "../lib/jewishCalendar";

// ---------------------------------------------------------------------------
// Column-name normalisation — accept the most common variants people will use
// ---------------------------------------------------------------------------
function norm(s) {
  return String(s || "").trim().toLowerCase().replace(/[\s_\-]+/g, "");
}
const COL_ALIASES = {
  first_name: ["firstname", "first", "fname", "name", "פֿאָרנאָמען", "שם", "vorname"],
  last_name: ["lastname", "last", "lname", "surname", "family", "פֿאַמיליע", "משפחה"],
  phone: ["phone", "phonenumber", "mobile", "tel", "telephone", "טעלעפֿאָן"],
  notes: ["notes", "note", "comment", "comments", "remark", "remarks", "באַמערקונג"],
  customer: ["customer", "name", "fullname", "buyer", "קונה", "קויפֿער"],
  product: ["product", "item", "aliyah", "aliya", "honor", "honour", "זאַך", "עליה"],
  week: ["week", "date", "shabbos", "shabbat", "saturday", "שבת", "דאַטע"],
  price: ["price", "amount", "value", "cost", "פּרײַז", "סומע"],
  description: ["description", "desc", "what", "details", "באַשרייַבונג"],
};

function pickColumn(headers, candidates) {
  const set = new Set(candidates.map(norm));
  const idx = headers.findIndex((h) => set.has(norm(h)));
  return idx === -1 ? null : idx;
}

function parseFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.onload = (ev) => {
      try {
        const isCsv = /\.csv$/i.test(file.name) || file.type === "text/csv";
        const wb = isCsv
          // CSV: feed as UTF-8 text so Hebrew/Yiddish characters survive intact.
          ? XLSX.read(ev.target.result, { type: "string" })
          // XLSX/XLS: binary array — keep cellDates off and raw on so original
          // strings (e.g. "2026-06-27") aren't reformatted by the US locale.
          : XLSX.read(ev.target.result, { type: "array", cellDates: false });
        const firstSheet = wb.SheetNames[0];
        const rows = XLSX.utils.sheet_to_json(wb.Sheets[firstSheet], { header: 1, raw: true, defval: "" });
        resolve(rows);
      } catch (e) { reject(e); }
    };
    if (/\.csv$/i.test(file.name) || file.type === "text/csv") {
      reader.readAsText(file, "utf-8");
    } else {
      reader.readAsArrayBuffer(file);
    }
  });
}

function downloadTemplate(kind) {
  let aoa;
  let filename;
  if (kind === "customers") {
    aoa = [
      ["first_name", "last_name", "phone", "notes"],
      ["יוסף", "פרידמאן", "07700 900100", ""],
      ["שמואל", "ראזענבערג", "07700 900101", "Has a credit"],
      ["David", "Cohen", "", ""],
    ];
    filename = "customers_template.xlsx";
  } else {
    aoa = [
      ["customer", "product", "week", "price"],
      ["יוסף פרידמאן", "כהן", "2026-06-27", 36],
      ["שמואל ראזענבערג", "לוי", "2026-06-27", 25],
      ["David Cohen", "מפטיר", "2026-06-27", 100],
      ["יוסף פרידמאן", "Special honor", "2026-06-27", 75],
    ];
    filename = "sales_template.xlsx";
  }
  const ws = XLSX.utils.aoa_to_sheet(aoa);
  ws["!cols"] = aoa[0].map(() => ({ wch: 22 }));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Sheet1");
  XLSX.writeFile(wb, filename);
}

// ---------------------------------------------------------------------------
// Date normalisation for the sales import — produce ISO YYYY-MM-DD and snap to
// the nearest Saturday (so Sunday/Friday entries become the upcoming/previous
// Shabbos).
// ---------------------------------------------------------------------------
function toShabbosISO(value) {
  if (value === null || value === undefined || value === "") return null;
  let d;
  if (value instanceof Date) d = value;
  else if (typeof value === "number") {
    // Excel serial date
    d = new Date(Math.round((value - 25569) * 86400 * 1000));
  } else {
    const s = String(value).trim();
    // ISO YYYY-MM-DD (or with time)
    const isoMatch = s.match(/^(\d{4})[-\/](\d{1,2})[-\/](\d{1,2})/);
    if (isoMatch) {
      const [, yy, mm, dd] = isoMatch;
      d = new Date(parseInt(yy, 10), parseInt(mm, 10) - 1, parseInt(dd, 10));
    } else {
      // Slashed/dashed short form: figure out day-vs-month using the
      // ">12 must be the day" rule. Defaults to DD/MM/YYYY when ambiguous.
      const slashMatch = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/);
      if (slashMatch) {
        const a = parseInt(slashMatch[1], 10);
        const b = parseInt(slashMatch[2], 10);
        const cRaw = slashMatch[3];
        const c = cRaw.length === 2 ? 2000 + parseInt(cRaw, 10) : parseInt(cRaw, 10);
        let day, month;
        if (a > 12 && b <= 12) { day = a; month = b; }       // clearly D/M
        else if (b > 12 && a <= 12) { day = b; month = a; }  // clearly M/D
        else { day = a; month = b; }                          // ambiguous → assume D/M
        d = new Date(c, month - 1, day);
      } else {
        d = new Date(s);
      }
    }
  }
  if (!d || isNaN(d.getTime())) return null;
  // Snap to nearest Saturday (Sat=6). If already Sat, keep.
  const day = d.getDay();
  if (day !== 6) {
    const fwd = (6 - day + 7) % 7;
    const back = (day - 6 + 7) % 7;
    d.setDate(d.getDate() + (fwd <= back ? fwd : -back));
  }
  // Format YYYY-MM-DD in local time (avoid UTC shift)
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}

// ---------------------------------------------------------------------------
// Aliyah name → id resolver. We accept the aliyah id (e.g. "kohen"), the
// Yiddish label (e.g. "כהן"), or English transliteration.
// ---------------------------------------------------------------------------
const ENGLISH_ALIYOS = {
  hotzaah: ["hotzaah", "hotza'ah", "hagbaha-hotzaah"],
  kohen: ["kohen", "cohen"],
  levi: ["levi", "levite"],
  shlishi: ["shlishi", "third"],
  revii: ["revii", "fourth"],
  chamishi: ["chamishi", "fifth"],
  shishi: ["shishi", "sixth"],
  shvii: ["shvii", "seventh"],
  acharon: ["acharon", "last"],
  maftir: ["maftir"],
  hagbah: ["hagbah", "hagbaha"],
  glilah: ["glilah", "gelilah"],
  mincha: ["mincha"],
  bentsh: ["bentsh", "benching"],
  geshnadt1: ["geshnadt1", "geshnadta", "noted1"],
  geshnadt2: ["geshnadt2", "geshnadtb", "noted2"],
  geshnadt3: ["geshnadt3", "geshnadtc", "noted3"],
};

function resolveProduct(value, products) {
  const v = String(value || "").trim();
  if (!v) return { product_id: "", product_name: "" };
  const n = norm(v);
  // Standard aliyos by id
  const byId = STANDARD_ALIYOS.find((a) => norm(a.id) === n);
  if (byId) return { product_id: byId.id, product_name: byId.label };
  // Standard aliyos by Yiddish label
  const byLabel = STANDARD_ALIYOS.find((a) => norm(a.label) === n);
  if (byLabel) return { product_id: byLabel.id, product_name: byLabel.label };
  // English aliases
  for (const [id, aliases] of Object.entries(ENGLISH_ALIYOS)) {
    if (aliases.some((al) => norm(al) === n)) {
      const a = STANDARD_ALIYOS.find((x) => x.id === id);
      if (a) return { product_id: a.id, product_name: a.label };
    }
  }
  // Special product by name (case-insensitive)
  const prod = (products || []).find((p) => norm(p.name) === n);
  if (prod) return { product_id: prod.id, product_name: prod.name };
  // Fallback — treat as a free-text product name, use a stable synthetic id
  return { product_id: `custom:${v}`, product_name: v };
}

// ---------------------------------------------------------------------------
// Customer matcher for sales import — by full name (case-insensitive, "first
// last" or "last first" or "first" alone).
// ---------------------------------------------------------------------------
function resolveCustomer(value, customers) {
  const v = String(value || "").trim();
  if (!v) return null;
  const n = norm(v);
  // Exact full-name match
  let m = customers.find((c) => norm(fullName(c)) === n);
  if (m) return m;
  // First-name only
  m = customers.find((c) => norm(c.first_name) === n);
  if (m) return m;
  // Last-name only
  m = customers.find((c) => norm(c.last_name) === n);
  if (m) return m;
  // Reversed "last first"
  const parts = v.split(/\s+/);
  if (parts.length >= 2) {
    const rev = `${parts.slice(1).join(" ")} ${parts[0]}`;
    m = customers.find((c) => norm(fullName(c)) === norm(rev));
    if (m) return m;
  }
  // Contains-match as a last resort
  m = customers.find((c) => norm(fullName(c)).includes(n) || n.includes(norm(fullName(c))));
  return m || null;
}

// ===========================================================================
// Component
// ===========================================================================
export default function ImportModal({ open, onClose, kind, customers = [], products = [] }) {
  const qc = useQueryClient();
  const fileInputRef = useRef(null);
  const [rows, setRows] = useState(null);
  const [filename, setFilename] = useState("");
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0 });

  const reset = () => { setRows(null); setFilename(""); setProgress({ done: 0, total: 0 }); };
  const handleClose = () => { if (!importing) { reset(); onClose(); } };

  const handleFile = async (file) => {
    if (!file) return;
    try {
      const parsed = await parseFile(file);
      if (!parsed.length) {
        toast.error("The file is empty.");
        return;
      }
      setRows(parsed);
      setFilename(file.name);
    } catch (e) {
      console.error(e);
      toast.error("Could not read the file. Please upload .xlsx, .xls or .csv.");
    }
  };

  // Map rows -> normalised records with validation
  const parsed = useMemo(() => {
    if (!rows || rows.length < 1) return { headers: [], records: [], valid: 0, errors: 0 };
    const headers = rows[0].map((h) => String(h || ""));
    const body = rows.slice(1).filter((r) => r.some((c) => String(c || "").trim() !== ""));

    if (kind === "customers") {
      const iFirst = pickColumn(headers, COL_ALIASES.first_name);
      const iLast = pickColumn(headers, COL_ALIASES.last_name);
      const iPhone = pickColumn(headers, COL_ALIASES.phone);
      const iNotes = pickColumn(headers, COL_ALIASES.notes);

      const records = body.map((r, idx) => {
        let first_name = iFirst !== null ? String(r[iFirst] || "").trim() : "";
        let last_name = iLast !== null ? String(r[iLast] || "").trim() : "";
        const phone = iPhone !== null ? String(r[iPhone] || "").trim() : "";
        const notes = iNotes !== null ? String(r[iNotes] || "").trim() : "";

        // If only a single "name" column was provided and no first_name yet,
        // split the first column on whitespace.
        if (!first_name && headers.length && r[0]) {
          const parts = String(r[0]).trim().split(/\s+/);
          first_name = parts[0] || "";
          if (!last_name) last_name = parts.slice(1).join(" ");
        }

        const error = !first_name ? "Missing first name" : null;
        return { rowIndex: idx + 2, first_name, last_name, phone, notes, error };
      });
      return {
        headers,
        records,
        valid: records.filter((r) => !r.error).length,
        errors: records.filter((r) => r.error).length,
      };
    }

    // Sales
    const iCust = pickColumn(headers, COL_ALIASES.customer) ?? pickColumn(headers, COL_ALIASES.first_name);
    const iProd = pickColumn(headers, COL_ALIASES.product);
    const iWeek = pickColumn(headers, COL_ALIASES.week);
    const iPrice = pickColumn(headers, COL_ALIASES.price);

    const records = body.map((r, idx) => {
      const rawCustomer = iCust !== null ? r[iCust] : "";
      const rawProduct = iProd !== null ? r[iProd] : "";
      const rawWeek = iWeek !== null ? r[iWeek] : "";
      const rawPrice = iPrice !== null ? r[iPrice] : "";

      const customer = resolveCustomer(rawCustomer, customers);
      const product = resolveProduct(rawProduct, products);
      const weekISO = toShabbosISO(rawWeek) || getCurrentShabbos();
      const priceNum = Number(String(rawPrice).replace(/[£$,\s]/g, ""));

      const errors = [];
      if (!customer) errors.push(`Unknown customer: "${String(rawCustomer || "—")}"`);
      if (!product.product_name) errors.push("Missing product");
      if (!priceNum || isNaN(priceNum)) errors.push("Invalid price");

      return {
        rowIndex: idx + 2,
        rawCustomer: String(rawCustomer || "").trim(),
        rawProduct: String(rawProduct || "").trim(),
        rawWeek: String(rawWeek || "").trim(),
        rawPrice: String(rawPrice || "").trim(),
        customer,
        product,
        week: weekISO,
        price: isFinite(priceNum) ? priceNum : 0,
        error: errors.length ? errors.join(" · ") : null,
      };
    });
    return {
      headers,
      records,
      valid: records.filter((r) => !r.error).length,
      errors: records.filter((r) => r.error).length,
    };
  }, [rows, kind, customers, products]);

  const doImport = async () => {
    if (!parsed.records.length || importing) return;
    setImporting(true);
    setProgress({ done: 0, total: parsed.valid });
    let inserted = 0; let skipped = 0;
    try {
      for (const rec of parsed.records) {
        if (rec.error) { skipped++; continue; }
        if (kind === "customers") {
          await api.customers.create({
            first_name: rec.first_name,
            last_name: rec.last_name || "",
            phone: rec.phone || "",
            notes: rec.notes || "",
          });
        } else {
          await api.sales.create({
            customer_id: rec.customer.id,
            customer_name: fullName(rec.customer),
            product_id: rec.product.product_id,
            product_name: rec.product.product_name,
            week: rec.week,
            price: rec.price,
          });
        }
        inserted++;
        setProgress({ done: inserted, total: parsed.valid });
      }
      qc.invalidateQueries({ queryKey: ["snapshot"] });
      toast.success(`Imported ${inserted} ${kind === "customers" ? "customers" : "sales"}${skipped ? ` (skipped ${skipped})` : ""}`);
      reset();
      onClose();
    } catch (e) {
      console.error(e);
      toast.error("Import failed midway. Please check the file and try again.");
    } finally {
      setImporting(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in" data-testid="import-modal">
      <div className="absolute inset-0 bg-ink-900/60 backdrop-blur-sm" onClick={handleClose} />
      <div className="relative card-lg w-full max-w-4xl max-h-[90vh] flex flex-col animate-slide-up">
        <div className="px-6 py-4 border-b border-line flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-md bg-brand-50 flex items-center justify-center">
              <FileSpreadsheet className="w-5 h-5 text-brand-700" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-ink-900">
                Import {kind === "customers" ? "customers" : "sales"} from Excel
              </h2>
              <p className="text-xs text-ink-500">Upload .xlsx, .xls or .csv — column names are matched flexibly.</p>
            </div>
          </div>
          <button onClick={handleClose} className="btn-ghost" disabled={importing} data-testid="import-close-btn"><X className="w-5 h-5" /></button>
        </div>

        <div className="p-6 overflow-y-auto pretty-scroll flex-1">
          {!rows ? (
            <div>
              {/* Drop / pick */}
              <div
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => { e.preventDefault(); }}
                onDrop={(e) => { e.preventDefault(); handleFile(e.dataTransfer.files[0]); }}
                className="border-2 border-dashed border-line2 rounded-lg px-8 py-14 text-center cursor-pointer hover:border-brand-700 hover:bg-brand-50/30 transition-colors"
                data-testid="import-dropzone"
              >
                <Upload className="w-10 h-10 mx-auto text-brand-700 mb-3" strokeWidth={1.5} />
                <p className="text-base font-semibold text-ink-900">Drop a file here or click to browse</p>
                <p className="text-sm text-ink-500 mt-1">Accepted: .xlsx, .xls, .csv</p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.xls,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,text/csv"
                  className="hidden"
                  onChange={(e) => handleFile(e.target.files[0])}
                  data-testid="import-file-input"
                />
              </div>

              {/* Format help */}
              <div className="mt-6 grid md:grid-cols-2 gap-4">
                <div className="rounded-md border border-line p-4 bg-surface2/40">
                  <p className="text-xs font-bold uppercase tracking-wider text-ink-500 mb-2">Expected columns</p>
                  {kind === "customers" ? (
                    <ul className="text-sm text-ink-700 space-y-1">
                      <li><b className="text-ink-900">first_name</b> — required</li>
                      <li><b className="text-ink-900">last_name</b> — optional</li>
                      <li><b className="text-ink-900">phone</b> — optional</li>
                      <li><b className="text-ink-900">notes</b> — optional</li>
                    </ul>
                  ) : (
                    <ul className="text-sm text-ink-700 space-y-1">
                      <li><b className="text-ink-900">customer</b> — full name, matched to your existing customers</li>
                      <li><b className="text-ink-900">product</b> — aliyah name (e.g. <span className="font-hebrew">כהן</span>, kohen, mevarekh) or a special product</li>
                      <li><b className="text-ink-900">week</b> — Shabbos date (any common format; non-Saturdays are snapped to the nearest Shabbos)</li>
                      <li><b className="text-ink-900">price</b> — number (£ symbol allowed)</li>
                    </ul>
                  )}
                  <p className="text-[11px] text-ink-400 mt-3">Column names are matched case-insensitively. Hebrew and English headers both work.</p>
                </div>
                <div className="rounded-md border border-line p-4 bg-surface2/40 flex flex-col">
                  <p className="text-xs font-bold uppercase tracking-wider text-ink-500 mb-2">Need a starting point?</p>
                  <p className="text-sm text-ink-700 flex-1">Download a sample template — fill it in, then upload it back here.</p>
                  <button onClick={() => downloadTemplate(kind)} className="btn-secondary mt-3 self-start" data-testid="import-template-btn">
                    <Download className="w-4 h-4" /> Download template
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div>
              {/* File summary */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <FileSpreadsheet className="w-6 h-6 text-brand-700" />
                  <div>
                    <p className="text-sm font-semibold text-ink-900">{filename}</p>
                    <p className="text-xs text-ink-500">{parsed.records.length} rows · {parsed.valid} ready · {parsed.errors} with issues</p>
                  </div>
                </div>
                <button onClick={reset} className="btn-ghost text-sm" disabled={importing} data-testid="import-choose-other">Choose another file</button>
              </div>

              {parsed.errors > 0 && (
                <div className="rounded-md bg-amber-50 border border-amber-500/30 px-4 py-3 mb-4 flex items-start gap-2.5">
                  <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
                  <div className="text-sm">
                    <b className="text-amber-700">{parsed.errors}</b>
                    <span className="text-amber-700"> row{parsed.errors === 1 ? "" : "s"} will be skipped. Fix them in your spreadsheet and re-upload to import all rows.</span>
                  </div>
                </div>
              )}

              {/* Preview table */}
              <div className="border border-line rounded-md overflow-hidden">
                <div className="max-h-[44vh] overflow-auto pretty-scroll">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th className="w-12">#</th>
                        {kind === "customers" ? (
                          <>
                            <th>First name</th>
                            <th>Last name</th>
                            <th>Phone</th>
                            <th>Notes</th>
                          </>
                        ) : (
                          <>
                            <th>Customer</th>
                            <th>Product</th>
                            <th>Week</th>
                            <th className="text-right">Price</th>
                          </>
                        )}
                        <th className="w-12 text-center">OK</th>
                      </tr>
                    </thead>
                    <tbody>
                      {parsed.records.map((r) => (
                        <tr key={r.rowIndex} className={classNames(r.error && "bg-danger-50/40")}>
                          <td className="font-mono text-ink-400">{r.rowIndex}</td>
                          {kind === "customers" ? (
                            <>
                              <td className="font-hebrew font-semibold">{r.first_name || <span className="text-danger-600">—</span>}</td>
                              <td className="font-hebrew">{r.last_name || <span className="text-ink-400">—</span>}</td>
                              <td className="font-mono text-xs text-ink-500">{r.phone || "—"}</td>
                              <td className="text-ink-500 text-xs">{r.notes || "—"}</td>
                            </>
                          ) : (
                            <>
                              <td>
                                {r.customer ? (
                                  <span className="font-hebrew font-semibold">{fullName(r.customer)}</span>
                                ) : (
                                  <span className="text-danger-600 text-xs">{r.rawCustomer || "—"} (unknown)</span>
                                )}
                              </td>
                              <td>{r.product.product_name ? <span className="chip-aliyah">{r.product.product_name}</span> : <span className="text-danger-600 text-xs">—</span>}</td>
                              <td className="font-mono text-xs">{r.week} <span className="text-ink-400">({getParshaForWeek(r.week).yiddish})</span></td>
                              <td className="font-mono font-bold text-brand-700 text-right">£{(r.price || 0).toFixed(0)}</td>
                            </>
                          )}
                          <td className="text-center">
                            {r.error ? (
                              <span title={r.error} className="inline-flex w-6 h-6 items-center justify-center rounded-full bg-danger-50 text-danger-600">
                                <AlertTriangle className="w-3.5 h-3.5" />
                              </span>
                            ) : (
                              <span className="inline-flex w-6 h-6 items-center justify-center rounded-full bg-emerald-50 text-emerald-700">
                                <Check className="w-3.5 h-3.5" />
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {parsed.errors > 0 && (
                <div className="mt-3 max-h-32 overflow-y-auto pretty-scroll">
                  <p className="text-[11px] uppercase tracking-wider text-ink-500 font-bold mb-1.5">Issues</p>
                  <ul className="text-xs text-danger-700 space-y-0.5">
                    {parsed.records.filter((r) => r.error).slice(0, 10).map((r) => (
                      <li key={r.rowIndex}><b>Row {r.rowIndex}:</b> {r.error}</li>
                    ))}
                    {parsed.records.filter((r) => r.error).length > 10 && (
                      <li className="text-ink-500">+ {parsed.records.filter((r) => r.error).length - 10} more...</li>
                    )}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-line flex items-center justify-between gap-3 bg-surface2/30">
          {importing ? (
            <div className="flex items-center gap-3 text-sm text-ink-700">
              <Loader2 className="w-4 h-4 animate-spin text-brand-700" />
              <span>Importing… <b>{progress.done}</b> of <b>{progress.total}</b></span>
            </div>
          ) : rows ? (
            <p className="text-xs text-ink-500">
              {parsed.valid > 0 ? (
                <>Ready to import <b className="text-emerald-700">{parsed.valid}</b> rows{parsed.errors > 0 ? <>; {parsed.errors} will be skipped.</> : "."}</>
              ) : (
                <>No valid rows. Please fix the issues above or choose a different file.</>
              )}
            </p>
          ) : (
            <p className="text-xs text-ink-500">No file selected yet.</p>
          )}
          <div className="flex items-center gap-2">
            <button onClick={handleClose} className="btn-secondary" disabled={importing} data-testid="import-cancel-btn">Cancel</button>
            <button
              onClick={doImport}
              disabled={importing || !rows || parsed.valid === 0}
              className="btn-primary"
              data-testid="import-confirm-btn"
            >
              {importing ? "Importing..." : `Import ${parsed.valid || 0} rows`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

import React, { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import api from "../lib/api";
import { fullName, classNames } from "../lib/jewishCalendar";
import { Filter, Plus, Minus, ArrowDownUp, Download } from "lucide-react";
import { generateStatementPDF } from "../lib/pdf";
import { toast } from "sonner";

export default function Transactions() {
  const { data } = useQuery({ queryKey: ["snapshot"], queryFn: api.snapshot });
  const customers = data?.customers || [];
  const sales = data?.sales || [];
  const payments = data?.payments || [];
  const extras = data?.extra_charges || [];

  const [selectedCustomer, setSelectedCustomer] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [downloading, setDownloading] = useState(false);

  const all = useMemo(() => {
    const combined = [
      ...sales.map((s) => ({ id: s.id, type: "sale", date: s.week || "", customer_id: s.customer_id, customer_name: s.customer_name, amount: s.price || 0, description: s.product_name, created_date: s.created_date })),
      ...payments.map((p) => ({ id: p.id, type: "payment", date: p.date || "", customer_id: p.customer_id, customer_name: p.customer_name, amount: -(p.amount || 0), description: p.notes || p.item_name || "Payment", created_date: p.created_date })),
      ...extras.map((e) => ({ id: e.id, type: "extra", date: e.date || "", customer_id: e.customer_id, customer_name: e.customer_name, amount: e.amount || 0, description: e.description, created_date: e.created_date })),
    ];
    let filtered = combined;
    if (selectedCustomer) filtered = filtered.filter((t) => t.customer_id === selectedCustomer);
    if (startDate) filtered = filtered.filter((t) => (t.date || t.created_date || "").slice(0, 10) >= startDate);
    if (endDate) filtered = filtered.filter((t) => (t.date || t.created_date || "").slice(0, 10) <= endDate);
    return filtered.sort((a, b) => (b.date || b.created_date || "").localeCompare(a.date || a.created_date || ""));
  }, [sales, payments, extras, selectedCustomer, startDate, endDate]);

  const summary = useMemo(() => ({
    sales: all.filter((t) => t.type === "sale").reduce((a, t) => a + t.amount, 0),
    payments: all.filter((t) => t.type === "payment").reduce((a, t) => a + Math.abs(t.amount), 0),
    extras: all.filter((t) => t.type === "extra").reduce((a, t) => a + t.amount, 0),
  }), [all]);

  const downloadPDF = async () => {
    if (downloading || all.length === 0) return;
    setDownloading(true);
    try {
      const customer = selectedCustomer
        ? customers.find((c) => c.id === selectedCustomer)
        : { first_name: "All", last_name: "Customers" };

      // Compute totals from filtered view
      const totalOwed = summary.sales + summary.extras;
      const totalPaid = summary.payments;
      const balance = totalOwed - totalPaid;

      // Reverse sort for chronological order in the statement (oldest first)
      const tx = [...all].sort((a, b) => (a.date || a.created_date || "").localeCompare(b.date || b.created_date || ""));
      await generateStatementPDF({
        customer,
        transactions: tx,
        totals: { totalOwed, totalPaid, balance },
      });
      toast.success("Statement downloaded");
    } catch (e) {
      console.error(e);
      toast.error("Could not generate PDF");
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="px-8 md:px-12 py-10 max-w-[1300px]">
      <div className="mb-8 animate-fade-in">
        <p className="kicker mb-2">Master Ledger</p>
        <h1 className="text-3xl md:text-4xl font-bold text-ink-900 tracking-tight">Transactions</h1>
        <p className="text-ink-500 mt-2 text-[15px]">All sales, payments, and extra charges in one place.</p>
      </div>

      <div className="card p-5 mb-6">
        <div className="flex items-center gap-2 mb-3"><Filter className="w-4 h-4 text-brand-700" /><p className="text-sm font-bold text-ink-900">Filters</p></div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="label">Customer</label>
            <select data-testid="tx-customer-filter" value={selectedCustomer} onChange={(e) => setSelectedCustomer(e.target.value)} className="input w-full">
              <option value="">— All customers —</option>
              {customers.map((c) => <option key={c.id} value={c.id}>{fullName(c)}</option>)}
            </select>
          </div>
          <div>
            <label className="label">From</label>
            <input data-testid="tx-from-date" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="input w-full" />
          </div>
          <div>
            <label className="label">To</label>
            <input data-testid="tx-to-date" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="input w-full" />
          </div>
        </div>
        {(selectedCustomer || startDate || endDate) && (
          <button onClick={() => { setSelectedCustomer(""); setStartDate(""); setEndDate(""); }} className="mt-3 text-xs text-ink-500 hover:text-brand-700 underline" data-testid="tx-reset">Reset filters</button>
        )}
      </div>

      <div className="grid grid-cols-3 gap-5 mb-6">
        <SumCard label="Total sales" value={summary.sales} tone="ink" testid="tx-sum-sales" />
        <SumCard label="Total payments" value={summary.payments} tone="paid" testid="tx-sum-payments" />
        <SumCard label="Total extras" value={summary.extras} tone="warn" testid="tx-sum-extras" />
      </div>

      <div className="flex justify-end mb-4">
        <button onClick={downloadPDF} disabled={all.length === 0 || downloading} className="btn-secondary" data-testid="tx-download-btn">
          <Download className="w-4 h-4" /> {downloading ? "Generating..." : "Download statement (PDF)"}
        </button>
      </div>

      <div className="card overflow-hidden">
        <table className="data-table">
          <thead><tr><th>Date</th><th>Customer</th><th>Type</th><th>Description</th><th className="text-right">Amount</th></tr></thead>
          <tbody>
            {all.length === 0 ? (
              <tr><td colSpan={5} className="text-center text-ink-400 py-10">No transactions match the filters.</td></tr>
            ) : all.map((t) => (
              <tr key={`${t.type}-${t.id}`} data-testid={`tx-row-${t.id}`}>
                <td className="text-ink-500 text-xs font-mono">{(t.date || t.created_date || "").slice(0, 10)}</td>
                <td className="font-hebrew font-semibold">{t.customer_name}</td>
                <td>
                  {t.type === "sale" && <span className="inline-flex items-center gap-1 bg-brand-50 text-brand-700 px-2.5 py-0.5 rounded text-xs font-bold border border-brand-100"><ArrowDownUp className="w-3 h-3" /> Sale</span>}
                  {t.type === "payment" && <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 px-2.5 py-0.5 rounded text-xs font-bold border border-emerald-500/20"><Minus className="w-3 h-3" /> Payment</span>}
                  {t.type === "extra" && <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-600 px-2.5 py-0.5 rounded text-xs font-bold border border-amber-500/20"><Plus className="w-3 h-3" /> Extra</span>}
                </td>
                <td className="text-ink-700">
                  <span className={t.type === "sale" ? "font-hebrew" : ""}>{t.description}</span>
                </td>
                <td className={classNames("font-mono font-bold tabular-nums text-right", t.amount > 0 ? "text-ink-900" : "text-emerald-700")}>
                  {t.amount > 0 ? "+" : "−"}£{Math.abs(t.amount).toFixed(0)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function SumCard({ label, value, tone, testid }) {
  const cls = { ink: "text-ink-900", paid: "text-emerald-700", warn: "text-amber-600", debt: "text-danger-700" }[tone] || "text-ink-900";
  return (
    <div className="card px-6 py-5" data-testid={testid}>
      <p className="text-[11px] uppercase tracking-wider text-ink-500 font-bold">{label}</p>
      <p className={classNames("font-mono text-[26px] mt-2 tabular-nums font-bold", cls)}>£{value.toFixed(0)}</p>
    </div>
  );
}

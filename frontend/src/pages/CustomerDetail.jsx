import React, { useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import api from "../lib/api";
import { fullName, classNames, STANDARD_ALIYOS, getParshaForWeek, formatGregorianYiddish } from "../lib/jewishCalendar";
import { ChevronLeft, Trash2, Coins, Receipt, FileDown, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { generateStatementPDF } from "../lib/pdf";

function formatWeek(weekId) {
  if (!weekId) return "—";
  const p = getParshaForWeek(weekId);
  return `${p.yiddish} · ${formatGregorianYiddish(weekId)}`;
}

export default function CustomerDetail() {
  const { id } = useParams();
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: ["snapshot"], queryFn: api.snapshot });
  const customers = data?.customers || [];
  const sales = data?.sales || [];
  const payments = data?.payments || [];
  const extras = data?.extra_charges || [];
  const customer = customers.find((c) => c.id === id);

  const mySales = sales.filter((s) => s.customer_id === id);
  const myPayments = payments.filter((p) => p.customer_id === id);
  const myExtras = extras.filter((e) => e.customer_id === id);
  const totalOwed = mySales.reduce((a, s) => a + (s.price || 0), 0) + myExtras.reduce((a, e) => a + (e.amount || 0), 0);
  const totalPaid = myPayments.reduce((a, p) => a + (p.amount || 0), 0);
  const balance = totalOwed - totalPaid;

  const [tab, setTab] = useState("sales");
  const [downloading, setDownloading] = useState(false);

  const [payAmount, setPayAmount] = useState("");
  const [payDate, setPayDate] = useState(new Date().toISOString().slice(0, 10));
  const [payNote, setPayNote] = useState("");
  const [payItemId, setPayItemId] = useState("");
  const [savingPay, setSavingPay] = useState(false);

  const [extraDesc, setExtraDesc] = useState("");
  const [extraAmount, setExtraAmount] = useState("");
  const [extraDate, setExtraDate] = useState(new Date().toISOString().slice(0, 10));
  const [savingExtra, setSavingExtra] = useState(false);

  const handleAddPayment = async () => {
    if (!payAmount) return;
    setSavingPay(true);
    try {
      const linkedSale = payItemId ? mySales.find((s) => s.id === payItemId) : null;
      await api.payments.create({
        customer_id: id, customer_name: fullName(customer),
        amount: parseFloat(payAmount), date: payDate, notes: payNote,
        item_id: linkedSale?.id || null, item_name: linkedSale?.product_name || null,
      });
      qc.invalidateQueries({ queryKey: ["snapshot"] });
      setPayAmount(""); setPayNote(""); setPayItemId("");
      toast.success("Payment recorded");
    } finally { setSavingPay(false); }
  };

  const handleAddExtra = async () => {
    if (!extraDesc.trim() || !extraAmount) return;
    setSavingExtra(true);
    try {
      await api.extras.create({
        customer_id: id, customer_name: fullName(customer),
        description: extraDesc.trim(), amount: parseFloat(extraAmount), date: extraDate,
      });
      qc.invalidateQueries({ queryKey: ["snapshot"] });
      setExtraDesc(""); setExtraAmount("");
      toast.success("Extra charge recorded");
    } finally { setSavingExtra(false); }
  };

  const deleteSale = async (sid) => { await api.sales.remove(sid); qc.invalidateQueries({ queryKey: ["snapshot"] }); };
  const deletePayment = async (pid) => { await api.payments.remove(pid); qc.invalidateQueries({ queryKey: ["snapshot"] }); };
  const deleteExtra = async (eid) => { await api.extras.remove(eid); qc.invalidateQueries({ queryKey: ["snapshot"] }); };

  const transactions = useMemo(() => {
    const all = [
      ...mySales.map((s) => ({ type: "sale", date: s.week, description: s.product_name, amount: s.price || 0 })),
      ...myExtras.map((e) => ({ type: "extra", date: e.date, description: e.description, amount: e.amount || 0 })),
      ...myPayments.map((p) => ({ type: "payment", date: p.date, description: p.notes || p.item_name || "Payment", amount: -(p.amount || 0) })),
    ].sort((a, b) => (a.date || "").localeCompare(b.date || ""));
    return all;
  }, [mySales, myExtras, myPayments]);

  const downloadPDF = async () => {
    if (!customer || downloading) return;
    setDownloading(true);
    try {
      await generateStatementPDF({
        customer,
        transactions,
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

  if (!customer) {
    return <div className="p-12 text-center text-ink-500">Loading customer...</div>;
  }

  return (
    <div className="px-8 md:px-12 py-10 max-w-[1300px]">
      {/* Header */}
      <div className="flex flex-wrap items-center gap-4 mb-8 animate-fade-in">
        <Link to="/app/customers" className="p-2 rounded-md text-ink-500 hover:text-brand-700 hover:bg-surface2 transition-colors" data-testid="back-link">
          <ChevronLeft className="w-5 h-5" />
        </Link>
        <div className="flex-1 min-w-0">
          <p className="kicker mb-1">Customer</p>
          <h1 className="font-hebrew text-3xl md:text-4xl text-ink-900 leading-none font-bold" data-testid="customer-name">{fullName(customer)}</h1>
          {customer.phone && <p className="text-ink-500 text-sm mt-2 font-mono">{customer.phone}</p>}
        </div>
        <button onClick={downloadPDF} disabled={downloading} className="btn-secondary" data-testid="download-statement-btn">
          {downloading ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileDown className="w-4 h-4" />}
          {downloading ? "Generating..." : "Download statement"}
        </button>
        <div className={classNames("px-5 py-3 rounded-md font-mono text-base font-bold tabular-nums border-2",
          balance > 0 ? "bg-danger-50 border-danger-500/30 text-danger-700" : "bg-emerald-50 border-emerald-500/30 text-emerald-700")} data-testid="balance-badge">
          {balance > 0 ? `Owes £${balance.toFixed(0)}` : "Paid in full"}
        </div>
      </div>

      {/* Sum cards */}
      <div className="grid grid-cols-3 gap-5 mb-8">
        <SumCard label="Total charges" value={totalOwed} tone="ink" testid="sum-total" />
        <SumCard label="Total paid" value={totalPaid} tone="paid" testid="sum-paid" />
        <SumCard label="Outstanding" value={Math.max(balance, 0)} tone={balance > 0 ? "debt" : "paid"} testid="sum-balance" />
      </div>

      {/* Forms */}
      <div className="grid lg:grid-cols-2 gap-6 mb-8">
        <div className="card p-6">
          <h3 className="text-lg font-bold text-ink-900 flex items-center gap-2 mb-4"><Coins className="w-4 h-4 text-emerald-700" /> Record a payment</h3>
          <div className="space-y-3">
            <div className="flex gap-3">
              <div className="flex-1">
                <label className="label">Amount (£)</label>
                <input data-testid="pay-amount-input" type="number" value={payAmount} onChange={(e) => setPayAmount(e.target.value)} className="input w-full font-mono" />
              </div>
              <div className="flex-1">
                <label className="label">Date</label>
                <input data-testid="pay-date-input" type="date" value={payDate} onChange={(e) => setPayDate(e.target.value)} className="input w-full" />
              </div>
            </div>
            <div>
              <label className="label">Link to a specific sale (optional)</label>
              <select data-testid="pay-item-select" value={payItemId} onChange={(e) => setPayItemId(e.target.value)} className="input w-full">
                <option value="">— No specific item —</option>
                {mySales.map((s) => (
                  <option key={s.id} value={s.id}>{s.product_name} · {formatWeek(s.week)} · £{s.price?.toFixed(0)}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Note</label>
              <input data-testid="pay-note-input" value={payNote} onChange={(e) => setPayNote(e.target.value)} className="input w-full" placeholder="Optional note..." />
            </div>
            <button onClick={handleAddPayment} disabled={savingPay || !payAmount} className="btn-success w-full" data-testid="add-payment-btn">
              {savingPay ? "Saving..." : "Record payment"}
            </button>
          </div>
        </div>

        <div className="card p-6">
          <h3 className="text-lg font-bold text-ink-900 flex items-center gap-2 mb-4"><Receipt className="w-4 h-4 text-amber-600" /> Add an extra charge</h3>
          <div className="space-y-3">
            <div>
              <label className="label">Description</label>
              <input data-testid="extra-desc-input" value={extraDesc} onChange={(e) => setExtraDesc(e.target.value)} className="input w-full" placeholder="What is this charge for?" />
            </div>
            <div className="flex gap-3">
              <div className="flex-1">
                <label className="label">Amount (£)</label>
                <input data-testid="extra-amount-input" type="number" value={extraAmount} onChange={(e) => setExtraAmount(e.target.value)} className="input w-full font-mono" />
              </div>
              <div className="flex-1">
                <label className="label">Date</label>
                <input data-testid="extra-date-input" type="date" value={extraDate} onChange={(e) => setExtraDate(e.target.value)} className="input w-full" />
              </div>
            </div>
            <button onClick={handleAddExtra} disabled={savingExtra || !extraDesc || !extraAmount} className="btn-warn w-full" data-testid="add-extra-btn">
              {savingExtra ? "Saving..." : "Add charge"}
            </button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-surface2 border border-line2 rounded-md p-1 mb-4 inline-flex">
        {[
          { id: "sales", label: `Sales (${mySales.length})` },
          { id: "extras", label: `Extras (${myExtras.length})` },
          { id: "payments", label: `Payments (${myPayments.length})` },
        ].map((t) => (
          <button
            key={t.id}
            data-testid={`tab-${t.id}`}
            onClick={() => setTab(t.id)}
            className={classNames("px-5 py-2 rounded text-sm font-semibold transition-all",
              tab === t.id ? "bg-brand-900 text-white shadow-card" : "text-ink-500 hover:text-ink-900")}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="card overflow-hidden">
        {tab === "sales" && (
          <table className="data-table">
            <thead><tr><th>Item</th><th>Shabbos</th><th>Price</th><th className="w-10"></th></tr></thead>
            <tbody>
              {mySales.length === 0 && <tr><td colSpan={4} className="text-center text-ink-400 py-10">No sales yet.</td></tr>}
              {mySales.map((s) => {
                const aliya = STANDARD_ALIYOS.find((a) => a.id === s.product_id);
                return (
                  <tr key={s.id} data-testid={`detail-sale-${s.id}`}>
                    <td>{aliya ? <span className="chip-aliyah">{aliya.label}</span> : <span className="font-hebrew font-semibold">{s.product_name}</span>}</td>
                    <td className="text-ink-500 text-xs font-hebrew">{formatWeek(s.week)}</td>
                    <td className="font-mono font-bold tabular-nums text-brand-700">£{s.price.toFixed(0)}</td>
                    <td><button onClick={() => deleteSale(s.id)} className="text-ink-400 hover:text-danger-600"><Trash2 className="w-4 h-4" /></button></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
        {tab === "extras" && (
          <table className="data-table">
            <thead><tr><th>Description</th><th>Date</th><th>Amount</th><th className="w-10"></th></tr></thead>
            <tbody>
              {myExtras.length === 0 && <tr><td colSpan={4} className="text-center text-ink-400 py-10">No extra charges.</td></tr>}
              {myExtras.map((e) => (
                <tr key={e.id} data-testid={`detail-extra-${e.id}`}>
                  <td className="font-hebrew font-semibold">{e.description}</td>
                  <td className="text-ink-500 text-xs font-mono">{e.date || "—"}</td>
                  <td className="font-mono font-bold tabular-nums text-amber-600">£{e.amount.toFixed(0)}</td>
                  <td><button onClick={() => deleteExtra(e.id)} className="text-ink-400 hover:text-danger-600"><Trash2 className="w-4 h-4" /></button></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {tab === "payments" && (
          <table className="data-table">
            <thead><tr><th>Amount</th><th>Date</th><th>Note</th><th className="w-10"></th></tr></thead>
            <tbody>
              {myPayments.length === 0 && <tr><td colSpan={4} className="text-center text-ink-400 py-10">No payments yet.</td></tr>}
              {myPayments.map((p) => (
                <tr key={p.id} data-testid={`detail-payment-${p.id}`}>
                  <td className="font-mono font-bold tabular-nums text-emerald-700">£{p.amount.toFixed(0)}</td>
                  <td className="text-ink-500 text-xs font-mono">{p.date || "—"}</td>
                  <td>
                    {p.item_name && <span className="chip-aliyah mr-2">{p.item_name}</span>}
                    {p.notes && <span className="text-ink-500 text-sm">{p.notes}</span>}
                  </td>
                  <td><button onClick={() => deletePayment(p.id)} className="text-ink-400 hover:text-danger-600"><Trash2 className="w-4 h-4" /></button></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function SumCard({ label, value, tone, testid }) {
  const tones = { ink: "text-ink-900", paid: "text-emerald-700", debt: "text-danger-700" };
  return (
    <div className="card px-6 py-5" data-testid={testid}>
      <p className="text-[11px] uppercase tracking-wider text-ink-500 font-bold">{label}</p>
      <p className={classNames("font-mono text-[28px] mt-2 tabular-nums font-bold", tones[tone] || "text-ink-900")}>£{Math.abs(value).toFixed(0)}</p>
    </div>
  );
}

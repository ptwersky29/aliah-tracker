import React, { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import api from "../lib/api";
import {
  STANDARD_ALIYOS, getNextSaleableDate, getParshaForWeek, formatGregorianYiddish,
  classNames, fullName, YT_BY_DATE, YOM_TOV_COLORS,
} from "../lib/jewishCalendar";
import { Gavel, List, Check, Undo2, Trash2, Search, BookOpen, Upload } from "lucide-react";
import { toast } from "sonner";
import ImportModal from "../components/ImportModal";
import ShabbosCalendarPicker from "../components/ShabbosCalendarPicker";

const QUICK = [10, 18, 25, 36, 50, 100];
const INCS = [5, 10, 18, 25, 50];

function CustomerCombobox({ customers, value, onChange, testid }) {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const selected = customers.find((c) => c.id === value);
  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return customers.slice(0, 50);
    return customers.filter((c) => fullName(c).toLowerCase().includes(s) || (c.phone || "").includes(s)).slice(0, 50);
  }, [customers, q]);

  return (
    <div className="relative">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-400" />
        <input
          data-testid={testid}
          value={q || (selected ? fullName(selected) : "")}
          onFocus={() => { setOpen(true); setQ(""); }}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search a customer..."
          className="input w-full pl-9 text-base font-hebrew"
        />
      </div>
      {open && (
        <div className="absolute mt-1 left-0 right-0 max-h-64 overflow-y-auto pretty-scroll bg-surface border border-line2 rounded-md shadow-pop z-20 animate-slide-up">
          {filtered.map((c) => (
            <button
              key={c.id}
              onMouseDown={() => { onChange(c.id); setQ(""); setOpen(false); }}
              className={classNames(
                "w-full px-4 py-2 flex items-center justify-between gap-2 hover:bg-brand-50 transition-colors text-left",
                c.id === value && "bg-brand-50",
              )}
              data-testid={`customer-option-${c.id}`}
            >
              <span className="font-hebrew font-semibold text-ink-900">{fullName(c)}</span>
              {c.phone && <span className="text-[10px] text-ink-400 font-mono">{c.phone}</span>}
            </button>
          ))}
          {filtered.length === 0 && (
            <p className="px-4 py-3 text-sm text-ink-400 text-center">No matches</p>
          )}
        </div>
      )}
    </div>
  );
}

function LikelyBuyers({ customers, allSales, productId, onPick }) {
  const top = useMemo(() => {
    const counter = new Map();
    allSales
      .filter((s) => s.product_id === productId)
      .forEach((s) => counter.set(s.customer_id, (counter.get(s.customer_id) || 0) + 1));
    return Array.from(counter.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([cid, n]) => ({ customer: customers.find((c) => c.id === cid), n }))
      .filter((x) => x.customer);
  }, [customers, allSales, productId]);

  if (!top.length) return null;
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-[11px] uppercase tracking-wider text-ink-500 font-bold">Frequent:</span>
      {top.map(({ customer, n }) => (
        <button
          key={customer.id}
          onClick={() => onPick(customer.id)}
          data-testid={`likely-buyer-${customer.id}`}
          className="chip-aliyah hover:border-brand-600 hover:text-brand-700 transition-all"
        >
          {fullName(customer)} · {n}×
        </button>
      ))}
    </div>
  );
}

function AuctionMode({ week, yt, customers, products, weekSales, allSales }) {
  const qc = useQueryClient();
  const items = [...STANDARD_ALIYOS, ...products.map((p) => ({ id: p.id, label: p.name, isCustom: true, default_price: p.default_price }))];

  const [selectedId, setSelectedId] = useState(items[0]?.id || "");
  const [customerId, setCustomerId] = useState("");
  const [price, setPrice] = useState("");
  const [saving, setSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState(null);

  const selected = items.find((i) => i.id === selectedId);
  const itemSales = weekSales.filter((s) => s.product_id === selectedId);
  const highest = itemSales.reduce((max, s) => Math.max(max, s.price || 0), 0);
  const soldIds = new Set(weekSales.map((s) => s.product_id));

  const handlePick = (id) => { setSelectedId(id); setPrice(""); };
  const handleQuick = (a) => setPrice(String(a));
  const handleAdd = (a) => setPrice((p) => String((parseFloat(p) || 0) + a));

  const handleSave = async () => {
    if (!selectedId || !customerId || !price) return;
    setSaving(true);
    try {
      const cust = customers.find((c) => c.id === customerId);
      const aliyah = STANDARD_ALIYOS.find((a) => a.id === selectedId);
      const prod = products.find((p) => p.id === selectedId);
      const created = await api.sales.create({
        customer_id: customerId,
        customer_name: fullName(cust),
        product_id: selectedId,
        product_name: aliyah?.label || prod?.name || "",
        week,
        price: parseFloat(price),
      });
      setLastSaved({ id: created.id, label: aliyah?.label || prod?.name, customerName: fullName(cust), price: parseFloat(price) });
      await qc.invalidateQueries({ queryKey: ["snapshot"] });
      await qc.refetchQueries({ queryKey: ["snapshot"] });
      setPrice("");
      setCustomerId("");
      const idx = items.findIndex((i) => i.id === selectedId);
      if (idx < items.length - 1) setSelectedId(items[idx + 1].id);
      toast.success(`${aliyah?.label || prod?.name} → ${fullName(cust)} · £${price}`);
    } catch (e) {
      toast.error("Could not save the sale");
    } finally {
      setSaving(false);
    }
  };

  const handleUndo = async () => {
    if (!lastSaved) return;
    await api.sales.remove(lastSaved.id);
    await qc.invalidateQueries({ queryKey: ["snapshot"] });
    await qc.refetchQueries({ queryKey: ["snapshot"] });
    setLastSaved(null);
    toast("Last sale undone");
  };

  const handleDelete = async (id) => {
    await api.sales.remove(id);
    await qc.invalidateQueries({ queryKey: ["snapshot"] });
    await qc.refetchQueries({ queryKey: ["snapshot"] });
    if (lastSaved?.id === id) setLastSaved(null);
  };

  const weekTotal = weekSales.reduce((a, s) => a + (s.price || 0), 0);

  return (
    <div className="grid lg:grid-cols-5 gap-6">
      {/* Aliyah selector */}
      <div className="lg:col-span-2 card overflow-hidden">
        <div className="px-5 py-4 border-b border-line bg-surface2/40">
          <p className="text-[11px] uppercase tracking-widest text-brand-600 font-bold">Select an item</p>
          <p className="text-xs text-ink-500 mt-0.5">Aliyah or special product</p>
        </div>
        <div className="p-2 max-h-[68vh] overflow-y-auto pretty-scroll space-y-1">
          {items.map((item) => {
            const isSold = soldIds.has(item.id);
            const isSel = item.id === selectedId;
            const t = weekSales.filter((s) => s.product_id === item.id).reduce((a, s) => a + (s.price || 0), 0);
            return (
              <button
                key={item.id}
                data-testid={`aliyah-${item.id}`}
                onClick={() => handlePick(item.id)}
                className={classNames(
                  "w-full flex items-center justify-between px-3.5 py-3 rounded-md transition-all border text-left",
                  isSel
                    ? "bg-brand-900 text-white border-brand-900 shadow-card"
                    : isSold
                    ? "bg-emerald-50 border-emerald-500/25 text-emerald-700 hover:bg-emerald-50/80"
                    : "border-transparent hover:bg-surface2 text-ink-900",
                )}
              >
                <div className="flex items-center gap-2 min-w-0">
                  {isSold && !isSel && <Check className="w-3.5 h-3.5 text-emerald-700 shrink-0" />}
                  <span className="font-hebrew text-[15px] font-semibold truncate">{item.label}</span>
                </div>
                {t > 0 && (
                  <span className={classNames(
                    "text-xs font-mono tabular-nums px-2 py-0.5 rounded font-bold shrink-0 ml-2",
                    isSel ? "bg-white/15 text-white" : "bg-emerald-500/15 text-emerald-700",
                  )}>
                    £{t.toFixed(0)}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Entry */}
      <div className="lg:col-span-3 space-y-5">
        <div className="rounded-lg bg-brand-900 text-white px-6 py-5 flex items-baseline justify-between gap-4 flex-wrap">
          <div className="min-w-0">
            <p className="text-[10px] uppercase tracking-[0.2em] text-emerald-500 font-bold">Current item</p>
            <p className="font-hebrew text-3xl text-white mt-1 leading-none font-bold truncate">{selected?.label || "—"}</p>
          </div>
          {highest > 0 && (
            <div className="text-right">
              <p className="text-[10px] uppercase tracking-widest text-white/55 font-bold">Highest bid</p>
              <p className="font-mono text-3xl text-emerald-500 tabular-nums font-bold">£{highest.toFixed(0)}</p>
            </div>
          )}
        </div>

        <LikelyBuyers
          customers={customers}
          allSales={allSales}
          productId={selectedId}
          onPick={setCustomerId}
        />

        <div>
          <label className="label">Customer</label>
          <CustomerCombobox testid="auction-customer-search" customers={customers} value={customerId} onChange={setCustomerId} />
        </div>

        <div>
          <label className="label">Price (£)</label>
          <input
            data-testid="auction-price-input"
            type="number"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSave()}
            placeholder="0"
            className="w-full bg-surface border-2 border-line2 focus:border-brand-700 focus:ring-4 focus:ring-brand-700/10 rounded-md px-5 py-4 text-4xl font-mono font-bold tabular-nums text-ink-900 text-center transition-all"
            autoFocus
          />
          <div className="grid grid-cols-6 gap-2 mt-3">
            {QUICK.map((a) => (
              <button key={a} data-testid={`quick-price-${a}`} onClick={() => handleQuick(a)} className="price-chip">£{a}</button>
            ))}
          </div>
          <div className="grid grid-cols-5 gap-2 mt-2">
            {INCS.map((a) => (
              <button key={`inc${a}`} data-testid={`inc-price-${a}`} onClick={() => handleAdd(a)} className="price-chip price-chip-add">
                +{a}
              </button>
            ))}
          </div>
        </div>

        <div className="flex gap-3">
          <button
            data-testid="auction-save-btn"
            onClick={handleSave}
            disabled={saving || !selectedId || !customerId || !price}
            className="flex-1 bg-brand-900 text-white py-4 rounded-md text-lg font-bold hover:bg-brand-800 active:scale-[0.99] transition-all disabled:opacity-40 shadow-card"
          >
            {saving ? "Saving..." : "Save sale"}
          </button>
          {lastSaved && (
            <button
              data-testid="auction-undo-btn"
              onClick={handleUndo}
              className="btn-danger px-5"
            >
              <Undo2 className="w-4 h-4" />
              <span className="hidden md:inline">Undo</span>
            </button>
          )}
        </div>

        {lastSaved && (
          <div className="px-4 py-3 rounded-md bg-emerald-50 border border-emerald-500/30 text-emerald-700 font-semibold flex items-center gap-2 text-sm">
            <Check className="w-4 h-4" />
            <span><span className="font-hebrew">{lastSaved.label}</span> → <span className="font-hebrew">{lastSaved.customerName}</span> — £{lastSaved.price.toFixed(0)}</span>
          </div>
        )}

        {itemSales.length > 0 && (
          <div className="card overflow-hidden">
            <div className="px-5 py-3 border-b border-line bg-surface2/40">
              <p className="text-[11px] uppercase tracking-widest text-brand-600 font-bold">Sales for <span className="font-hebrew text-ink-900">{selected?.label}</span></p>
            </div>
            <ul className="divide-y divide-line">
              {itemSales.map((s) => (
                <li key={s.id} className="flex items-center justify-between px-5 py-3">
                  <span className="font-hebrew font-semibold text-ink-900">{s.customer_name}</span>
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-brand-700 font-bold tabular-nums">£{s.price.toFixed(0)}</span>
                    <button onClick={() => handleDelete(s.id)} className="text-ink-400 hover:text-danger-600 transition-colors" data-testid={`del-sale-${s.id}`}>
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="flex items-center justify-between px-5 py-4 bg-surface2 rounded-md border border-line">
          <span className="text-xs font-bold text-ink-500 uppercase tracking-widest">{yt ? "Yom Tov total" : "This Shabbos total"}</span>
          <span className="font-mono text-3xl font-bold text-brand-900 tabular-nums" data-testid="week-total">£{weekTotal.toFixed(2)}</span>
        </div>
      </div>
    </div>
  );
}

function ListMode({ parsha, yt, weekSales }) {
  const qc = useQueryClient();
  const handleDelete = async (id) => {
    await api.sales.remove(id);
    await qc.invalidateQueries({ queryKey: ["snapshot"] });
    await qc.refetchQueries({ queryKey: ["snapshot"] });
  };
  const total = weekSales.reduce((a, s) => a + (s.price || 0), 0);

  const byCustomer = useMemo(() => {
    const m = {};
    weekSales.forEach((s) => {
      const k = s.customer_id;
      if (!m[k]) m[k] = { name: s.customer_name, total: 0, count: 0 };
      m[k].total += s.price || 0;
      m[k].count++;
    });
    return Object.values(m).sort((a, b) => b.total - a.total).slice(0, 5);
  }, [weekSales]);

  if (!weekSales.length) {
    return <div className="card py-16 text-center text-ink-400">No sales yet for {yt ? yt.yiddish : "this Shabbos"}.</div>;
  }

  return (
    <div className="space-y-6">
      {byCustomer.length > 0 && (
        <div className="card p-5">
          <p className="text-[11px] uppercase tracking-widest text-brand-600 font-bold mb-3">Top buyers</p>
          <div className="flex flex-wrap gap-3">
            {byCustomer.map((b, i) => (
              <div key={b.name} className="flex items-center gap-2 px-4 py-2 bg-brand-50 border border-brand-100 rounded-md">
                <span className="w-6 h-6 bg-brand-900 text-white font-bold rounded-full flex items-center justify-center text-[11px]">{i + 1}</span>
                <span className="font-hebrew font-semibold text-sm">{b.name}</span>
                <span className="font-mono font-bold text-brand-700 tabular-nums">£{b.total.toFixed(0)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
      <div className="card overflow-hidden">
        <div className="px-6 py-4 border-b border-line flex items-center justify-between">
          <h3 className="text-lg font-bold text-ink-900">
            <span className="font-hebrew">{yt ? yt.yiddish : parsha.yiddish}</span> · {weekSales.length} sales
          </h3>
          <p className="font-mono text-brand-700 text-lg font-bold tabular-nums">£{total.toFixed(2)}</p>
        </div>
        <table className="data-table">
          <thead>
            <tr><th>Item</th><th>Buyer</th><th>Price</th><th className="w-10"></th></tr>
          </thead>
          <tbody>
            {weekSales.map((s) => {
              const aliya = STANDARD_ALIYOS.find((a) => a.id === s.product_id);
              return (
                <tr key={s.id} data-testid={`list-sale-${s.id}`}>
                  <td>{aliya ? <span className="chip-aliyah">{aliya.label}</span> : <span className="font-hebrew font-semibold">{s.product_name}</span>}</td>
                  <td className="font-hebrew font-semibold">{s.customer_name}</td>
                  <td className="font-mono text-brand-700 font-bold tabular-nums">£{s.price.toFixed(0)}</td>
                  <td>
                    <button onClick={() => handleDelete(s.id)} className="text-ink-400 hover:text-danger-600 transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function Sales() {
  const [week, setWeek] = useState(getNextSaleableDate());
  const [mode, setMode] = useState("auction");
  const [importOpen, setImportOpen] = useState(false);
  const { data } = useQuery({ queryKey: ["snapshot"], queryFn: api.snapshot });

  const customers = data?.customers || [];
  const products = data?.products || [];
  const sales = data?.sales || [];
  const yt = YT_BY_DATE[week] || null;
  const parsha = yt ? null : getParshaForWeek(week);
  const weekSales = sales.filter((s) => s.week === week);
  const weekTotal = weekSales.reduce((a, s) => a + (s.price || 0), 0);

  return (
    <div className="px-8 md:px-12 py-10 max-w-[1400px]">
      <div className="flex flex-wrap items-end justify-between gap-5 mb-8">
        <div>
          <p className="kicker mb-2">{yt ? "Yom Tov Auction" : "Weekly Auction"}</p>
          <h1 className="text-3xl md:text-4xl font-bold text-ink-900 tracking-tight">Auction</h1>
          <div className="flex items-center gap-2 mt-3 text-sm text-ink-500 flex-wrap">
            <BookOpen className="w-4 h-4 text-brand-700" />
            {yt ? (
              <>
                <span className="font-hebrew font-semibold text-ink-900 text-base">{yt.yiddish}</span>
                <span>·</span>
                <span className={classNames("text-[10px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wider", YOM_TOV_COLORS[yt.type] || "")}>
                  {yt.type}
                </span>
              </>
            ) : (
              <>
                <span className="font-hebrew font-semibold text-ink-900 text-base">{parsha.yiddish}</span>
                <span>·</span>
                <span>{parsha.book}</span>
                {parsha.note && <span className="badge-warn">{parsha.note}</span>}
              </>
            )}
            <span>·</span>
            <span>{formatGregorianYiddish(week)}</span>
          </div>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex bg-surface2 border border-line2 rounded-md p-1">
            <button
              data-testid="mode-auction"
              onClick={() => setMode("auction")}
              className={classNames("flex items-center gap-1.5 px-3.5 py-1.5 rounded text-sm font-semibold transition-all",
                mode === "auction" ? "bg-brand-900 text-white shadow-card" : "text-ink-500 hover:text-ink-900")}
            >
              <Gavel className="w-3.5 h-3.5" /> Auction
            </button>
            <button
              data-testid="mode-list"
              onClick={() => setMode("list")}
              className={classNames("flex items-center gap-1.5 px-3.5 py-1.5 rounded text-sm font-semibold transition-all",
                mode === "list" ? "bg-brand-900 text-white shadow-card" : "text-ink-500 hover:text-ink-900")}
            >
              <List className="w-3.5 h-3.5" /> List
            </button>
          </div>
          <ShabbosCalendarPicker value={week} onChange={setWeek} />
          <button onClick={() => setImportOpen(true)} className="btn-secondary" data-testid="import-sales-btn">
            <Upload className="w-4 h-4" /> Import
          </button>
          <div className="px-3 py-2 border border-line2 rounded-md bg-surface text-brand-700 text-sm font-mono tabular-nums font-bold">
            {weekSales.length} · £{weekTotal.toFixed(0)}
          </div>
        </div>
      </div>

      {customers.length === 0 ? (
        <div className="card text-center py-16 text-ink-500">
          <p className="text-lg font-semibold">Add customers first</p>
          <p className="text-sm mt-1">Please add customers before starting the auction.</p>
        </div>
      ) : mode === "auction" ? (
        <AuctionMode week={week} yt={yt} customers={customers} products={products} weekSales={weekSales} allSales={sales} />
      ) : (
        <ListMode parsha={parsha} yt={yt} weekSales={weekSales} />
      )}

      <ImportModal open={importOpen} onClose={() => setImportOpen(false)} kind="sales" customers={customers} products={products} />
    </div>
  );
}

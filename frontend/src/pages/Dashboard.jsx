import React, { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import api from "../lib/api";
import {
  fullName, getCurrentShabbos, getParshaForWeek, formatGregorianYiddish, classNames,
} from "../lib/jewishCalendar";
import { BarChart, Bar, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid } from "recharts";
import { AlertCircle, Search, ChevronRight, BookOpen, TrendingUp, Coins, Wallet, AlertTriangle } from "lucide-react";

function PageHeader({ title, subtitle, kicker, right }) {
  return (
    <div className="mb-8 flex flex-wrap items-end justify-between gap-6 animate-fade-in">
      <div>
        {kicker && <p className="kicker mb-2">{kicker}</p>}
        <h1 className="text-3xl md:text-4xl font-bold text-ink-900 tracking-tight">{title}</h1>
        {subtitle && <p className="text-ink-500 mt-2 text-[15px]">{subtitle}</p>}
      </div>
      {right}
    </div>
  );
}

function Metric({ label, value, sub, icon: Icon, tone = "ink", testid }) {
  const iconBg = {
    ink: "bg-brand-50 text-brand-700",
    paid: "bg-emerald-50 text-emerald-700",
    debt: "bg-danger-50 text-danger-700",
    warn: "bg-amber-50 text-amber-600",
  }[tone];
  return (
    <div className="card p-5" data-testid={testid}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-[11px] tracking-wider uppercase text-ink-500 font-bold">{label}</p>
          <p className={classNames("font-mono mt-3 text-[26px] tabular-nums leading-none font-bold",
            tone === "paid" && "text-emerald-700",
            tone === "debt" && "text-danger-700",
            tone === "warn" && "text-amber-600",
            tone === "ink" && "text-ink-900")}>
            {value}
          </p>
          {sub && <p className="text-[12px] text-ink-500 mt-2">{sub}</p>}
        </div>
        {Icon && (
          <div className={classNames("w-9 h-9 rounded-md flex items-center justify-center shrink-0", iconBg)}>
            <Icon className="w-4 h-4" strokeWidth={1.8} />
          </div>
        )}
      </div>
    </div>
  );
}

function ParshaBanner({ parsha, shabbos, weekTotal, weekCount, monthTotal, collectionRate }) {
  return (
    <div className="relative overflow-hidden rounded-lg bg-brand-900 text-white">
      <div className="absolute -right-12 -top-12 w-64 h-64 rounded-full bg-brand-700/40 blur-3xl pointer-events-none" />
      <div className="absolute -right-32 -bottom-20 w-72 h-72 rounded-full bg-emerald-500/15 blur-3xl pointer-events-none" />
      <div className="relative px-8 py-7 md:flex md:items-center md:justify-between gap-8">
        <div className="min-w-0">
          <p className="text-[11px] uppercase tracking-[0.2em] text-emerald-500 font-bold">This Shabbos</p>
          <div className="flex items-baseline gap-4 mt-2 flex-wrap">
            <h2 className="font-hebrew text-5xl md:text-[56px] text-white leading-none font-bold">{parsha.name}</h2>
            {parsha.note && <span className="text-[11px] bg-emerald-500/15 border border-emerald-500/30 text-emerald-500 px-2.5 py-1 rounded">{parsha.note}</span>}
          </div>
          <p className="text-white/55 text-sm mt-3 font-medium">
            {parsha.book} · {formatGregorianYiddish(shabbos)}
          </p>
        </div>
        <div className="mt-6 md:mt-0 grid grid-cols-3 gap-3 min-w-[420px]">
          <div className="border border-white/10 rounded-md px-4 py-3 bg-white/5 backdrop-blur" data-testid="banner-week-total">
            <p className="text-[10px] uppercase tracking-widest text-white/55 font-bold">This Shabbos</p>
            <p className="font-mono text-2xl text-white mt-1 tabular-nums font-bold">£{weekTotal.toFixed(0)}</p>
            <p className="text-[10px] text-white/55 mt-0.5">{weekCount} sales</p>
          </div>
          <div className="border border-white/10 rounded-md px-4 py-3 bg-white/5 backdrop-blur" data-testid="banner-month-total">
            <p className="text-[10px] uppercase tracking-widest text-white/55 font-bold">This Month</p>
            <p className="font-mono text-2xl text-white mt-1 tabular-nums font-bold">£{monthTotal.toFixed(0)}</p>
            <p className="text-[10px] text-white/55 mt-0.5">total sold</p>
          </div>
          <div className="border border-white/10 rounded-md px-4 py-3 bg-white/5 backdrop-blur" data-testid="banner-collection-rate">
            <p className="text-[10px] uppercase tracking-widest text-white/55 font-bold">Collection</p>
            <p className="font-mono text-2xl text-emerald-500 mt-1 tabular-nums font-bold">{collectionRate.toFixed(0)}%</p>
            <p className="text-[10px] text-white/55 mt-0.5">paid up</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function WeeklyChart({ sales }) {
  const data = useMemo(() => {
    const map = new Map();
    sales.forEach((s) => {
      if (!s.week) return;
      map.set(s.week, (map.get(s.week) || 0) + (s.price || 0));
    });
    const arr = Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0])).slice(-8);
    return arr.map(([week, total]) => ({
      week,
      label: getParshaForWeek(week).yiddish,
      total: +total.toFixed(2),
    }));
  }, [sales]);

  if (!data.length) return null;
  return (
    <div className="card p-6">
      <div className="flex items-baseline justify-between mb-5">
        <div>
          <h3 className="text-lg font-bold text-ink-900">Weekly sales</h3>
          <p className="text-xs text-ink-500 mt-0.5">Last 8 Shabbosos</p>
        </div>
      </div>
      <div className="h-56 min-w-0" data-testid="weekly-chart">
        <ResponsiveContainer width="100%" height="100%" minWidth={200} minHeight={200}>
          <BarChart data={data} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
            <CartesianGrid stroke="#E4E7EC" strokeDasharray="3 4" vertical={false} />
            <XAxis dataKey="label" stroke="#667085" tick={{ fontSize: 11, fontFamily: "Heebo" }} />
            <YAxis stroke="#667085" tick={{ fontSize: 11, fontFamily: "JetBrains Mono" }} tickFormatter={(v) => `£${v}`} width={48} />
            <Tooltip
              contentStyle={{ background: "#FFFFFF", border: "1px solid #E4E7EC", borderRadius: 8, fontFamily: "Plus Jakarta Sans", fontSize: 12 }}
              labelStyle={{ fontFamily: "Heebo", fontWeight: 600 }}
              formatter={(value) => [`£${value}`, "Total"]}
            />
            <Bar dataKey="total" fill="#1E3258" radius={[5, 5, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function AlertsPanel({ balances }) {
  const high = balances.filter((b) => b.balance > 200).slice(0, 6);
  if (!high.length) {
    return (
      <div className="card p-6" data-testid="alerts-panel">
        <div className="flex items-center gap-2 mb-2">
          <AlertCircle className="w-4 h-4 text-emerald-600" />
          <h3 className="text-lg font-bold text-ink-900">No alerts</h3>
        </div>
        <p className="text-sm text-ink-500">No customer is over £200 in arrears.</p>
      </div>
    );
  }
  return (
    <div className="card p-6" data-testid="alerts-panel">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-ink-900 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-danger-600" /> High balances
        </h3>
        <span className="badge-debt">{high.length}</span>
      </div>
      <div className="space-y-2">
        {high.map((c) => (
          <Link
            key={c.id}
            to={`/customers/${c.id}`}
            className="flex items-center justify-between px-3 py-2.5 rounded-md border border-line hover:border-danger-500/40 hover:bg-danger-50/40 transition-all"
            data-testid={`alert-row-${c.id}`}
          >
            <span className="font-hebrew text-[15px] font-semibold text-ink-900">{fullName(c)}</span>
            <span className="font-mono text-danger-700 font-bold tabular-nums">£{c.balance.toFixed(0)}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}

function BalanceTable({ balances }) {
  const [q, setQ] = useState("");
  const [sortBy, setSortBy] = useState("debt");
  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    let arr = balances.filter((b) => fullName(b).toLowerCase().includes(s) || (b.phone || "").includes(s));
    if (sortBy === "debt") arr.sort((a, b) => b.balance - a.balance);
    if (sortBy === "name") arr.sort((a, b) => fullName(a).localeCompare(fullName(b)));
    if (sortBy === "paid") arr.sort((a, b) => b.totalPaid - a.totalPaid);
    return arr;
  }, [balances, q, sortBy]);

  return (
    <div className="card overflow-hidden">
      <div className="px-5 py-4 border-b border-line flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-lg font-bold text-ink-900">Customer balances</h3>
          <p className="text-xs text-ink-500 mt-0.5">All members and their standing</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-ink-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              data-testid="balance-search-input"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search name or phone..."
              className="input pl-9 w-64 py-2"
            />
          </div>
          <select
            data-testid="balance-sort-select"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="input py-2"
          >
            <option value="debt">Sort: Balance</option>
            <option value="name">Sort: Name</option>
            <option value="paid">Sort: Paid</option>
          </select>
        </div>
      </div>

      <div className="max-h-[560px] overflow-y-auto pretty-scroll">
        <table className="data-table">
          <thead className="sticky top-0 z-10 bg-surface2/95 backdrop-blur">
            <tr>
              <th className="w-[44%]">Customer</th>
              <th>Charges</th>
              <th>Paid</th>
              <th>Balance</th>
              <th className="w-10"></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((c) => (
              <tr key={c.id} data-testid={`balance-row-${c.id}`}>
                <td>
                  <div className="flex items-center gap-3">
                    <span
                      className={classNames(
                        "w-9 h-9 rounded-md border flex items-center justify-center font-hebrew font-bold text-sm",
                        c.balance > 200
                          ? "bg-danger-50 border-danger-500/30 text-danger-700"
                          : c.balance > 0
                          ? "bg-amber-50 border-amber-500/30 text-amber-600"
                          : "bg-emerald-50 border-emerald-500/30 text-emerald-700",
                      )}
                    >
                      {(c.first_name || c.name || "?").charAt(0)}
                    </span>
                    <div>
                      <Link to={`/customers/${c.id}`} className="font-hebrew text-[15px] font-semibold text-ink-900 hover:text-brand-700 transition-colors">
                        {fullName(c)}
                      </Link>
                      {c.phone && <p className="text-[11px] text-ink-400 font-mono mt-0.5">{c.phone}</p>}
                    </div>
                  </div>
                </td>
                <td className="font-mono tabular-nums text-ink-700">£{c.totalOwed.toFixed(0)}</td>
                <td className="font-mono tabular-nums text-emerald-700">£{c.totalPaid.toFixed(0)}</td>
                <td>
                  {c.balance > 0 ? (
                    <span className={classNames("font-mono font-bold tabular-nums px-2.5 py-1 rounded",
                      c.balance > 200 ? "bg-danger-50 text-danger-700" : "bg-amber-50 text-amber-600")}>
                      £{c.balance.toFixed(0)}
                    </span>
                  ) : (
                    <span className="badge-paid">Paid up</span>
                  )}
                </td>
                <td>
                  <Link to={`/customers/${c.id}`} className="text-ink-400 hover:text-brand-700 transition-colors block">
                    <ChevronRight className="w-4 h-4" />
                  </Link>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={5} className="text-center text-ink-400 py-10">No matches found.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { data, isLoading } = useQuery({ queryKey: ["snapshot"], queryFn: api.snapshot });
  const customers = data?.customers || [];
  const sales = data?.sales || [];
  const payments = data?.payments || [];
  const extras = data?.extra_charges || [];

  const shabbos = getCurrentShabbos();
  const parsha = getParshaForWeek(shabbos);

  const balances = useMemo(() => {
    return customers.map((c) => {
      const totalSales = sales.filter((s) => s.customer_id === c.id).reduce((a, s) => a + (s.price || 0), 0);
      const totalExtras = extras.filter((e) => e.customer_id === c.id).reduce((a, e) => a + (e.amount || 0), 0);
      const totalOwed = totalSales + totalExtras;
      const totalPaid = payments.filter((p) => p.customer_id === c.id).reduce((a, p) => a + (p.amount || 0), 0);
      const balance = totalOwed - totalPaid;
      return { ...c, totalSales, totalExtras, totalOwed, totalPaid, balance };
    });
  }, [customers, sales, payments, extras]);

  const stats = useMemo(() => {
    const totalOwed = balances.reduce((a, b) => a + b.totalOwed, 0);
    const totalPaid = balances.reduce((a, b) => a + b.totalPaid, 0);
    const totalBalance = balances.reduce((a, b) => a + b.balance, 0);
    const customersWithDebt = balances.filter((b) => b.balance > 0 && b.totalOwed > 0).length;
    const collectionRate = totalOwed > 0 ? (totalPaid / totalOwed) * 100 : 0;
    const weekSales = sales.filter((s) => s.week === shabbos);
    const weekTotal = weekSales.reduce((a, s) => a + (s.price || 0), 0);
    const now = new Date();
    const monthTotal = sales.filter((s) => {
      if (!s.week) return false;
      const d = new Date(s.week + "T12:00:00");
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    }).reduce((a, s) => a + (s.price || 0), 0);
    return { totalOwed, totalPaid, totalBalance, customersWithDebt, collectionRate, weekTotal, weekCount: weekSales.length, monthTotal };
  }, [balances, sales, shabbos]);

  return (
    <div className="px-8 md:px-12 py-10 max-w-[1400px]">
      <PageHeader kicker="Overview" title="Dashboard" subtitle="A live look at this Shabbos and the chevra's overall standing." />

      <ParshaBanner
        parsha={parsha}
        shabbos={shabbos}
        weekTotal={stats.weekTotal}
        weekCount={stats.weekCount}
        monthTotal={stats.monthTotal}
        collectionRate={stats.collectionRate}
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-5 mt-7">
        <Metric icon={Coins} testid="metric-total-owed" label="Total charges" value={`£${stats.totalOwed.toFixed(0)}`} sub="all time gross" tone="ink" />
        <Metric icon={TrendingUp} testid="metric-total-paid" label="Total paid" value={`£${stats.totalPaid.toFixed(0)}`} sub="received" tone="paid" />
        <Metric icon={Wallet} testid="metric-balance" label="Outstanding" value={`£${stats.totalBalance.toFixed(0)}`} sub="to collect" tone="debt" />
        <Metric icon={AlertCircle} testid="metric-customers-debt" label="With balance" value={`${stats.customersWithDebt}`} sub="customers owe money" tone="warn" />
      </div>

      <div className="grid lg:grid-cols-3 gap-6 mt-6">
        <div className="lg:col-span-2">
          <WeeklyChart sales={sales} />
        </div>
        <AlertsPanel balances={balances} />
      </div>

      <div className="mt-6">
        <BalanceTable balances={balances} />
      </div>

      {isLoading && (
        <div className="fixed bottom-6 left-[280px] bg-brand-900 text-white px-4 py-2 rounded-md text-sm font-mono z-30 shadow-pop">
          Loading data...
        </div>
      )}
    </div>
  );
}

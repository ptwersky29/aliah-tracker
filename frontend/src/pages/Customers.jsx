import React, { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import api from "../lib/api";
import { fullName, classNames } from "../lib/jewishCalendar";
import { Plus, Trash2, Pencil, Check, X, Users, Search, AlertTriangle, ChevronRight, Upload } from "lucide-react";
import { toast } from "sonner";
import ImportModal from "../components/ImportModal";

export default function Customers() {
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: ["snapshot"], queryFn: api.snapshot });
  const customers = data?.customers || [];
  const sales = data?.sales || [];
  const payments = data?.payments || [];
  const extras = data?.extra_charges || [];

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("debt");
  const [selected, setSelected] = useState(new Set());
  const [editingId, setEditingId] = useState(null);
  const [edit, setEdit] = useState({});
  const [importOpen, setImportOpen] = useState(false);

  const enriched = useMemo(() => customers.map((c) => {
    const totalOwed = sales.filter((s) => s.customer_id === c.id).reduce((a, s) => a + (s.price || 0), 0)
      + extras.filter((e) => e.customer_id === c.id).reduce((a, e) => a + (e.amount || 0), 0);
    const totalPaid = payments.filter((p) => p.customer_id === c.id).reduce((a, p) => a + (p.amount || 0), 0);
    return { ...c, totalOwed, totalPaid, balance: totalOwed - totalPaid };
  }), [customers, sales, payments, extras]);

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();
    let arr = enriched.filter((c) => fullName(c).toLowerCase().includes(s) || (c.phone || "").includes(s));
    if (sortBy === "debt") arr.sort((a, b) => b.balance - a.balance);
    if (sortBy === "first") arr.sort((a, b) => (a.first_name || "").localeCompare(b.first_name || ""));
    if (sortBy === "last") arr.sort((a, b) => (a.last_name || "").localeCompare(b.last_name || ""));
    if (sortBy === "paid") arr.sort((a, b) => b.totalPaid - a.totalPaid);
    return arr;
  }, [enriched, search, sortBy]);

  const highDebt = enriched.filter((c) => c.balance > 200);

  const handleAdd = async () => {
    if (!firstName.trim()) return;
    setSaving(true);
    try {
      await api.customers.create({ first_name: firstName.trim(), last_name: lastName.trim(), phone: phone.trim() });
      setFirstName(""); setLastName(""); setPhone("");
      qc.invalidateQueries({ queryKey: ["snapshot"] });
      toast.success("Customer added");
    } finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    await api.customers.remove(id);
    qc.invalidateQueries({ queryKey: ["snapshot"] });
  };

  const handleBulkDelete = async () => {
    if (!window.confirm(`Delete ${selected.size} customers?`)) return;
    await Promise.all([...selected].map((id) => api.customers.remove(id)));
    qc.invalidateQueries({ queryKey: ["snapshot"] });
    setSelected(new Set());
    toast.success(`${selected.size} customers deleted`);
  };

  const startEdit = (c) => { setEditingId(c.id); setEdit({ first_name: c.first_name || "", last_name: c.last_name || "", phone: c.phone || "", notes: c.notes || "" }); };
  const saveEdit = async () => {
    await api.customers.update(editingId, edit);
    qc.invalidateQueries({ queryKey: ["snapshot"] });
    setEditingId(null);
    toast.success("Customer updated");
  };

  const toggleSelect = (id) => {
    const s = new Set(selected);
    s.has(id) ? s.delete(id) : s.add(id);
    setSelected(s);
  };

  return (
    <div className="px-8 md:px-12 py-10 max-w-[1400px]">
      <div className="mb-8 animate-fade-in flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="kicker mb-2">Members</p>
          <h1 className="text-3xl md:text-4xl font-bold text-ink-900 tracking-tight">Customers</h1>
          <p className="text-ink-500 mt-2 text-[15px]">Manage members, edit details, and track balances.</p>
        </div>
        <button onClick={() => setImportOpen(true)} className="btn-secondary" data-testid="import-customers-btn">
          <Upload className="w-4 h-4" /> Import from Excel
        </button>
      </div>

      {highDebt.length > 0 && (
        <div className="mb-6 card px-5 py-3 flex items-center gap-3 flex-wrap border-l-4 border-l-danger-600" data-testid="high-debt-banner">
          <AlertTriangle className="w-4 h-4 text-danger-600 shrink-0" />
          <span className="text-sm font-bold text-danger-700">{highDebt.length} customers with balance over £200:</span>
          <div className="flex gap-2 flex-wrap">
            {highDebt.slice(0, 5).map((c) => (
              <Link key={c.id} to={`/app/customers/${c.id}`} className="badge-debt hover:opacity-80 transition" data-testid={`high-debt-${c.id}`}>
                <span className="font-hebrew">{fullName(c)}</span> · £{c.balance.toFixed(0)}
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Add form */}
      <div className="card p-6 mb-6">
        <h3 className="text-lg font-bold text-ink-900 mb-4">Add a new customer</h3>
        <div className="flex flex-wrap gap-3 items-end">
          <FieldInline label="First name *" value={firstName} onChange={setFirstName} testid="customer-first-name-input" />
          <FieldInline label="Last name" value={lastName} onChange={setLastName} testid="customer-last-name-input" />
          <FieldInline label="Phone" value={phone} onChange={setPhone} mono testid="customer-phone-input" />
          <button onClick={handleAdd} disabled={saving || !firstName.trim()} className="btn-primary" data-testid="add-customer-btn">
            <Plus className="w-4 h-4" /> {saving ? "Saving..." : "Add customer"}
          </button>
        </div>
      </div>

      {/* List */}
      <div className="card overflow-hidden">
        <div className="px-5 py-4 border-b border-line flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Users className="w-4 h-4 text-brand-700" />
            <h3 className="text-lg font-bold text-ink-900">All customers</h3>
            <span className="badge-muted">{customers.length}</span>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {selected.size > 0 && (
              <button onClick={handleBulkDelete} className="btn-danger" data-testid="bulk-delete-btn">
                <Trash2 className="w-3.5 h-3.5" /> Delete {selected.size}
              </button>
            )}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-ink-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input data-testid="customers-search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search..." className="input pl-9 w-56 py-2" />
            </div>
            <select data-testid="customers-sort" value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="input py-2">
              <option value="debt">Sort: Balance</option>
              <option value="first">Sort: First name</option>
              <option value="last">Sort: Last name</option>
              <option value="paid">Sort: Paid</option>
            </select>
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="py-20 text-center text-ink-400">
            <Users className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="font-semibold">{search ? "No matches found." : "No customers yet."}</p>
          </div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th className="w-10">
                  <input type="checkbox" data-testid="select-all-customers" checked={selected.size === filtered.length && filtered.length > 0} onChange={() => setSelected(selected.size === filtered.length ? new Set() : new Set(filtered.map((c) => c.id)))} />
                </th>
                <th>Name</th>
                <th>Phone</th>
                <th>Charges</th>
                <th>Paid</th>
                <th>Balance</th>
                <th className="w-28"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((c) => editingId === c.id ? (
                <tr key={c.id} className="bg-brand-50/50">
                  <td colSpan={7} className="py-3">
                    <div className="flex flex-wrap gap-2 items-center">
                      <input value={edit.first_name} onChange={(e) => setEdit({ ...edit, first_name: e.target.value })} className="input w-36 py-2" placeholder="First name" />
                      <input value={edit.last_name} onChange={(e) => setEdit({ ...edit, last_name: e.target.value })} className="input w-36 py-2" placeholder="Last name" />
                      <input value={edit.phone} onChange={(e) => setEdit({ ...edit, phone: e.target.value })} className="input w-40 py-2 font-mono" placeholder="Phone" />
                      <input value={edit.notes} onChange={(e) => setEdit({ ...edit, notes: e.target.value })} className="input flex-1 min-w-32 py-2" placeholder="Notes..." />
                      <button onClick={saveEdit} className="btn-primary py-2"><Check className="w-3.5 h-3.5" /> Save</button>
                      <button onClick={() => setEditingId(null)} className="btn-ghost"><X className="w-3.5 h-3.5" /> Cancel</button>
                    </div>
                  </td>
                </tr>
              ) : (
                <tr key={c.id} data-testid={`customer-row-${c.id}`}>
                  <td><input type="checkbox" checked={selected.has(c.id)} onChange={() => toggleSelect(c.id)} data-testid={`select-customer-${c.id}`} /></td>
                  <td>
                    <div className="flex items-center gap-3">
                      <span className={classNames("w-9 h-9 rounded-md border flex items-center justify-center font-hebrew font-bold text-sm shrink-0",
                        c.balance > 200 ? "bg-danger-50 border-danger-500/30 text-danger-700" :
                        c.balance > 0 ? "bg-amber-50 border-amber-500/30 text-amber-600" :
                        "bg-emerald-50 border-emerald-500/30 text-emerald-700")}>
                        {(c.first_name || c.name || "?").charAt(0)}
                      </span>
                      <div>
                        <Link to={`/app/customers/${c.id}`} className="font-hebrew text-[15px] font-semibold text-ink-900 hover:text-brand-700 transition-colors">{fullName(c)}</Link>
                        {c.notes && <p className="text-xs text-ink-400 truncate max-w-44">{c.notes}</p>}
                      </div>
                    </div>
                  </td>
                  <td className="font-mono text-ink-500 text-xs">{c.phone || "—"}</td>
                  <td className="font-mono tabular-nums text-ink-700">£{c.totalOwed.toFixed(0)}</td>
                  <td className="font-mono tabular-nums text-emerald-700">£{c.totalPaid.toFixed(0)}</td>
                  <td>
                    {c.balance > 0 ? (
                      <span className={classNames("font-mono font-bold tabular-nums px-2.5 py-1 rounded",
                        c.balance > 200 ? "bg-danger-50 text-danger-700" : "bg-amber-50 text-amber-600")}>
                        £{c.balance.toFixed(0)}
                      </span>
                    ) : <span className="badge-paid">Paid up</span>}
                  </td>
                  <td>
                    <div className="flex items-center gap-1 justify-end">
                      <button onClick={() => startEdit(c)} className="p-2 rounded-md text-ink-400 hover:text-brand-700 hover:bg-surface2 transition-colors" data-testid={`edit-customer-${c.id}`}>
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => handleDelete(c.id)} className="p-2 rounded-md text-ink-400 hover:text-danger-600 hover:bg-surface2 transition-colors" data-testid={`delete-customer-${c.id}`}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                      <Link to={`/app/customers/${c.id}`} className="p-2 rounded-md text-ink-400 hover:text-brand-700 transition-colors">
                        <ChevronRight className="w-3.5 h-3.5" />
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <ImportModal open={importOpen} onClose={() => setImportOpen(false)} kind="customers" customers={customers} />
    </div>
  );
}

function FieldInline({ label, value, onChange, mono, testid }) {
  return (
    <div className="flex-1 min-w-36">
      <label className="label">{label}</label>
      <input data-testid={testid} value={value} onChange={(e) => onChange(e.target.value)} className={classNames("input w-full", mono && "font-mono")} />
    </div>
  );
}

import React, { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import api from "../lib/api";
import { STANDARD_ALIYOS } from "../lib/jewishCalendar";
import { Plus, Trash2, Package, Pencil, Check, X } from "lucide-react";
import { toast } from "sonner";

export default function Products() {
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: ["snapshot"], queryFn: api.snapshot });
  const products = data?.products || [];

  const [name, setName] = useState("");
  const [defaultPrice, setDefaultPrice] = useState("");
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState("");
  const [editPrice, setEditPrice] = useState("");

  const handleAdd = async () => {
    if (!name.trim()) return;
    setSaving(true);
    try {
      await api.products.create({
        name: name.trim(),
        default_price: defaultPrice ? parseFloat(defaultPrice) : null,
        sort_order: (products.length || 0) + 1,
        active: true,
      });
      setName(""); setDefaultPrice("");
      qc.invalidateQueries({ queryKey: ["snapshot"] });
      toast.success("Product added");
    } finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    await api.products.remove(id);
    qc.invalidateQueries({ queryKey: ["snapshot"] });
  };

  const startEdit = (p) => { setEditingId(p.id); setEditName(p.name); setEditPrice(p.default_price ?? ""); };
  const saveEdit = async () => {
    await api.products.update(editingId, { name: editName.trim(), default_price: editPrice ? parseFloat(editPrice) : null });
    qc.invalidateQueries({ queryKey: ["snapshot"] });
    setEditingId(null);
  };

  return (
    <div className="px-8 md:px-12 py-10 max-w-[1300px]">
      <div className="mb-8 animate-fade-in">
        <p className="kicker mb-2">Catalog</p>
        <h1 className="text-3xl md:text-4xl font-bold text-ink-900 tracking-tight">Products</h1>
        <p className="text-ink-500 mt-2 text-[15px]">Standard aliyos are always available. Add custom special products below.</p>
      </div>

      {/* Standard aliyos */}
      <div className="card p-6 mb-6">
        <div className="flex items-baseline justify-between mb-4">
          <h3 className="text-lg font-bold text-ink-900">Standard aliyos</h3>
          <p className="text-[11px] uppercase tracking-wider text-ink-500 font-bold">Always available</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {STANDARD_ALIYOS.map((a) => (
            <span key={a.id} className="chip-aliyah" data-testid={`std-aliyah-${a.id}`}>{a.label}</span>
          ))}
        </div>
      </div>

      {/* Add form */}
      <div className="card p-6 mb-6">
        <h3 className="text-lg font-bold text-ink-900 mb-4">Add a special product</h3>
        <div className="flex flex-wrap gap-3 items-end">
          <div className="flex-1 min-w-48">
            <label className="label">Name *</label>
            <input data-testid="product-name-input" value={name} onChange={(e) => setName(e.target.value)} className="input w-full" placeholder="Product name..." />
          </div>
          <div className="w-44">
            <label className="label">Default price (£)</label>
            <input data-testid="product-price-input" type="number" value={defaultPrice} onChange={(e) => setDefaultPrice(e.target.value)} className="input w-full font-mono" placeholder="0" />
          </div>
          <button onClick={handleAdd} disabled={saving || !name.trim()} className="btn-primary" data-testid="add-product-btn">
            <Plus className="w-4 h-4" /> {saving ? "Saving..." : "Add product"}
          </button>
        </div>
      </div>

      {/* List */}
      <div className="card overflow-hidden">
        <div className="px-5 py-4 border-b border-line flex items-center justify-between">
          <h3 className="text-lg font-bold text-ink-900 flex items-center gap-2"><Package className="w-4 h-4 text-brand-700" /> Special products</h3>
          <span className="badge-muted">{products.length}</span>
        </div>
        {products.length === 0 ? (
          <div className="py-16 text-center text-ink-400">
            <Package className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="font-semibold">No special products yet</p>
            <p className="text-xs mt-1">Standard aliyos are already available automatically</p>
          </div>
        ) : (
          <table className="data-table">
            <thead><tr><th>#</th><th>Name</th><th>Price</th><th className="w-24"></th></tr></thead>
            <tbody>
              {products.map((p, i) => editingId === p.id ? (
                <tr key={p.id} className="bg-brand-50/50">
                  <td className="font-mono text-ink-400">{i + 1}</td>
                  <td><input value={editName} onChange={(e) => setEditName(e.target.value)} className="input w-full py-2" /></td>
                  <td><input type="number" value={editPrice} onChange={(e) => setEditPrice(e.target.value)} className="input w-32 py-2 font-mono" /></td>
                  <td>
                    <div className="flex gap-1 justify-end">
                      <button onClick={saveEdit} className="btn-primary py-2"><Check className="w-3.5 h-3.5" /></button>
                      <button onClick={() => setEditingId(null)} className="btn-ghost"><X className="w-3.5 h-3.5" /></button>
                    </div>
                  </td>
                </tr>
              ) : (
                <tr key={p.id} data-testid={`product-row-${p.id}`}>
                  <td className="font-mono text-ink-400">{i + 1}</td>
                  <td className="font-hebrew font-semibold">{p.name}</td>
                  <td className="font-mono tabular-nums">{p.default_price ? `£${p.default_price.toFixed(0)}` : "—"}</td>
                  <td>
                    <div className="flex items-center gap-1 justify-end">
                      <button onClick={() => startEdit(p)} className="p-2 rounded-md text-ink-400 hover:text-brand-700 hover:bg-surface2 transition-colors" data-testid={`edit-product-${p.id}`}><Pencil className="w-3.5 h-3.5" /></button>
                      <button onClick={() => handleDelete(p.id)} className="p-2 rounded-md text-ink-400 hover:text-danger-600 hover:bg-surface2 transition-colors" data-testid={`delete-product-${p.id}`}><Trash2 className="w-3.5 h-3.5" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

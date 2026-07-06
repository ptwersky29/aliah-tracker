import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { BookMarked, Gavel, Users, CalendarDays, Shield, TrendingUp, ArrowRight } from "lucide-react";

const features = [
  { icon: Gavel, title: "Auction Management", desc: "Track weekly aliyos auctions with real-time pricing and bidder history." },
  { icon: Users, title: "Member Ledger", desc: "Manage your community members, their balances, and payment history in one place." },
  { icon: CalendarDays, title: "Shabbos Schedule", desc: "View the annual calendar with parshios, special Shabbosos, and auction dates." },
  { icon: Shield, title: "Secure & Private", desc: "Your data is encrypted and stored securely. Only authorised shul officers have access." },
  { icon: TrendingUp, title: "Insights & Reports", desc: "Understand revenue trends, collection rates, and member standing at a glance." },
  { icon: BookMarked, title: "Yiddish & Hebrew", desc: "Full support for Yiddish and Hebrew names, dates, and parshios." },
];

export default function Landing() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-canvas text-ink-900 font-sans">
      {/* Nav */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-line">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-md bg-brand-700 flex items-center justify-center">
              <BookMarked className="w-5 h-5 text-white" strokeWidth={1.75} />
            </div>
            <span className="text-lg font-bold tracking-tight">Pinkas</span>
          </div>
          <div className="flex items-center gap-4">
            <Link
              to="/login"
              className="text-sm font-semibold text-ink-700 hover:text-ink-900 px-4 py-2 rounded-md hover:bg-surface2 transition-colors"
            >
              Sign in
            </Link>
            <Link
              to="/login"
              className="text-sm font-semibold text-white bg-brand-700 hover:bg-brand-800 px-5 py-2.5 rounded-md transition-all shadow-card"
            >
              Get started
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute -top-40 -right-40 w-[500px] h-[500px] rounded-full bg-brand-500/5 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-40 -left-40 w-[500px] h-[500px] rounded-full bg-emerald-500/5 blur-3xl pointer-events-none" />
        <div className="max-w-6xl mx-auto px-6 pt-28 pb-36 text-center relative">
          <span className="inline-block text-[11px] font-bold uppercase tracking-[0.2em] text-brand-600 bg-brand-50 border border-brand-100 px-4 py-1.5 rounded-full mb-8">
            Auction Ledger for Shuls
          </span>
          <h1 className="text-5xl md:text-7xl font-bold text-ink-900 tracking-tight leading-[1.08] max-w-4xl mx-auto">
            Manage your shul's aliyos auctions with{" "}
            <span className="text-brand-700">elegance</span>
          </h1>
          <p className="text-lg md:text-xl text-ink-500 mt-6 max-w-2xl mx-auto leading-relaxed">
            Pinkas helps shuls track weekly auction sales, member balances, and payments — 
            from kohen to maftir, from Shabbos to Shabbos.
          </p>
          <div className="flex items-center justify-center gap-4 mt-10">
            <button
              onClick={() => navigate("/login")}
              className="inline-flex items-center gap-2 bg-brand-700 text-white hover:bg-brand-800 px-7 py-3.5 rounded-lg text-base font-bold transition-all shadow-cardLg"
            >
              Enter the app
              <ArrowRight className="w-4 h-4" />
            </button>
            <Link
              to="/login"
              className="inline-flex items-center gap-2 bg-surface text-ink-700 border border-line2 hover:bg-surface2 px-7 py-3.5 rounded-lg text-base font-semibold transition-all"
            >
              Learn more
            </Link>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="max-w-6xl mx-auto px-6 pb-32">
        <div className="text-center mb-16">
          <span className="kicker">Everything you need</span>
          <h2 className="text-3xl md:text-4xl font-bold text-ink-900 mt-3 tracking-tight">
            Built for gabbaim, by gabbaim
          </h2>
          <p className="text-ink-500 mt-4 text-lg max-w-xl mx-auto">
            Track sales, manage members, and keep the shul running smoothly week after week.
          </p>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((f) => (
            <div key={f.title} className="card p-6 hover:shadow-cardLg transition-all">
              <div className="w-10 h-10 rounded-lg bg-brand-50 flex items-center justify-center mb-4">
                <f.icon className="w-5 h-5 text-brand-700" strokeWidth={1.8} />
              </div>
              <h3 className="text-lg font-bold text-ink-900">{f.title}</h3>
              <p className="text-sm text-ink-500 mt-2 leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="bg-brand-900">
        <div className="max-w-6xl mx-auto px-6 py-20 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white tracking-tight">
            Ready to get started?
          </h2>
          <p className="text-white/60 mt-4 text-lg max-w-md mx-auto">
            Join communities already using Pinkas to manage their auction ledger.
          </p>
          <button
            onClick={() => navigate("/login")}
            className="mt-8 inline-flex items-center gap-2 bg-emerald-600 text-white hover:bg-emerald-700 px-8 py-3.5 rounded-lg text-base font-bold transition-all shadow-cardLg"
          >
            Sign in to Pinkas
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-line py-8">
        <div className="max-w-6xl mx-auto px-6 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BookMarked className="w-4 h-4 text-brand-700" strokeWidth={1.75} />
            <span className="text-sm font-bold text-ink-700">Pinkas</span>
          </div>
          <p className="text-xs text-ink-400">&copy; {new Date().getFullYear()} Pinkas. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}

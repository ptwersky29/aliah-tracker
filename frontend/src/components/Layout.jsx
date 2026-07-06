import React from "react";
import { NavLink, Outlet } from "react-router-dom";
import {
  LayoutDashboard, Gavel, Users, Package, CalendarDays, ScrollText, BookMarked,
} from "lucide-react";
import { classNames, getCurrentShabbos, getParshaForWeek, formatGregorianYiddish } from "../lib/jewishCalendar";
import { formatHebrewDate, gregorianToHebrew } from "../lib/hebrewCalendar";

const nav = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard, testid: "nav-dashboard" },
  { to: "/sales", label: "Auction", icon: Gavel, testid: "nav-sales" },
  { to: "/customers", label: "Customers", icon: Users, testid: "nav-customers" },
  { to: "/products", label: "Products", icon: Package, testid: "nav-products" },
  { to: "/calendar", label: "Calendar", icon: CalendarDays, testid: "nav-calendar" },
  { to: "/transactions", label: "Transactions", icon: ScrollText, testid: "nav-transactions" },
];

export default function Layout() {
  const today = new Date();
  const isoToday = today.toISOString().slice(0, 10);
  const shabbos = getCurrentShabbos();
  const parsha = getParshaForWeek(shabbos);
  const heb = gregorianToHebrew(isoToday);

  return (
    <div className="min-h-screen bg-canvas text-ink-900 font-sans">
      {/* Left sidebar */}
      <aside
        data-testid="sidebar"
        className="fixed top-0 left-0 h-full w-[260px] z-20 bg-brand-900 text-white flex flex-col"
      >
        {/* Brand */}
        <div className="px-6 pt-7 pb-5 border-b border-white/8">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-md bg-brand-700 border border-white/10 flex items-center justify-center">
              <BookMarked className="w-5 h-5 text-white" strokeWidth={1.75} />
            </div>
            <div>
              <h1 className="text-base font-bold leading-tight tracking-tight">Pinkas</h1>
              <p className="text-[10px] uppercase tracking-[0.18em] text-white/50 mt-0.5 font-semibold">Auction Ledger</p>
            </div>
          </div>
        </div>

        {/* Today */}
        <div className="px-6 py-4 border-b border-white/8">
          <p className="text-[10px] uppercase tracking-[0.16em] font-bold text-white/40">Today</p>
          <p className="text-sm font-semibold text-white mt-1.5" data-testid="header-today-gregorian">
            {today.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}
          </p>
          <p className="text-xs text-white/60 font-hebrew mt-0.5" data-testid="header-today-hebrew">
            {formatHebrewDate(heb)}
          </p>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 pretty-scroll overflow-y-auto">
          {nav.map(({ to, label, icon: Icon, testid }) => (
            <NavLink
              key={to}
              to={to}
              data-testid={testid}
              end={to === "/"}
              className={({ isActive }) =>
                classNames(
                  "flex items-center gap-3 px-3.5 py-2.5 my-0.5 rounded-md text-sm font-semibold transition-all",
                  isActive
                    ? "bg-white/10 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]"
                    : "text-white/70 hover:bg-white/5 hover:text-white",
                )
              }
            >
              {({ isActive }) => (
                <>
                  <Icon className={classNames("w-4 h-4 shrink-0", isActive ? "text-white" : "text-white/50")} strokeWidth={1.8} />
                  <span>{label}</span>
                </>
              )}
            </NavLink>
          ))}
        </nav>

        {/* Footer parsha plate */}
        <div className="mx-3 mb-4 mt-2 border border-white/10 rounded-md bg-white/5 px-4 py-3">
          <p className="text-[10px] uppercase tracking-[0.16em] text-emerald-500 font-bold">This Shabbos</p>
          <p className="font-hebrew text-xl mt-1 leading-none text-white">{parsha.yiddish}</p>
          <p className="text-[11px] text-white/55 mt-1.5">{formatGregorianYiddish(shabbos)}</p>
          {parsha.note && (
            <span className="inline-block mt-2 text-[10px] bg-emerald-500/15 border border-emerald-500/30 text-emerald-500 px-2 py-0.5 rounded">
              {parsha.note}
            </span>
          )}
        </div>
      </aside>

      <main className="ml-[260px] min-h-screen">
        <Outlet />
      </main>
    </div>
  );
}

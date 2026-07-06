import React, { useMemo, useState } from "react";
import {
  PARSHIYOS, PARSHA_SCHEDULE_5786, YOMIM_TOVIM, YOM_TOV_COLORS,
  STANDARD_ALIYOS, getCurrentShabbos, getParshaForWeek, formatGregorianYiddish, classNames,
} from "../lib/jewishCalendar";
import {
  gregorianToHebrew, formatHebrewDate, formatHebrewYear, getHebrewMonthName,
  getMonthWithHebrew, toHebrewNumeral,
} from "../lib/hebrewCalendar";
import { BookOpen, Star, Grid, List, ChevronLeft, ChevronRight } from "lucide-react";

const WEEK_FULL = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const WEEK_LONG = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Shabbos"];
const GREG_MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

const YT_BY_DATE = {};
YOMIM_TOVIM.forEach((y) => { if (y.date) YT_BY_DATE[y.date] = y; });
const PARSHA_BY_SHABBOS = {};
Object.entries(PARSHA_SCHEDULE_5786).forEach(([d, id]) => { PARSHA_BY_SHABBOS[d] = PARSHIYOS.find((p) => p.id === id); });

const TABS = [
  { id: "month", label: "Month", icon: Grid },
  { id: "parshiyos", label: "Parshiyos", icon: BookOpen },
  { id: "yomim", label: "Yomim Tovim", icon: Star },
  { id: "aliyos", label: "Aliyos", icon: List },
];

export default function Calendar() {
  const [tab, setTab] = useState("month");
  const today = new Date();
  const isoToday = today.toISOString().slice(0, 10);
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth() + 1);
  const [selected, setSelected] = useState(null);

  const shabbos = getCurrentShabbos();
  const parsha = getParshaForWeek(shabbos);
  const todayHeb = useMemo(() => gregorianToHebrew(isoToday), [isoToday]);

  const prev = () => { if (month === 1) { setMonth(12); setYear((y) => y - 1); } else setMonth((m) => m - 1); };
  const next = () => { if (month === 12) { setMonth(1); setYear((y) => y + 1); } else setMonth((m) => m + 1); };

  return (
    <div className="px-8 md:px-12 py-10 max-w-[1300px]">
      <div className="mb-6 animate-fade-in">
        <p className="kicker mb-2">Calendar</p>
        <h1 className="text-3xl md:text-4xl font-bold text-ink-900 tracking-tight">Jewish Calendar</h1>
        <p className="text-ink-500 mt-2 text-[15px]">
          Today · <span className="font-hebrew">{formatHebrewDate(todayHeb)}</span> · {formatGregorianYiddish(isoToday)}
        </p>
      </div>

      {/* Parsha banner */}
      <div className="rounded-lg bg-brand-900 text-white px-6 py-5 mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-[10px] uppercase tracking-[0.2em] text-emerald-500 font-bold">This week's parsha</p>
          <p className="font-hebrew text-4xl mt-1 leading-none text-white font-bold">{parsha.name}</p>
          <p className="text-white/55 text-sm mt-1.5">{parsha.book} · {formatGregorianYiddish(shabbos)}</p>
        </div>
        {parsha.note && <span className="text-xs bg-emerald-500/15 border border-emerald-500/30 text-emerald-500 px-3 py-1 rounded">{parsha.note}</span>}
      </div>

      <div className="flex gap-1 bg-surface2 border border-line2 rounded-md p-1 mb-6 inline-flex flex-wrap">
        {TABS.map((t) => (
          <button key={t.id} data-testid={`calendar-tab-${t.id}`} onClick={() => setTab(t.id)} className={classNames(
            "flex items-center gap-2 px-4 py-2 rounded text-sm font-semibold transition-all",
            tab === t.id ? "bg-brand-900 text-white shadow-card" : "text-ink-500 hover:text-ink-900",
          )}>
            <t.icon className="w-3.5 h-3.5" /> {t.label}
          </button>
        ))}
      </div>

      {tab === "month" && <MonthView year={year} month={month} today={isoToday} selected={selected} onSelect={setSelected} onPrev={prev} onNext={next} />}
      {tab === "parshiyos" && <ParshaList currentId={parsha.id} />}
      {tab === "yomim" && <YomimTovim />}
      {tab === "aliyos" && <AliyosList />}
    </div>
  );
}

function MonthView({ year, month, today, selected, onSelect, onPrev, onNext }) {
  const days = useMemo(() => getMonthWithHebrew(year, month), [year, month]);
  const firstWeekday = days[0].weekday;
  const cells = [];
  for (let i = 0; i < firstWeekday; i++) cells.push(null);
  days.forEach((d) => cells.push(d));
  while (cells.length % 7 !== 0) cells.push(null);
  const weeks = []; for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));

  const mid = days[14]?.date || days[0].date;
  const midHeb = gregorianToHebrew(mid);
  const hebMonth = getHebrewMonthName(midHeb.month, midHeb.year);
  const hebYear = formatHebrewYear(midHeb.year);
  const sel = selected ? { date: selected, yt: YT_BY_DATE[selected], parsha: new Date(selected + "T12:00:00").getDay() === 6 ? PARSHA_BY_SHABBOS[selected] : null, heb: gregorianToHebrew(selected) } : null;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <button onClick={onPrev} className="btn-ghost" data-testid="cal-prev"><ChevronLeft className="w-5 h-5" /></button>
        <div className="text-center">
          <p className="text-2xl text-ink-900 font-bold">{GREG_MONTHS[month - 1]} {year}</p>
          <p className="text-brand-700 text-sm font-semibold font-hebrew">{hebMonth} {hebYear}</p>
        </div>
        <button onClick={onNext} className="btn-ghost" data-testid="cal-next"><ChevronRight className="w-5 h-5" /></button>
      </div>
      <div className="card overflow-hidden">
        <div className="grid grid-cols-7 border-b border-line">
          {WEEK_LONG.map((n, i) => (
            <div key={i} className={classNames("text-center py-2.5 text-xs font-bold uppercase tracking-wider",
              i === 6 ? "text-brand-700 bg-brand-50/50" : "text-ink-500")}>
              <span className="hidden sm:inline">{n}</span><span className="sm:hidden">{WEEK_FULL[i]}</span>
            </div>
          ))}
        </div>
        {weeks.map((w, wi) => (
          <div key={wi} className="grid grid-cols-7 border-b border-line last:border-0">
            {w.map((cell, di) => {
              if (!cell) return <div key={di} className="min-h-20 bg-surface2/30 border-r border-line last:border-0" />;
              const isToday = cell.date === today;
              const isSel = cell.date === selected;
              const isShabbos = di === 6;
              const yt = YT_BY_DATE[cell.date];
              const p = isShabbos ? PARSHA_BY_SHABBOS[cell.date] : null;
              const isRoshChodesh = cell.hebrew.day === 1;
              return (
                <button key={di} onClick={() => onSelect(isSel ? null : cell.date)}
                  data-testid={`cal-cell-${cell.date}`}
                  className={classNames("min-h-20 p-1.5 text-left border-r border-line last:border-0 flex flex-col gap-0.5 transition-all hover:bg-brand-50/40",
                    isToday && "bg-brand-50",
                    isSel && "bg-brand-100 ring-2 ring-inset ring-brand-700",
                    isShabbos && !isSel && !isToday && "bg-emerald-50/30")}>
                  <div className="flex items-start justify-between">
                    <span className={classNames("text-xs font-bold w-6 h-6 flex items-center justify-center rounded-full",
                      isToday ? "bg-brand-900 text-white" : isShabbos ? "text-brand-700" : "text-ink-900")}>
                      {cell.day}
                    </span>
                  </div>
                  <span className={classNames("text-xs font-hebrew font-semibold leading-none",
                    isRoshChodesh ? "text-brand-700 font-bold" : "text-ink-500")}>
                    {toHebrewNumeral(cell.hebrew.day)}{isRoshChodesh && <span className="text-brand-700"> R״Ch</span>}
                  </span>
                  {yt && <span className={classNames("text-[10px] px-1 py-0.5 rounded font-bold leading-tight truncate w-full border font-hebrew", YOM_TOV_COLORS[yt.type] || "bg-surface2")}>
                    {yt.yiddish.split("(")[0].trim()}
                  </span>}
                  {p && !yt && <span className="text-[10px] text-brand-700/80 font-semibold leading-none truncate font-hebrew">{p.yiddish}</span>}
                </button>
              );
            })}
          </div>
        ))}
      </div>

      {sel && (
        <div className="card p-5 animate-fade-in" data-testid="cal-selected-info">
          <div className="flex items-start justify-between flex-wrap gap-3">
            <div>
              <p className="text-[11px] uppercase tracking-wider text-ink-500 font-bold mb-1">{WEEK_LONG[new Date(sel.date + "T12:00:00").getDay()]} · {formatGregorianYiddish(sel.date)}</p>
              <p className="text-2xl text-brand-700 font-bold font-hebrew">{formatHebrewDate(sel.heb)}</p>
            </div>
            {sel.yt && <span className={classNames("text-sm font-bold px-3 py-1.5 rounded-md border font-hebrew", YOM_TOV_COLORS[sel.yt.type])}>{sel.yt.yiddish}</span>}
          </div>
          {sel.parsha && (
            <div className="mt-3 flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-brand-700" />
              <span className="font-hebrew font-semibold text-ink-900">{sel.parsha.name}</span>
              <span className="text-ink-500 text-sm">{sel.parsha.book}</span>
              {sel.parsha.note && <span className="badge-warn">{sel.parsha.note}</span>}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ParshaList({ currentId }) {
  const books = ["בראשית","שמות","ויקרא","במדבר","דברים"];
  const bookLabels = { "בראשית": "Bereishis", "שמות": "Shmos", "ויקרא": "Vayikra", "במדבר": "Bamidbar", "דברים": "Devarim" };
  const byBook = books.map((b) => ({ book: b, list: PARSHIYOS.filter((p) => p.book === b && !p.combined) }));
  return (
    <div className="space-y-6">
      {byBook.map(({ book, list }) => (
        <div key={book} className="card overflow-hidden">
          <div className="px-5 py-3 border-b border-line flex items-center gap-3 bg-surface2/30">
            <span className="font-hebrew text-xl text-brand-700 font-bold">{book}</span>
            <span className="text-ink-500 text-xs">{bookLabels[book]} · {list.length} parshiyos</span>
          </div>
          <div className="p-4 flex flex-wrap gap-2">
            {list.map((p) => {
              const sh = Object.entries(PARSHA_SCHEDULE_5786).find(([, id]) => id === p.id)?.[0];
              const isCur = p.id === currentId;
              return (
                <div key={p.id} data-testid={`parsha-${p.id}`} className={classNames("inline-flex flex-col items-start px-3 py-1.5 rounded-md border text-sm font-hebrew font-semibold transition-all",
                  isCur ? "bg-brand-900 text-white border-brand-900 shadow-card" : "bg-surface text-ink-900 border-line2 hover:border-brand-700")}>
                  <span className="flex items-center gap-1.5">{p.name} {p.note && <span className={classNames("text-[10px] px-1.5 py-0.5 rounded", isCur ? "bg-white/20" : "bg-amber-50 text-amber-600")}>{p.note}</span>}{isCur && <span className="text-[10px] opacity-80">← now</span>}</span>
                  {sh && <span className={classNames("text-[10px] mt-0.5 font-mono", isCur ? "opacity-80" : "text-ink-400")}>{new Date(sh + "T12:00:00").toLocaleDateString("en-GB", { day: "numeric", month: "short" })}</span>}
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

function YomimTovim() {
  const today = new Date();
  return (
    <div className="card overflow-hidden">
      <table className="data-table">
        <thead><tr><th>Holiday</th><th>Hebrew date</th><th>Type</th><th>Gregorian</th><th>Day</th></tr></thead>
        <tbody>
          {YOMIM_TOVIM.map((y) => {
            const d = y.date ? new Date(y.date + "T12:00:00") : null;
            const isToday = d && d.toDateString() === today.toDateString();
            const isPast = d && d < today;
            const heb = y.date ? gregorianToHebrew(y.date) : null;
            return (
              <tr key={y.id} data-testid={`yt-${y.id}`} className={classNames(isToday && "bg-brand-50", isPast && !isToday && "opacity-60")}>
                <td className="font-hebrew font-semibold">{y.yiddish}</td>
                <td className="text-ink-500 text-xs font-hebrew">{heb ? `${toHebrewNumeral(heb.day)} ${getHebrewMonthName(heb.month, heb.year)}` : "—"}</td>
                <td><span className={classNames("text-xs font-bold px-2.5 py-0.5 rounded border", YOM_TOV_COLORS[y.type])}>{y.type}</span></td>
                <td className="text-ink-500 text-xs font-mono">{d ? d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "—"}</td>
                <td><span className={classNames("text-xs font-semibold px-2 py-0.5 rounded", d && d.getDay() === 6 ? "bg-brand-50 text-brand-700" : "bg-surface2 text-ink-500")}>{d ? WEEK_FULL[d.getDay()] : ""}</span></td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function AliyosList() {
  return (
    <div className="card overflow-hidden">
      <table className="data-table">
        <thead><tr><th className="w-12">#</th><th>Aliyah</th></tr></thead>
        <tbody>
          {STANDARD_ALIYOS.map((a, i) => (
            <tr key={a.id} data-testid={`aliyah-row-${a.id}`}>
              <td className="font-mono text-ink-400">{i + 1}</td>
              <td><span className="chip-aliyah">{a.label}</span></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

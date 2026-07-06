import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  getParshaForWeek, formatGregorianYiddish, classNames, getCurrentShabbos,
  YOMIM_TOVIM, YOM_TOV_COLORS, PARSHA_SCHEDULE_5786, PARSHIYOS,
} from "../lib/jewishCalendar";
import {
  gregorianToHebrew, getMonthWithHebrew, toHebrewNumeral,
  getHebrewMonthName, formatHebrewYear, formatHebrewDate,
} from "../lib/hebrewCalendar";
import { ChevronDown, ChevronLeft, ChevronRight, BookOpen, Calendar as CalIcon } from "lucide-react";

const WEEK_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const GREG_MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];

const YT_BY_DATE = {};
YOMIM_TOVIM.forEach((y) => { if (y.date) YT_BY_DATE[y.date] = y; });
const PARSHA_BY_SHABBOS = {};
Object.entries(PARSHA_SCHEDULE_5786).forEach(([d, id]) => { PARSHA_BY_SHABBOS[d] = PARSHIYOS.find((p) => p.id === id); });

/**
 * ShabbosCalendarPicker — a popover month-view Jewish calendar where the user
 * picks a Shabbos for the auction. Shows Gregorian + Hebrew dates side by side,
 * parsha labels on each Saturday, and yom tov markers.
 */
export default function ShabbosCalendarPicker({ value, onChange }) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);

  const selectedDate = value ? new Date(value + "T12:00:00") : new Date();
  const [year, setYear] = useState(selectedDate.getFullYear());
  const [month, setMonth] = useState(selectedDate.getMonth() + 1);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e) => { if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  // Close on Esc
  useEffect(() => {
    if (!open) return;
    const handler = (e) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open]);

  // When opening, jump the view to the selected month
  useEffect(() => {
    if (open) {
      const d = new Date(value + "T12:00:00");
      setYear(d.getFullYear());
      setMonth(d.getMonth() + 1);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const days = useMemo(() => getMonthWithHebrew(year, month), [year, month]);
  const firstWeekday = days[0].weekday;
  const cells = [];
  for (let i = 0; i < firstWeekday; i++) cells.push(null);
  days.forEach((d) => cells.push(d));
  while (cells.length % 7 !== 0) cells.push(null);
  const weeks = []; for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));

  // For the header — pick the Hebrew month that covers the majority of days
  // in this Gregorian month (avoids the "early flip" when the 15th lands in
  // the next Hebrew month, e.g. July 2026 → mostly Tamuz but day 15 is Av).
  const middleDayHebrew = useMemo(() => {
    const counts = new Map();
    days.forEach((d) => {
      const key = `${d.hebrew.year}-${d.hebrew.month}`;
      counts.set(key, (counts.get(key) || 0) + 1);
    });
    let top = null, max = -1;
    counts.forEach((n, key) => { if (n > max) { max = n; top = key; } });
    const [y, m] = top.split("-").map(Number);
    return { year: y, month: m, day: 1 };
  }, [days]);

  const today = new Date().toISOString().slice(0, 10);
  const parshaSel = getParshaForWeek(value);
  const hebSel = useMemo(() => gregorianToHebrew(value), [value]);

  const prev = () => { if (month === 1) { setMonth(12); setYear((y) => y - 1); } else setMonth((m) => m - 1); };
  const next = () => { if (month === 12) { setMonth(1); setYear((y) => y + 1); } else setMonth((m) => m + 1); };
  const goToday = () => { onChange(getCurrentShabbos()); setOpen(false); };

  const pickCell = (iso) => {
    const d = new Date(iso + "T12:00:00");
    if (d.getDay() !== 6) return; // only Shabbosos pickable
    onChange(iso);
    setOpen(false);
  };

  return (
    <div ref={wrapRef} className="relative">
      <button
        data-testid="shabbos-picker-trigger"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center justify-between gap-3 w-72 bg-surface border border-line2 hover:border-brand-700 transition-colors rounded-md px-4 py-2.5 text-left"
      >
        <div className="min-w-0">
          <p className="text-[10px] uppercase tracking-widest text-brand-600 font-bold flex items-center gap-1">
            <CalIcon className="w-3 h-3" /> Parshas · Shabbos
          </p>
          <p className="font-hebrew text-base font-semibold text-ink-900 leading-tight truncate">{parshaSel.yiddish}</p>
          <p className="text-[11px] text-ink-400 font-mono">
            {formatGregorianYiddish(value)} · <span className="font-hebrew">{formatHebrewDate(hebSel)}</span>
          </p>
        </div>
        <ChevronDown className={classNames("w-4 h-4 text-ink-500 transition-transform shrink-0", open && "rotate-180")} />
      </button>

      {open && (
        <div
          data-testid="shabbos-picker-menu"
          className="absolute top-full mt-2 left-0 w-[420px] bg-surface border border-line2 rounded-lg shadow-pop z-30 animate-slide-up overflow-hidden"
        >
          {/* Header */}
          <div className="px-4 py-3 border-b border-line flex items-center justify-between bg-brand-50/30">
            <button onClick={prev} className="btn-ghost !p-1.5" data-testid="shabbos-cal-prev"><ChevronLeft className="w-4 h-4" /></button>
            <div className="text-center">
              <p className="text-base font-bold text-ink-900 leading-none">{GREG_MONTHS[month - 1]} {year}</p>
              <p className="text-xs text-brand-700 font-semibold font-hebrew mt-0.5">
                {getHebrewMonthName(middleDayHebrew.month, middleDayHebrew.year)} {formatHebrewYear(middleDayHebrew.year)}
              </p>
            </div>
            <button onClick={next} className="btn-ghost !p-1.5" data-testid="shabbos-cal-next"><ChevronRight className="w-4 h-4" /></button>
          </div>

          {/* Weekday header */}
          <div className="grid grid-cols-7 border-b border-line">
            {WEEK_SHORT.map((n, i) => (
              <div key={i} className={classNames("text-center py-2 text-[10px] font-bold uppercase tracking-wider",
                i === 6 ? "text-brand-700 bg-brand-50/50" : "text-ink-500")}>
                {n}
              </div>
            ))}
          </div>

          {/* Days */}
          {weeks.map((w, wi) => (
            <div key={wi} className="grid grid-cols-7 border-b border-line last:border-0">
              {w.map((cell, di) => {
                if (!cell) return <div key={di} className="min-h-14 bg-surface2/40" />;
                const isToday = cell.date === today;
                const isSelected = cell.date === value;
                const isShabbos = di === 6;
                const yt = YT_BY_DATE[cell.date];
                const p = isShabbos ? (PARSHA_BY_SHABBOS[cell.date] || getParshaForWeek(cell.date)) : null;
                const isRoshChodesh = cell.hebrew.day === 1;
                const clickable = isShabbos;
                return (
                  <button
                    key={di}
                    onClick={() => clickable && pickCell(cell.date)}
                    data-testid={`shabbos-cell-${cell.date}`}
                    disabled={!clickable}
                    aria-label={`${WEEK_SHORT[di]} ${GREG_MONTHS[month - 1]} ${cell.day} ${year} · ${toHebrewNumeral(cell.hebrew.day)} ${getHebrewMonthName(cell.hebrew.month, cell.hebrew.year)}${p ? ` · Parshas ${p.yiddish}` : ""}${yt ? ` · ${yt.yiddish}` : ""}`}
                    className={classNames(
                      "min-h-14 p-1 text-left transition-all flex flex-col gap-0.5 border-r border-line last:border-0",
                      clickable && "hover:bg-brand-50 cursor-pointer",
                      !clickable && "cursor-default",
                      isSelected && "bg-brand-900 text-white ring-2 ring-inset ring-brand-700 shadow-inner",
                      !isSelected && isToday && "bg-amber-50",
                      !isSelected && !isToday && isShabbos && "bg-brand-50/40",
                    )}
                  >
                    <div className="flex items-start justify-between">
                      <span className={classNames(
                        "text-[11px] font-bold w-5 h-5 flex items-center justify-center rounded-full leading-none",
                        isSelected ? "bg-white text-brand-900"
                          : isToday ? "bg-amber-500 text-white"
                          : isShabbos ? "text-brand-700"
                          : "text-ink-700",
                      )}>{cell.day}</span>
                      <span className={classNames(
                        "text-[10px] font-hebrew font-semibold leading-none mt-0.5",
                        isSelected ? "text-white/85" : isRoshChodesh ? "text-brand-700 font-bold" : "text-ink-400",
                      )}>{toHebrewNumeral(cell.hebrew.day)}</span>
                    </div>
                    {yt && (
                      <span className={classNames(
                        "text-[9px] px-0.5 py-0 rounded font-bold leading-tight truncate font-hebrew",
                        isSelected ? "text-white/90" : "",
                        !isSelected && (YOM_TOV_COLORS[yt.type] || "bg-surface2 text-ink-500"),
                      )}>{yt.yiddish.split("(")[0].trim()}</span>
                    )}
                    {p && !yt && (
                      <span className={classNames(
                        "text-[9px] font-hebrew font-semibold leading-tight truncate",
                        isSelected ? "text-white/90" : "text-brand-700/85",
                      )}>{p.yiddish}</span>
                    )}
                  </button>
                );
              })}
            </div>
          ))}

          {/* Footer */}
          <div className="px-4 py-2.5 border-t border-line flex items-center justify-between bg-surface2/30">
            <div className="flex items-center gap-2 text-[10px] text-ink-500">
              <span className="inline-block w-2.5 h-2.5 rounded-full bg-amber-500"></span> Today
              <span className="inline-block w-2.5 h-2.5 rounded-full bg-brand-900 ml-2"></span> Selected
            </div>
            <button
              onClick={goToday}
              data-testid="shabbos-cal-this-week"
              className="text-xs font-semibold text-brand-700 hover:text-brand-900 transition-colors flex items-center gap-1"
            >
              <BookOpen className="w-3 h-3" /> This Shabbos
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

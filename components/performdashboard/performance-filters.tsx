"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import { Filter, BookOpen, FlaskConical, CalendarRange, X, ChevronDown } from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface PerformanceFiltersValue {
  examinations: string[];  // [] = all (changed from single string)
  subject: string;
  dateFrom: string;
  dateTo: string;
}

interface PerformanceFiltersProps {
  assessmentRows: Array<{
    subject: string;
    examination: string;
    exam_date: string;
  }>;
  value: PerformanceFiltersValue;
  onChange: (next: PerformanceFiltersValue) => void;
}

// ─── Preset date ranges ───────────────────────────────────────────────────────

type Preset = "all" | "this_month" | "last_month" | "last_3" | "last_6" | "custom";

function isoToday(): string { return new Date().toISOString().slice(0, 10); }
function isoMonthsAgo(n: number): string {
  const d = new Date(); d.setMonth(d.getMonth() - n); d.setDate(1);
  return d.toISOString().slice(0, 10);
}
function startOfMonth(): string {
  const d = new Date(); d.setDate(1); return d.toISOString().slice(0, 10);
}
function startOfLastMonth(): string {
  const d = new Date(); d.setDate(1); d.setMonth(d.getMonth() - 1);
  return d.toISOString().slice(0, 10);
}
function endOfLastMonth(): string {
  const d = new Date(); d.setDate(0); return d.toISOString().slice(0, 10);
}

const PRESETS: { label: string; value: Preset }[] = [
  { label: "All Time", value: "all" },
  { label: "This Month", value: "this_month" },
  { label: "Last Month", value: "last_month" },
  { label: "Last 3 Months", value: "last_3" },
  { label: "Last 6 Months", value: "last_6" },
  { label: "Custom Range", value: "custom" },
];

function presetToDates(p: Preset): { dateFrom: string; dateTo: string } {
  switch (p) {
    case "all":        return { dateFrom: "", dateTo: "" };
    case "this_month": return { dateFrom: startOfMonth(), dateTo: isoToday() };
    case "last_month": return { dateFrom: startOfLastMonth(), dateTo: endOfLastMonth() };
    case "last_3":     return { dateFrom: isoMonthsAgo(3), dateTo: isoToday() };
    case "last_6":     return { dateFrom: isoMonthsAgo(6), dateTo: isoToday() };
    case "custom":     return { dateFrom: "", dateTo: "" };
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function unique(arr: string[]): string[] {
  return Array.from(new Set(arr.filter(Boolean))).sort();
}

function activeFilterCount(v: PerformanceFiltersValue): number {
  let n = 0;
  if (v.examinations.length) n++;
  if (v.subject) n++;
  if (v.dateFrom || v.dateTo) n++;
  return n;
}

// ─── Multi-select Dropdown ────────────────────────────────────────────────────

function MultiSelectDropdown({
  options,
  selected,
  onChange,
  placeholder,
}: {
  options: string[];
  selected: string[];
  onChange: (next: string[]) => void;
  placeholder: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  function toggle(opt: string) {
    onChange(
      selected.includes(opt) ? selected.filter((s) => s !== opt) : [...selected, opt]
    );
  }

  function toggleAll() {
    onChange(selected.length === options.length ? [] : [...options]);
  }

  const label =
    selected.length === 0
      ? placeholder
      : selected.length === 1
      ? selected[0]
      : `${selected.length} selected`;

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between h-9 pl-3 pr-2.5 rounded-lg border border-slate-200 bg-white text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-400 focus:border-transparent transition hover:border-slate-300"
      >
        <span className={selected.length === 0 ? "text-slate-400" : "text-slate-700"}>
          {label}
        </span>
        <ChevronDown
          className={`h-3.5 w-3.5 text-slate-400 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div className="absolute z-50 mt-1 w-full rounded-lg border border-slate-200 bg-white shadow-lg overflow-hidden">
          {/* Select all row */}
          <label className="flex items-center gap-2.5 px-3 py-2 cursor-pointer hover:bg-slate-50 border-b border-slate-100">
            <input
              type="checkbox"
              checked={selected.length === options.length}
              ref={(el) => {
                if (el) el.indeterminate = selected.length > 0 && selected.length < options.length;
              }}
              onChange={toggleAll}
              className="h-3.5 w-3.5 rounded accent-teal-600"
            />
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
              All Examinations
            </span>
          </label>

          {/* Options */}
          <div className="max-h-48 overflow-y-auto">
            {options.map((opt) => (
              <label
                key={opt}
                className="flex items-center gap-2.5 px-3 py-2 cursor-pointer hover:bg-slate-50 text-sm text-slate-700"
              >
                <input
                  type="checkbox"
                  checked={selected.includes(opt)}
                  onChange={() => toggle(opt)}
                  className="h-3.5 w-3.5 rounded accent-teal-600"
                />
                {opt}
              </label>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export function PerformanceFilters({
  assessmentRows,
  value,
  onChange,
}: PerformanceFiltersProps) {
  // Ensure value fields have safe defaults
  const safeValue: PerformanceFiltersValue = {
    examinations: value?.examinations ?? [],
    subject: value?.subject ?? "",
    dateFrom: value?.dateFrom ?? "",
    dateTo: value?.dateTo ?? "",
  };
  const [preset, setPreset] = useState<Preset>("all");
  const [showCustom, setShowCustom] = useState(false);

  const examinations = useMemo(
    () => unique(assessmentRows.map((r) => r.examination)),
    [assessmentRows]
  );
  const subjects = useMemo(
    () => unique(assessmentRows.map((r) => r.subject)),
    [assessmentRows]
  );

  const activeCount = activeFilterCount(safeValue);

  function handlePreset(p: Preset) {
    setPreset(p);
    setShowCustom(p === "custom");
    if (p !== "custom") onChange({ ...safeValue, ...presetToDates(p) });
  }

  function handleClearAll() {
    setPreset("all");
    setShowCustom(false);
    onChange({ examinations: [], subject: "", dateFrom: "", dateTo: "" });
  }

  return (
    <div className="rounded-xl border border-slate-100 bg-white shadow-sm overflow-hidden">
      {/* ── Header bar ── */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100 bg-slate-50/60">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-teal-600" />
          <span className="text-sm font-semibold text-slate-700">Filter Performance Data</span>
          {activeCount > 0 && (
            <span className="inline-flex items-center justify-center h-5 w-5 rounded-full bg-teal-600 text-white text-[10px] font-bold">
              {activeCount}
            </span>
          )}
        </div>
        {activeCount > 0 && (
          <button
            onClick={handleClearAll}
            className="flex items-center gap-1 text-xs text-slate-400 hover:text-red-500 transition-colors"
          >
            <X className="h-3.5 w-3.5" />
            Clear all
          </button>
        )}
      </div>

      {/* ── Filter controls ── */}
      <div className="px-5 py-4 grid grid-cols-1 sm:grid-cols-3 gap-4">

        {/* 1. Examination multi-select */}
        <div className="flex flex-col gap-1.5">
          <label className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
            <FlaskConical className="h-3.5 w-3.5 text-violet-500" />
            Examination
          </label>

          <MultiSelectDropdown
            options={examinations}
            selected={safeValue.examinations}
            onChange={(next) => onChange({ ...safeValue, examinations: next })}
            placeholder="All Examinations"
          />

          {/* Selected pills */}
          {safeValue.examinations.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-0.5">
              {safeValue.examinations.map((ex) => (
                <span
                  key={ex}
                  className="inline-flex items-center gap-1 text-[11px] bg-violet-50 text-violet-700 px-2 py-0.5 rounded-full font-medium"
                >
                  {ex}
                  <button
                    onClick={() =>
                      onChange({ ...safeValue, examinations: safeValue.examinations.filter((e) => e !== ex) })
                    }
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>

        {/* 2. Subject filter */}
        <div className="flex flex-col gap-1.5">
          <label className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
            <BookOpen className="h-3.5 w-3.5 text-amber-500" />
            Subject
          </label>
          <div className="relative">
            <select
              value={safeValue.subject}
              onChange={(e) => onChange({ ...safeValue, subject: e.target.value })}
              className="w-full appearance-none h-9 pl-3 pr-8 rounded-lg border border-slate-200 bg-white text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-400 focus:border-transparent transition"
            >
              <option value="">All Subjects</option>
              {subjects.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
          </div>
          {safeValue.subject && (
            <span className="inline-flex items-center gap-1 self-start text-[11px] bg-amber-50 text-amber-700 px-2 py-0.5 rounded-full font-medium">
              {safeValue.subject}
              <button onClick={() => onChange({ ...safeValue, subject: "" })}>
                <X className="h-3 w-3" />
              </button>
            </span>
          )}
        </div>

        {/* 3. Date range */}
        <div className="flex flex-col gap-1.5">
          <label className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
            <CalendarRange className="h-3.5 w-3.5 text-teal-500" />
            Date Range
          </label>
          <div className="relative">
            <select
              value={preset}
              onChange={(e) => handlePreset(e.target.value as Preset)}
              className="w-full appearance-none h-9 pl-3 pr-8 rounded-lg border border-slate-200 bg-white text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-400 focus:border-transparent transition"
            >
              {PRESETS.map((p) => (
                <option key={p.value} value={p.value}>{p.label}</option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
          </div>
          {(safeValue.dateFrom || safeValue.dateTo) && !showCustom && (
            <span className="inline-flex items-center gap-1 self-start text-[11px] bg-teal-50 text-teal-700 px-2 py-0.5 rounded-full font-medium">
              {safeValue.dateFrom || "…"} → {safeValue.dateTo || "today"}
              <button onClick={() => handlePreset("all")}>
                <X className="h-3 w-3" />
              </button>
            </span>
          )}
        </div>
      </div>

      {/* ── Custom date picker ── */}
      {showCustom && (
        <div className="px-5 pb-4 grid grid-cols-2 gap-3 border-t border-slate-100 pt-3">
          <div className="flex flex-col gap-1">
            <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">From</label>
            <input
              type="date"
              value={safeValue.dateFrom}
              max={safeValue.dateTo || isoToday()}
              onChange={(e) => onChange({ ...safeValue, dateFrom: e.target.value })}
              className="h-9 px-3 rounded-lg border border-slate-200 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-400 focus:border-transparent"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">To</label>
            <input
              type="date"
              value={safeValue.dateTo}
              min={safeValue.dateFrom}
              max={isoToday()}
              onChange={(e) => onChange({ ...safeValue, dateTo: e.target.value })}
              className="h-9 px-3 rounded-lg border border-slate-200 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-400 focus:border-transparent"
            />
          </div>
          {(safeValue.dateFrom || safeValue.dateTo) && (
            <div className="col-span-2">
              <span className="inline-flex items-center gap-1 text-[11px] bg-teal-50 text-teal-700 px-2 py-0.5 rounded-full font-medium">
                {safeValue.dateFrom || "Any start"} → {safeValue.dateTo || "Any end"}
                <button onClick={() => onChange({ ...safeValue, dateFrom: "", dateTo: "" })}>
                  <X className="h-3 w-3" />
                </button>
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
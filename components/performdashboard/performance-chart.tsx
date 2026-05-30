"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

// ─── Types ────────────────────────────────────────────────────────────────────

interface AssessmentRow {
  subject: string;
  examination: string;
  marks: number;
  total_marks?: number;
}

interface PerformanceChartProps {
  /** Raw assessment rows — the chart builds itself from these */
  assessmentRows?: AssessmentRow[];

  /** Legacy prop kept for backward-compat (ignored when assessmentRows provided) */
  data?: Array<{
    subject: string;
    thisTerm: number;
    lastTerm?: number;
  }>;
}

// ─── Palette — one colour per examination line ────────────────────────────────

const LINE_COLORS = [
  "#14b8a6", // teal
  "#6366f1", // indigo
  "#f59e0b", // amber
  "#ef4444", // red
  "#22c55e", // green
  "#ec4899", // pink
  "#3b82f6", // blue
  "#a855f7", // purple
  "#f97316", // orange
  "#64748b", // slate
];

function colorFor(index: number) {
  return LINE_COLORS[index % LINE_COLORS.length];
}

// ─── Data builder ─────────────────────────────────────────────────────────────

/**
 * Converts flat assessment rows into recharts-friendly data:
 *
 * [
 *   { subject: "Maths",   "Unit Test 1": 72, "Mid-Term": 81 },
 *   { subject: "Science", "Unit Test 1": 68, "Mid-Term": 74 },
 *   …
 * ]
 */
function buildChartData(rows: AssessmentRow[]): {
  chartData: Record<string, string | number>[];
  examinations: string[];
} {
  if (!rows.length) return { chartData: [], examinations: [] };

  // Collect unique subjects & examinations (preserve insertion order)
  const subjectSet = new Set<string>();
  const examinationSet = new Set<string>();

  for (const r of rows) {
    if (r.subject) subjectSet.add(r.subject);
    if (r.examination) examinationSet.add(r.examination);
  }

  const subjects = Array.from(subjectSet);
  const examinations = Array.from(examinationSet);

  // Build a lookup: subject → examination → percentage
  const lookup: Record<string, Record<string, number>> = {};
  for (const r of rows) {
    if (!r.subject || !r.examination) continue;
    if (!lookup[r.subject]) lookup[r.subject] = {};
    const total = r.total_marks && r.total_marks > 0 ? r.total_marks : 100;
    const pct = Math.round((r.marks / total) * 100 * 10) / 10; // 1 dp
    // If duplicate (same subject+exam), take the latest (last in array)
    lookup[r.subject][r.examination] = pct;
  }

  const chartData = subjects.map((subject) => {
    const point: Record<string, string | number> = { subject };
    for (const exam of examinations) {
      if (lookup[subject]?.[exam] !== undefined) {
        point[exam] = lookup[subject][exam];
      }
    }
    return point;
  });

  return { chartData, examinations };
}

// ─── Custom Tooltip ───────────────────────────────────────────────────────────

function CustomTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ name: string; value: number; color: string }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-lg text-sm min-w-[160px]">
      <p className="font-semibold text-slate-800 mb-2">{label}</p>
      {payload.map((entry) => (
        <div key={entry.name} className="flex items-center justify-between gap-4 py-0.5">
          <span className="flex items-center gap-1.5">
            <span
              className="inline-block w-2.5 h-2.5 rounded-full"
              style={{ background: entry.color }}
            />
            <span className="text-slate-600">{entry.name}</span>
          </span>
          <span className="font-bold text-slate-800">{entry.value}%</span>
        </div>
      ))}
    </div>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export function PerformanceChart({ assessmentRows, data }: PerformanceChartProps) {

  // ── Build from raw rows when provided ──
  if (assessmentRows && assessmentRows.length > 0) {
    const { chartData, examinations } = buildChartData(assessmentRows);

    if (!chartData.length) {
      return (
        <div className="rounded-xl bg-white p-5 shadow-sm border border-slate-100">
          <h3 className="mb-4 text-lg font-semibold text-slate-800">Performance Overview</h3>
          <div className="h-64 flex items-center justify-center text-sm text-slate-400">
            No assessment data yet.
          </div>
        </div>
      );
    }

    return (
      <div className="rounded-xl bg-white p-5 shadow-sm border border-slate-100">
        <div className="mb-4 flex items-start justify-between gap-2">
          <h3 className="text-lg font-semibold text-slate-800">Performance Overview</h3>
          <span className="text-xs text-slate-400 mt-1">
            {examinations.length} test{examinations.length !== 1 ? "s" : ""}
          </span>
        </div>

        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis
                dataKey="subject"
                tick={{ fontSize: 11, fill: "#64748b" }}
                tickLine={false}
                axisLine={{ stroke: "#e2e8f0" }}
              />
              <YAxis
                domain={[0, 100]}
                tick={{ fontSize: 11, fill: "#64748b" }}
                tickLine={false}
                axisLine={{ stroke: "#e2e8f0" }}
                ticks={[0, 25, 50, 75, 100]}
                tickFormatter={(v) => `${v}%`}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend
                verticalAlign="top"
                height={examinations.length > 4 ? 52 : 36}
                iconType="circle"
                formatter={(value) => (
                  <span style={{ fontSize: 12, color: "#475569" }}>{value}</span>
                )}
              />
              {examinations.map((exam, i) => (
                <Line
                  key={exam}
                  type="monotone"
                  dataKey={exam}
                  name={exam}
                  stroke={colorFor(i)}
                  strokeWidth={2}
                  dot={{ fill: colorFor(i), strokeWidth: 2, r: 4 }}
                  activeDot={{ r: 6 }}
                  connectNulls={false}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    );
  }

  // ── Legacy fallback: original this-term / last-term shape ──
  const legacyData = data ?? [];
  return (
    <div className="rounded-xl bg-white p-5 shadow-sm border border-slate-100">
      <h3 className="mb-4 text-lg font-semibold text-slate-800">Performance Overview</h3>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={legacyData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis
              dataKey="subject"
              tick={{ fontSize: 11, fill: "#64748b" }}
              tickLine={false}
              axisLine={{ stroke: "#e2e8f0" }}
            />
            <YAxis
              domain={[0, 100]}
              tick={{ fontSize: 11, fill: "#64748b" }}
              tickLine={false}
              axisLine={{ stroke: "#e2e8f0" }}
              ticks={[0, 25, 50, 75, 100]}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "#fff",
                border: "1px solid #e2e8f0",
                borderRadius: "8px",
                boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
              }}
            />
            <Legend
              verticalAlign="top"
              height={36}
              iconType="circle"
              formatter={(value) => (
                <span className="text-sm text-slate-600">{value}</span>
              )}
            />
            <Line
              type="monotone"
              dataKey="thisTerm"
              name="This Term"
              stroke="#14b8a6"
              strokeWidth={2}
              dot={{ fill: "#14b8a6", strokeWidth: 2, r: 4 }}
              activeDot={{ r: 6 }}
            />
            <Line
              type="monotone"
              dataKey="lastTerm"
              name="Last Term"
              stroke="#94a3b8"
              strokeWidth={2}
              dot={{ fill: "#94a3b8", strokeWidth: 2, r: 4 }}
              activeDot={{ r: 6 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
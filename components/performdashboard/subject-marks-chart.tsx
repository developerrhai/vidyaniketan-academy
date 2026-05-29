"use client";

import {
  ComposedChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
  Cell,
  ErrorBar,
} from "recharts";

interface Subject {
  name: string;
  marks: number;
  total: number;
  color: string;
}

interface SubjectMarksChartProps {
  subjects: Subject[];
  average: number;
}

const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload?.length) {
    const d = payload[0].payload;
    return (
      <div className="rounded-lg bg-white border border-slate-100 shadow-md px-3 py-2 text-sm">
        <p className="font-semibold text-slate-800">{d.name}</p>
        <p className="text-slate-500">
          Scored: <span className="font-bold text-slate-800">{d.marks}</span> / {d.total}
        </p>
        <p className="text-slate-500">
          Percentage:{" "}
          <span className="font-bold text-slate-800">
            {Math.round((d.marks / d.total) * 100)}%
          </span>
        </p>
      </div>
    );
  }
  return null;
};

export function SubjectMarksChart({ subjects, average }: SubjectMarksChartProps) {
  if (!subjects.length) {
    return (
      <div className="rounded-xl bg-white p-5 shadow-sm border border-slate-100">
        <h3 className="mb-4 text-lg font-semibold text-slate-800">Subject-wise Marks</h3>
        <p className="text-sm text-slate-500 py-8 text-center">No marks recorded yet.</p>
      </div>
    );
  }

  // Build chart data: low=0, high=total, open=marks (scored), close=total (for candle body)
  const data = subjects.map((s) => ({
    ...s,
    scored: s.marks,
    remaining: s.total - s.marks,
    pct: Math.round((s.marks / s.total) * 100),
  }));

  return (
    <div className="rounded-xl bg-white p-5 shadow-sm border border-slate-100">
      <h3 className="mb-1 text-lg font-semibold text-slate-800">Subject-wise Marks</h3>
      <p className="text-xs text-slate-400 mb-5 font-mono">Candlestick — scored vs total</p>

      <ResponsiveContainer width="100%" height={260}>
        <ComposedChart data={data} margin={{ top: 16, right: 16, left: -10, bottom: 4 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0ede8" vertical={false} />
          <XAxis
            dataKey="name"
            tick={{ fontSize: 11, fill: "#a09888", fontFamily: "monospace" }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            domain={[0, (dataMax: number) => Math.ceil(dataMax / 25) * 25]}
            tick={{ fontSize: 10, fill: "#b0a898", fontFamily: "monospace" }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(0,0,0,0.03)" }} />

          {/* Average reference line */}
          <ReferenceLine
            y={average}
            stroke="#c0a060"
            strokeDasharray="5 4"
            strokeWidth={1.5}
            label={{
              value: `avg ${average}`,
              position: "insideTopRight",
              fontSize: 10,
              fill: "#c0a060",
              fontFamily: "monospace",
            }}
          />

          {/* Remaining (unscored) portion — dimmed top of candle */}
          <Bar dataKey="remaining" stackId="a" radius={[4, 4, 0, 0]}>
            {data.map((entry, index) => (
              <Cell
                key={`rem-${index}`}
                fill={entry.color}
                fillOpacity={0.18}
              />
            ))}
          </Bar>

          {/* Scored portion — solid candle body */}
          <Bar dataKey="scored" stackId="a" radius={[0, 0, 4, 4]} label={{ position: "inside", fontSize: 11, fill: "white", fontWeight: 700, fontFamily: "monospace", formatter: (v: number) => v }}>
            {data.map((entry, index) => (
              <Cell key={`scored-${index}`} fill={entry.color} />
            ))}
          </Bar>
        </ComposedChart>
      </ResponsiveContainer>

      {/* Legend */}
      <div className="flex flex-wrap gap-x-5 gap-y-2 mt-4">
        {subjects.map((s) => (
          <div key={s.name} className="flex items-center gap-2 text-xs text-slate-500">
            <span
              className="inline-block w-2.5 h-2.5 rounded-sm"
              style={{ backgroundColor: s.color }}
            />
            {s.name}: <span className="font-semibold text-slate-700">{s.marks}/{s.total}</span>
          </div>
        ))}
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <span className="inline-block w-2.5 h-2.5 rounded-sm border border-dashed border-yellow-500" />
          Average: <span className="font-semibold text-slate-700">{average}%</span>
        </div>
      </div>
    </div>
  );
}
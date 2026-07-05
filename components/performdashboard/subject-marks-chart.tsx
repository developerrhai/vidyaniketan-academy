"use client";

import React, { useMemo } from "react";
import {
  ComposedChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { Info, HelpCircle } from "lucide-react";
import { type AssessmentRow } from "../../lib/performance-utils";

interface SubjectMarksChartProps {
  assessmentRows: AssessmentRow[];
}

const TEST_COLORS = [
  "#3b82f6", // Vibrant Blue
  "#10b981", // Emerald Green
  "#f59e0b", // Amber Yellow
  "#8b5cf6", // Royal Purple
  "#ec4899", // Rose Pink
  "#06b6d4", // Cyan
  "#f97316", // Orange
];

/**
 * CUSTOM CHART TOOLTIP
 * Displays the subject average and individual test marks on hover in a dark premium badge.
 */
const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    const testsList = Object.keys(data)
      .filter((k) => k !== "subject" && k !== "average" && data[k] !== undefined && data[k] !== null)
      .map((k) => ({ name: k, score: data[k] }));

    return (
      <div className="rounded-2xl bg-slate-900 text-white border border-slate-800 shadow-2xl px-4 py-3 text-xs space-y-2 z-50 font-sans">
        <p className="font-bold text-slate-100 text-sm border-b border-slate-800 pb-1">{data.subject}</p>
        <p className="text-slate-300">
          Subject Average: <span className="font-bold text-teal-400">{data.average}%</span>
        </p>
        {testsList.length > 0 && (
          <div className="space-y-1 pt-1">
            <p className="text-slate-400 font-bold text-[9px] uppercase tracking-wider">Test-wise Marks:</p>
            {testsList.map((t) => (
              <p key={t.name} className="text-slate-300 flex justify-between gap-6">
                <span className="text-slate-400">{t.name}:</span>
                <span className="font-bold text-white">{t.score} Marks</span>
              </p>
            ))}
          </div>
        )}
      </div>
    );
  }
  return null;
};

export function SubjectMarksChart({ assessmentRows }: SubjectMarksChartProps) {
  // Extract data ready for nested visualization
  const { chartData, uniqueTestNames } = useMemo(() => {
    if (!assessmentRows || assessmentRows.length === 0) {
      return { chartData: [], uniqueTestNames: [] };
    }

    // Group rows by subject
    const subjectMap = new Map<string, AssessmentRow[]>();
    assessmentRows.forEach((row) => {
      if (!row?.subject) return;
      const subKey = row.subject.trim();
      if (!subKey) return;
      const list = subjectMap.get(subKey) || [];
      list.push(row);
      subjectMap.set(subKey, list);
    });

    const uniqueTests = new Set<string>();
    const chartData: any[] = [];

    for (const [subjectName, rawRows] of subjectMap.entries()) {
      // Group tests by examination name to average scores if it's class view
      const testMap = new Map<string, { marksSum: number; maxMarksSum: number; count: number }>();
      
      rawRows.forEach((r) => {
        const testName = r.examination || "Weekly Test";
        const max = Number(r.total_marks) > 0 ? Number(r.total_marks) : 100;
        const score = Number(r.marks) || 0;
        
        const existing = testMap.get(testName) || { marksSum: 0, maxMarksSum: 0, count: 0 };
        existing.marksSum += score;
        existing.maxMarksSum += max;
        existing.count += 1;
        
        testMap.set(testName, existing);
        uniqueTests.add(testName);
      });

      const item: any = {
        subject: subjectName,
      };

      let totalScoreSum = 0;
      let totalMaxSum = 0;

      testMap.forEach((data, testName) => {
        const avgScore = Number((data.marksSum / data.count).toFixed(1));
        const avgMax = Number((data.maxMarksSum / data.count).toFixed(1));
        // Save score (normalized out of 100 for visual consistency if max marks differ)
        const pct = avgMax > 0 ? Math.round((avgScore / avgMax) * 100) : 0;
        item[testName] = avgScore; // Save raw score
        totalScoreSum += avgScore;
        totalMaxSum += avgMax;
      });

      // Calculate subject average percentage
      item.average = totalMaxSum > 0 ? Math.round((totalScoreSum / totalMaxSum) * 100) : 0;
      chartData.push(item);
    }

    return {
      chartData,
      uniqueTestNames: Array.from(uniqueTests),
    };
  }, [assessmentRows]);

  if (chartData.length === 0) {
    return (
      <div className="rounded-2xl bg-white p-8 shadow-sm border border-slate-100 flex flex-col items-center justify-center min-h-[300px]">
        <div className="rounded-full bg-slate-50 p-4 mb-3">
          <Info className="h-8 w-8 text-slate-400" />
        </div>
        <h3 className="text-lg font-semibold text-slate-800 mb-1">Subject Performance Analysis</h3>
        <p className="text-sm text-slate-500 text-center max-w-sm">
          No assessment records found. Graphs will appear automatically once test marks are recorded.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl bg-white p-6 shadow-sm border border-slate-100">
      {/* Chart Title and Header */}
      <div className="flex items-start justify-between mb-6 flex-wrap gap-4">
        <div>
          <h3 className="text-lg font-bold text-slate-800">Subject-wise Performance Overview</h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Wide background bars represent the **Subject Average**, with narrow test bars nested inside.
          </p>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-slate-400 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-100">
          <HelpCircle className="h-3.5 w-3.5 text-slate-400" />
          <span>Hover bars to view complete test details</span>
        </div>
      </div>

      {/* Composed Chart Container */}
      <div className="w-full overflow-x-auto scrollbar-thin scrollbar-thumb-slate-100 scrollbar-track-transparent">
        <div style={{ minWidth: chartData.length > 5 ? `${chartData.length * 150}px` : "100%", height: 320 }}>
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartData} margin={{ top: 24, right: 10, left: -22, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              
              {/* Primary X-Axis for Subjects (Categories) */}
              <XAxis
                dataKey="subject"
                xAxisId={0}
                tick={{ fontSize: 11, fill: "#475569", fontWeight: 700 }}
                axisLine={false}
                tickLine={false}
              />
              
              {/* Secondary X-Axis (Hidden) for grouping nested Test bars side-by-side inside the Subject bar */}
              <XAxis
                dataKey="subject"
                xAxisId={1}
                hide
              />

              <YAxis
                domain={[0, 100]}
                tick={{ fontSize: 10, fill: "#64748b", fontWeight: 500 }}
                axisLine={false}
                tickLine={false}
              />
              
              <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(148, 163, 184, 0.03)" }} />
              
              {/* Legend Configuration */}
              <Legend
                verticalAlign="bottom"
                height={36}
                iconSize={10}
                iconType="circle"
                wrapperStyle={{ fontSize: 11, fontWeight: 500 }}
              />

              {/* 1. THE OVERALL SUBJECT AVERAGE: Wide background bar (darker for clear visibility) */}
              <Bar
                name="Subject Average"
                xAxisId={0}
                dataKey="average"
                fill="#e2e8f0"
                fillOpacity={0.6}
                stroke="#94a3b8"
                strokeWidth={1.5}
                barSize={75}
                radius={[6, 6, 0, 0]}
                label={{
                  position: "top",
                  fontSize: 10,
                  fill: "#475569",
                  fontWeight: 800,
                  formatter: (val: number) => `${val}% Avg`,
                }}
              />

              {/* 2. THE NESTED TEST BARS: Populated dynamically inside the average bar */}
              {uniqueTestNames.map((testName, idx) => (
                <Bar
                  key={testName}
                  name={testName}
                  xAxisId={1}
                  dataKey={testName}
                  fill={TEST_COLORS[idx % TEST_COLORS.length]}
                  barSize={10}
                  radius={[3, 3, 0, 0]}
                />
              ))}
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
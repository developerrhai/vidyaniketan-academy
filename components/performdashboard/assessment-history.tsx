"use client";

import { Loader2 } from "lucide-react";
import type { AssessmentRow } from "@/lib/performance-utils";

type AssessmentHistoryProps = {
  rows: AssessmentRow[];
  loading?: boolean;
};

function getColor(pct: number) {
  if (pct >= 80) return "#3B6D11";
  if (pct >= 60) return "#185FA5";
  return "#A32D2D";
}

export function AssessmentHistory({ rows, loading }: AssessmentHistoryProps) {
  // Derive unique subjects and unique exams (preserving insertion order)
  const subjects = [...new Set(rows.map((r) => r.subject))];
  const examKeys = [...new Map(
    rows.map((r) => [r.examination, { examination: r.examination, exam_date: r.exam_date }])
  ).values()];

  return (
    <div className="rounded-xl bg-white border border-slate-100 shadow-sm overflow-hidden">
      <h3 className="px-5 py-4 text-[15px] font-medium text-slate-800 border-b border-slate-100">
        Assessment History
      </h3>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
        <tr style={{ backgroundColor: "#314158" }}>
            <th className="px-4 py-3 text-left text-xs font-medium text-white border-r border-white/10 whitespace-nowrap">
              Examination
            </th>
            {subjects.map((subject) => (
              <th
                key={subject}
                className="px-4 py-3 text-center text-[13px] font-medium text-white min-w-[100px]"
              >
                {subject}
              </th>
            ))}
          </tr>
          </thead>

          <tbody>
            {loading ? (
              <tr>
                <td
                  colSpan={subjects.length + 1}
                  className="py-8 text-center text-slate-400"
                >
                  <Loader2 className="mx-auto h-5 w-5 animate-spin" />
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td
                  colSpan={subjects.length + 1}
                  className="py-8 text-center text-slate-400 text-sm"
                >
                  No assessments recorded yet. Use Add Marks to enter results.
                </td>
              </tr>
            ) : (
              examKeys.map((exam) => (
                <tr key={exam.examination} className="border-t border-slate-100 hover:bg-slate-50">
                  {/* Exam label */}
                  <td className="px-4 py-3 border-r border-slate-100 whitespace-nowrap">
                    <p className="font-medium text-slate-700">{exam.examination}</p>
                    <p className="text-[11px] text-slate-400">
                      {exam.exam_date ? String(exam.exam_date).split("T")[0] : "—"}
                    </p>
                  </td>

                  {/* One cell per subject */}
                  {subjects.map((subject) => {
                    const match = rows.find(
                      (r) => r.subject === subject && r.examination === exam.examination
                    );
                    const total = match?.total_marks && match.total_marks > 0 ? match.total_marks : 100;
                    const pct = match ? Math.round((match.marks / total) * 100) : null;
                    const color = pct !== null ? getColor(pct) : undefined;

                    return (
                      <td key={subject} className="px-4 py-3 text-center">
                        {match && pct !== null ? (
                          <>
                            <span className="font-medium" style={{ color }}>
                              {match.marks}
                            </span>
                            <span className="text-slate-400"> / {total}</span>
                            <div className="mt-1 h-[3px] rounded-full bg-slate-100 overflow-hidden">
                              <div
                                className="h-full rounded-full"
                                style={{ width: `${pct}%`, backgroundColor: color }}
                              />
                            </div>
                          </>
                        ) : (
                          <span className="text-slate-300">—</span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
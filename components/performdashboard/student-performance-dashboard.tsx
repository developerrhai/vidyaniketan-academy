"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, GraduationCap, Download, Loader2, MessageCircle, Plus, ClipboardList, CalendarCheck } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "../ui/button";
import { StudentProfile } from "../performdashboard/student-profile";
import { StatsCard } from "../performdashboard/stats-card";
import { PerformanceChart } from "../performdashboard/performance-chart";
import { SubjectMarksChart } from "../performdashboard/subject-marks-chart";
import { PerformanceInsights } from "../performdashboard/insights-card";
import { DetailedAnalysis } from "../performdashboard/detailed-analysis";
import { AddMarksDialog } from "../performdashboard/add-marks-dialog";
import { BulkAddMarksDialog } from "../performdashboard/bulk-add-marks-dialog";
import { AssessmentHistory } from "../performdashboard/assessment-history";
import { AddAttendanceDialog } from "../performdashboard/add-attendance-dialog";
import { RankHistory, type RankHistoryRow } from "../performdashboard/rank-history";
import { PerformanceFilters, type PerformanceFiltersValue } from "./performance-filters";
import {
  studentsUniversalApi,
  teacherStudentAssessmentsApi,
  studentAttendanceApi,
  studentRankHistoryApi,
} from "../../lib/api";
import {
  type AssessmentRow,
  type DashboardData,
  type InsightItem,
  buildDashboardData,
  buildInsights,
  parseAttendanceExtras,
  parseRankExtras,
  toNum,
} from "../../lib/performance-utils";

const STANDARDS = [
  "4th Standard",
  "4th Scholarship",
  "5th Standard",
  "5th Scholarship(नवोदय / सैनिक)",
  "6th Standard",
  "6th Foundation",
  "7th Standard",
  "7th Scholarship",
  "7th Foundation",
  "6th–7th Foundation",
  "8th Standard",
  "8th Foundation",
  "8th Regular",
  "9th Standard",
  "9th Photon",
  "9th Foundation",
  "10th Standard",
  "11th Standard",
  "12th Standard",
  "Basic Foundation 1 (4th to 6th)",
  "Basic Foundation 2 (7th to 9th)"
];

type Student = {
  id: number;
  name: string;
  phone: string;
  standard: string;
  board: string;
  location: string;
};

const emptyDashboard = (student: Student): DashboardData =>
  buildDashboardData(student, [], { totalStudents: 1, classRank: 0 });

// ─── Bulk send result tracking ────────────────────────────────────────────────
type BulkResult = {
  studentName: string;
  phone: string;
  status: "success" | "failed" | "skipped";
  reason?: string;
};

function getPerformanceLabel(pct: number): string {
  if (pct >= 90) return "Excellent 🌟";
  if (pct >= 75) return "Very Good 👍";
  if (pct >= 60) return "Good ✅";
  if (pct >= 50) return "Average 📘";
  return "Needs Improvement 📚";
}

function mapAssessmentRows(data: unknown[]): AssessmentRow[] {
  return (data || []).map((r: any) => ({
    id: r.id,
    student_id: r.student_id ? Number(r.student_id) : undefined,
    subject: r.subject || "",
    marks: toNum(r.marks),
    total_marks: r.total_marks != null ? toNum(r.total_marks) : undefined,
    examination: r.examination || "",
    exam_date: r.exam_date || "",
  }));
}

// ─── RhaiTech WhatsApp API call ───────────────────────────────────────────────

// async function sendWhatsAppViaAPI(
//   phone: string,
//   studentName: string,
//   className: string,
//   examination: string,
//   examDate: string,
//   marks: number,
//   totalMarks: number,
//   performance: string
// ): Promise<{ success: boolean; message: string }> {
//   try {
//     const res = await fetch(
//       `${process.env.NEXT_PUBLIC_API_URL}/whatsapp/send-report`,
//       {
//         method: "POST",
//         headers: { "Content-Type": "application/json" },
//         body: JSON.stringify({
//           phone,
//           studentName,
//           className,
//           examination,
//           examDate,
//           marks,
//           totalMarks,
//           performance,
//         }),
//       }
//     );

//     const json = await res.json();
//     return { success: json.success, message: json.message };
//   } catch (e: any) {
//     return { success: false, message: e?.message || "Network error" };
//   }
// }

async function sendWhatsAppViaAPI(
  phone: string,
  studentName: string,
  className: string,
  examination: string,
  examDate: string,
  marks: number,
  totalMarks: number,
  performance: string
): Promise<{ success: boolean; message: string }> {

  try {

    // Clean phone number
    let cleanedPhone = String(phone || "").replace(/\D/g, "");

    // Add India code if missing
    if (cleanedPhone.length === 10) {
      cleanedPhone = `91${cleanedPhone}`;
    }

    // Validate
    if (cleanedPhone.length < 12) {
      return {
        success: false,
        message: `Invalid number: ${phone}`,
      };
    }

    console.log("📤 Sending WhatsApp to:", cleanedPhone);

    const res = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/whatsapp/send-report`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },

        body: JSON.stringify({
          phone: cleanedPhone,
          studentName,
          className,
          examination,
          examDate,
          marks,
          totalMarks,
          performance,
        }),
      }
    );

    const json = await res.json();

    console.log("✅ WhatsApp API Response:", json);

    return {
      success:
        json.success === true ||
        json.status === true ||
        json.message?.toLowerCase().includes("sent"),

      message: json.message || "Message processed",
    };

  } catch (e: any) {

    console.error("❌ WhatsApp Send Error:", e);

    return {
      success: false,
      message: e?.message || "Network error",
    };
  }
}


// ─── Report HTML builder ──────────────────────────────────────────────────────

function generateReportHTML(data: DashboardData): string {
  const generatedOn = new Date().toLocaleDateString("en-IN", {
    day: "2-digit", month: "long", year: "numeric",
  });

  const subjectRows = data.subjects.map((s) => {
    const pct = ((s.marks / s.total) * 100).toFixed(1);
    const pctNum = Number(pct);
    const grade =
      pctNum >= 90 ? "A+" : pctNum >= 80 ? "A" : pctNum >= 70 ? "B+" :
        pctNum >= 60 ? "B" : pctNum >= 50 ? "C" : "D";
    const barW = Math.max(0, Math.min(100, pctNum));
    const badgeBg = pctNum >= 75 ? "#dcfce7" : pctNum >= 50 ? "#fef9c3" : "#fee2e2";
    const badgeFg = pctNum >= 75 ? "#15803d" : pctNum >= 50 ? "#854d0e" : "#b91c1c";
    return `
        <tr>
          <td style="padding:10px 12px;font-weight:500;color:#1e293b">${s.name}</td>
          <td style="padding:10px 12px;text-align:center;color:#475569">${s.marks}</td>
          <td style="padding:10px 12px;text-align:center;color:#475569">${s.total}</td>
          <td style="padding:10px 12px;text-align:center;color:#475569">${pct}%</td>
          <td style="padding:10px 12px;text-align:center">
            <span style="display:inline-block;padding:2px 10px;border-radius:20px;font-size:12px;
              font-weight:700;background:${badgeBg};color:${badgeFg}">${grade}</span>
          </td>
          <td style="padding:10px 12px">
            <div style="background:#e2e8f0;border-radius:4px;height:8px;width:100%;min-width:80px">
              <div style="background:${s.color};height:8px;border-radius:4px;width:${barW}%"></div>
            </div>
          </td>
        </tr>`;
  }).join("");

  const compRows = data.performanceData
    .filter((p) => p.lastTerm !== undefined && p.lastTerm !== null)
    .map((p) => {
      const diff = p.thisTerm - (p.lastTerm as number);
      const arrow = diff > 0 ? "&#9650;" : diff < 0 ? "&#9660;" : "&#8212;";
      const color = diff > 0 ? "#16a34a" : diff < 0 ? "#dc2626" : "#94a3b8";
      return `
        <tr>
          <td style="padding:10px 12px;font-weight:500;color:#1e293b">${p.subject}</td>
          <td style="padding:10px 12px;text-align:center;color:#475569">${p.lastTerm}</td>
          <td style="padding:10px 12px;text-align:center;color:#475569">${p.thisTerm}</td>
          <td style="padding:10px 12px;text-align:center;font-weight:700;color:${color}">
            ${arrow} ${Math.abs(diff)}
          </td>
        </tr>`;
    }).join("");

  const changeClass = (v: number) => (v >= 0 ? "change-pos" : "change-neg");
  const arrowHTML = (v: number) => (v >= 0 ? "&#9650;" : "&#9660;");

  return `<!DOCTYPE html>
  <html lang="en">
  <head>
    <meta charset="UTF-8"/>
    <title>Performance Report – ${data.name}</title>
    <style>
      * { box-sizing: border-box; margin: 0; padding: 0 }
      body { font-family: 'Segoe UI', Arial, sans-serif; background: #fff; color: #1e293b; font-size: 14px }
      @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact } .no-print { display: none } }
      .page { max-width: 900px; margin: 0 auto; padding: 40px 36px }
      .header { display: flex; align-items: center; justify-content: space-between; padding-bottom: 20px; border-bottom: 3px solid #0d9488; margin-bottom: 28px }
      .header-left h1 { font-size: 22px; font-weight: 700; color: #0d9488 }
      .header-left p { font-size: 12px; color: #94a3b8; margin-top: 2px }
      .header-badge { background: #0d9488; color: #fff; padding: 6px 16px; border-radius: 20px; font-size: 12px; font-weight: 600 }
      .profile-card { background: #f0fdfa; border: 1px solid #99f6e4; border-radius: 12px; padding: 20px 24px; display: flex; gap: 32px; flex-wrap: wrap; margin-bottom: 24px }
      .profile-field label { font-size: 11px; color: #64748b; text-transform: uppercase; letter-spacing: .5px }
      .profile-field p { font-size: 15px; font-weight: 600; color: #0f172a; margin-top: 2px }
      .stats-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 14px; margin-bottom: 28px }
      .stat-box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 16px; text-align: center }
      .stat-box .label { font-size: 11px; color: #64748b; text-transform: uppercase; letter-spacing: .5px }
      .stat-box .value { font-size: 26px; font-weight: 700; color: #0f172a; margin: 4px 0 2px }
      .stat-box .sub { font-size: 12px; color: #94a3b8 }
      .change-pos { font-size: 12px; color: #16a34a; font-weight: 600 }
      .change-neg { font-size: 12px; color: #dc2626; font-weight: 600 }
      .section-title { font-size: 14px; font-weight: 700; color: #0f172a; border-left: 4px solid #0d9488; padding-left: 10px; margin: 24px 0 14px }
      table { width: 100%; border-collapse: collapse; font-size: 13px }
      thead tr { background: #f1f5f9 }
      thead th { padding: 10px 12px; text-align: left; font-size: 11px; text-transform: uppercase; letter-spacing: .5px; color: #64748b; font-weight: 600 }
      tbody tr:nth-child(even) { background: #f8fafc }
      .footer { margin-top: 36px; padding-top: 16px; border-top: 1px solid #e2e8f0; display: flex; justify-content: space-between; font-size: 11px; color: #94a3b8 }
      .print-btn { display: block; margin: 0 auto 28px; padding: 10px 28px; background: #0d9488; color: #fff; border: none; border-radius: 8px; font-size: 14px; font-weight: 600; cursor: pointer }
    </style>
  </head>
  <body>
  <div class="page">
    <button class="print-btn no-print" onclick="window.print()">&#128438; Print / Save as PDF</button>
    <div class="header">
      <div class="header-left"><h1>Student Performance Report</h1><p>Generated on ${generatedOn}</p></div>
      <span class="header-badge">Academic Report</span>
    </div>
    <div class="profile-card">
      <div class="profile-field"><label>Student Name</label><p>${data.name}</p></div>
      <div class="profile-field"><label>Class / Standard</label><p>${data.class}</p></div>
      <div class="profile-field"><label>Board</label><p>${data.board}</p></div>
      <div class="profile-field"><label>Location</label><p>${data.location}</p></div>
      <div class="profile-field"><label>Contact</label><p>${data.phone}</p></div>
    </div>
    <div class="section-title">Performance Overview</div>
    <div class="stats-grid">
      <div class="stat-box"><div class="label">Overall %</div><div class="value">${data.stats.overallPercentage}%</div>
        ${data.stats.percentageChange !== undefined && data.stats.percentageChange !== null ? `<div class="${changeClass(data.stats.percentageChange)}">${arrowHTML(data.stats.percentageChange)} ${Math.abs(data.stats.percentageChange)}% vs Last Term</div>` : ""}</div>
      <div class="stat-box"><div class="label">Avg Marks</div><div class="value">${data.stats.averageMarks}</div><div class="sub">out of ${data.stats.totalMarks}</div></div>
      <div class="stat-box"><div class="label">Class Rank</div><div class="value">${data.stats.classRank}</div><div class="sub">of ${data.stats.totalStudents} students</div></div>
      <div class="stat-box"><div class="label">Attendance</div><div class="value">${data.stats.attendance}%</div>
        ${data.stats.attendanceChange !== undefined && data.stats.attendanceChange !== null ? `<div class="${changeClass(data.stats.attendanceChange)}">${arrowHTML(data.stats.attendanceChange)} ${Math.abs(data.stats.attendanceChange)}% vs Last Term</div>` : ""}</div>
    </div>
    <div class="section-title">Subject-wise Performance</div>
    <table>
      <thead><tr><th>Subject</th><th style="text-align:center">Marks</th><th style="text-align:center">Total</th><th style="text-align:center">Percentage</th><th style="text-align:center">Grade</th><th>Progress</th></tr></thead>
      <tbody>${subjectRows}</tbody>
    </table>
    ${compRows ? `<div class="section-title">Term-over-Term Comparison</div>
    <table><thead><tr><th>Subject</th><th style="text-align:center">Last Term</th><th style="text-align:center">This Term</th><th style="text-align:center">Change</th></tr></thead>
    <tbody>${compRows}</tbody></table>` : ""}
    <div class="footer"><span>Student Performance Analysis System</span><span>Report for ${data.name} &nbsp;|&nbsp; ${generatedOn}</span></div>
  </div></body></html>`;
}

async function downloadReport(data: DashboardData) {
  const html = generateReportHTML(data);
  const blob = new Blob([html], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const win = window.open(url, "_blank");
  if (win) { win.focus(); setTimeout(() => URL.revokeObjectURL(url), 10_000); }
  else {
    const a = document.createElement("a");
    a.href = url;
    a.download = `report-${data.name.replace(/\s+/g, "-").toLowerCase()}.html`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 5_000);
  }
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function StudentPerformanceDashboard() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [students, setStudents] = useState<Student[]>([]);
  const preferredStudentId = Number(searchParams.get("studentId"));
  const [selectedStudentId, setSelectedStudentId] = useState<number | null>(() =>
    Number.isFinite(preferredStudentId) ? preferredStudentId : null
  );
  // const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [historyRows, setHistoryRows] = useState<AssessmentRow[]>([]);
  const [filters, setFilters] = useState<PerformanceFiltersValue>({
    examinations: [],
    subject: "",
    dateFrom: "",
    dateTo: "",
  });

  const [attendanceExtras, setAttendanceExtras] = useState({
    attendance: 0,
    attendanceChange: 0,
  });

  const [rankExtras, setRankExtras] = useState({
    classRank: 0,
    totalStudents: 1,
    rankChange: 0,
  });
  const [rankHistoryRows, setRankHistoryRows] = useState<RankHistoryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [studentLoading, setStudentLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [addMarksOpen, setAddMarksOpen] = useState(false);
  const [bulkMarksOpen, setBulkMarksOpen] = useState(false);
  const [addAttendanceOpen, setAddAttendanceOpen] = useState(false);

  // ── Bulk send state ────────────────────────────────────────────────────────
  const [bulkSending, setBulkSending] = useState(false);
  const [bulkProgress, setBulkProgress] = useState(0);
  const [bulkTotal, setBulkTotal] = useState(0);
  const [bulkResults, setBulkResults] = useState<BulkResult[]>([]);
  const [showBulkResults, setShowBulkResults] = useState(false);
  // Raw assessments cache per student: studentId → rows
  const [assessmentCache, setAssessmentCache] = useState<Map<number, AssessmentRow[]>>(new Map());
  const [selectedStandard, setSelectedStandard] = useState<string>("all");

  const selectedStudent = useMemo(
    () => students.find((s) => s.id === selectedStudentId) ?? null,
    [students, selectedStudentId]
  );

  const [classAssessments, setClassAssessments] = useState<AssessmentRow[]>([]);
  const [classLoading, setClassLoading] = useState(false);

  const isStudentView = selectedStudentId !== null && selectedStudent !== null;

  const classStudents = useMemo(() => {
    if (selectedStandard === "all") return students;
    return students.filter((s) => s.standard === selectedStandard);
  }, [students, selectedStandard]);

  const classStats = useMemo(() => {
    if (classAssessments.length === 0) {
      return {
        overallPercentage: 0,
        averageMarks: 0,
        totalStudents: classStudents.length,
        totalTests: 0,
      };
    }
    const totalMarks = classAssessments.reduce((acc, curr) => acc + Number(curr.marks), 0);
    const avg = Number((totalMarks / classAssessments.length).toFixed(1));
    const uniqueExams = new Set(classAssessments.map((a) => a.examination));
    return {
      overallPercentage: avg,
      averageMarks: avg,
      totalStudents: classStudents.length,
      totalTests: uniqueExams.size,
    };
  }, [classAssessments, classStudents.length]);

  const classPerformanceChartRows = useMemo<AssessmentRow[]>(() => {
    const groupedByDate = new Map<string, { total: number; count: number; examName: string }>();
    classAssessments.forEach((a) => {
      const date = (a.exam_date || "").split("T")[0];
      if (!date) return;
      const existing = groupedByDate.get(date) || { total: 0, count: 0, examName: a.examination };
      existing.total += Number(a.marks);
      existing.count += 1;
      groupedByDate.set(date, existing);
    });
    return Array.from(groupedByDate.entries())
      .map(([date, data]) => ({
        id: 0,
        subject: "Class Avg",
        exam_date: date,
        marks: Number((data.total / data.count).toFixed(1)),
        examination: data.examName || "Class Avg",
      }))
      .sort((a, b) => a.exam_date.localeCompare(b.exam_date));
  }, [classAssessments]);

  const classSubjects = useMemo(() => {
    const groupedBySubject = new Map<string, { total: number; count: number }>();
    classAssessments.forEach((a) => {
      const sub = a.subject || "General";
      const existing = groupedBySubject.get(sub) || { total: 0, count: 0 };
      existing.total += Number(a.marks);
      existing.count += 1;
      groupedBySubject.set(sub, existing);
    });
    const subjectColors = ["#22c55e", "#3b82f6", "#eab308", "#8b5cf6", "#f97316", "#ec4899", "#14b8a6"];
    return Array.from(groupedBySubject.entries()).map(([name, data], idx) => ({
      name,
      marks: Number((data.total / data.count).toFixed(1)),
      total: 100,
      color: subjectColors[idx % subjectColors.length],
    }));
  }, [classAssessments]);

  const classInsights = useMemo<InsightItem[]>(() => {
    const list: InsightItem[] = [
      {
        type: "info",
        title: "Class Average",
        description: `The overall average across all students is ${classStats.overallPercentage}%.`,
      },
      {
        type: "success",
        title: "Total Records",
        description: `A total of ${classAssessments.length} assessment records are registered for ${classStudents.length} students in this class.`,
      },
    ];
    if (classSubjects.length > 0) {
      const bestSubject = [...classSubjects].sort((a, b) => b.marks - a.marks)[0];
      list.push({
        type: "tip",
        title: "Highest Performing Subject",
        description: `${bestSubject.name} is the highest performing subject, averaging ${bestSubject.marks}%.`,
      });
    }
    return list;
  }, [classStats.overallPercentage, classAssessments.length, classStudents.length, classSubjects]);

  const studentRankList = useMemo(() => {
    return classStudents
      .map((student) => {
        const studentAssessments = classAssessments.filter((a) => Number(a.student_id) === student.id);
        const avg =
          studentAssessments.length > 0
            ? Number(
                (
                  studentAssessments.reduce((acc, a) => acc + Number(a.marks), 0) /
                  studentAssessments.length
                ).toFixed(1)
              )
            : 0;
        return {
          ...student,
          average: avg,
          testsCount: studentAssessments.length,
        };
      })
      .sort((a, b) => b.average - a.average);
  }, [classStudents, classAssessments]);

  const fetchClassAssessments = async (standard: string) => {
    setClassLoading(true);
    try {
      if (standard === "all") {
        const res: any = await teacherStudentAssessmentsApi.getLatestAll();
        setClassAssessments(mapAssessmentRows(res?.data || []));
      } else {
        const res: any = await teacherStudentAssessmentsApi.getByStandard(standard);
        setClassAssessments(mapAssessmentRows(res?.data || []));
      }
    } catch (e: any) {
      console.error("Failed to load class assessments:", e);
    } finally {
      setClassLoading(false);
    }
  };

  useEffect(() => {
    fetchClassAssessments(selectedStandard);
  }, [selectedStandard]);

  useEffect(() => {
    const loadStudents = async () => {
      setLoading(true);
      setError(null);
      try {
        const studentsRes: any = await studentsUniversalApi.getAll();
        const allStudents: Student[] = (studentsRes?.data || []).map((s: any) => ({
          id: Number(s.id),
          name: s.name || "",
          phone: s.phone || "",
          standard: s.standard || "",
          board: s.board || "",
          location: s.location || "",
        }));
        setStudents(allStudents);
        if (allStudents.length > 0) {
          if (Number.isFinite(preferredStudentId)) {
            const queryMatch = allStudents.find((s) => s.id === preferredStudentId);
            if (queryMatch) {
              setSelectedStudentId(queryMatch.id);
              setSelectedStandard(queryMatch.standard || "all");
              return;
            }
          }
          const urlStd = searchParams.get("standard") || "all";
          setSelectedStandard(urlStd);
          setSelectedStudentId(null);
        }
      } catch (e: any) {
        setError(e?.message || "Failed to load students");
      } finally {
        setLoading(false);
      }
    };
    loadStudents();
  }, [preferredStudentId, searchParams]);

  useEffect(() => {
    if (!students.length) return;
    if (Number.isFinite(preferredStudentId)) {
      const queryMatch = students.find((s) => s.id === preferredStudentId);
      if (queryMatch) {
        if (queryMatch.id !== selectedStudentId) setSelectedStudentId(queryMatch.id);
        setSelectedStandard(queryMatch.standard || "all");
      }
    } else {
      setSelectedStudentId(null);
      const urlStd = searchParams.get("standard") || "all";
      setSelectedStandard(urlStd);
    }
  }, [preferredStudentId, students, selectedStudentId, searchParams]);

  const handleStandardChange = (std: string) => {
    setSelectedStandard(std);
    setSelectedStudentId(null);
    setFilters({
      examinations: [],
      subject: "",
      dateFrom: "",
      dateTo: "",
    });
    router.replace(`/teacherdashboard/performanceanalysis?standard=${encodeURIComponent(std)}`);
  };

  const handleStudentChange = (id: number) => {
    setSelectedStudentId(id);
    setFilters({
      examinations: [],
      subject: "",
      dateFrom: "",
      dateTo: "",
    });
    router.replace(`/teacherdashboard/performanceanalysis?studentId=${id}`);
  };

  const handleDownloadReport = async () => {
    if (!displayData) return;
    setDownloading(true);
    try { await downloadReport(displayData); }
    finally { setDownloading(false); }
  };

  const refreshStudentPerformance = async () => {
    if (!selectedStudent) return;
    setStudentLoading(true);
    setError(null);

    const [assessmentResult, attendanceResult, rankResult] = await Promise.allSettled([
      teacherStudentAssessmentsApi.getByStudent(selectedStudent.id),
      studentAttendanceApi.getByStudent(selectedStudent.id),
      studentRankHistoryApi.getByStudent(selectedStudent.id),
    ]);

    if (assessmentResult.status === "rejected") {
      setError(assessmentResult.reason?.message || "Failed to load marks from server");
      setStudentLoading(false);
      return;
    }

    try {
      const assessmentRes = assessmentResult.value as { data?: unknown[] };
      const attendanceRes =
        attendanceResult.status === "fulfilled"
          ? (attendanceResult.value as { data?: unknown[] })
          : { data: [] };
      const rankRes =
        rankResult.status === "fulfilled"
          ? (rankResult.value as { data?: unknown[] })
          : { data: [] };

      const rows = mapAssessmentRows(assessmentRes?.data || []);
      setHistoryRows(rows);
      setAssessmentCache((prev) => new Map(prev).set(selectedStudent.id, rows));

      const attendanceList = (attendanceRes?.data || []) as Array<{ attendance_percentage?: number }>;
      const rankList = (rankRes?.data || []) as Array<{
        id?: number;
        class_rank?: number;
        total_students?: number;
        average_percentage?: number;
        snapshot_date?: string;
      }>;
      setRankHistoryRows(
        rankList.map((r) => ({
          id: r.id,
          class_rank: Number(r.class_rank) || 0,
          total_students: Number(r.total_students) || 0,
          average_percentage: Number(r.average_percentage) || 0,
          snapshot_date: r.snapshot_date || "",
        }))
      );

      const attendanceExtrasParsed = parseAttendanceExtras(attendanceList);
      const rankExtrasParsed = parseRankExtras(rankList, students.length);

      setAttendanceExtras({
        attendance: attendanceExtrasParsed.attendance ?? 0,
        attendanceChange: attendanceExtrasParsed.attendanceChange ?? 0,
      });
      setRankExtras({
        classRank: rankExtrasParsed.classRank ?? 0,
        totalStudents: rankExtrasParsed.totalStudents ?? students.length,
        rankChange: rankExtrasParsed.rankChange ?? 0,
      });

      // const built = buildDashboardData(selectedStudent, rows, {
      //   totalStudents: rankExtrasParsed.totalStudents ?? students.length,
      //   ...rankExtrasParsed,
      //   ...attendanceExtrasParsed,
      // });
      // setDashboardData(built);

      if (!rankList.length && rows.length > 0) {
        try {
          await studentRankHistoryApi.snapshotAll();
          const refreshed: any = await studentRankHistoryApi.getByStudent(selectedStudent.id);
          const refreshedRanks = refreshed?.data || [];
          setRankHistoryRows(
            refreshedRanks.map((r: {
              id?: number;
              class_rank?: number;
              total_students?: number;
              average_percentage?: number;
              snapshot_date?: string;
            }) => ({
              id: r.id,
              class_rank: Number(r.class_rank) || 0,
              total_students: Number(r.total_students) || 0,
              average_percentage: Number(r.average_percentage) || 0,
              snapshot_date: r.snapshot_date || "",
            }))
          );
          const updatedRank = parseRankExtras(refreshedRanks, students.length);
          setRankExtras({
            classRank: updatedRank.classRank ?? 0,
            totalStudents: updatedRank.totalStudents ?? students.length,
            rankChange: updatedRank.rankChange ?? 0,
          });
          // setDashboardData(
          //   buildDashboardData(selectedStudent, rows, {
          //     totalStudents: updatedRank.totalStudents ?? students.length,
          //     ...updatedRank,
          //     ...attendanceExtrasParsed,
          //   })
          // );
        } catch {
          /* snapshot optional */
        }
      }
    } catch (e: any) {
      setError(e?.message || "Failed to load performance data");
    } finally {
      setStudentLoading(false);
    }
  };

  useEffect(() => {
    if (!selectedStudent) return;
    refreshStudentPerformance();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedStudent?.id, students.length]);

  const filteredHistoryRows = useMemo(() => {
    return historyRows.filter((row) => {
      if (filters.examinations && filters.examinations.length > 0 && !filters.examinations.includes(row.examination)) {
        return false;
      }
      if (filters.subject && row.subject !== filters.subject) {
        return false;
      }
      if (filters.dateFrom && row.exam_date < filters.dateFrom) {
        return false;
      }
      if (filters.dateTo && row.exam_date > filters.dateTo) {
        return false;
      }
      return true;
    });
  }, [historyRows, filters]);

  const displayData = useMemo(() => {
    // if (dashboardData) return dashboardData;
    if (selectedStudent) {
      return buildDashboardData(selectedStudent, filteredHistoryRows, {
        ...rankExtras,
        ...attendanceExtras,
        aggregate: filters.examinations && filters.examinations.length > 0,
      });
    }
    return emptyDashboard({
      id: 0,
      name: loading ? "Loading…" : "Select a student",
      phone: "",
      standard: "",
      board: "",
      location: "",
    });
  }, [selectedStudent, filteredHistoryRows, rankExtras, attendanceExtras, students.length, loading, filters.examinations]);

  const insights = useMemo(() => {
    if (!displayData) {
      return buildInsights(
        emptyDashboard({ id: 0, name: "", phone: "", standard: "", board: "", location: "" })
      );
    }
    return buildInsights(displayData);
  }, [displayData]);

  // ── Bulk Send Handler ──────────────────────────────────────────────────────
  const handleBulkSend = async () => {
    if (bulkSending) return;
    const confirm = window.confirm(
      `Send WhatsApp report to all ${students.length} students?\n\nThis will send the latest test result for each student via the marks_update template.`
    );
    if (!confirm) return;

    setBulkSending(true);
    setBulkProgress(0);
    setBulkTotal(students.length);
    setBulkResults([]);
    setShowBulkResults(false);
    setError(null);

    const results: BulkResult[] = [];

    for (let i = 0; i < students.length; i++) {
      const student = students[i];
      setBulkProgress(i + 1);

      // Skip if no phone
      if (!student.phone?.trim()) {
        results.push({ studentName: student.name, phone: "—", status: "skipped", reason: "No phone number" });
        continue;
      }

      try {
        // Fetch assessments (use cache if already loaded)
        let rows: AssessmentRow[] = assessmentCache.get(student.id) || [];
        if (!rows.length) {
          const res: any = await teacherStudentAssessmentsApi.getByStudent(student.id);
          rows = mapAssessmentRows(res?.data || []);
          setAssessmentCache((prev) => new Map(prev).set(student.id, rows));
        }

        if (!rows.length) {
          results.push({ studentName: student.name, phone: student.phone, status: "skipped", reason: "No assessment data" });
          continue;
        }

        // Get latest assessment row
        const latest = rows[0];

        // Use actual total_marks from DB, fallback to 100
        const totalMarks =
          latest.total_marks != null && latest.total_marks > 0
            ? latest.total_marks
            : 100;

        const pct = (toNum(latest.marks) / totalMarks) * 100;
        const performance = getPerformanceLabel(pct);
        const examDate = latest.exam_date
          ? new Date(latest.exam_date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
          : new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });

        const result = await sendWhatsAppViaAPI(
          student.phone,
          student.name,
          student.standard,
          latest.examination || "Weekly Test",
          examDate,
          toNum(latest.marks),
          totalMarks,      // ← dynamic from DB
          performance
        );

        results.push({
          studentName: student.name,
          phone: student.phone,
          status: result.success ? "success" : "failed",
          reason: result.success ? undefined : result.message,
        });

        // Small delay between API calls to avoid rate limiting
        await new Promise((r) => setTimeout(r, 300));

      } catch (e: any) {
        results.push({ studentName: student.name, phone: student.phone, status: "failed", reason: e?.message || "Unknown error" });
      }
    }

    setBulkResults(results);
    setBulkSending(false);
    setShowBulkResults(true);
  };

  const successCount = bulkResults.filter((r) => r.status === "success").length;
  const failedCount = bulkResults.filter((r) => r.status === "failed").length;
  const skippedCount = bulkResults.filter((r) => r.status === "skipped").length;

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">

        {/* ── Header ── */}
        <div className="mb-6 flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push("/teacherdashboard/subjects")}
              className="rounded-lg p-2 hover:bg-slate-200 transition-colors"
              title="Back to Student Management"
            >
              <ArrowLeft className="h-5 w-5 text-slate-600" />
            </button>
            <div className="flex items-center gap-2">
              <GraduationCap className="h-6 w-6 text-teal-600" />
              <h1 className="text-xl font-bold text-slate-800 sm:text-2xl">
                {isStudentView ? "Student Performance Analysis" : "Class Performance Analysis"}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap justify-end">
            <select
              value={selectedStandard}
              onChange={(e) => handleStandardChange(e.target.value)}
              className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 font-medium shadow-sm"
              disabled={loading || students.length === 0}
            >
              <option value="all">All Classes</option>
              {STANDARDS.map((std) => (
                <option key={std} value={std}>{std}</option>
              ))}
            </select>

            {/* 📤 Bulk Send Button */}
            <Button
              onClick={handleBulkSend}
              disabled={bulkSending || loading || classStudents.length === 0}
              className="bg-green-600 hover:bg-green-700 text-white gap-2 shadow-md disabled:opacity-60"
              title="Send latest test report to all students in this class via WhatsApp"
            >
              {bulkSending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="hidden sm:inline">{bulkProgress}/{bulkTotal} Sending...</span>
                </>
              ) : (
                <>
                  <MessageCircle className="h-4 w-4" />
                  <span className="hidden sm:inline">Bulk WhatsApp</span>
                </>
              )}
            </Button>

            <Button
              onClick={() => setAddMarksOpen(true)}
              disabled={loading || !isStudentView}
              className="bg-violet-600 hover:bg-violet-700 text-white gap-2 shadow-md disabled:opacity-60"
            >
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">Add Marks</span>
            </Button>

            <Button
              onClick={() => setAddAttendanceOpen(true)}
              disabled={loading || !isStudentView}
              className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2 shadow-md disabled:opacity-60"
            >
              <CalendarCheck className="h-4 w-4" />
              <span className="hidden sm:inline">Add Attendance</span>
            </Button>

            <Button
              onClick={() => setBulkMarksOpen(true)}
              disabled={loading || classStudents.length === 0}
              variant="outline"
              className="border-amber-400 text-amber-700 hover:bg-amber-50 gap-2"
            >
              <ClipboardList className="h-4 w-4" />
              <span className="hidden sm:inline">Bulk Marks</span>
            </Button>

            {/* 📥 Download Button */}
            <Button
              onClick={handleDownloadReport}
              disabled={downloading || loading || studentLoading || !isStudentView || !displayData}
              className="bg-teal-500 hover:bg-teal-600 text-white gap-2 shadow-md disabled:opacity-60"
            >
              {downloading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
              <span className="hidden sm:inline">{downloading ? "Preparing..." : "Download Report"}</span>
            </Button>
          </div>
        </div>

        {/* ── Bulk Progress Bar ── */}
        {bulkSending && (
          <div className="mb-4 rounded-lg border border-green-200 bg-green-50 p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-green-800 flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Sending reports... {bulkProgress} of {bulkTotal}
              </span>
              <span className="text-sm text-green-600">{Math.round((bulkProgress / bulkTotal) * 100)}%</span>
            </div>
            <div className="w-full bg-green-200 rounded-full h-2">
              <div
                className="bg-green-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${(bulkProgress / bulkTotal) * 100}%` }}
              />
            </div>
          </div>
        )}

        {/* ── Bulk Results Summary ── */}
        {showBulkResults && !bulkSending && (
          <div className="mb-4 rounded-lg border border-slate-200 bg-white shadow-sm overflow-hidden">
            {/* Summary bar */}
            <div className="flex items-center gap-4 p-4 border-b border-slate-100 flex-wrap">
              <span className="font-semibold text-slate-700">Bulk Send Complete</span>
              <span className="flex items-center gap-1 text-sm text-green-700 bg-green-50 px-3 py-1 rounded-full">
                ✅ {successCount} Sent
              </span>
              <span className="flex items-center gap-1 text-sm text-red-700 bg-red-50 px-3 py-1 rounded-full">
                ❌ {failedCount} Failed
              </span>
              <span className="flex items-center gap-1 text-sm text-yellow-700 bg-yellow-50 px-3 py-1 rounded-full">
                ⚠️ {skippedCount} Skipped
              </span>
              <button
                onClick={() => setShowBulkResults(false)}
                className="ml-auto text-xs text-slate-400 hover:text-slate-600 underline"
              >
                Dismiss
              </button>
            </div>

            {/* Detailed result table */}
            <div className="max-h-56 overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 sticky top-0">
                  <tr>
                    <th className="text-left px-4 py-2 text-xs text-slate-500 font-medium">Student</th>
                    <th className="text-left px-4 py-2 text-xs text-slate-500 font-medium">Phone</th>
                    <th className="text-left px-4 py-2 text-xs text-slate-500 font-medium">Status</th>
                    <th className="text-left px-4 py-2 text-xs text-slate-500 font-medium">Reason</th>
                  </tr>
                </thead>
                <tbody>
                  {bulkResults.map((r, i) => (
                    <tr key={i} className={i % 2 === 0 ? "bg-white" : "bg-slate-50"}>
                      <td className="px-4 py-2 font-medium text-slate-700">{r.studentName}</td>
                      <td className="px-4 py-2 text-slate-500">{r.phone}</td>
                      <td className="px-4 py-2">
                        <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold
                            ${r.status === "success" ? "bg-green-100 text-green-700" :
                            r.status === "failed" ? "bg-red-100 text-red-700" :
                              "bg-yellow-100 text-yellow-700"}`}>
                          {r.status === "success" ? "✅ Sent" : r.status === "failed" ? "❌ Failed" : "⚠️ Skipped"}
                        </span>
                      </td>
                      <td className="px-4 py-2 text-slate-400 text-xs">{r.reason || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── Error ── */}
        {error && (
          <div className="mb-4 rounded-lg border border-red-100 bg-red-50 p-3 text-sm text-red-700">{error}</div>
        )}

        {isStudentView && (
          <Button
            variant="outline"
            onClick={() => router.replace(`/teacherdashboard/performanceanalysis?standard=${encodeURIComponent(selectedStandard)}`)}
            className="mb-4 gap-1.5 rounded-full border-slate-200 text-slate-600 bg-white hover:bg-slate-50 shadow-sm"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Class Overview
          </Button>
        )}

        {/* ── Dashboard Card ── */}
        <div className="rounded-2xl bg-white p-6 shadow-sm border border-slate-100">
          {(loading || studentLoading || classLoading) && (
            <div className="mb-4 flex items-center gap-2 rounded-lg border border-sky-100 bg-sky-50 p-3 text-sm text-sky-700">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading dashboard data...
            </div>
          )}

          {isStudentView ? (
            <>
              {/* Individual Student Dashboard View */}
              <div className="mb-6 flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
                <StudentProfile
                  name={displayData!.name}
                  phone={displayData!.phone}
                  className={displayData!.class}
                  board={displayData!.board}
                  location={displayData!.location}
                />
                <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                  <StatsCard title="Overall Percentage" value={`${displayData!.stats.overallPercentage}%`}
                    change={displayData!.stats.percentageChange} changeLabel="vs Last Term" icon="percentage" />
                  <StatsCard title="Average Marks" value={displayData!.stats.averageMarks}
                    subValue={`/ ${displayData!.stats.totalMarks}`} change={displayData!.stats.averageChange}
                    changeLabel="vs Last Term" icon="star" />
                  <StatsCard title="Class Rank" value={displayData!.stats.classRank}
                    subValue={`/ ${displayData!.stats.totalStudents}`} change={displayData!.stats.rankChange}
                    changeLabel="vs Last Term" icon="rank" />
                  <StatsCard title="Attendance" value={`${displayData!.stats.attendance}%`}
                    change={displayData!.stats.attendanceChange} changeLabel="vs Last Term" icon="attendance" />
                </div>
              </div>

              <div className="mb-6">
                <PerformanceFilters
                  assessmentRows={historyRows}
                  value={filters}
                  onChange={setFilters}
                  onExaminationDeleted={refreshStudentPerformance}
                />
              </div>

              <div className="mb-6 grid gap-6 lg:grid-cols-3">
                <div className="lg:col-span-1">
                  <PerformanceChart assessmentRows={filteredHistoryRows} />
                </div>
                <div className="lg:col-span-1">
                  <SubjectMarksChart subjects={displayData!.subjects} average={displayData!.stats.overallPercentage} />
                </div>
                <div className="lg:col-span-1"><PerformanceInsights insights={insights} /></div>
              </div>

              <DetailedAnalysis subjects={displayData!.subjects} />
              <div className="mt-6">
                <AssessmentHistory rows={filteredHistoryRows} loading={studentLoading} />
              </div>
              <div className="mt-6">
                <RankHistory rows={rankHistoryRows} loading={studentLoading} />
              </div>
            </>
          ) : (
            <>
              {/* Class-level Overview Dashboard View */}
              <div className="mb-6 flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex items-center gap-4">
                  <div className="relative h-20 w-20 overflow-hidden rounded-full bg-gradient-to-br from-teal-50 to-teal-100 flex items-center justify-center shadow-md">
                    <GraduationCap className="h-10 w-10 text-teal-600" />
                  </div>
                  <div className="flex flex-col gap-1">
                    <h2 className="text-xl font-bold text-slate-800">
                      {selectedStandard === "all" ? "All Classes Overview" : `${selectedStandard} Overview`}
                    </h2>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-500">
                      <span>Total Students: {classStudents.length}</span>
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                  <StatsCard title="Class Average" value={`${classStats.overallPercentage}%`} icon="percentage" />
                  <StatsCard title="Average Marks" value={classStats.averageMarks} subValue="/ 100" icon="star" />
                  <StatsCard title="Total Students" value={classStats.totalStudents} icon="rank" />
                  <StatsCard title="Total Assessments" value={classStats.totalTests} icon="attendance" />
                </div>
              </div>

              <div className="mb-6 grid gap-6 lg:grid-cols-3">
                <div className="lg:col-span-1">
                  <PerformanceChart assessmentRows={classPerformanceChartRows} />
                </div>
                <div className="lg:col-span-1">
                  <SubjectMarksChart subjects={classSubjects} average={classStats.overallPercentage} />
                </div>
                <div className="lg:col-span-1">
                  <PerformanceInsights insights={classInsights} />
                </div>
              </div>

              {/* Student rankings list */}
              <div className="mt-6 rounded-xl border border-slate-100 bg-white p-4 shadow-sm">
                <h3 className="text-lg font-bold text-slate-800 mb-4">Student Rankings & Performance Directory</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm border-collapse text-left">
                    <thead>
                      <tr className="border-b border-slate-100 bg-slate-50 text-slate-500 text-xs font-semibold uppercase">
                        <th className="px-4 py-3">Rank</th>
                        <th className="px-4 py-3">Name</th>
                        <th className="px-4 py-3">Phone</th>
                        <th className="px-4 py-3">Board</th>
                        <th className="px-4 py-3">Location</th>
                        <th className="px-4 py-3 text-center">Tests Taken</th>
                        <th className="px-4 py-3 text-center">Class Avg %</th>
                        <th className="px-4 py-3 text-center">Grade</th>
                        <th className="px-4 py-3 text-center">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {studentRankList.length === 0 ? (
                        <tr>
                          <td colSpan={9} className="px-4 py-8 text-center text-slate-400">
                            No students in this class.
                          </td>
                        </tr>
                      ) : (
                        studentRankList.map((s, index) => {
                          const pct = s.average;
                          const grade = pct >= 90 ? "A+" : pct >= 80 ? "A" : pct >= 70 ? "B+" : pct >= 60 ? "B" : pct >= 50 ? "C" : "D";
                          const badgeBg = pct >= 75 ? "bg-emerald-100 text-emerald-700" : pct >= 50 ? "bg-amber-100 text-amber-700" : "bg-red-100 text-red-700";
                          return (
                            <tr key={s.id} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                              <td className="px-4 py-3 font-semibold text-slate-700">#{index + 1}</td>
                              <td className="px-4 py-3 font-medium text-slate-800">{s.name}</td>
                              <td className="px-4 py-3 text-slate-500">{s.phone || "—"}</td>
                              <td className="px-4 py-3 text-slate-500">{s.board || "—"}</td>
                              <td className="px-4 py-3 text-slate-500">{s.location || "—"}</td>
                              <td className="px-4 py-3 text-center text-slate-600">{s.testsCount}</td>
                              <td className="px-4 py-3 text-center font-bold text-slate-700">{pct}%</td>
                              <td className="px-4 py-3 text-center">
                                <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-bold ${badgeBg}`}>
                                  {grade}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-center">
                                <Button
                                  size="sm"
                                  onClick={() => handleStudentChange(s.id)}
                                  className="bg-teal-600 hover:bg-teal-700 text-white rounded-full px-3 py-1 text-xs gap-1 shadow-sm"
                                >
                                  <GraduationCap className="h-3 w-3" />
                                  View Performance
                                </Button>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>

        <AddMarksDialog
          open={addMarksOpen}
          onOpenChange={setAddMarksOpen}
          studentId={selectedStudentId}
          studentName={selectedStudent?.name}
          onSaved={refreshStudentPerformance}
        />

        <BulkAddMarksDialog
          open={bulkMarksOpen}
          onOpenChange={setBulkMarksOpen}
          students={classStudents.map((s) => ({ id: s.id, name: s.name }))}
          onSaved={refreshStudentPerformance}
        />

        <AddAttendanceDialog
          open={addAttendanceOpen}
          onOpenChange={setAddAttendanceOpen}
          studentId={selectedStudentId}
          studentName={selectedStudent?.name}
          onSaved={refreshStudentPerformance}
        />
      </div>
    </div>
  );
}
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  GraduationCap,
  Search,
  Eye,
  Pencil,
  Trash2,
  Loader2,
  BarChart3,
  Download,
  Upload,
  FileJson,
  FileText,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  ClipboardList,
  Plus,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/teacher/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/teacher/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/teacher/ui/table";
import { Button } from "@/components/teacher/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/teacher/ui/dialog";
import { Label } from "@/components/teacher/ui/label";
import { studentsApi, studentsUniversalApi, teacherStudentAssessmentsApi } from "@/lib/api";

type Student = {
  id: number;
  name: string;
  phone: string;
  father_phone?: string;
  subject?: string;
  marks?: number;
  examination?: string;
  exam_date?: string;
  standard: string;
  board: string;
  location: string;
};

type AssessmentRow = {
  id?: number;
  student_id: number;
  subject: string;
  marks: number;
  examination: string;
  exam_date: string;
};

// ── Subject column type ───────────────────────────────────────────────────────
type SubjectCol = { id: string; subject: string };

// ─── CSV helpers ─────────────────────────────────────────────────────────────

function studentsToCSV(students: Student[]): string {
  const headers = [
    "id",
    "name",
    "phone",
    "father_phone",
    "subject",
    "marks",
    "examination",
    "exam_date",
    "standard",
    "board",
    "location",
  ];
  const escape = (v: unknown) => {
    const s = v === undefined || v === null ? "" : String(v);
    return s.includes(",") || s.includes('"') || s.includes("\n")
      ? `"${s.replace(/"/g, '""')}"`
      : s;
  };
  const rows = students.map((s) =>
    headers.map((h) => escape(s[h as keyof Student])).join(",")
  );
  return [headers.join(","), ...rows].join("\n");
}

function parseCSV(text: string): Record<string, string>[] {
  const lines = text.trim().split(/\r?\n/);
  if (lines.length < 2) return [];
  const headers = lines[0].split(",").map((h) => h.trim());
  return lines.slice(1).map((line) => {
    const values: string[] = [];
    let cur = "";
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        if (inQuotes && line[i + 1] === '"') { cur += '"'; i++; }
        else inQuotes = !inQuotes;
      } else if (ch === "," && !inQuotes) {
        values.push(cur); cur = "";
      } else {
        cur += ch;
      }
    }
    values.push(cur);
    const obj: Record<string, string> = {};
    headers.forEach((h, i) => { obj[h] = values[i] ?? ""; });
    return obj;
  });
}

function downloadBlob(content: string, filename: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// ─── Dropdown menu component ─────────────────────────────────────────────────

function DropdownMenu({
  trigger,
  items,
}: {
  trigger: React.ReactNode;
  items: { icon: React.ReactNode; label: string; onClick: () => void }[];
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <div onClick={() => setOpen((p) => !p)}>{trigger}</div>
      {open && (
        <div className="absolute right-0 z-50 mt-2 min-w-[180px] rounded-xl border border-border bg-popover shadow-lg py-1 animate-in fade-in slide-in-from-top-1">
          {items.map((item) => (
            <button
              key={item.label}
              className="flex w-full items-center gap-2 px-4 py-2.5 text-sm hover:bg-muted transition-colors text-left"
              onClick={() => { item.onClick(); setOpen(false); }}
            >
              {item.icon}
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Pagination component ─────────────────────────────────────────────────────

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];

function Pagination({
  total,
  page,
  pageSize,
  onPageChange,
  onPageSizeChange,
}: {
  total: number;
  page: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
}) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);

  const pageNumbers = useMemo(() => {
    const pages = new Set<number>();
    pages.add(1);
    pages.add(totalPages);
    for (let p = Math.max(1, page - 1); p <= Math.min(totalPages, page + 1); p++) {
      pages.add(p);
    }
    const sorted = Array.from(pages).sort((a, b) => a - b);
    const result: number[] = [];
    for (let i = 0; i < sorted.length; i++) {
      if (i > 0 && sorted[i] - sorted[i - 1] > 1) result.push(-1);
      result.push(sorted[i]);
    }
    return result;
  }, [page, totalPages]);

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between px-1 pt-4 pb-1">
      <div className="flex items-center gap-3 text-sm text-muted-foreground">
        <span>
          {total === 0 ? "No results" : `${from}–${to} of ${total}`}
        </span>
        <div className="flex items-center gap-1.5">
          <span className="hidden sm:inline">Rows per page</span>
          <Select
            value={String(pageSize)}
            onValueChange={(v) => { onPageSizeChange(Number(v)); onPageChange(1); }}
          >
            <SelectTrigger className="h-8 w-[70px] rounded-full text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PAGE_SIZE_OPTIONS.map((s) => (
                <SelectItem key={s} value={String(s)}>{s}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex items-center gap-1">
        <Button variant="outline" size="icon" className="h-8 w-8 rounded-full" disabled={page === 1} onClick={() => onPageChange(1)} title="First page">
          <ChevronsLeft className="h-3.5 w-3.5" />
        </Button>
        <Button variant="outline" size="icon" className="h-8 w-8 rounded-full" disabled={page === 1} onClick={() => onPageChange(page - 1)} title="Previous page">
          <ChevronLeft className="h-3.5 w-3.5" />
        </Button>
        {pageNumbers.map((p, i) =>
          p === -1 ? (
            <span key={`ellipsis-${i}`} className="px-1 text-sm text-muted-foreground select-none">…</span>
          ) : (
            <Button key={p} variant={p === page ? "default" : "outline"} size="icon" className="h-8 w-8 rounded-full text-xs" onClick={() => onPageChange(p)}>
              {p}
            </Button>
          )
        )}
        <Button variant="outline" size="icon" className="h-8 w-8 rounded-full" disabled={page === totalPages} onClick={() => onPageChange(page + 1)} title="Next page">
          <ChevronRight className="h-3.5 w-3.5" />
        </Button>
        <Button variant="outline" size="icon" className="h-8 w-8 rounded-full" disabled={page === totalPages} onClick={() => onPageChange(totalPages)} title="Last page">
          <ChevronsRight className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function StudentManagementContent() {
  const router = useRouter();
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoadingId, setActionLoadingId] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [standardFilter, setStandardFilter] = useState("all");
  const [boardFilter, setBoardFilter] = useState("all");
  const [locationFilter, setLocationFilter] = useState("all");
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [viewOpen, setViewOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [historyRows, setHistoryRows] = useState<AssessmentRow[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);
  const [editForm, setEditForm] = useState({
    subject: "",
    marks: "",
    total_marks: "",
    examination: "",
    exam_date: "",
  });

  // ── Pagination state ────────────────────────────────────────────────────────
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // ── Bulk marks state ──────────────────────────────────────────────────────────
  const [bulkOpen, setBulkOpen] = useState(false);
 const [bulkCommon, setBulkCommon] = useState({
    examination: "",
    exam_date: new Date().toISOString().split("T")[0],
    total_marks: "",
  });
  // Dynamic subject columns — start with one empty column
  const [bulkSubjects, setBulkSubjects] = useState<SubjectCol[]>([
    { id: "col-0", subject: "" },
  ]);
  // marks keyed by studentId → colId → value string
  const [bulkMarks, setBulkMarks] = useState<Record<number, Record<string, string>>>({});
  const [bulkSaving, setBulkSaving] = useState(false);
  const [bulkProgress, setBulkProgress] = useState<{ done: number; total: number } | null>(null);

  // Import state
  const [importOpen, setImportOpen] = useState(false);
  const [importMode, setImportMode] = useState<"students" | "marks">("students");
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importFormat, setImportFormat] = useState<"csv" | "json" | "xlsx">("csv");
  const [importPreview, setImportPreview] = useState<Student[]>([]);
  const [importError, setImportError] = useState("");
  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState<{ done: number; total: number } | null>(null);
  const [xlsxMarksRows, setXlsxMarksRows] = useState<Array<{
    student_id: number; studentName: string; subject: string;
    marks: number; examination: string; exam_date: string;
  }>>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [studentsRes, assessmentsRes]: any[] = await Promise.all([
          studentsUniversalApi.getAll(),
          teacherStudentAssessmentsApi.getLatestAll(),
        ]);

        const latestMap = new Map<number, AssessmentRow>();
        for (const row of assessmentsRes?.data || []) {
          latestMap.set(Number(row.student_id), row);
        }

        const merged: Student[] = (studentsRes?.data || []).map((s: any) => {
          const latest = latestMap.get(Number(s.id));
          return {
            id: Number(s.id),
            name: s.name || "",
            phone: s.phone || "",
            father_phone: s.father_phone || "",
            subject: latest?.subject || "",
            marks: latest?.marks !== undefined ? Number(latest.marks) : undefined,
            examination: latest?.examination || "",
            exam_date: latest?.exam_date || "",
            standard: s.standard || "",
            board: s.board || "",
            location: s.location || "",
          };
        });

        setStudents(merged);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const standards = useMemo(
    () => Array.from(new Set(students.map((s) => s.standard))).filter(Boolean),
    [students]
  );
  const boards = useMemo(
    () => Array.from(new Set(students.map((s) => s.board))).filter(Boolean),
    [students]
  );
  const locations = useMemo(
    () => Array.from(new Set(students.map((s) => s.location))).filter(Boolean),
    [students]
  );

  const filteredStudents = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    return students.filter((student) => {
      const matchesQuery =
        query.length === 0 ||
        student.name.toLowerCase().includes(query) ||
        student.phone.toLowerCase().includes(query) ||
        String(student.father_phone || "").toLowerCase().includes(query);
      const matchesStandard = standardFilter === "all" || student.standard === standardFilter;
      const matchesBoard = boardFilter === "all" || student.board === boardFilter;
      const matchesLocation = locationFilter === "all" || student.location === locationFilter;
      return matchesQuery && matchesStandard && matchesBoard && matchesLocation;
    });
  }, [students, searchTerm, standardFilter, boardFilter, locationFilter]);

  useEffect(() => {
    setPage(1);
  }, [searchTerm, standardFilter, boardFilter, locationFilter]);

  const paginatedStudents = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredStudents.slice(start, start + pageSize);
  }, [filteredStudents, page, pageSize]);

  // ── Export ────────────────────────────────────────────────────────────────

  const exportCSV = () => {
    const csv = studentsToCSV(filteredStudents);
    downloadBlob(csv, "students.csv", "text/csv;charset=utf-8;");
  };

  const exportJSON = () => {
    const json = JSON.stringify(filteredStudents, null, 2);
    downloadBlob(json, "students.json", "application/json");
  };

  // ── Import ────────────────────────────────────────────────────────────────

  const handleImportFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportFile(file);
    setImportError("");
    setImportPreview([]);
    setXlsxMarksRows([]);

    const ext = file.name.split(".").pop()?.toLowerCase();

    if (ext === "xlsx" || ext === "xls") {
      setImportFormat("xlsx");
      setImportMode("marks");
      try {
        const XLSX = await import("xlsx");
        const buffer = await file.arrayBuffer();
        const wb = XLSX.read(buffer, { type: "array" });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const rows: any[] = XLSX.utils.sheet_to_json(ws, { defval: "" });

        if (rows.length === 0) throw new Error("No data rows found in Excel file.");

        const firstRow = rows[0];
        if (!("student_id" in firstRow) || !("marks" in firstRow)) {
          throw new Error("Excel must have at least 'student_id' and 'marks' columns.");
        }

        const studentMap = new Map(students.map((s) => [s.id, s.name]));
        const today = new Date().toISOString().split("T")[0];
        const parsed = rows
          .filter((r) => r.student_id !== "" && r.marks !== "")
          .map((r) => ({
            student_id: Number(r.student_id),
            studentName: studentMap.get(Number(r.student_id)) || String(r.student_id),
            subject: r.subject || "",
            marks: Number(r.marks),
            examination: r.examination || "",
            exam_date: r.exam_date ? String(r.exam_date).split("T")[0] : today,
          }))
          .filter((r) => !Number.isNaN(r.student_id) && !Number.isNaN(r.marks));

        if (parsed.length === 0) throw new Error("No valid rows found. Check student_id and marks columns.");
        setXlsxMarksRows(parsed);
      } catch (err: any) {
        setImportError(err.message || "Failed to parse Excel file.");
        setXlsxMarksRows([]);
      }
      return;
    }

    setImportMode("students");
    const fmt: "csv" | "json" = ext === "json" ? "json" : "csv";
    setImportFormat(fmt);

    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const text = ev.target?.result as string;
        let parsed: Student[] = [];

        if (fmt === "json") {
          const raw = JSON.parse(text);
          parsed = (Array.isArray(raw) ? raw : [raw]).map((r: any, idx) => ({
            id: Number(r.id) || idx + 1,
            name: r.name || "",
            phone: r.phone || "",
            father_phone: r.father_phone || "",
            subject: r.subject || "",
            marks: r.marks !== undefined ? Number(r.marks) : undefined,
            examination: r.examination || "",
            exam_date: r.exam_date || "",
            standard: r.standard || "",
            board: r.board || "",
            location: r.location || "",
          }));
        } else {
          const rows = parseCSV(text);
          parsed = rows.map((r, idx) => ({
            id: Number(r.id) || idx + 1,
            name: r.name || "",
            phone: r.phone || "",
            father_phone: r.father_phone || "",
            subject: r.subject || "",
            marks: r.marks !== "" && r.marks !== undefined ? Number(r.marks) : undefined,
            examination: r.examination || "",
            exam_date: r.exam_date || "",
            standard: r.standard || "",
            board: r.board || "",
            location: r.location || "",
          }));
        }

        if (parsed.length === 0) throw new Error("No valid rows found in file.");
        setImportPreview(parsed);
      } catch (err: any) {
        setImportError(err.message || "Failed to parse file.");
        setImportPreview([]);
      }
    };
    reader.readAsText(file);
  };

  const confirmImport = async () => {
    if (importMode === "marks") {
      if (xlsxMarksRows.length === 0) return;
      setImporting(true);
      setImportProgress({ done: 0, total: xlsxMarksRows.length });
      let done = 0;
      const errors: string[] = [];

      for (const row of xlsxMarksRows) {
        try {
          await teacherStudentAssessmentsApi.createByStudent(row.student_id, {
            subject: row.subject,
            marks: row.marks,
            examination: row.examination,
            exam_date: row.exam_date,
          });
          setStudents((prev) =>
            prev.map((s) =>
              s.id === row.student_id
                ? { ...s, subject: row.subject, marks: row.marks, examination: row.examination, exam_date: row.exam_date }
                : s
            )
          );
        } catch (err: any) {
          errors.push(`Student ${row.student_id}: ${err.message || "failed"}`);
        }
        done++;
        setImportProgress({ done, total: xlsxMarksRows.length });
      }

      setImporting(false);
      setImportProgress(null);
      if (errors.length > 0) {
        setImportError(`${errors.length} row(s) failed:\n${errors.slice(0, 3).join("\n")}`);
      } else {
        setImportOpen(false);
        setImportFile(null);
        setXlsxMarksRows([]);
        if (fileInputRef.current) fileInputRef.current.value = "";
      }
      return;
    }

    if (importPreview.length === 0) return;
    setImporting(true);
    try {
      setStudents((prev) => {
        const map = new Map(prev.map((s) => [s.id, s]));
        for (const s of importPreview) {
          map.set(s.id, s);
        }
        return Array.from(map.values());
      });
      setImportOpen(false);
      setImportFile(null);
      setImportPreview([]);
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (err: any) {
      setImportError(err.message || "Import failed.");
    } finally {
      setImporting(false);
    }
  };

  // ── View / Edit / Delete ─────────────────────────────────────────────────

  const openView = async (student: Student) => {
    setSelectedStudent(student);
    setViewOpen(true);
    setHistoryLoading(true);
    try {
      const res: any = await teacherStudentAssessmentsApi.getByStudent(student.id);
      setHistoryRows(res?.data || []);
    } catch (err) {
      console.error(err);
      setHistoryRows([]);
    } finally {
      setHistoryLoading(false);
    }
  };

  const openEdit = async (student: Student) => {
    setSelectedStudent(student);
    setEditForm({
      subject: "",
      marks: "",
      examination: "",
      exam_date: new Date().toISOString().split("T")[0],
    });
    setHistoryLoading(true);
    try {
      const res: any = await teacherStudentAssessmentsApi.getByStudent(student.id);
      setHistoryRows(res?.data || []);
    } catch (err) {
      console.error(err);
      setHistoryRows([]);
    } finally {
      setHistoryLoading(false);
    }
    setEditOpen(true);
  };

  const saveEdit = async () => {
    if (!selectedStudent) return;
    if (!editForm.subject || !editForm.examination || !editForm.exam_date || !editForm.marks) {
      alert("Please fill subject, marks, examination and date");
      return;
    }
    const marksNum = Number(editForm.marks);
    if (Number.isNaN(marksNum) || marksNum < 0) {
      alert("Marks must be a valid non-negative number");
      return;
    }
    const totalMarksNum = editForm.total_marks !== "" ? Number(editForm.total_marks) : undefined;
    if (totalMarksNum !== undefined && (Number.isNaN(totalMarksNum) || totalMarksNum < 0)) {
      alert("Total Marks must be a valid non-negative number");
      return;
    }
    if (totalMarksNum !== undefined && marksNum > totalMarksNum) {
      alert("Marks obtained cannot be greater than Total Marks");
      return;
    }

    setSavingEdit(true);
    try {
      await teacherStudentAssessmentsApi.createByStudent(selectedStudent.id, {
        subject: editForm.subject,
        marks: marksNum,
        ...(totalMarksNum !== undefined && { total_marks: totalMarksNum }),
        examination: editForm.examination,
        exam_date: editForm.exam_date,
      });

      const refreshed: any = await teacherStudentAssessmentsApi.getByStudent(selectedStudent.id);
      const nextHistory = refreshed?.data || [];
      setHistoryRows(nextHistory);

      const latest = nextHistory[0];
      setStudents((prev) =>
        prev.map((s) =>
          s.id === selectedStudent.id
            ? {
                ...s,
                subject: latest?.subject || "",
                marks: latest?.marks !== undefined ? Number(latest.marks) : undefined,
                examination: latest?.examination || "",
                exam_date: latest?.exam_date || "",
              }
            : s
        )
      );
      setEditForm({ subject: "", marks: "", total_marks: "", examination: "", exam_date: new Date().toISOString().split("T")[0] });
      setEditOpen(false);
    } catch (err: any) {
      alert(err.message || "Failed to save");
    } finally {
      setSavingEdit(false);
    }
  };

  // ── Bulk marks helpers ────────────────────────────────────────────────────────

  const addBulkSubjectCol = () => {
    const newId = `col-${Date.now()}`;
    setBulkSubjects((prev) => [...prev, { id: newId, subject: "" }]);
  };

  // ── Bulk marks export ─────────────────────────────────────────────────────────
const exportBulkCSV = () => {
  const subjectHeaders = bulkSubjects.map((c) => c.subject || `Subject_${c.id}`);
  const headerRow = ["student_id", "name", "standard", "board", ...subjectHeaders, "percentage"];
  const rows = filteredStudents.map((student) => {
    const markValues = bulkSubjects.map((col) => bulkMarks[student.id]?.[col.id] ?? "");
    const filled = markValues.map(Number).filter((v, i) => bulkMarks[student.id]?.[bulkSubjects[i].id]?.trim());
    const totalObtained = filled.reduce((a, b) => a + b, 0);
    const totalPossible = bulkCommon.total_marks !== "" ? Number(bulkCommon.total_marks) * filled.length : null;
    const pct = totalPossible && totalPossible > 0 ? ((totalObtained / totalPossible) * 100).toFixed(1) + "%" : "";
    return [student.id, student.name, student.standard, student.board, ...markValues, pct].join(",");
  });
  downloadBlob([headerRow.join(","), ...rows].join("\n"), "bulk_marks.csv", "text/csv;charset=utf-8;");
};

const bulkImportRef = useRef<HTMLInputElement>(null);

const handleBulkImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
  const file = e.target.files?.[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (ev) => {
    try {
      const text = ev.target?.result as string;
      const rows = parseCSV(text);
      if (rows.length === 0) return;
      // Detect subject columns (everything except student_id, name, standard, board, percentage)
      const skip = new Set(["student_id", "name", "standard", "board", "percentage"]);
      const subjectCols = Object.keys(rows[0]).filter((k) => !skip.has(k));
      // Rebuild subject columns
      const newCols: SubjectCol[] = subjectCols.map((s, i) => ({ id: `import-col-${i}`, subject: s }));
      setBulkSubjects(newCols);
      // Fill marks
      const newMarks: Record<number, Record<string, string>> = {};
      for (const row of rows) {
        const sid = Number(row.student_id);
        if (!sid) continue;
        newMarks[sid] = {};
        for (const col of newCols) {
          const val = row[col.subject];
          if (val !== undefined && val !== "") newMarks[sid][col.id] = val;
        }
      }
      setBulkMarks(newMarks);
    } catch (err) {
      console.error("Bulk import error", err);
    }
    if (e.target) e.target.value = "";
  };
  reader.readAsText(file);
};


  const removeBulkSubjectCol = (colId: string) => {
    setBulkSubjects((prev) => prev.filter((c) => c.id !== colId));
    // Clean up marks for removed column
    setBulkMarks((prev) => {
      const next = { ...prev };
      for (const sid of Object.keys(next)) {
        const copy = { ...next[Number(sid)] };
        delete copy[colId];
        next[Number(sid)] = copy;
      }
      return next;
    });
  };

  const updateBulkSubjectName = (colId: string, value: string) => {
    setBulkSubjects((prev) =>
      prev.map((c) => (c.id === colId ? { ...c, subject: value } : c))
    );
  };

  const updateBulkMark = (studentId: number, colId: string, value: string) => {
    setBulkMarks((prev) => ({
      ...prev,
      [studentId]: { ...(prev[studentId] || {}), [colId]: value },
    }));
  };

  // Count total filled entries across all subject columns
  const bulkFilledCount = useMemo(() => {
    let count = 0;
    for (const colMap of Object.values(bulkMarks)) {
      for (const v of Object.values(colMap)) {
        if (v.trim() !== "") count++;
      }
    }
    return count;
  }, [bulkMarks]);

  // ── Bulk marks save ───────────────────────────────────────────────────────────

  const saveBulkMarks = async () => {
    if (!bulkCommon.examination || !bulkCommon.exam_date) {
      alert("Please fill Examination and Date first.");
      return;
    }
    // Validate all subject columns have a name
    const unnamedCol = bulkSubjects.find((c) => c.subject.trim() === "");
    if (unnamedCol) {
      alert("Please enter a subject name for every subject column, or remove empty ones.");
      return;
    }

    // Build flat list of (studentId, colId, marks) to save
    type Entry = { studentId: number; colId: string; subject: string; marks: number };
    const entries: Entry[] = [];

    for (const [sidStr, colMap] of Object.entries(bulkMarks)) {
      const studentId = Number(sidStr);
      for (const [colId, marksStr] of Object.entries(colMap)) {
        if (marksStr.trim() === "") continue;
        const marksNum = Number(marksStr);
        if (Number.isNaN(marksNum) || marksNum < 0) {
          alert("All marks must be valid non-negative numbers.");
          return;
        }
        const col = bulkSubjects.find((c) => c.id === colId);
        if (!col) continue;
        entries.push({ studentId, colId, subject: col.subject, marks: marksNum });
      }
    }

    if (entries.length === 0) {
      alert("Enter marks for at least one student.");
      return;
    }

    setBulkSaving(true);
    setBulkProgress({ done: 0, total: entries.length });
    let done = 0;
    const updatedStudentIds = new Set<number>();

    for (const entry of entries) {
      try {
        await teacherStudentAssessmentsApi.createByStudent(entry.studentId, {
          subject: entry.subject,
          marks: entry.marks,
          examination: bulkCommon.examination,
          exam_date: bulkCommon.exam_date,
        });
        updatedStudentIds.add(entry.studentId);
      } catch (err) {
        console.error(`Failed for student ${entry.studentId} / ${entry.subject}:`, err);
      }
      done++;
      setBulkProgress({ done, total: entries.length });
    }

    // Update latest marks in the table (last subject col written wins per student)
    setStudents((prev) =>
      prev.map((s) => {
        if (!updatedStudentIds.has(s.id)) return s;
        // Find the last entry for this student to show as "latest"
        const studentEntries = entries.filter((e) => e.studentId === s.id);
        const last = studentEntries[studentEntries.length - 1];
        return {
          ...s,
          subject: last.subject,
          marks: last.marks,
          examination: bulkCommon.examination,
          exam_date: bulkCommon.exam_date,
        };
      })
    );

    setBulkSaving(false);
    setBulkProgress(null);
    setBulkOpen(false);
    setBulkMarks({});
    setBulkSubjects([{ id: "col-0", subject: "" }]);
    setBulkCommon({ examination: "", exam_date: new Date().toISOString().split("T")[0], total_marks: "" });
  };

  const deleteStudent = async (student: Student) => {
    if (!confirm(`Delete student "${student.name}"?`)) return;
    setActionLoadingId(student.id);
    try {
      await studentsApi.remove(student.id);
      setStudents((prev) => prev.filter((s) => s.id !== student.id));
    } catch (err: any) {
      alert(err.message || "Failed to delete student");
    } finally {
      setActionLoadingId(null);
    }
  };

  const openPerformanceAnalysis = (student: Student) => {
    router.push(`/teacherdashboard/performanceanalysis?studentId=${student.id}`);
  };

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <section className="rounded-3xl border border-border bg-card p-4 md:p-6 shadow-[var(--shadow-soft)]">
      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-xl font-semibold">
          <GraduationCap className="h-5 w-5 text-primary" />
          <h2>Students Analysis</h2>
        </div>

        <div className="flex items-center gap-2">
          <DropdownMenu
            trigger={
              <Button variant="outline" className="h-9 rounded-full gap-1.5 text-sm">
                <Download className="h-4 w-4" />
                Export
                <ChevronDown className="h-3.5 w-3.5 opacity-60" />
              </Button>
            }
            items={[
              {
                icon: <FileText className="h-4 w-4 text-emerald-600" />,
                label: "Export as CSV",
                onClick: exportCSV,
              },
              {
                icon: <FileJson className="h-4 w-4 text-blue-600" />,
                label: "Export as JSON",
                onClick: exportJSON,
              },
            ]}
          />

          <Button
            className="h-9 rounded-full gap-1.5 text-sm"
            onClick={() => {
              setImportOpen(true);
              setImportFile(null);
              setImportPreview([]);
              setImportError("");
              if (fileInputRef.current) fileInputRef.current.value = "";
            }}
          >
            <Upload className="h-4 w-4" />
            Import
          </Button>

          <Button
            variant="outline"
            className="h-9 rounded-full gap-1.5 text-sm border-amber-400 text-amber-600 hover:bg-amber-50"
            onClick={() => {
              setBulkMarks({});
              setBulkSubjects([{ id: "col-0", subject: "" }]);
              setBulkCommon({ examination: "", exam_date: new Date().toISOString().split("T")[0] });
              setBulkProgress(null);
              setBulkOpen(true);
            }}
          >
            <ClipboardList className="h-4 w-4" />
            Bulk Marks
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-4">
        <div className="relative md:col-span-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by name or phone..."
            className="h-10 rounded-full pl-10"
          />
        </div>

        <Select value={standardFilter} onValueChange={setStandardFilter}>
          <SelectTrigger className="h-10 rounded-full">
            <SelectValue placeholder="All Standards" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Standards</SelectItem>
            {standards.map((s) => (
              <SelectItem key={s} value={s}>Std {s}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={boardFilter} onValueChange={setBoardFilter}>
          <SelectTrigger className="h-10 rounded-full">
            <SelectValue placeholder="All Boards" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Boards</SelectItem>
            {boards.map((b) => (
              <SelectItem key={b} value={b}>{b}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={locationFilter} onValueChange={setLocationFilter}>
          <SelectTrigger className="h-10 rounded-full">
            <SelectValue placeholder="All Locations" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Locations</SelectItem>
            {locations.map((l) => (
              <SelectItem key={l} value={l}>{l}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="mt-5 overflow-hidden rounded-2xl border border-border">
        {loading ? (
          <div className="py-10 flex justify-center">
            <Loader2 className="h-7 w-7 animate-spin text-primary" />
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-900 hover:bg-slate-900">
                <TableHead className="text-white">Name</TableHead>
                <TableHead className="text-white">Phone</TableHead>
                <TableHead className="text-white">Marks</TableHead>
                <TableHead className="text-white">Std</TableHead>
                <TableHead className="text-white">Board</TableHead>
                <TableHead className="text-white">Location</TableHead>
                <TableHead className="text-right text-white">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedStudents.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="py-10 text-center text-sm text-muted-foreground">
                    No students found for selected filters.
                  </TableCell>
                </TableRow>
              ) : (
                paginatedStudents.map((student) => (
                  <TableRow key={student.id}>
                    <TableCell className="font-medium">{student.name}</TableCell>
                    <TableCell>{student.phone}</TableCell>
                    <TableCell>
                      {student.marks !== undefined ? (
                        <span className="rounded-full bg-rose-100 px-3 py-1 text-xs font-semibold text-rose-700">
                          {student.marks}
                        </span>
                      ) : "—"}
                    </TableCell>
                    <TableCell>{student.standard}</TableCell>
                    <TableCell>{student.board}</TableCell>
                    <TableCell>{student.location}</TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-2">
                        <Button type="button" size="icon" className="h-9 w-9 rounded-full bg-cyan-500 text-white hover:bg-cyan-600" title="View" onClick={() => openView(student)}>
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button type="button" size="icon" className="h-9 w-9 rounded-full bg-teal-500 text-white hover:bg-teal-600" title="Edit" onClick={() => openEdit(student)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button type="button" size="icon" className="h-9 w-9 rounded-full bg-violet-500 text-white hover:bg-violet-600" title="Analyze" onClick={() => openPerformanceAnalysis(student)}>
                          <BarChart3 className="h-4 w-4" />
                        </Button>
                        <Button type="button" size="icon" className="h-9 w-9 rounded-full bg-red-500 text-white hover:bg-red-600" title="Delete" onClick={() => deleteStudent(student)} disabled={actionLoadingId === student.id}>
                          {actionLoadingId === student.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        )}
      </div>

      {/* Pagination */}
      {!loading && filteredStudents.length > 0 && (
        <Pagination
          total={filteredStudents.length}
          page={page}
          pageSize={pageSize}
          onPageChange={setPage}
          onPageSizeChange={setPageSize}
        />
      )}

      {/* ── View Dialog ─────────────────────────────────────────────────── */}
      <Dialog open={viewOpen} onOpenChange={setViewOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Student Details</DialogTitle>
          </DialogHeader>
          {selectedStudent && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><span className="text-muted-foreground">Name:</span> {selectedStudent.name}</div>
                <div><span className="text-muted-foreground">Phone:</span> {selectedStudent.phone}</div>
                <div><span className="text-muted-foreground">Standard:</span> {selectedStudent.standard}</div>
                <div><span className="text-muted-foreground">Board:</span> {selectedStudent.board}</div>
                <div><span className="text-muted-foreground">Location:</span> {selectedStudent.location}</div>
              </div>
              <div className="rounded-xl border border-border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Subject</TableHead>
                      <TableHead>Examination</TableHead>
                      <TableHead>Marks</TableHead>
                      <TableHead>Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {historyLoading ? (
                      <TableRow><TableCell colSpan={4} className="text-center py-6"><Loader2 className="mx-auto h-5 w-5 animate-spin text-muted-foreground" /></TableCell></TableRow>
                    ) : historyRows.length === 0 ? (
                      <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-6">No assessment entries yet.</TableCell></TableRow>
                    ) : (
                      historyRows.map((row) => (
                        <TableRow key={`${row.id || 0}-${row.exam_date}-${row.subject}`}>
                          <TableCell>{row.subject}</TableCell>
                          <TableCell>{row.examination}</TableCell>
                          <TableCell>{row.marks}</TableCell>
                          <TableCell>{row.exam_date ? String(row.exam_date).split("T")[0] : "—"}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ── Edit Dialog ─────────────────────────────────────────────────── */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add Student Test</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1">
              <Label>Subject</Label>
              <Input value={editForm.subject} onChange={(e) => setEditForm((p) => ({ ...p, subject: e.target.value }))} placeholder="e.g. Mathematics" />
            </div>
            <div className="space-y-1">
              <Label>Marks Obtained</Label>
              <Input type="number" value={editForm.marks} onChange={(e) => setEditForm((p) => ({ ...p, marks: e.target.value }))} placeholder="e.g. 87" />
            </div>
            <div className="space-y-1">
              <Label>Total Marks</Label>
              <Input type="number" value={editForm.total_marks} onChange={(e) => setEditForm((p) => ({ ...p, total_marks: e.target.value }))} placeholder="e.g. 100" />
            </div>
            <div className="space-y-1">
              <Label>Examination</Label>
              <Input value={editForm.examination} onChange={(e) => setEditForm((p) => ({ ...p, examination: e.target.value }))} placeholder="e.g. Unit Test 1" />
            </div>
            <div className="space-y-1">
              <Label>Date</Label>
              <Input type="date" value={editForm.exam_date} onChange={(e) => setEditForm((p) => ({ ...p, exam_date: e.target.value }))} />
            </div>
            <div className="rounded-xl border border-border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Subject</TableHead>
                    <TableHead>Exam</TableHead>
                    <TableHead>Marks</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {historyLoading ? (
                    <TableRow><TableCell colSpan={4} className="text-center py-4"><Loader2 className="mx-auto h-5 w-5 animate-spin text-muted-foreground" /></TableCell></TableRow>
                  ) : historyRows.length === 0 ? (
                    <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-4">No tests added yet.</TableCell></TableRow>
                  ) : (
                    historyRows.map((row) => (
                      <TableRow key={`edit-${row.id || 0}-${row.exam_date}-${row.subject}`}>
                        <TableCell>{row.subject}</TableCell>
                        <TableCell>{row.examination}</TableCell>
                        <TableCell>{row.marks}</TableCell>
                        <TableCell>{row.exam_date ? String(row.exam_date).split("T")[0] : "—"}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button>
            <Button onClick={saveEdit} disabled={savingEdit}>
              {savingEdit && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Add Test
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Import Dialog ────────────────────────────────────────────────── */}
      <Dialog open={importOpen} onOpenChange={setImportOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5" />
              Import
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 flex-1 overflow-y-auto pr-1">
            <div className="rounded-lg bg-muted/60 p-3 text-sm text-muted-foreground space-y-1">
              <p className="font-medium text-foreground">Supported formats: CSV, JSON &amp; Excel (.xlsx)</p>
              <p>
                <span className="font-medium text-foreground">Excel (bulk marks):</span>{" "}
                columns <code className="text-xs bg-background rounded px-1">student_id, marks, subject, examination, exam_date</code> — saves marks to backend via API.
              </p>
              <p>
                <span className="font-medium text-foreground">CSV / JSON (students):</span>{" "}
                columns <code className="text-xs bg-background rounded px-1">id, name, phone, standard, board, location …</code>
              </p>
            </div>

            <div
              className="flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-border p-8 cursor-pointer hover:bg-muted/40 transition-colors"
              onClick={() => fileInputRef.current?.click()}
            >
              <div className="flex gap-3">
                <FileText className="h-8 w-8 text-emerald-500" />
                <FileJson className="h-8 w-8 text-blue-500" />
                <svg className="h-8 w-8 text-green-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/><path d="m6 13 2 2 4-4"/>
                </svg>
              </div>
              <p className="text-sm font-medium">Click to choose CSV, JSON or Excel file</p>
              {importFile && (
                <p className="text-xs text-muted-foreground font-medium">{importFile.name}</p>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.json,.xlsx,.xls"
                className="hidden"
                onChange={handleImportFileChange}
              />
            </div>

            {importError && (
              <p className="text-sm text-red-500 rounded-lg bg-red-50 px-3 py-2 whitespace-pre-line">{importError}</p>
            )}

            {importMode === "marks" && xlsxMarksRows.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-semibold text-green-700">
                    Excel — Bulk Marks
                  </span>
                  <p className="text-sm font-medium">{xlsxMarksRows.length} row{xlsxMarksRows.length !== 1 ? "s" : ""} found</p>
                </div>
                <div className="rounded-xl border border-border overflow-auto max-h-56">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Student ID</TableHead>
                        <TableHead>Name</TableHead>
                        <TableHead>Subject</TableHead>
                        <TableHead>Examination</TableHead>
                        <TableHead>Marks</TableHead>
                        <TableHead>Date</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {xlsxMarksRows.slice(0, 10).map((r, i) => (
                        <TableRow key={i}>
                          <TableCell>{r.student_id}</TableCell>
                          <TableCell>{r.studentName}</TableCell>
                          <TableCell>{r.subject || "—"}</TableCell>
                          <TableCell>{r.examination || "—"}</TableCell>
                          <TableCell>
                            <span className="rounded-full bg-rose-100 px-2.5 py-0.5 text-xs font-semibold text-rose-700">{r.marks}</span>
                          </TableCell>
                          <TableCell>{r.exam_date || "—"}</TableCell>
                        </TableRow>
                      ))}
                      {xlsxMarksRows.length > 10 && (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center text-xs text-muted-foreground py-2">
                            …and {xlsxMarksRows.length - 10} more
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}

            {importMode === "students" && importPreview.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-medium">
                  Preview — {importPreview.length} student{importPreview.length !== 1 ? "s" : ""} found
                </p>
                <div className="rounded-xl border border-border overflow-auto max-h-52">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Phone</TableHead>
                        <TableHead>Std</TableHead>
                        <TableHead>Board</TableHead>
                        <TableHead>Location</TableHead>
                        <TableHead>Marks</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {importPreview.slice(0, 10).map((s, i) => (
                        <TableRow key={i}>
                          <TableCell>{s.name || "—"}</TableCell>
                          <TableCell>{s.phone || "—"}</TableCell>
                          <TableCell>{s.standard || "—"}</TableCell>
                          <TableCell>{s.board || "—"}</TableCell>
                          <TableCell>{s.location || "—"}</TableCell>
                          <TableCell>{s.marks !== undefined ? s.marks : "—"}</TableCell>
                        </TableRow>
                      ))}
                      {importPreview.length > 10 && (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center text-xs text-muted-foreground py-2">
                            …and {importPreview.length - 10} more
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}

            {importProgress && (
              <div className="space-y-1">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Saving marks…</span>
                  <span>{importProgress.done} / {importProgress.total}</span>
                </div>
                <div className="h-2 rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full bg-green-500 transition-all duration-300"
                    style={{ width: `${(importProgress.done / importProgress.total) * 100}%` }}
                  />
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="pt-2">
            <Button variant="outline" onClick={() => setImportOpen(false)} disabled={importing}>Cancel</Button>
            <Button
              onClick={confirmImport}
              disabled={(importMode === "marks" ? xlsxMarksRows.length === 0 : importPreview.length === 0) || importing}
            >
              {importing && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {importMode === "marks"
                ? `Save ${xlsxMarksRows.length} Mark${xlsxMarksRows.length !== 1 ? "s" : ""} to DB`
                : `Import ${importPreview.length > 0 ? `${importPreview.length} Students` : ""}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Bulk Marks Dialog ────────────────────────────────────────────── */}
      <Dialog open={bulkOpen} onOpenChange={setBulkOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ClipboardList className="h-5 w-5 text-amber-500" />
              Bulk Add Marks
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 flex-1 overflow-y-auto pr-1">
           {/* Common fields: Examination + Date + Total Marks */}
<div className="space-y-3 rounded-xl bg-muted/50 p-4">
  <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
    <div className="space-y-1">
      <Label>Examination <span className="text-red-500">*</span></Label>
      <Input
        value={bulkCommon.examination}
        onChange={(e) => setBulkCommon((p) => ({ ...p, examination: e.target.value }))}
        placeholder="e.g. Unit Test 1"
      />
    </div>
    <div className="space-y-1">
      <Label>Date <span className="text-red-500">*</span></Label>
      <Input
        type="date"
        value={bulkCommon.exam_date}
        onChange={(e) => setBulkCommon((p) => ({ ...p, exam_date: e.target.value }))}
      />
    </div>
    <div className="space-y-1">
      <Label>Total Marks <span className="text-muted-foreground text-xs font-normal">(optional — all subjects)</span></Label>
      <Input
        type="number"
        min={0}
        value={bulkCommon.total_marks}
        onChange={(e) => setBulkCommon((p) => ({ ...p, total_marks: e.target.value }))}
        placeholder="e.g. 100"
      />
    </div>
  </div>
  {/* Import / Export row */}
  <div className="flex items-center gap-2 pt-1">
    <Button
      type="button"
      variant="outline"
      size="sm"
      className="h-8 rounded-full gap-1.5 text-xs"
      onClick={exportBulkCSV}
    >
      <Download className="h-3.5 w-3.5" />
      Export CSV
    </Button>
    <Button
      type="button"
      variant="outline"
      size="sm"
      className="h-8 rounded-full gap-1.5 text-xs"
      onClick={() => bulkImportRef.current?.click()}
    >
      <Upload className="h-3.5 w-3.5" />
      Import CSV
    </Button>
    <input
      ref={bulkImportRef}
      type="file"
      accept=".csv"
      className="hidden"
      onChange={handleBulkImportFile}
    />
    <span className="text-xs text-muted-foreground">Import a previously exported bulk CSV to pre-fill marks.</span>
  </div>
</div>

            {/* Subject columns management */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-muted-foreground">
                  Subject Columns ({bulkSubjects.length})
                </p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-8 rounded-full gap-1.5 text-xs border-amber-400 text-amber-600 hover:bg-amber-50"
                  onClick={addBulkSubjectCol}
                >
                  <Plus className="h-3.5 w-3.5" />
                  Add Subject
                </Button>
              </div>

              {/* Subject name inputs row */}
              <div className="flex flex-wrap gap-2">
                {bulkSubjects.map((col, idx) => (
                  <div key={col.id} className="flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-3 py-1">
                    <span className="text-xs text-amber-500 font-semibold min-w-[1.2rem]">#{idx + 1}</span>
                    <Input
                      value={col.subject}
                      onChange={(e) => updateBulkSubjectName(col.id, e.target.value)}
                      placeholder="Subject name"
                      className="h-7 w-36 rounded-full border-amber-200 text-xs px-2 bg-white focus-visible:ring-amber-300"
                    />
                    {bulkSubjects.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeBulkSubjectCol(col.id)}
                        className="flex h-5 w-5 items-center justify-center rounded-full text-amber-400 hover:bg-amber-200 hover:text-amber-700 transition-colors"
                        title="Remove subject"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Info */}
            <p className="text-xs text-muted-foreground px-1">
              Showing {filteredStudents.length} student{filteredStudents.length !== 1 ? "s" : ""} matching current filters. Leave marks blank to skip a student.
            </p>

            {/* Student marks table — dynamic columns */}
            <div className="rounded-xl border border-border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-900 hover:bg-slate-900">
                    <TableHead className="text-white sticky left-0 bg-slate-900 z-10">Name</TableHead>
                    <TableHead className="text-white">Std</TableHead>
                    <TableHead className="text-white">Board</TableHead>
                    {bulkSubjects.map((col, idx) => (
  <TableHead key={col.id} className="text-white min-w-[130px]">
    <div className="flex flex-col gap-0.5">
      <span className="text-amber-300 text-[10px] font-normal">Subject #{idx + 1}</span>
      <span className="truncate max-w-[120px]">
        {col.subject.trim() || <span className="opacity-50 italic text-xs">Unnamed</span>}
      </span>
    </div>
  </TableHead>
                    ))}
                    <TableHead className="text-white min-w-[100px]">
                      <div className="flex flex-col gap-0.5">
                        <span className="text-blue-300 text-[10px] font-normal">Auto</span>
                        <span>Total</span>
                      </div>
                    </TableHead>
                    <TableHead className="text-white min-w-[100px]">
                      <div className="flex flex-col gap-0.5">
                        <span className="text-emerald-300 text-[10px] font-normal">Auto</span>
                        <span>% Score</span>
                      </div>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredStudents.length === 0 ? (
                    <TableRow>
                    <TableCell colSpan={5 + bulkSubjects.length} className="text-center py-8 text-muted-foreground text-sm">
                        No students match current filters.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredStudents.map((student) => (
                      <TableRow key={student.id}>
                        <TableCell className="font-medium sticky left-0 bg-card z-10">{student.name}</TableCell>
                        <TableCell>{student.standard}</TableCell>
                        <TableCell>{student.board}</TableCell>
                       {bulkSubjects.map((col) => (
  <TableCell key={col.id}>
    <Input
      type="number"
      min={0}
      placeholder="—"
      value={bulkMarks[student.id]?.[col.id] ?? ""}
      onChange={(e) => updateBulkMark(student.id, col.id, e.target.value)}
      className="h-8 w-28 rounded-full text-sm"
    />
  </TableCell>
))}
<TableCell>
  {(() => {
    const filledEntries = bulkSubjects
      .map((col) => bulkMarks[student.id]?.[col.id])
      .filter((v) => v !== undefined && v !== "");
    if (filledEntries.length === 0) return <span className="text-muted-foreground text-xs">—</span>;
    const rowTotal = filledEntries.reduce((sum, v) => sum + Number(v), 0);
    const tm = bulkCommon.total_marks !== "" ? Number(bulkCommon.total_marks) : null;
    const maxPossible = tm && tm > 0 ? tm : null;
    return (
      <div className="flex flex-col gap-0.5">
        <span className="rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-bold text-blue-800 inline-block w-fit">
          {rowTotal}
        </span>
        {maxPossible && (
          <span className="text-[10px] text-muted-foreground pl-1">/ {maxPossible}</span>
        )}
      </div>
    );
  })()}
</TableCell>
<TableCell>
  {(() => {
    const filledEntries = bulkSubjects
      .map((col) => bulkMarks[student.id]?.[col.id])
      .filter((v) => v !== undefined && v !== "");
    if (filledEntries.length === 0) return <span className="text-muted-foreground text-xs">—</span>;
    const totalObtained = filledEntries.reduce((sum, v) => sum + Number(v), 0);
    const tm = bulkCommon.total_marks !== "" ? Number(bulkCommon.total_marks) : null;
    if (!tm || tm <= 0) {
      // No total marks set — show sum only
      return (
        <span className="rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-semibold text-blue-700">
          Σ {totalObtained}
        </span>
      );
    }
    const maxPossible = tm;
    const pct = ((totalObtained / maxPossible) * 100).toFixed(1);
    const pctNum = parseFloat(pct);
    const color =
      pctNum >= 75 ? "bg-emerald-100 text-emerald-700" :
      pctNum >= 50 ? "bg-amber-100 text-amber-700" :
      "bg-red-100 text-red-700";
    return (
      <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${color}`}>
        {pct}%
      </span>
    );
  })()}
</TableCell>
                      </TableRow>
                    ))
                  )}
                {filteredStudents.length > 0 && (
                    <TableRow className="bg-slate-50 border-t-2 border-slate-200 font-semibold">
                      <TableCell className="sticky left-0 bg-slate-50 z-10 text-slate-700 text-sm font-bold">
                        Total
                      </TableCell>
                      <TableCell />
                      <TableCell />
                      {bulkSubjects.map((col) => {
                        const colTotal = filteredStudents.reduce((sum, student) => {
                          const val = bulkMarks[student.id]?.[col.id];
                          if (val === undefined || val === "") return sum;
                          const num = Number(val);
                          return Number.isNaN(num) ? sum : sum + num;
                        }, 0);
                        const filledCount = filteredStudents.filter((student) => {
                          const val = bulkMarks[student.id]?.[col.id];
                          return val !== undefined && val !== "" && !Number.isNaN(Number(val));
                        }).length;
                        return (
                          <TableCell key={col.id}>
                            {filledCount > 0 ? (
                              <div className="flex flex-col gap-0.5">
                                <span className="rounded-full bg-slate-200 px-2.5 py-0.5 text-xs font-bold text-slate-800 inline-block w-fit">
                                  Σ {colTotal}
                                </span>
                                <span className="text-[10px] text-muted-foreground pl-1">{filledCount} students</span>
                              </div>
                            ) : (
                              <span className="text-muted-foreground text-xs">—</span>
                            )}
                          </TableCell>
                        );
                      })}
                      {/* Grand row total cell */}
                      <TableCell>
                        {(() => {
                          const grandTotal = filteredStudents.reduce((sum, student) =>
                            sum + bulkSubjects.reduce((s2, col) => {
                              const val = bulkMarks[student.id]?.[col.id];
                              if (!val || val === "") return s2;
                              const num = Number(val);
                              return Number.isNaN(num) ? s2 : s2 + num;
                            }, 0), 0);
                          const totalFilledCells = filteredStudents.reduce((sum, student) =>
                            sum + bulkSubjects.filter((col) => {
                              const val = bulkMarks[student.id]?.[col.id];
                              return val !== undefined && val !== "" && !Number.isNaN(Number(val));
                            }).length, 0);
                          if (totalFilledCells === 0) return <span className="text-muted-foreground text-xs">—</span>;
                          const tm = bulkCommon.total_marks !== "" ? Number(bulkCommon.total_marks) : null;
                          const filledStudentCount2 = filteredStudents.filter((student) =>
                            bulkSubjects.some((col) => {
                              const val = bulkMarks[student.id]?.[col.id];
                              return val !== undefined && val !== "" && !Number.isNaN(Number(val));
                            })
                          ).length;
                          const maxPossible = tm && tm > 0 ? tm * filledStudentCount2 : null;
                          return (
                            <div className="flex flex-col gap-0.5">
                              <span className="rounded-full bg-blue-200 px-2.5 py-0.5 text-xs font-bold text-blue-900 inline-block w-fit">
                                {grandTotal}
                              </span>
                              {maxPossible && (
                                <span className="text-[10px] text-muted-foreground pl-1">/ {maxPossible}</span>
                              )}
                            </div>
                          );
                        })()}
                      </TableCell>
                      {/* Grand total % cell */}
                      <TableCell>
                        {(() => {
                          const grandObtained = filteredStudents.reduce((sum, student) => {
                            return sum + bulkSubjects.reduce((s2, col) => {
                              const val = bulkMarks[student.id]?.[col.id];
                              if (val === undefined || val === "") return s2;
                              const num = Number(val);
                              return Number.isNaN(num) ? s2 : s2 + num;
                            }, 0);
                          }, 0);
                          const tm = bulkCommon.total_marks !== "" ? Number(bulkCommon.total_marks) : null;
                          const totalFilledCells = filteredStudents.reduce((sum, student) =>
                            sum + bulkSubjects.filter((col) => {
                              const val = bulkMarks[student.id]?.[col.id];
                              return val !== undefined && val !== "" && !Number.isNaN(Number(val));
                            }).length, 0);
                          if (totalFilledCells === 0) return <span className="text-muted-foreground text-xs">—</span>;
                          if (!tm || tm <= 0) {
                            return (
                              <span className="rounded-full bg-slate-200 px-2.5 py-0.5 text-xs font-bold text-slate-800">
                                Σ {grandObtained}
                              </span>
                            );
                          }
                          const filledStudentCount = filteredStudents.filter((student) =>
                            bulkSubjects.some((col) => {
                              const val = bulkMarks[student.id]?.[col.id];
                              return val !== undefined && val !== "" && !Number.isNaN(Number(val));
                            })
                          ).length;
                          const maxPossible = tm * filledStudentCount;
                          const pct = ((grandObtained / maxPossible) * 100).toFixed(1);
                          const pctNum = parseFloat(pct);
                          const color =
                            pctNum >= 75 ? "bg-emerald-100 text-emerald-700" :
                            pctNum >= 50 ? "bg-amber-100 text-amber-700" :
                            "bg-red-100 text-red-700";
                          return (
                            <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${color}`}>
                              {pct}%
                            </span>
                          );
                        })()}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>

            {/* Progress bar */}
            {bulkProgress && (
              <div className="space-y-1">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Saving…</span>
                  <span>{bulkProgress.done} / {bulkProgress.total}</span>
                </div>
                <div className="h-2 rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full bg-amber-400 transition-all duration-300"
                    style={{ width: `${(bulkProgress.done / bulkProgress.total) * 100}%` }}
                  />
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="pt-2">
            <Button variant="outline" onClick={() => setBulkOpen(false)} disabled={bulkSaving}>
              Cancel
            </Button>
            <Button
              className="bg-amber-500 hover:bg-amber-600 text-white"
              onClick={saveBulkMarks}
              disabled={bulkSaving}
            >
              {bulkSaving ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Saving…</>
              ) : (
                <>
                  <ClipboardList className="h-4 w-4 mr-2" />
                  Save {bulkFilledCount > 0 ? `${bulkFilledCount} Mark${bulkFilledCount !== 1 ? "s" : ""}` : "Marks"}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
"use client";

import { useState, useCallback } from "react";
import { Plus, Trash2, Loader2, CheckCircle2, AlertCircle, X } from "lucide-react";
import { Button } from "../ui/button";
import { teacherStudentAssessmentsApi } from "../../lib/api";

// ─── Types ────────────────────────────────────────────────────────────────────

interface TestRow {
  id: string; // local UUID for key
  subject: string;
  examination: string;
  marks: string;
  total_marks: string;
  exam_date: string;
  status: "idle" | "saving" | "saved" | "error";
  error?: string;
}

interface AddMarksDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  studentId: number | null;
  studentName?: string;
  onSaved: () => void;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function uid() {
  return Math.random().toString(36).slice(2, 9);
}

function emptyRow(): TestRow {
  return {
    id: uid(),
    subject: "",
    examination: "",
    marks: "",
    total_marks: "100",
    exam_date: new Date().toISOString().split("T")[0],
    status: "idle",
  };
}

const SUBJECTS = [
  "Mathematics",
  "Science",
  "English",
  "Social Science",
  "Hindi",
  "Physics",
  "Chemistry",
  "Biology",
  "History",
  "Geography",
  "Economics",
  "Computer Science",
  "Other",
];

const EXAMINATIONS = [
  "Unit Test 1",
  "Unit Test 2",
  "Unit Test 3",
  "Mid-Term",
  "Pre-Final",
  "Final",
  "Weekly Test",
  "Monthly Test",
  "Practice Test",
  "Other",
];

// ─── Row Component ────────────────────────────────────────────────────────────

function TestRowInput({
  row,
  index,
  onChange,
  onRemove,
  canRemove,
}: {
  row: TestRow;
  index: number;
  onChange: (id: string, field: keyof TestRow, value: string) => void;
  onRemove: (id: string) => void;
  canRemove: boolean;
}) {
  const isLocked = row.status === "saved";

  const inputBase =
    "h-9 w-full rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-400 focus:border-transparent disabled:bg-slate-50 disabled:text-slate-400 disabled:cursor-not-allowed transition";

  return (
    <div
      className={`relative grid grid-cols-12 gap-2 items-end rounded-xl p-3 border transition-all
        ${row.status === "saved"
          ? "bg-green-50 border-green-200"
          : row.status === "error"
          ? "bg-red-50 border-red-200"
          : "bg-slate-50 border-slate-200"
        }`}
    >
      {/* Row number badge */}
      <div className="col-span-12 flex items-center gap-2 mb-1">
        <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-teal-100 text-teal-700 text-xs font-bold">
          {index + 1}
        </span>
        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
          Test Entry #{index + 1}
        </span>
        {row.status === "saved" && (
          <span className="ml-auto flex items-center gap-1 text-xs text-green-600 font-semibold">
            <CheckCircle2 className="h-3.5 w-3.5" /> Saved
          </span>
        )}
        {row.status === "error" && (
          <span className="ml-auto flex items-center gap-1 text-xs text-red-600 font-semibold">
            <AlertCircle className="h-3.5 w-3.5" /> {row.error || "Failed"}
          </span>
        )}
        {row.status === "saving" && (
          <span className="ml-auto flex items-center gap-1 text-xs text-sky-600 font-semibold">
            <Loader2 className="h-3.5 w-3.5 animate-spin" /> Saving…
          </span>
        )}
      </div>

      {/* Subject */}
      <div className="col-span-12 sm:col-span-4">
        <label className="block text-xs text-slate-500 mb-1 font-medium">Subject *</label>
        <select
          value={row.subject}
          onChange={(e) => onChange(row.id, "subject", e.target.value)}
          disabled={isLocked}
          className={inputBase}
        >
          <option value="">Select subject</option>
          {SUBJECTS.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>

      {/* Examination */}
      <div className="col-span-12 sm:col-span-4">
        <label className="block text-xs text-slate-500 mb-1 font-medium">Examination *</label>
        <select
          value={row.examination}
          onChange={(e) => onChange(row.id, "examination", e.target.value)}
          disabled={isLocked}
          className={inputBase}
        >
          <option value="">Select exam</option>
          {EXAMINATIONS.map((e) => (
            <option key={e} value={e}>{e}</option>
          ))}
        </select>
      </div>

      {/* Exam Date */}
      <div className="col-span-12 sm:col-span-4">
        <label className="block text-xs text-slate-500 mb-1 font-medium">Exam Date *</label>
        <input
          type="date"
          value={row.exam_date}
          onChange={(e) => onChange(row.id, "exam_date", e.target.value)}
          disabled={isLocked}
          className={inputBase}
        />
      </div>

      {/* Marks */}
      <div className="col-span-6 sm:col-span-3">
        <label className="block text-xs text-slate-500 mb-1 font-medium">Marks Obtained *</label>
        <input
          type="number"
          min="0"
          max={row.total_marks || "100"}
          placeholder="e.g. 78"
          value={row.marks}
          onChange={(e) => onChange(row.id, "marks", e.target.value)}
          disabled={isLocked}
          className={inputBase}
        />
      </div>

      {/* Total Marks */}
      <div className="col-span-6 sm:col-span-3">
        <label className="block text-xs text-slate-500 mb-1 font-medium">Out Of</label>
        <input
          type="number"
          min="1"
          placeholder="100"
          value={row.total_marks}
          onChange={(e) => onChange(row.id, "total_marks", e.target.value)}
          disabled={isLocked}
          className={inputBase}
        />
      </div>

      {/* Percentage preview */}
      <div className="col-span-6 sm:col-span-3 flex flex-col justify-end">
        <label className="block text-xs text-slate-500 mb-1 font-medium">Percentage</label>
        <div className="h-9 flex items-center px-3 rounded-md bg-white border border-slate-200 text-sm font-semibold text-teal-700">
          {row.marks && row.total_marks && Number(row.total_marks) > 0
            ? `${((Number(row.marks) / Number(row.total_marks)) * 100).toFixed(1)}%`
            : "—"}
        </div>
      </div>

      {/* Remove button */}
      <div className="col-span-6 sm:col-span-3 flex flex-col justify-end">
        <button
          type="button"
          onClick={() => onRemove(row.id)}
          disabled={!canRemove || isLocked}
          className="h-9 w-full flex items-center justify-center gap-1.5 rounded-md text-sm font-medium
            text-red-500 border border-red-200 hover:bg-red-50 disabled:opacity-30 disabled:cursor-not-allowed transition"
          title="Remove this row"
        >
          <Trash2 className="h-3.5 w-3.5" />
          Remove
        </button>
      </div>
    </div>
  );
}

// ─── Dialog ───────────────────────────────────────────────────────────────────

export function AddMarksDialog({
  open,
  onOpenChange,
  studentId,
  studentName,
  onSaved,
}: AddMarksDialogProps) {
  const [rows, setRows] = useState<TestRow[]>([emptyRow()]);
  const [saving, setSaving] = useState(false);
  const [globalError, setGlobalError] = useState<string | null>(null);

  const handleClose = useCallback(() => {
    if (saving) return;
    setRows([emptyRow()]);
    setGlobalError(null);
    onOpenChange(false);
  }, [saving, onOpenChange]);

  const handleChange = useCallback(
    (id: string, field: keyof TestRow, value: string) => {
      setRows((prev) =>
        prev.map((r) => (r.id === id ? { ...r, [field]: value, status: "idle", error: undefined } : r))
      );
    },
    []
  );

  const handleAddRow = () => {
    setRows((prev) => [...prev, emptyRow()]);
  };

  const handleRemoveRow = (id: string) => {
    setRows((prev) => prev.filter((r) => r.id !== id));
  };

  const validate = (row: TestRow): string | null => {
    if (!row.subject) return "Subject is required";
    if (!row.examination) return "Examination is required";
    if (!row.exam_date) return "Exam date is required";
    if (row.marks === "" || isNaN(Number(row.marks))) return "Marks must be a number";
    if (Number(row.marks) < 0) return "Marks cannot be negative";
    if (row.total_marks && Number(row.total_marks) > 0 && Number(row.marks) > Number(row.total_marks))
      return "Marks cannot exceed total marks";
    return null;
  };

  const handleSaveAll = async () => {
    if (!studentId) return;
    setGlobalError(null);

    // Validate all rows first
    let hasError = false;
    const validated = rows.map((row) => {
      if (row.status === "saved") return row; // skip already saved
      const err = validate(row);
      if (err) {
        hasError = true;
        return { ...row, status: "error" as const, error: err };
      }
      return row;
    });
    if (hasError) {
      setRows(validated);
      setGlobalError("Please fix the errors below before saving.");
      return;
    }

    setSaving(true);

    // Save pending rows sequentially
    const updated = [...rows];
    for (let i = 0; i < updated.length; i++) {
      const row = updated[i];
      if (row.status === "saved") continue;

      updated[i] = { ...row, status: "saving" };
      setRows([...updated]);

      try {
        await teacherStudentAssessmentsApi.create({
          student_id: studentId,
          subject: row.subject,
          examination: row.examination,
          marks: Number(row.marks),
          total_marks: row.total_marks ? Number(row.total_marks) : 100,
          exam_date: row.exam_date,
        });
        updated[i] = { ...row, status: "saved" };
      } catch (e: any) {
        updated[i] = {
          ...row,
          status: "error",
          error: e?.message || "Save failed",
        };
      }

      setRows([...updated]);
    }

    setSaving(false);

    const allSaved = updated.every((r) => r.status === "saved");
    const anySaved = updated.some((r) => r.status === "saved");

    if (anySaved) onSaved();

    if (allSaved) {
      setTimeout(() => {
        handleClose();
      }, 600);
    } else {
      setGlobalError("Some entries could not be saved. Review errors above.");
    }
  };

  const pendingCount = rows.filter((r) => r.status !== "saved").length;
  const savedCount = rows.filter((r) => r.status === "saved").length;

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={handleClose}
      />

      {/* Dialog */}
      <div className="relative z-10 w-full max-w-3xl max-h-[90vh] flex flex-col rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-gradient-to-r from-teal-50 to-white shrink-0">
          <div>
            <h2 className="text-lg font-bold text-slate-800">Add Test Marks</h2>
            {studentName && (
              <p className="text-sm text-slate-500 mt-0.5">
                Student: <span className="font-semibold text-teal-700">{studentName}</span>
              </p>
            )}
          </div>
          <button
            onClick={handleClose}
            disabled={saving}
            className="rounded-full p-1.5 hover:bg-slate-100 transition disabled:opacity-40"
          >
            <X className="h-5 w-5 text-slate-500" />
          </button>
        </div>

        {/* Progress bar when saving */}
        {saving && (
          <div className="w-full h-1 bg-slate-100 shrink-0">
            <div
              className="h-1 bg-teal-500 transition-all duration-500"
              style={{ width: `${(savedCount / rows.length) * 100}%` }}
            />
          </div>
        )}

        {/* Body — scrollable */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3">

          {globalError && (
            <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {globalError}
            </div>
          )}

          {rows.map((row, i) => (
            <TestRowInput
              key={row.id}
              row={row}
              index={i}
              onChange={handleChange}
              onRemove={handleRemoveRow}
              canRemove={rows.length > 1}
            />
          ))}

          {/* Add another test row button */}
          <button
            type="button"
            onClick={handleAddRow}
            disabled={saving}
            className="w-full flex items-center justify-center gap-2 rounded-xl border-2 border-dashed border-teal-300
              py-3 text-sm font-semibold text-teal-600 hover:bg-teal-50 hover:border-teal-400 transition disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Plus className="h-4 w-4" />
            Add Another Test
          </button>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-3 px-6 py-4 border-t border-slate-100 bg-slate-50 shrink-0">
          <div className="text-sm text-slate-500">
            {rows.length} {rows.length === 1 ? "entry" : "entries"}
            {savedCount > 0 && (
              <span className="ml-2 text-green-600 font-semibold">· {savedCount} saved</span>
            )}
            {pendingCount > 0 && !saving && (
              <span className="ml-2 text-slate-400">· {pendingCount} pending</span>
            )}
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={handleClose}
              disabled={saving}
              className="border-slate-200 text-slate-600"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSaveAll}
              disabled={saving || !studentId || pendingCount === 0}
              className="bg-teal-600 hover:bg-teal-700 text-white gap-2 min-w-[130px]"
            >
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Saving {savedCount + 1}/{rows.length}…
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4" />
                  Save {pendingCount} {pendingCount === 1 ? "Entry" : "Entries"}
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
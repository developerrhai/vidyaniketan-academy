import * as XLSX from "xlsx"
import { Student, feeStatus, formatDob } from "./student-types"

import { ExportField } from "@/components/dashboard/students/ExportStudentModal"

export const handleExportExcel = (students: Student[], fields: ExportField[]) => {
  if (!students.length) { alert("No students to export"); return }

  const headers = fields.map(f => f.label);

  const rows = students.map((s) => {
    return fields.map(f => {
      const key = f.key;
      
      // Handle computed fields
      if (key === "balance") {
        const totalFee = Number(s.fee || 0);
        const paidFee  = Number(s.paid_fee || 0);
        return Math.max(totalFee - paidFee, 0);
      }
      if (key === "fee_status") {
        return feeStatus(s).label;
      }
      
      // Handle dates
      if (key === "dob" || key === "admission_date") {
        return s[key] ? formatDob(s[key] as string) : "";
      }

      // Handle default mapping
      const val = s[key as keyof Student];
      return val !== null && val !== undefined ? val : "";
    });
  });

  const esc = (value: string | number) => `"${String(value).replace(/"/g, "\"\"")}"`
  const csv = [headers, ...rows].map((row) => row.map(esc).join(",")).join("\n")
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = `students_${new Date().toISOString().slice(0, 10)}.csv`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

const normalizeHeader = (value: unknown) =>
  String(value || "").trim().toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "")

const pickValue = (row: Record<string, unknown>, keys: string[]) => {
  for (const key of keys) {
    const value = row[key]
    if (value !== undefined && value !== null && String(value).trim() !== "") return value
  }
  return ""
}

export const processImportExcel = async (file: File): Promise<Array<Record<string, unknown>>> => {
  const buffer = await file.arrayBuffer()
  const workbook = XLSX.read(buffer, { type: "array" })
  const sheetName = workbook.SheetNames[0]
  const sheet = workbook.Sheets[sheetName]
  const rawRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "" })

  if (!rawRows.length) { throw new Error("Excel sheet is empty") }

  const normalizedRows = rawRows.map((row) => {
    const next: Record<string, unknown> = {}
    Object.entries(row).forEach(([key, value]) => { next[normalizeHeader(key)] = value })
    return next
  })

  const admin_id = localStorage.getItem("userInfo")
    ? JSON.parse(localStorage.getItem("userInfo") as string)?.id
    : null

  const payloads = normalizedRows.map((row) => {
    const name = String(pickValue(row, ["name", "student_name", "student"])).trim()
    if (!name) return null
    return {
      admin_id,
      name,
      email:          String(pickValue(row, ["email"])).trim(),
      phone:          String(pickValue(row, ["phone", "contact_no_1", "student_phone", "mobile", "contact"])).trim(),
      father_phone:   String(pickValue(row, ["father_phone", "contact_no_2", "parent_phone", "guardian_phone"])).trim(),
      standard:       String(pickValue(row, ["standard", "std", "class"])).trim(),
      course:         String(pickValue(row, ["course", "batch"])).trim(),
      branch:         String(pickValue(row, ["branch"])).trim(),
      institute:      String(pickValue(row, ["institute", "school", "college"])).trim(),
      fee:            Number(pickValue(row, ["fee", "total_fee"])) || 0,
      paid_fee:       Number(pickValue(row, ["paid_fee", "paid", "paidamount"])) || 0,
      aadhar:         String(pickValue(row, ["aadhar", "aadhar_number", "aadhaar"])).trim(),
      dob:            String(pickValue(row, ["dob", "date_of_birth", "birth_date"])).trim(),
      hostel:         String(pickValue(row, ["hostel"])).trim(),
      address:        String(pickValue(row, ["address"])).trim(),
      caste_religion: String(pickValue(row, ["caste_religion", "caste", "religion"])).trim(),
    }
  }).filter(Boolean) as Array<Record<string, unknown>>

  if (!payloads.length) {
    throw new Error("No valid student rows found. Add at least a Name column in the Excel sheet.")
  }

  return payloads;
}

"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { GraduationCap, Search, Eye, Trash2, Phone, User, MapPin, BookOpen, Loader2, IndianRupee, Pencil, FileSpreadsheet, Upload, Mail, SquarePen, Building } from "lucide-react"
import { studentsApi, studentsUniversalApi } from "@/lib/api"
import * as XLSX from "xlsx"

interface Student {
  id: number; name: string; phone: string; father_name: string; father_phone: string;
  aadhar: string; dob: string; address: string; email: string;
  standard: string; batch?: string; course: string; branch: string; fee: number; paid_fee: number;
  hostel: string; school_fee: number; academy_fee: number; hostel_fee: number;
  caste_religion: string; photo: string;
  scholarship_type?: string; scholarship_value?: number; scholarship_amount?: number;
  mother_name?: string; school_name?: string; scholarship_applied_to?: string;
  admission_type?: string; admission_date?: string; academic_year?: string;
}

const STANDARDS = [
  "1st Standard", "2nd Standard", "3rd Standard", "4th Standard", "5th Standard",
  "6th Standard", "7th Standard", "8th Standard", "9th Standard", "10th Standard",
  "11th Standard", "12th Standard"
]

const BRANCHES = [
  "Main Branch",
  "SOF Branch"
]

const JUNIOR_BATCHES = [
  "1st Standard", "2nd Standard", "3rd Standard",
  "4th Standard", "4th Scholarship", "5th Standard", "5th Scholarship(नवोदय / सैनिक)",
  "6th Standard", "6th Foundation", "7th Standard", "7th Scholarship", "7th Foundation",
  "6th–7th Foundation", "8th Standard", "8th Foundation", "8th Regular",
  "9th Standard", "9th Photon", "9th Foundation", "10th Standard",
  "Basic Foundation 1 (4th to 6th)", "Basic Foundation 2 (7th to 9th)"
]
const SENIOR_BATCHES = ["JEE", "NEET", "Foundation", "CET"]

const ALL_BATCHES = Array.from(new Set([...JUNIOR_BATCHES, ...SENIOR_BATCHES]))

const getBatchOptions = (std: string) => {
  if (std === "11th Standard" || std === "12th Standard") {
    return SENIOR_BATCHES;
  }
  return JUNIOR_BATCHES;
}

const feeStatus = (s: Student) => {
  const fee = Number(s.fee)
  const paid = Number(s.paid_fee)
  if (fee === 0) return { label: "No Fee", cls: "bg-gray-100 text-gray-500" }
  if (paid >= fee) return { label: "Paid", cls: "bg-emerald-100 text-emerald-700" }
  if (paid > 0) return { label: "Partial", cls: "bg-yellow-100 text-yellow-700" }
  return { label: "Pending", cls: "bg-red-100 text-red-700" }
}

const formatDob = (dob: string) => {
  if (!dob) return ""
  try {
    return new Date(dob).toLocaleDateString("en-IN", {
      day: "2-digit", month: "2-digit", year: "numeric"
    })
  } catch {
    return dob
  }
}

const formatDateForInput = (dateStr?: string) => {
  if (!dateStr) return ""
  try {
    const d = new Date(dateStr)
    if (isNaN(d.getTime())) return ""
    const y = d.getFullYear()
    const m = String(d.getMonth() + 1).padStart(2, "0")
    const r = String(d.getDate()).padStart(2, "0")
    return `${y}-${m}-${r}`
  } catch {
    return ""
  }
}

export function StudentsContent() {
  const [students, setStudents] = useState<Student[]>([])
  const [loading, setLoading] = useState(true)
  const [importing, setImporting] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [filterStandard, setFilterStandard] = useState("all")
  const [filterBatch, setFilterBatch] = useState("all")
  const [filterBranch, setFilterBranch] = useState("all")
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  const [selected, setSelected] = useState<Student | null>(null)
  const [viewOpen, setViewOpen] = useState(false)

  // ── Edit Modal State ──────────────────────────────────────────────────────
  const [editStudent, setEditStudent] = useState<Student | null>(null)
  const [editOpen, setEditOpen] = useState(false)
  const [editForm, setEditForm] = useState<Partial<Student>>({})
  const [editSaving, setEditSaving] = useState(false)
  const [editAppliedTo, setEditAppliedTo] = useState<string[]>([])
  const [editAdmissionType, setEditAdmissionType] = useState<string[]>([])

  const [feeStudent, setFeeStudent] = useState<Student | null>(null)
  const [feeModalOpen, setFeeModalOpen] = useState(false)
  const [newFee, setNewFee] = useState({
    academy_fee: 0,
    hostel_fee: 0,
    school_fee: 0,
    total_fee: 0,
    scholarship_type: "None",
    scholarship_value: 0,
    scholarship_amount: 0
  })
  const [feeSaving, setFeeSaving] = useState(false)

  const [payStudent, setPayStudent] = useState<Student | null>(null)
  const [payModalOpen, setPayModalOpen] = useState(false)
  const [payAmount, setPayAmount] = useState("")
  const [payMode, setPayMode] = useState<"add" | "set">("add")
  const [paySaving, setPaySaving] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const filters = {
        standard: filterStandard !== "all" ? filterStandard : undefined,
        batch:    filterBatch    !== "all" ? filterBatch    : undefined,
        branch:   filterBranch   !== "all" ? filterBranch   : undefined,
        search:   searchTerm     || undefined,
      }

      let result: Student[] = []

      try {
        const universal: any = await studentsUniversalApi.getAll(filters)
        result = universal?.data || []
      } catch {
        const primary: any = await studentsApi.getAll(filters)
        result = primary?.data || []
      }

      if (filterStandard !== "all") {
        result = result.filter((s) => {
          return String(s.standard ?? "").trim().toLowerCase() === String(filterStandard).trim().toLowerCase()
        })
      }

      if (filterBatch !== "all") {
        result = result.filter((s) =>
          s.batch?.toLowerCase().trim() === filterBatch.toLowerCase().trim()
        )
      }

      if (filterBranch !== "all") {
        result = result.filter((s) =>
          s.branch?.toLowerCase().trim() === filterBranch.toLowerCase().trim()
        )
      }

      if (searchTerm) {
        const q = searchTerm.toLowerCase()
        result = result.filter((s) =>
          s.name?.toLowerCase().includes(q) ||
          s.phone?.includes(searchTerm) ||
          s.father_phone?.includes(searchTerm)
        )
      }

      setStudents(result)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [filterStandard, filterBatch, filterBranch, searchTerm])

  useEffect(() => { load() }, [load])

  const handleDelete = async (id: number) => {
    if (!confirm("Delete this student?")) return
    try {
      await studentsApi.remove(id)
      setStudents(prev => prev.filter(s => s.id !== id))
    } catch (err: any) { alert(err.message) }
  }

  // ── Edit Handlers ─────────────────────────────────────────────────────────
  const openEditModal = (s: Student) => {
    setEditStudent(s)
    let applied: string[] = [];
    if (s.scholarship_applied_to) {
      applied = s.scholarship_applied_to.split(",");
    } else {
      applied = ["school_fee", "academy_fee", "hostel_fee"];
    }
    setEditAppliedTo(applied);

    let admType: string[] = [];
    if (s.admission_type) {
      admType = s.admission_type.split(",");
    }
    setEditAdmissionType(admType);

    setEditForm({
      ...s,
      dob: formatDateForInput(s.dob),
      admission_date: formatDateForInput(s.admission_date),
    })
    setEditOpen(true)
  }

  const handleEditChange = (field: keyof Student, value: string) => {
    setEditForm(prev => ({ ...prev, [field]: value }))
  }

  const handleSaveEdit = async () => {
    if (!editStudent) return
    if (!editForm.name?.trim()) { alert("Name is required"); return }

    const schoolFee = Number(editForm.school_fee || 0);
    const academyFee = Number(editForm.academy_fee || 0);
    const hostelFee = Number(editForm.hostel_fee || 0);
    const originalFee = schoolFee + academyFee + hostelFee;

    let baseFeeForConcession = 0;
    if (editAppliedTo.includes("school_fee")) baseFeeForConcession += schoolFee;
    if (editAppliedTo.includes("academy_fee")) baseFeeForConcession += academyFee;
    if (editAppliedTo.includes("hostel_fee")) baseFeeForConcession += hostelFee;

    let calculatedAmount = 0;
    const val = Number(editForm.scholarship_value || 0);
    if (editForm.scholarship_type === "Percent") {
      calculatedAmount = baseFeeForConcession * (val / 100);
    } else if (editForm.scholarship_type === "Flat") {
      calculatedAmount = val;
    }
    const finalPayable = Math.max(0, originalFee - calculatedAmount);

    const payload = {
      ...editForm,
      school_fee: schoolFee,
      academy_fee: academyFee,
      hostel_fee: hostelFee,
      fee: finalPayable,
      scholarship_value: val,
      scholarship_amount: calculatedAmount,
      scholarship_applied_to: editAppliedTo.join(","),
      admission_type: editAdmissionType.join(",")
    };

    setEditSaving(true)
    try {
      await studentsApi.update(editStudent.id, payload)
      setStudents(prev =>
        prev.map(s => s.id === editStudent.id ? { ...s, ...payload } as any : s)
      )
      setEditOpen(false)
    } catch (err: any) { alert(err.message) }
    finally { setEditSaving(false) }
  }

  const openFeeModal = (s: Student) => {
    setFeeStudent(s)
    setNewFee({
      academy_fee: Number(s?.academy_fee) || 0,
      hostel_fee:  Number(s?.hostel_fee)  || 0,
      school_fee:  Number(s?.school_fee)  || 0,
      total_fee:   Number(s?.fee)         || 0,
      scholarship_type: s?.scholarship_type || "None",
      scholarship_value: Number(s?.scholarship_value) || 0,
      scholarship_amount: Number(s?.scholarship_amount) || 0
    })
    setFeeModalOpen(true)
  }

  const handleUpdateFee = async () => {
    if (!feeStudent) return
    const originalFee = Number(newFee.school_fee) + Number(newFee.academy_fee) + Number(newFee.hostel_fee);
    let calculatedAmount = 0;
    const val = Number(newFee.scholarship_value || 0);
    if (newFee.scholarship_type === "Percent") {
      calculatedAmount = originalFee * (val / 100);
    } else if (newFee.scholarship_type === "Flat") {
      calculatedAmount = val;
    }
    const finalPayable = Math.max(0, originalFee - calculatedAmount);

    setFeeSaving(true)
    try {
      await studentsApi.update(feeStudent.id, {
        ...feeStudent,
        school_fee:  newFee.school_fee,
        academy_fee: newFee.academy_fee,
        hostel_fee:  newFee.hostel_fee,
        fee:         finalPayable,
        scholarship_type: newFee.scholarship_type,
        scholarship_value: val,
        scholarship_amount: calculatedAmount
      })
      setStudents(prev => prev.map(s =>
        s.id === feeStudent.id ? { 
          ...s, 
          school_fee: newFee.school_fee,
          academy_fee: newFee.academy_fee,
          hostel_fee: newFee.hostel_fee,
          fee: finalPayable,
          scholarship_type: newFee.scholarship_type,
          scholarship_value: val,
          scholarship_amount: calculatedAmount
        } : s
      ))
      setFeeModalOpen(false)
    } catch (err: any) { alert(err.message) }
    finally { setFeeSaving(false) }
  }

  const openPayModal = (s: Student) => {
    setPayStudent(s)
    setPayAmount("")
    setPayMode("add")
    setPayModalOpen(true)
  }

  const handlePayFee = async () => {
    if (!payStudent) return
    const val = parseFloat(payAmount)
    if (isNaN(val) || val < 0) { alert("Enter a valid amount"); return }

    const newPaid = payMode === "add" ? Number(payStudent.paid_fee) + val : val
    const totalFee = Number(payStudent.fee)

    if (totalFee > 0 && newPaid > totalFee) {
      alert(`Paid amount (₹${newPaid.toLocaleString()}) cannot exceed total fee (₹${totalFee.toLocaleString()})`)
      return
    }

    setPaySaving(true)
    try {
      await studentsApi.update(payStudent.id, { ...payStudent, paid_fee: newPaid })
      setStudents(prev => prev.map(s =>
        s.id === payStudent.id ? { ...s, paid_fee: newPaid } : s
      ))
      setPayModalOpen(false)
    } catch (err: any) { alert(err.message) }
    finally { setPaySaving(false) }
  }

  const handleExportExcel = () => {
    if (!students.length) { alert("No students to export"); return }

    const headers = [
      "ID", "Name", "Mother Name", "School/College Name", "Aadhar", "DOB",
      "Contact no.1", "Contact no.2",
      "Email", "Address", "Caste / Religion",
      "Standard", "Course", "Branch", "Hostel",
      "Total Fee", "Paid Fee", "Balance", "Fee Status",
    ]

    const rows = students.map((s) => {
      const totalFee = Number(s.fee || 0)
      const paidFee  = Number(s.paid_fee || 0)
      const balance  = Math.max(totalFee - paidFee, 0)
      const status   = feeStatus(s).label
      return [
        s.id, s.name || "", s.mother_name || "", s.school_name || "", s.aadhar || "", s.dob ? formatDob(s.dob) : "",
        s.phone || "", s.father_phone || "",
        s.email || "", s.address || "", s.caste_religion || "",
        s.standard || "", s.batch || "", s.branch || "", s.hostel || "",
        totalFee, paidFee, balance, status,
      ]
    })

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

  const handleImportExcel = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    setImporting(true)
    try {
      const buffer = await file.arrayBuffer()
      const workbook = XLSX.read(buffer, { type: "array" })
      const sheetName = workbook.SheetNames[0]
      const sheet = workbook.Sheets[sheetName]
      const rawRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "" })

      if (!rawRows.length) { alert("Excel sheet is empty"); return }

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
        alert("No valid student rows found. Add at least a Name column in the Excel sheet.")
        return
      }

      const results = await Promise.allSettled(payloads.map((payload) => studentsApi.create(payload)))
      const successCount = results.filter((r) => r.status === "fulfilled").length
      const failedCount  = results.length - successCount
      await load()

      if (failedCount > 0) {
        alert(`${successCount} students imported successfully. ${failedCount} rows failed.`)
      } else {
        alert(`${successCount} students imported successfully.`)
      }
    } catch (err: any) {
      alert(err.message || "Failed to import Excel file")
    } finally {
      setImporting(false)
      event.target.value = ""
    }
  }

  return (
    <div className="space-y-6 pt-12 lg:pt-0">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-xl md:text-2xl">
            <GraduationCap className="h-6 w-6" /> Students Management
          </CardTitle>
        </CardHeader>
        <CardContent>

          {/* Filters */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search by name or phone…" value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)} className="pl-10" />
            </div>

            <Select
              key={`standard-${filterStandard}`}
              value={filterStandard}
              onValueChange={setFilterStandard}
            >
              <SelectTrigger><SelectValue placeholder="All Standards" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Standards</SelectItem>
                {STANDARDS.map(std => (
                  <SelectItem key={std} value={std}>{std}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              key={`batch-${filterBatch}`}
              value={filterBatch}
              onValueChange={setFilterBatch}
            >
              <SelectTrigger><SelectValue placeholder="All Batches" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Batches</SelectItem>
                {ALL_BATCHES.map(b => (
                  <SelectItem key={b} value={b}>{b}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              key={`branch-${filterBranch}`}
              value={filterBranch}
              onValueChange={setFilterBranch}
            >
              <SelectTrigger><SelectValue placeholder="All Branches" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Branches</SelectItem>
                {BRANCHES.map((branch) => (
                  <SelectItem key={branch} value={branch}>
                    {branch}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex justify-end mb-4">
            <div className="flex items-center gap-2">
              <input ref={fileInputRef} type="file" accept=".xlsx,.xls,.csv"
                onChange={handleImportExcel} className="hidden" />
              <Button onClick={() => fileInputRef.current?.click()} variant="outline" disabled={importing}>
                {importing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Upload className="h-4 w-4 mr-2" />}
                Import Excel
              </Button>
              <Button onClick={handleExportExcel} variant="outline">
                <FileSpreadsheet className="h-4 w-4 mr-2" /> Export Excel
              </Button>
            </div>
          </div>

          {/* Table */}
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <div className="rounded-lg border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-900">
                    <TableHead className="text-white font-semibold">Name</TableHead>
                    <TableHead className="text-white font-semibold hidden sm:table-cell">Contact no.1</TableHead>
                    <TableHead className="text-white font-semibold hidden sm:table-cell">Contact no.2</TableHead>
                    <TableHead className="text-white font-semibold hidden sm:table-cell">Concession</TableHead>
                    <TableHead className="text-white font-semibold hidden sm:table-cell">DOB</TableHead>
                    <TableHead className="text-white font-semibold">Std</TableHead>
                    <TableHead className="text-white font-semibold">Batch</TableHead>
                    <TableHead className="text-white font-semibold hidden md:table-cell">Branch</TableHead>
                    <TableHead className="text-white font-semibold hidden md:table-cell">Hostel</TableHead>
                    <TableHead className="text-white font-semibold hidden lg:table-cell">Total Fee</TableHead>
                    <TableHead className="text-white font-semibold hidden lg:table-cell">Paid</TableHead>
                    <TableHead className="text-white font-semibold hidden sm:table-cell">Status</TableHead>
                    <TableHead className="text-white font-semibold text-center">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {students.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={12} className="text-center py-8 text-muted-foreground">
                        No students found
                      </TableCell>
                    </TableRow>
                  ) : students.map(s => {
                    const { label, cls } = feeStatus(s)
                    return (
                      <TableRow key={s.id} className="hover:bg-muted/50">
                        <TableCell className="font-medium">{s.name}</TableCell>
                        <TableCell className="hidden sm:table-cell">{s.phone}</TableCell>
                        <TableCell className="hidden sm:table-cell">{s.father_phone}</TableCell>
                        <TableCell className="hidden md:table-cell">
                          {s.scholarship_amount && Number(s.scholarship_amount) > 0 ? (
                            <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-800 border border-amber-200 text-xs px-2.5 py-0.5 rounded-full font-medium shadow-sm">
                              {s.scholarship_type === "Percent" ? `${Number(s.scholarship_value)}%` : "Flat"} (-₹{Number(s.scholarship_amount).toLocaleString()})
                            </span>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell className="hidden md:table-cell">{formatDob(s.dob)}</TableCell>
                        <TableCell>{s.standard}</TableCell>
                        <TableCell>{s.batch}</TableCell>
                        <TableCell className="hidden md:table-cell">{s.branch}</TableCell>
                        <TableCell className="hidden md:table-cell">{s.hostel}</TableCell>
                        <TableCell className="hidden lg:table-cell font-medium">
                          ₹{Number(s.fee).toLocaleString()}
                        </TableCell>
                        <TableCell className="hidden lg:table-cell text-emerald-600 font-medium">
                          ₹{Number(s.paid_fee).toLocaleString()}
                        </TableCell>
                        <TableCell className="hidden sm:table-cell">
                          <Badge className={cls}>{label}</Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center justify-center gap-1">
                            <Button size="sm" variant="outline" className="h-8 w-8 p-0"
                              title="View details"
                              onClick={() => { setSelected(s); setViewOpen(true) }}>
                              <Eye className="h-4 w-4" />
                            </Button>
                            {/* ── Edit Button ── */}
                            <Button size="sm" variant="outline" className="h-8 w-8 p-0 text-violet-600 hover:text-violet-700 hover:border-violet-300"
                              title="Edit student"
                              onClick={() => openEditModal(s)}>
                              <SquarePen className="h-4 w-4" />
                            </Button>
                            <Button size="sm" variant="outline" className="h-8 w-8 p-0 text-blue-600 hover:text-blue-700 hover:border-blue-300"
                              title="Update total fee"
                              onClick={() => openFeeModal(s)}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button size="sm" variant="outline" className="h-8 w-8 p-0 text-emerald-600 hover:text-emerald-700 hover:border-emerald-300"
                              title="Record payment"
                              onClick={() => openPayModal(s)}>
                              <IndianRupee className="h-4 w-4" />
                            </Button>
                            <Button size="sm" variant="destructive" className="h-8 w-8 p-0"
                              onClick={() => handleDelete(s.id)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── View Modal ───────────────────────────────────── */}
      <Dialog open={viewOpen} onOpenChange={setViewOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <GraduationCap className="h-5 w-5" /> Student Details
            </DialogTitle>
          </DialogHeader>
          {selected && (
            <div className="max-h-[70vh] overflow-y-auto overflow-x-hidden pr-1 space-y-3">

              {selected.photo && (
                <div className="flex items-start gap-3 p-3 bg-muted rounded-lg">
                  <User className="h-5 w-5 text-muted-foreground shrink-0 mt-1" />
                  <div>
                    <p className="text-sm text-muted-foreground mb-2">Passport Photo</p>
                    <img
                      src={selected.photo}
                      alt="Passport photo"
                      className="w-20 h-24 object-cover rounded-lg border border-border"
                    />
                  </div>
                </div>
              )}

              {[
                { icon: User,     label: "Name",             value: selected.name },
                { icon: Phone,    label: "Contact no.1",     value: selected.phone },
                { icon: Phone,    label: "Contact no.2",     value: selected.father_phone },
                { icon: User,     label: "Father Name",      value: selected.father_name },
                { icon: User,     label: "Mother Name",      value: selected.mother_name },
                { icon: Mail,     label: "Email",            value: selected.email },
                { icon: MapPin,   label: "Aadhar",           value: selected.aadhar },
                { icon: MapPin,   label: "DOB",              value: formatDob(selected.dob) },
                { icon: MapPin,   label: "Address",          value: selected.address },
                { icon: MapPin,   label: "Branch",           value: selected.branch },
                { icon: MapPin,   label: "Hostel",           value: selected.hostel },
                { icon: BookOpen, label: "Standard",         value: selected.standard },
                { icon: BookOpen, label: "Batch",            value: selected.batch },
                { icon: Building, label: "School/College Name", value: selected.school_name },
                { icon: BookOpen, label: "Academic Year",    value: selected.academic_year },
                { icon: BookOpen, label: "Admission In",     value: selected.admission_type },
                { icon: BookOpen, label: "Date of Admission", value: selected.admission_date ? formatDob(selected.admission_date) : "" },
                { icon: BookOpen, label: "Caste / Religion", value: selected.caste_religion },
              ].map(({ icon: Icon, label, value }) =>
                value ? (
                  <div key={label} className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                    <Icon className="h-5 w-5 text-muted-foreground shrink-0" />
                    <div>
                      <p className="text-sm text-muted-foreground">{label}</p>
                      <p className="font-medium">{value}</p>
                    </div>
                  </div>
                ) : null
              )}

              <div className="p-3 bg-muted rounded-lg space-y-2">
                <p className="text-sm text-muted-foreground font-medium">Fee Summary</p>
                {(() => {
                  const originalFee = Number(selected.school_fee || 0) + Number(selected.academy_fee || 0) + Number(selected.hostel_fee || 0);
                  const scholarshipAmt = Number(selected.scholarship_amount || 0);
                  const payable = Number(selected.fee || 0);
                  return (
                    <div className="space-y-2">
                      <div className="grid grid-cols-2 gap-2 text-xs bg-background rounded-lg p-3">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">School Fee:</span>
                          <span className="font-medium">₹{Number(selected.school_fee || 0).toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Academy Fee:</span>
                          <span className="font-medium">₹{Number(selected.academy_fee || 0).toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Hostel Fee:</span>
                          <span className="font-medium">₹{Number(selected.hostel_fee || 0).toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between border-t pt-1 mt-1 col-span-2">
                          <span className="text-muted-foreground font-semibold">Original Fee:</span>
                          <span className="font-bold">₹{originalFee.toLocaleString()}</span>
                        </div>
                        {scholarshipAmt > 0 && (
                          <div className="flex justify-between text-amber-600 col-span-2">
                            <span>Scholarship / Concession ({selected.scholarship_type === "Percent" ? `${selected.scholarship_value}%` : "Flat"}):</span>
                            <span>-₹{scholarshipAmt.toLocaleString()}</span>
                          </div>
                        )}
                      </div>

                      <div className="grid grid-cols-3 gap-2 text-center">
                        <div className="bg-background rounded-lg p-2">
                          <p className="text-xs text-muted-foreground">Net Payable</p>
                          <p className="font-bold text-sm">₹{payable.toLocaleString()}</p>
                        </div>
                        <div className="bg-background rounded-lg p-2">
                          <p className="text-xs text-muted-foreground">Paid</p>
                          <p className="font-bold text-sm text-emerald-600">₹{Number(selected.paid_fee).toLocaleString()}</p>
                        </div>
                        <div className="bg-background rounded-lg p-2">
                          <p className="text-xs text-muted-foreground">Balance</p>
                          <p className="font-bold text-sm text-red-500">
                            ₹{Math.max(0, payable - Number(selected.paid_fee)).toLocaleString()}
                          </p>
                        </div>
                      </div>

                      <div className="w-full bg-muted-foreground/20 rounded-full h-2 mt-1">
                        <div
                          className="bg-emerald-500 h-2 rounded-full transition-all"
                          style={{ width: `${Math.min((Number(selected.paid_fee) / (payable || 1)) * 100, 100)}%` }}
                        />
                      </div>
                      <p className="text-xs text-right text-muted-foreground">
                        {payable > 0
                          ? `${Math.round((Number(selected.paid_fee) / payable) * 100)}% paid`
                          : "No fee set"}
                      </p>
                    </div>
                  );
                })()}
              </div>

            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ── Edit Student Modal ───────────────────────────── */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <SquarePen className="h-5 w-5 text-violet-600" /> Edit Student
            </DialogTitle>
          </DialogHeader>

          {editStudent && (
            <div className="max-h-[70vh] overflow-y-auto pr-1 space-y-4 py-2">

              {/* Personal Info */}
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Personal Information</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label htmlFor="edit-name">Name <span className="text-destructive">*</span></Label>
                  <Input id="edit-name" value={editForm.name ?? ""} onChange={e => handleEditChange("name", e.target.value)} placeholder="Full name" />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="edit-email">Email</Label>
                  <Input id="edit-email" type="email" value={editForm.email ?? ""} onChange={e => handleEditChange("email", e.target.value)} placeholder="Email address" />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="edit-phone">Contact no.1</Label>
                  <Input id="edit-phone" value={editForm.phone ?? ""} onChange={e => handleEditChange("phone", e.target.value)} placeholder="Student phone" />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="edit-father-phone">Contact no.2</Label>
                  <Input id="edit-father-phone" value={editForm.father_phone ?? ""} onChange={e => handleEditChange("father_phone", e.target.value)} placeholder="Parent / guardian phone" />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="edit-father-name">Father Name</Label>
                  <Input id="edit-father-name" value={editForm.father_name ?? ""} onChange={e => handleEditChange("father_name", e.target.value)} placeholder="Father's name" />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="edit-mother-name">Mother Name</Label>
                  <Input id="edit-mother-name" value={editForm.mother_name ?? ""} onChange={e => handleEditChange("mother_name", e.target.value)} placeholder="Mother's name" />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="edit-school-name">School/College Name</Label>
                  <Input id="edit-school-name" value={editForm.school_name ?? ""} onChange={e => handleEditChange("school_name", e.target.value)} placeholder="School or college name" />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="edit-dob">Date of Birth</Label>
                  <Input id="edit-dob" type="date" value={editForm.dob ?? ""} onChange={e => handleEditChange("dob", e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="edit-aadhar">Aadhar Number</Label>
                  <Input id="edit-aadhar" value={editForm.aadhar ?? ""} onChange={e => handleEditChange("aadhar", e.target.value)} placeholder="12-digit Aadhar number" maxLength={12} />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="edit-caste">Caste / Religion</Label>
                  <Input id="edit-caste" value={editForm.caste_religion ?? ""} onChange={e => handleEditChange("caste_religion", e.target.value)} placeholder="Caste or religion" />
                </div>
                <div className="space-y-1 sm:col-span-2">
                  <Label htmlFor="edit-address">Address</Label>
                  <Input id="edit-address" value={editForm.address ?? ""} onChange={e => handleEditChange("address", e.target.value)} placeholder="Full address" />
                </div>
                <div className="space-y-1 sm:col-span-2">
                  <Label>Student Photo</Label>
                  <div className="flex items-center gap-4 p-2 border border-dashed border-gray-300 rounded-lg bg-gray-50/50">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={e => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const reader = new FileReader();
                          reader.onload = () => handleEditChange("photo", reader.result as string);
                          reader.readAsDataURL(file);
                        }
                      }}
                      className="text-sm"
                    />
                    {editForm.photo && (
                      <div className="flex items-center gap-2">
                        <img src={editForm.photo} alt="Preview" className="w-10 h-12 object-cover rounded border border-gray-200" />
                        <Button type="button" variant="destructive" size="sm" onClick={() => handleEditChange("photo", "")}>Remove</Button>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Academic Info */}
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground pt-2">Academic Information</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label>Standard</Label>
                  <Select value={editForm.standard ?? ""} onValueChange={val => {
                    handleEditChange("standard", val);
                    const allowed = getBatchOptions(val);
                    if (!allowed.includes(editForm.batch ?? "")) {
                      handleEditChange("batch", "");
                      handleEditChange("course", "");
                    }
                  }}>
                    <SelectTrigger><SelectValue placeholder="Select Standard" /></SelectTrigger>
                    <SelectContent>
                      {STANDARDS.map(std => (
                        <SelectItem key={std} value={std}>{std}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label>Batch</Label>
                  <Select value={editForm.batch ?? ""} onValueChange={val => {
                    handleEditChange("batch", val);
                    handleEditChange("course", val); // Compatibility
                  }}>
                    <SelectTrigger><SelectValue placeholder="Select Batch" /></SelectTrigger>
                    <SelectContent>
                      {getBatchOptions(editForm.standard ?? "").map(b => (
                        <SelectItem key={b} value={b}>{b}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label>Branch</Label>
                  <Select value={editForm.branch ?? ""} onValueChange={val => handleEditChange("branch", val)}>
                    <SelectTrigger><SelectValue placeholder="Select Branch" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Main Branch">Main Branch</SelectItem>
                      <SelectItem value="SOF Branch">SOF Branch</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label>Hostel</Label>
                  <Select value={editForm.hostel ?? ""} onValueChange={val => handleEditChange("hostel", val)}>
                    <SelectTrigger><SelectValue placeholder="Select Hostel" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Yes">Yes</SelectItem>
                      <SelectItem value="No">No</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label htmlFor="edit-academic-year">Academic Year</Label>
                  <Input id="edit-academic-year" value={editForm.academic_year ?? ""} onChange={e => handleEditChange("academic_year", e.target.value)} placeholder="E.g. 2023-2024" />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="edit-admission-date">Date of Admission</Label>
                  <Input id="edit-admission-date" type="date" value={editForm.admission_date ?? ""} onChange={e => handleEditChange("admission_date", e.target.value)} />
                </div>
              </div>

              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground pt-2">Fees & Concession Details</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label htmlFor="edit-school-fee">School/College Fee (₹)</Label>
                  <Input id="edit-school-fee" type="number" min="0" value={editForm.school_fee ?? "0"} onChange={e => handleEditChange("school_fee", e.target.value)} placeholder="0.00" />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="edit-academy-fee">Academy Fee (₹)</Label>
                  <Input id="edit-academy-fee" type="number" min="0" value={editForm.academy_fee ?? "0"} onChange={e => handleEditChange("academy_fee", e.target.value)} placeholder="0.00" />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="edit-hostel-fee">Hostel Fee (₹)</Label>
                  <Input id="edit-hostel-fee" type="number" min="0" value={editForm.hostel_fee ?? "0"} onChange={e => handleEditChange("hostel_fee", e.target.value)} placeholder="0.00" />
                </div>
                <div className="space-y-1">
                  <Label>Scholarship / Concession Type</Label>
                  <Select value={editForm.scholarship_type ?? "None"} onValueChange={val => handleEditChange("scholarship_type", val)}>
                    <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="None">None</SelectItem>
                      <SelectItem value="Flat">Flat (₹)</SelectItem>
                      <SelectItem value="Percent">Percent (%)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label>Scholarship / Concession Value</Label>
                  <Input type="number" min="0" value={editForm.scholarship_value ?? "0"} onChange={e => handleEditChange("scholarship_value", e.target.value)} placeholder="0.00" />
                </div>
                <div className="space-y-1 sm:col-span-2">
                  <Label>Concession Applied To</Label>
                  <div className="flex flex-wrap gap-4 mt-1">
                    {[
                      { key: "school_fee", label: "School/College Fee" },
                      { key: "academy_fee", label: "Academy Fee" },
                      { key: "hostel_fee", label: "Hostel Fee" }
                    ].map(opt => {
                      return (
                        <label key={opt.key} className="flex items-center gap-2 cursor-pointer select-none">
                          <input
                            type="checkbox"
                            checked={editAppliedTo.includes(opt.key)}
                            onChange={() => {
                              const nextApplied = editAppliedTo.includes(opt.key)
                                ? editAppliedTo.filter(v => v !== opt.key)
                                : [...editAppliedTo, opt.key];
                              setEditAppliedTo(nextApplied);
                            }}
                            className="h-4 w-4 rounded border-gray-300 text-violet-600 focus:ring-violet-500"
                          />
                          <span className="text-sm text-gray-700">{opt.label}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
                
                {(() => {
                  const sFee = Number(editForm.school_fee || 0);
                  const aFee = Number(editForm.academy_fee || 0);
                  const hFee = Number(editForm.hostel_fee || 0);
                  const originalFee = sFee + aFee + hFee;

                  let baseFeeForConcession = 0;
                  if (editAppliedTo.includes("school_fee")) baseFeeForConcession += sFee;
                  if (editAppliedTo.includes("academy_fee")) baseFeeForConcession += aFee;
                  if (editAppliedTo.includes("hostel_fee")) baseFeeForConcession += hFee;

                  let calculatedAmount = 0;
                  const val = Number(editForm.scholarship_value || 0);
                  if (editForm.scholarship_type === "Percent") {
                    calculatedAmount = baseFeeForConcession * (val / 100);
                  } else if (editForm.scholarship_type === "Flat") {
                    calculatedAmount = val;
                  }
                  const finalPayable = Math.max(0, originalFee - calculatedAmount);

                  return (
                    <div className="p-3 rounded-lg bg-slate-100 border border-slate-200 sm:col-span-2 space-y-2">
                      <p className="font-semibold text-xs text-slate-700 uppercase tracking-wider">Recalculated Fee Preview</p>
                      <div className="grid grid-cols-3 gap-2 text-center text-xs">
                        <div className="bg-white rounded p-2 border">
                          <p className="text-muted-foreground">Original Fee</p>
                          <p className="font-bold text-slate-800">₹{originalFee.toLocaleString()}</p>
                        </div>
                        <div className="bg-white rounded p-2 border">
                          <p className="text-muted-foreground">Concession Amt</p>
                          <p className="font-bold text-amber-600">₹{calculatedAmount.toLocaleString()}</p>
                        </div>
                        <div className="bg-white rounded p-2 border">
                          <p className="text-muted-foreground">Net Payable</p>
                          <p className="font-bold text-emerald-600">₹{finalPayable.toLocaleString()}</p>
                        </div>
                      </div>
                    </div>
                  );
                })()}

                <div className="space-y-1 sm:col-span-2">
                  <Label>Admission In (Admission Type)</Label>
                  <div className="flex gap-4 mt-1">
                    {["School/College", "Academy", "Hostel"].map(opt => {
                      return (
                        <label key={opt} className="flex items-center gap-2 cursor-pointer select-none">
                          <input
                            type="checkbox"
                            checked={editAdmissionType.includes(opt)}
                            onChange={() => {
                              const nextAdmissionType = editAdmissionType.includes(opt)
                                ? editAdmissionType.filter(v => v !== opt)
                                : [...editAdmissionType, opt];
                              setEditAdmissionType(nextAdmissionType);
                            }}
                            className="h-4 w-4 rounded border-gray-300 text-violet-600 focus:ring-violet-500"
                          />
                          <span className="text-sm text-gray-700">{opt}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              </div>

            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveEdit} disabled={editSaving} className="bg-violet-600 hover:bg-violet-700">
              {editSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Update Fee Modal ─────────────────────────────── */}
      <Dialog open={feeModalOpen} onOpenChange={setFeeModalOpen}>
        <DialogContent className="md:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pencil className="h-5 w-5 text-blue-600" /> Update Total Fee
            </DialogTitle>
          </DialogHeader>

          {feeStudent && (
            <div className="space-y-4 py-2">
              <div className="flex items-center gap-3 p-3 rounded-lg bg-muted">
                <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold shrink-0">
                  {feeStudent.name.charAt(0)}
                </div>
                <div>
                  <p className="font-semibold text-sm">{feeStudent.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {feeStudent.standard && `${feeStudent.standard}`}
                    {feeStudent.course && ` · ${feeStudent.course}`}
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-1 gap-3">
                  <div className="space-y-1">
                    <Label htmlFor="school-fee">School/College Fee (₹)</Label>
                    <Input
                      id="school-fee"
                      type="number"
                      min="0"
                      value={newFee.school_fee}
                      onChange={e => setNewFee({ ...newFee, school_fee: Number(e.target.value) })}
                      placeholder="0.00"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor="academy-fee">Academy Fee (₹)</Label>
                    <Input
                      id="academy-fee"
                      type="number"
                      min="0"
                      value={newFee.academy_fee}
                      onChange={e => setNewFee({ ...newFee, academy_fee: Number(e.target.value) })}
                      placeholder="0.00"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor="hostel-fee">Hostel Fee (₹)</Label>
                    <Input
                      id="hostel-fee"
                      type="number"
                      min="0"
                      value={newFee.hostel_fee}
                      onChange={e => setNewFee({ ...newFee, hostel_fee: Number(e.target.value) })}
                      placeholder="0.00"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label>Scholarship / Concession Type</Label>
                    <Select value={newFee.scholarship_type} onValueChange={v => setNewFee({ ...newFee, scholarship_type: v })}>
                      <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="None">None</SelectItem>
                        <SelectItem value="Flat">Flat (₹)</SelectItem>
                        <SelectItem value="Percent">Percent (%)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1">
                    <Label>Scholarship / Concession Value</Label>
                    <Input
                      type="number"
                      min="0"
                      value={newFee.scholarship_value}
                      onChange={e => setNewFee({ ...newFee, scholarship_value: Number(e.target.value) })}
                      placeholder="0.00"
                    />
                  </div>
                </div>

                {(() => {
                  const originalFee = Number(newFee.school_fee) + Number(newFee.academy_fee) + Number(newFee.hostel_fee);
                  let calculatedAmount = 0;
                  const val = Number(newFee.scholarship_value || 0);
                  if (newFee.scholarship_type === "Percent") {
                    calculatedAmount = originalFee * (val / 100);
                  } else if (newFee.scholarship_type === "Flat") {
                    calculatedAmount = val;
                  }
                  const finalPayable = Math.max(0, originalFee - calculatedAmount);
                  return (
                    <div className="p-4 rounded-xl bg-slate-100 border border-slate-200 space-y-2">
                      <p className="font-semibold text-xs text-slate-700 uppercase tracking-wider">Fee breakdown</p>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div className="flex justify-between col-span-2">
                          <span className="text-muted-foreground">Original Fee:</span>
                          <span className="font-medium">₹{originalFee.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between col-span-2">
                          <span className="text-muted-foreground">Concession:</span>
                          <span className="font-medium text-amber-600">-₹{calculatedAmount.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between col-span-2 pt-2 border-t font-semibold">
                          <span className="text-slate-700">Net Payable:</span>
                          <span className="text-emerald-600">₹{finalPayable.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between col-span-2 text-xs text-muted-foreground pt-1 border-t border-dashed">
                          <span>Paid: ₹{Number(feeStudent.paid_fee).toLocaleString()}</span>
                          <span>Remaining Balance: ₹{Math.max(0, finalPayable - Number(feeStudent.paid_fee)).toLocaleString()}</span>
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setFeeModalOpen(false)}>Cancel</Button>
            <Button onClick={handleUpdateFee} disabled={feeSaving} className="bg-blue-600 hover:bg-blue-700">
              {feeSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Update Fee
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Pay Fee Modal ────────────────────────────────── */}
      <Dialog open={payModalOpen} onOpenChange={setPayModalOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <IndianRupee className="h-5 w-5 text-emerald-600" /> Record Payment
            </DialogTitle>
          </DialogHeader>

          {payStudent && (
            <div className="space-y-4 py-2">
              <div className="flex items-center gap-3 p-3 rounded-lg bg-muted">
                <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 font-bold shrink-0">
                  {payStudent.name.charAt(0)}
                </div>
                <div>
                  <p className="font-semibold text-sm">{payStudent.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {payStudent.standard && `${payStudent.standard}`}
                    {payStudent.course && ` · ${payStudent.course}`}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="rounded-lg border p-2">
                  <p className="text-xs text-muted-foreground">Total Fee</p>
                  <p className="font-bold text-sm">₹{Number(payStudent.fee).toLocaleString()}</p>
                </div>
                <div className="rounded-lg border p-2">
                  <p className="text-xs text-muted-foreground">Paid</p>
                  <p className="font-bold text-sm text-emerald-600">₹{Number(payStudent.paid_fee).toLocaleString()}</p>
                </div>
                <div className="rounded-lg border p-2">
                  <p className="text-xs text-muted-foreground">Balance</p>
                  <p className="font-bold text-sm text-red-500">
                    ₹{(Number(payStudent.fee) - Number(payStudent.paid_fee)).toLocaleString()}
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Payment Type</Label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setPayMode("add")}
                    className={`py-2 px-3 rounded-lg border text-sm font-medium transition-all ${payMode === "add"
                      ? "bg-emerald-600 text-white border-emerald-600"
                      : "border-border text-muted-foreground hover:border-emerald-400"
                      }`}
                  >
                    + Add Payment
                  </button>
                  <button
                    onClick={() => setPayMode("set")}
                    className={`py-2 px-3 rounded-lg border text-sm font-medium transition-all ${payMode === "set"
                      ? "bg-blue-600 text-white border-blue-600"
                      : "border-border text-muted-foreground hover:border-blue-400"
                      }`}
                  >
                    = Set Total Paid
                  </button>
                </div>
                <p className="text-xs text-muted-foreground px-1">
                  {payMode === "add"
                    ? "Adds this amount on top of the existing paid amount"
                    : "Sets the paid_fee column to exactly this value"}
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="pay-amount">
                  {payMode === "add" ? "Payment Amount (₹)" : "Set Paid Amount (₹)"}
                  <span className="text-destructive"> *</span>
                </Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-medium">₹</span>
                  <Input
                    id="pay-amount"
                    type="number"
                    min="0"
                    value={payAmount}
                    onChange={e => setPayAmount(e.target.value)}
                    placeholder={payMode === "add" ? "Amount being paid now" : "Total amount paid so far"}
                    className="pl-7"
                    autoFocus
                  />
                </div>

                {payAmount && !isNaN(parseFloat(payAmount)) && (
                  <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-3 space-y-1">
                    <p className="text-xs font-medium text-emerald-700">After this update:</p>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Paid will become</span>
                      <span className="font-bold text-emerald-700">
                        ₹{(payMode === "add"
                          ? Number(payStudent.paid_fee) + parseFloat(payAmount)
                          : parseFloat(payAmount)
                        ).toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Balance will be</span>
                      <span className="font-bold text-red-500">
                        ₹{Math.max(0,
                          Number(payStudent.fee) - (payMode === "add"
                            ? Number(payStudent.paid_fee) + parseFloat(payAmount)
                            : parseFloat(payAmount))
                        ).toLocaleString()}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setPayModalOpen(false)}>Cancel</Button>
            <Button onClick={handlePayFee} disabled={paySaving} className="bg-emerald-600 hover:bg-emerald-700">
              {paySaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Confirm Payment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
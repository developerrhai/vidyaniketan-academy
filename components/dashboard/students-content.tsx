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
import { GraduationCap, Search, Eye, Trash2, Phone, User, MapPin, BookOpen, Loader2, IndianRupee, Pencil, FileSpreadsheet, Upload, School } from "lucide-react"
import { studentsApi, studentsUniversalApi } from "@/lib/api"
import * as XLSX from "xlsx"

interface Student {
  id: number; name: string; phone: string; father_name: string; father_phone: string, gender: string; academic_year: string,
  standard: string; course: string; branch: string; fee: number; paid_fee: number, hostel: string, school_fee: number, academy_fee: number, hostel_fee: number
}

const feeStatus = (s: Student) => {
  const fee = Number(s.fee)
  const paid = Number(s.paid_fee)
  if (fee === 0) return { label: "No Fee", cls: "bg-gray-100 text-gray-500" }
  if (paid >= fee) return { label: "Paid", cls: "bg-emerald-100 text-emerald-700" }
  if (paid > 0) return { label: "Partial", cls: "bg-yellow-100 text-yellow-700" }
  return { label: "Pending", cls: "bg-red-100 text-red-700" }
}

export function StudentsContent() {
  const [students, setStudents] = useState<Student[]>([])
  const [loading, setLoading] = useState(true)
  const [importing, setImporting] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [filterStandard, setFilterStandard] = useState("all")
  const [filterCourse, setFilterCourse] = useState("all")
  const [filterBranch, setFilterBranch] = useState("all")
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  const [selected, setSelected] = useState<Student | null>(null)
  const [viewOpen, setViewOpen] = useState(false)

  const [feeStudent, setFeeStudent] = useState<Student | null>(null)
  const [feeModalOpen, setFeeModalOpen] = useState(false)
  const [newFee, setNewFee] = useState({
    academy_fee: 0,
    hostel_fee: 0,
    school_fee: 0,
    total_fee: 0
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
        course: filterCourse !== "all" ? filterCourse : undefined,
        branch: filterBranch !== "all" ? filterBranch : undefined,
        search: searchTerm || undefined,
      }
      try {
        const universal: any = await studentsUniversalApi.getAll(filters)
        setStudents(universal?.data || [])
      } catch {
        const primary: any = await studentsApi.getAll(filters)
        setStudents(primary?.data || [])
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [filterStandard, filterCourse, filterBranch, searchTerm])

  useEffect(() => { load() }, [load])

  const handleDelete = async (id: number) => {
    if (!confirm("Delete this student?")) return
    try {
      await studentsApi.remove(id)
      setStudents(prev => prev.filter(s => s.id !== id))
    } catch (err: any) { alert(err.message) }
  }

  const openFeeModal = (s: Student) => {
    setFeeStudent(s)
    setNewFee({
      academy_fee: Number(s?.academy_fee) || 0,
      hostel_fee: Number(s?.hostel_fee) || 0,
      school_fee: Number(s?.school_fee) || 0,
      total_fee: Number(s?.fee) || 0,
    })
    setFeeModalOpen(true)
  }

  const handleUpdateFee = async () => {
    if (!feeStudent) return
    if (isNaN(newFee.total_fee) || newFee.total_fee < 0) { alert("Enter a valid fee amount"); return }
    setFeeSaving(true)
    try {
      await studentsApi.update(feeStudent.id, {
        ...feeStudent,
        school_fee: newFee.school_fee,
        academy_fee: newFee.academy_fee,
        hostel_fee: newFee.hostel_fee,
        fee: newFee.total_fee
      })
      setStudents(prev => prev.map(s =>
        s.id === feeStudent.id ? { ...s, fee: newFee.total_fee } : s
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

    let newPaid: number
    if (payMode === "add") {
      newPaid = Number(payStudent.paid_fee) + val
    } else {
      newPaid = val
    }

    const totalFee = Number(payStudent.fee)
    if (totalFee > 0 && newPaid > totalFee) {
      alert(`Paid amount (₹${newPaid.toLocaleString()}) cannot exceed total fee (₹${totalFee.toLocaleString()})`)
      return
    }

    setPaySaving(true)
    try {
      await studentsApi.update(payStudent.id, {
        ...payStudent,
        paid_fee: newPaid,
      })
      setStudents(prev => prev.map(s =>
        s.id === payStudent.id ? { ...s, paid_fee: newPaid } : s
      ))
      setPayModalOpen(false)
    } catch (err: any) { alert(err.message) }
    finally { setPaySaving(false) }
  }

  const handleExportExcel = () => {
    if (!students.length) {
      alert("No students to export")
      return
    }

    const headers = [
      "ID", "Name", "Gender", "Academic Year",
      "Contact no.1", "Contact no.2",
      "Standard", "Course", "Branch", "Hostel",
      "Total Fee", "Paid Fee", "Balance", "Fee Status",
    ]

    const rows = students.map((s) => {
      const totalFee = Number(s.fee || 0)
      const paidFee = Number(s.paid_fee || 0)
      const balance = Math.max(totalFee - paidFee, 0)
      const status = feeStatus(s).label
      return [
        s.id, s.name || "", s.gender || "", s.academic_year || "",
        s.phone || "", s.father_phone || "",
        s.standard || "", s.course || "", s.branch || "", s.hostel || "",
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
          email: String(pickValue(row, ["email"])).trim(),
          phone: String(pickValue(row, ["phone", "contact_no_1", "student_phone", "mobile", "contact"])).trim(),
          father_phone: String(pickValue(row, ["father_phone", "contact_no_2", "parent_phone", "guardian_phone"])).trim(),
          standard: String(pickValue(row, ["standard", "std", "class"])).trim(),
          course: String(pickValue(row, ["course", "batch"])).trim(),
          branch: String(pickValue(row, ["branch"])).trim(),
          institute: String(pickValue(row, ["institute", "school", "college"])).trim(),
          fee: Number(pickValue(row, ["fee", "total_fee"])) || 0,
          paid_fee: Number(pickValue(row, ["paid_fee", "paid", "paidamount"])) || 0,
          gender: String(pickValue(row, ["gender"])).trim(),
          academic_year: String(pickValue(row, ["academic_year"])).trim(),
          hostel: String(pickValue(row, ["hostel"])).trim(),
        }
      }).filter(Boolean) as Array<Record<string, unknown>>

      if (!payloads.length) {
        alert("No valid student rows found. Add at least a Name column in the Excel sheet.")
        return
      }

      const results = await Promise.allSettled(payloads.map((payload) => studentsApi.create(payload)))
      const successCount = results.filter((r) => r.status === "fulfilled").length
      const failedCount = results.length - successCount
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
            <Select value={filterStandard} onValueChange={setFilterStandard}>
              <SelectTrigger><SelectValue placeholder="All Standards" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Standards</SelectItem>
                {Array.from({ length: 12 }, (_, i) => (
                  <SelectItem key={i + 1} value={String(i + 1)}>{i + 1}th Standard</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterCourse} onValueChange={setFilterCourse}>
              <SelectTrigger><SelectValue placeholder="All Courses" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Courses</SelectItem>
                <SelectItem value="JEE">JEE</SelectItem>
                <SelectItem value="NEET">NEET</SelectItem>
                <SelectItem value="Foundation">Foundation</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterBranch} onValueChange={setFilterBranch}>
              <SelectTrigger><SelectValue placeholder="All Branches" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Branches</SelectItem>
                <SelectItem value="branch 1">Branch 1</SelectItem>
                <SelectItem value="branch 2">Branch 2</SelectItem>
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
                    <TableHead className="text-white font-semibold hidden sm:table-cell">Gender</TableHead>
                    <TableHead className="text-white font-semibold hidden sm:table-cell">Academic Year</TableHead>
                    {/* Father Name column removed */}
                    <TableHead className="text-white font-semibold">Std</TableHead>
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
                        <TableCell className="hidden md:table-cell">{s.gender}</TableCell>
                        <TableCell className="hidden md:table-cell">{s.academic_year}</TableCell>
                        {/* father_name cell removed */}
                        <TableCell>{s.standard}</TableCell>
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
            <div className="space-y-3">
              {[
                { icon: User,   label: "Name",          value: selected.name },
                { icon: Phone,  label: "Contact no.1",  value: selected.phone },
                { icon: Phone,  label: "Contact no.2",  value: selected.father_phone },
                // Father Name removed
                { icon: MapPin, label: "Branch",        value: selected.branch },
                { icon: MapPin, label: "Gender",        value: selected.gender },
                { icon: MapPin, label: "Academic Year", value: selected.academic_year },
                { icon: MapPin, label: "Hostel",        value: selected.hostel },
              ].map(({ icon: Icon, label, value }) => (
                <div key={label} className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                  <Icon className="h-5 w-5 text-muted-foreground shrink-0" />
                  <div>
                    <p className="text-sm text-muted-foreground">{label}</p>
                    <p className="font-medium">{value}</p>
                  </div>
                </div>
              ))}

              <div className="p-3 bg-muted rounded-lg space-y-2">
                <p className="text-sm text-muted-foreground font-medium">Fee Summary</p>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="bg-background rounded-lg p-2">
                    <p className="text-xs text-muted-foreground">Total Fee</p>
                    <p className="font-bold text-sm">₹{Number(selected.fee).toLocaleString()}</p>
                  </div>
                  <div className="bg-background rounded-lg p-2">
                    <p className="text-xs text-muted-foreground">Paid</p>
                    <p className="font-bold text-sm text-emerald-600">₹{Number(selected.paid_fee).toLocaleString()}</p>
                  </div>
                  <div className="bg-background rounded-lg p-2">
                    <p className="text-xs text-muted-foreground">Balance</p>
                    <p className="font-bold text-sm text-red-500">
                      ₹{(Number(selected.fee) - Number(selected.paid_fee)).toLocaleString()}
                    </p>
                  </div>
                </div>
                <div className="w-full bg-muted-foreground/20 rounded-full h-2 mt-1">
                  <div
                    className="bg-emerald-500 h-2 rounded-full transition-all"
                    style={{ width: `${Math.min((Number(selected.paid_fee) / (Number(selected.fee) || 1)) * 100, 100)}%` }}
                  />
                </div>
                <p className="text-xs text-right text-muted-foreground">
                  {Number(selected.fee) > 0
                    ? `${Math.round((Number(selected.paid_fee) / Number(selected.fee)) * 100)}% paid`
                    : "No fee set"}
                </p>
              </div>
            </div>
          )}
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
                    {feeStudent.standard && `Std ${feeStudent.standard}`}
                    {feeStudent.course && ` · ${feeStudent.course}`}
                  </p>
                </div>
              </div>

              <div className="flex flex-row gap-4">
                <div className="flex flex-col gap-4">
                  <div className="space-y-2 flex flex-row gap-4">
                    <Label htmlFor="school-fee">School/College fee (₹)</Label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-medium">₹</span>
                      <Input
                        id="school-fee"
                        type="number"
                        min="0"
                        value={newFee.school_fee}
                        onChange={e => setNewFee({ ...newFee, total_fee: Number(newFee.academy_fee) + Number(newFee.hostel_fee) + Number(e.target.value), school_fee: Number(e.target.value) })}
                        placeholder="Enter school fee"
                        className="pl-7"
                        autoFocus
                      />
                    </div>
                  </div>

                  <div className="space-y-2 flex flex-row gap-4 justify-between">
                    <Label htmlFor="academy-fee">Academy fee (₹)</Label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-medium">₹</span>
                      <Input
                        id="academy-fee"
                        type="number"
                        min="0"
                        value={newFee.academy_fee}
                        onChange={e => setNewFee({ ...newFee, total_fee: Number(newFee.school_fee) + Number(newFee.hostel_fee) + Number(e.target.value), academy_fee: Number(e.target.value) })}
                        placeholder="Enter academy fee"
                        className="pl-7"
                      />
                    </div>
                  </div>

                  <div className="space-y-2 flex flex-row gap-4 justify-between">
                    <Label htmlFor="hostel-fee">Hostel Fee (₹)</Label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-medium">₹</span>
                      <Input
                        id="hostel-fee"
                        type="number"
                        min="0"
                        value={newFee.hostel_fee}
                        onChange={e => setNewFee({ ...newFee, total_fee: Number(newFee.school_fee) + Number(newFee.academy_fee) + Number(e.target.value), hostel_fee: Number(e.target.value) })}
                        placeholder="Enter hostel fee"
                        className="pl-7"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <p className="text-xl text-muted-foreground px-1">
                Total Fee:{" "}
                <span className="font-medium text-foreground">
                  ₹{`  `}{Math.max(0, Number(newFee.total_fee) - Number(feeStudent.paid_fee)).toLocaleString()}
                </span>
              </p>
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
                    {payStudent.standard && `Std ${payStudent.standard}`}
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
"use client"

import { useState, useEffect, useRef } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { GraduationCap, Search, Loader2, FileSpreadsheet, Upload } from "lucide-react"
import { studentsApi } from "@/lib/api"
import { Student, STANDARDS, ALL_BATCHES, BRANCHES } from "@/lib/student-types"
import { handleExportExcel, processImportExcel } from "@/lib/excel-utils"

import { StudentsTable } from "./students/StudentsTable"
import { ViewStudentModal } from "./students/ViewStudentModal"
import { EditStudentModal } from "./students/EditStudentModal"
import { UpdateFeeModal } from "./students/UpdateFeeModal"
import { PayFeeModal } from "./students/PayFeeModal"
import { ExportStudentModal } from "./students/ExportStudentModal"

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
  const [editOpen, setEditOpen] = useState(false)
  const [feeModalOpen, setFeeModalOpen] = useState(false)
  const [payModalOpen, setPayModalOpen] = useState(false)
  const [exportOpen, setExportOpen] = useState(false)

  const load = async () => {
    try {
      const res = await studentsApi.getAll() as { success: boolean; data: Student[] }
      setStudents(Array.isArray(res.data) ? res.data : [])
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const handleDelete = async (id: number) => {
    if (!confirm("Are you sure you want to delete this student?")) return
    try {
      await studentsApi.remove(id)
      setStudents(prev => prev.filter(s => s.id !== id))
    } catch (err: any) { alert(err.message) }
  }

  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    setImporting(true)
    try {
      const payloads = await processImportExcel(file)
      const results = await Promise.allSettled(payloads.map(payload => studentsApi.create(payload)))
      const successCount = results.filter(r => r.status === "fulfilled").length
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

  const filteredStudents = students.filter(s => {
    if (searchTerm) {
      const q = searchTerm.toLowerCase()
      if (!s.name?.toLowerCase().includes(q) && !s.phone?.includes(q)) return false
    }
    if (filterStandard !== "all" && s.standard !== filterStandard) return false
    if (filterBatch !== "all" && s.batch !== filterBatch) return false
    if (filterBranch !== "all" && s.branch !== filterBranch) return false
    return true
  })

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

            <Select key={`standard-${filterStandard}`} value={filterStandard} onValueChange={setFilterStandard}>
              <SelectTrigger><SelectValue placeholder="All Standards" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Standards</SelectItem>
                {STANDARDS.map(std => <SelectItem key={std} value={std}>{std}</SelectItem>)}
              </SelectContent>
            </Select>

            <Select key={`batch-${filterBatch}`} value={filterBatch} onValueChange={setFilterBatch}>
              <SelectTrigger><SelectValue placeholder="All Batches" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Batches</SelectItem>
                {ALL_BATCHES.map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}
              </SelectContent>
            </Select>

            <Select key={`branch-${filterBranch}`} value={filterBranch} onValueChange={setFilterBranch}>
              <SelectTrigger><SelectValue placeholder="All Branches" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Branches</SelectItem>
                {BRANCHES.map(branch => <SelectItem key={branch} value={branch}>{branch}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="flex justify-end mb-4">
            <div className="flex items-center gap-2">
              <input ref={fileInputRef} type="file" accept=".xlsx,.xls,.csv"
                onChange={handleImport} className="hidden" />
              <Button onClick={() => fileInputRef.current?.click()} variant="outline" disabled={importing}>
                {importing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Upload className="h-4 w-4 mr-2" />}
                Import Excel
              </Button>
              <Button onClick={() => setExportOpen(true)} variant="outline">
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
            <StudentsTable
              students={filteredStudents}
              onView={(s) => { setSelected(s); setViewOpen(true); }}
              onEdit={(s) => { setSelected(s); setEditOpen(true); }}
              onUpdateFee={(s) => { setSelected(s); setFeeModalOpen(true); }}
              onPayFee={(s) => { setSelected(s); setPayModalOpen(true); }}
              onDelete={handleDelete}
            />
          )}
        </CardContent>
      </Card>

      <ViewStudentModal
        open={viewOpen}
        onOpenChange={setViewOpen}
        selected={selected}
      />

      <EditStudentModal
        open={editOpen}
        onOpenChange={setEditOpen}
        student={selected}
        onSuccess={(updatedStudent) => {
          setStudents(prev => prev.map(s => s.id === updatedStudent.id ? updatedStudent : s))
        }}
      />

      <UpdateFeeModal
        open={feeModalOpen}
        onOpenChange={setFeeModalOpen}
        student={selected}
        onSuccess={(updatedStudent) => {
          setStudents(prev => prev.map(s => s.id === updatedStudent.id ? updatedStudent : s))
        }}
      />

      <PayFeeModal
        open={payModalOpen}
        onOpenChange={setPayModalOpen}
        student={selected}
        onSuccess={(updatedStudent) => {
          setStudents(prev => prev.map(s => s.id === updatedStudent.id ? updatedStudent : s))
        }}
      />

      <ExportStudentModal
        open={exportOpen}
        onOpenChange={setExportOpen}
        students={filteredStudents}
      />
    </div>
  )
}
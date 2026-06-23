"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Loader2, Search, FileSpreadsheet, Printer, DollarSign } from "lucide-react"
import { studentsApi } from "@/lib/api"

interface Student {
  id: number;
  name: string;
  phone: string;
  father_name: string;
  father_phone: string;
  standard: string;
  course: string;
  branch: string;
  fee: number;
  paid_fee: number;
  hostel: string;
  school_fee: number;
  academy_fee: number;
  hostel_fee: number;
  scholarship_type?: string;
  scholarship_value?: number;
  scholarship_amount?: number;
}

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
]

const BRANCHES = ["Main Branch", "SOF (School of Foundation)"]

export function FeeReportsContent() {
  const [students, setStudents] = useState<Student[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [filterStandard, setFilterStandard] = useState("all")
  const [filterCourse, setFilterCourse] = useState("all")
  const [filterBranch, setFilterBranch] = useState("all")

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res: any = await studentsApi.getAll({
        standard: filterStandard !== "all" ? filterStandard : undefined,
        course: filterCourse !== "all" ? filterCourse : undefined,
        branch: filterBranch !== "all" ? filterBranch : undefined,
        search: searchTerm.trim() || undefined
      })
      setStudents(res.data || [])
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [filterStandard, filterCourse, filterBranch, searchTerm])

  useEffect(() => {
    load()
  }, [load])

  // Summary stats
  const stats = students.reduce(
    (acc, curr) => {
      const school = Number(curr.school_fee || 0)
      const hostel = Number(curr.hostel_fee || 0)
      const scholarship = Number(curr.scholarship_amount || 0)
      const payable = Number(curr.fee || 0)
      const paid = Number(curr.paid_fee || 0)
      const outstanding = Math.max(0, payable - paid)

      acc.totalSchoolFee += school
      acc.totalHostelFee += hostel
      acc.totalScholarship += scholarship
      acc.netPayable += payable
      acc.totalCollected += paid
      acc.totalOutstanding += outstanding
      return acc
    },
    {
      totalSchoolFee: 0,
      totalHostelFee: 0,
      totalScholarship: 0,
      netPayable: 0,
      totalCollected: 0,
      totalOutstanding: 0
    }
  )

  const handleExportExcel = () => {
    if (!students.length) {
      alert("No data to export")
      return
    }

    const headers = [
      "Student ID",
      "Student Name",
      "Standard",
      "Course",
      "Branch",
      "Hostel",
      "School Fee (₹)",
      "Hostel Fee (₹)",
      "Original Fee (₹)",
      "Scholarship Amount (₹)",
      "Net Payable (₹)",
      "Paid Amount (₹)",
      "Outstanding Amount (₹)"
    ]

    const rows = students.map((s) => {
      const original = Number(s.school_fee || 0) + Number(s.academy_fee || 0) + Number(s.hostel_fee || 0)
      const outstanding = Math.max(0, Number(s.fee || 0) - Number(s.paid_fee || 0))
      return [
        s.id,
        s.name,
        s.standard || "",
        s.course || "",
        s.branch || "",
        s.hostel || "",
        Number(s.school_fee || 0),
        Number(s.hostel_fee || 0),
        original,
        Number(s.scholarship_amount || 0),
        Number(s.fee || 0),
        Number(s.paid_fee || 0),
        outstanding
      ]
    })

    const esc = (value: string | number) => `"${String(value).replace(/"/g, "\"\"")}"`
    const csv = [headers, ...rows].map((row) => row.map(esc).join(",")).join("\n")
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `fee_reports_${new Date().toISOString().slice(0, 10)}.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const handlePrintPDF = () => {
    const w = window.open("", "_blank")
    if (!w) return

    const tableRowsHtml = students.map((s) => {
      const original = Number(s.school_fee || 0) + Number(s.academy_fee || 0) + Number(s.hostel_fee || 0)
      const outstanding = Math.max(0, Number(s.fee || 0) - Number(s.paid_fee || 0))
      return `
        <tr>
          <td>${s.name}</td>
          <td>${s.standard}</td>
          <td style="text-align:right">₹ ${original.toLocaleString()}</td>
          <td style="text-align:right">-₹ ${Number(s.scholarship_amount || 0).toLocaleString()}</td>
          <td style="text-align:right">₹ ${Number(s.fee || 0).toLocaleString()}</td>
          <td style="text-align:right">₹ ${Number(s.paid_fee || 0).toLocaleString()}</td>
          <td style="text-align:right;color:#dc2626">₹ ${outstanding.toLocaleString()}</td>
        </tr>
      `
    }).join("")

    w.document.write(`
      <html>
      <head>
        <title>Fee Reports - Vidyaaniketan Professional Academy</title>
        <style>
          @page { size: A4 landscape; margin: 15mm; }
          body { font-family: 'Segoe UI', system-ui, sans-serif; color: #333; margin: 0; padding: 20px; }
          .header { text-align: center; border-bottom: 2px solid #0d9488; padding-bottom: 10px; margin-bottom: 20px; }
          .header h1 { margin: 0; font-size: 24px; color: #0d9488; }
          .header p { margin: 4px 0; font-size: 14px; color: #64748b; }
          .stats-grid { display: grid; grid-template-columns: repeat(6, 1fr); gap: 10px; margin-bottom: 25px; }
          .stat-card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 10px; text-align: center; }
          .stat-card .label { font-size: 10px; color: #64748b; text-transform: uppercase; font-weight: 600; }
          .stat-card .value { font-size: 16px; font-weight: 700; color: #0f172a; margin-top: 4px; }
          table { width: 100%; border-collapse: collapse; margin-top: 15px; font-size: 12px; }
          th { background: #f1f5f9; color: #475569; font-weight: 700; padding: 8px; border: 1px solid #cbd5e1; text-align: left; }
          td { padding: 8px; border: 1px solid #cbd5e1; }
          tr:nth-child(even) { background: #f8fafc; }
          .no-print-bar { text-align: right; margin-bottom: 15px; }
          .btn-print { background: #0d9488; color: white; border: none; padding: 8px 16px; border-radius: 4px; font-weight: 600; cursor: pointer; }
          @media print {
            .no-print-bar { display: none; }
            body { padding: 0; }
          }
        </style>
      </head>
      <body>
        <div class="no-print-bar">
          <button class="btn-print" onclick="window.print()">Print / Save as PDF</button>
        </div>
        <div class="header">
          <h1>Vidyaaniketan Professional Academy</h1>
          <p>Fee Reports Dashboard Summary | Date: ${new Date().toLocaleDateString("en-IN")}</p>
        </div>
        <div class="stats-grid">
          <div class="stat-card"><div class="label">Total School Fee</div><div class="value">₹${stats.totalSchoolFee.toLocaleString()}</div></div>
          <div class="stat-card"><div class="label">Total Hostel Fee</div><div class="value">₹${stats.totalHostelFee.toLocaleString()}</div></div>
          <div class="stat-card"><div class="label">Scholarships Given</div><div class="value">₹${stats.totalScholarship.toLocaleString()}</div></div>
          <div class="stat-card"><div class="label">Net Payable</div><div class="value">₹${stats.netPayable.toLocaleString()}</div></div>
          <div class="stat-card"><div class="label">Amount Collected</div><div class="value" style="color:#16a34a">₹${stats.totalCollected.toLocaleString()}</div></div>
          <div class="stat-card"><div class="label">Outstanding</div><div class="value" style="color:#dc2626">₹${stats.totalOutstanding.toLocaleString()}</div></div>
        </div>
        <table>
          <thead>
            <tr>
              <th>Student Name</th>
              <th>Standard</th>
              <th style="text-align:right">Original Fee</th>
              <th style="text-align:right">Scholarship/Concession</th>
              <th style="text-align:right">Net Payable</th>
              <th style="text-align:right">Amount Paid</th>
              <th style="text-align:right">Outstanding</th>
            </tr>
          </thead>
          <tbody>
            ${tableRowsHtml}
          </tbody>
        </table>
      </body>
      </html>
    `)
    w.document.close()
  }

  return (
    <div className="space-y-6 pt-12 lg:pt-0">
      
      {/* Summary Analytics Panel */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {[
          { label: "Total School Fee", value: stats.totalSchoolFee, cls: "from-sky-500 to-sky-600" },
          { label: "Total Hostel Fee", value: stats.totalHostelFee, cls: "from-indigo-500 to-indigo-600" },
          { label: "Total Scholarship", value: stats.totalScholarship, cls: "from-amber-500 to-amber-600" },
          { label: "Net Payable", value: stats.netPayable, cls: "from-blue-500 to-blue-600" },
          { label: "Total Collected", value: stats.totalCollected, cls: "from-emerald-500 to-emerald-600" },
          { label: "Outstanding", value: stats.totalOutstanding, cls: "from-rose-500 to-rose-600" }
        ].map((item) => (
          <Card key={item.label} className={`bg-gradient-to-br ${item.cls} text-white border-0 shadow-md`}>
            <CardContent className="p-3">
              <p className="text-[11px] uppercase tracking-wider font-semibold opacity-95">{item.label}</p>
              <p className="text-lg font-bold mt-1">₹{item.value.toLocaleString()}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="shadow-lg border">
        <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b">
          <CardTitle className="text-xl md:text-2xl font-bold flex items-center gap-2 text-slate-800">
            <DollarSign className="h-6 w-6 text-teal-600" /> Fee Reports & Analytics
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          {/* Filters */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by student name…"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            <Select value={filterStandard} onValueChange={setFilterStandard}>
              <SelectTrigger><SelectValue placeholder="All Standards" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Standards</SelectItem>
                {STANDARDS.map((std) => (
                  <SelectItem key={std} value={std}>{std}</SelectItem>
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
                {BRANCHES.map((b) => (
                  <SelectItem key={b} value={b}>{b}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex justify-end gap-2 mb-4">
            <Button onClick={handleExportExcel} variant="outline" size="sm">
              <FileSpreadsheet className="h-4 w-4 mr-2" /> Export Excel
            </Button>
            <Button onClick={handlePrintPDF} variant="outline" size="sm">
              <Printer className="h-4 w-4 mr-2" /> Print PDF
            </Button>
          </div>

          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <div className="rounded-lg border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-900 hover:bg-slate-900">
                    <TableHead className="text-white font-semibold">Student Name</TableHead>
                    <TableHead className="text-white font-semibold">Std</TableHead>
                    <TableHead className="text-white font-semibold hidden md:table-cell">Branch</TableHead>
                    <TableHead className="text-white font-semibold">Original Fee</TableHead>
                    <TableHead className="text-white font-semibold text-amber-500">Scholarship / Concession</TableHead>
                    <TableHead className="text-white font-semibold">Net Payable</TableHead>
                    <TableHead className="text-white font-semibold text-emerald-500">Paid Amount</TableHead>
                    <TableHead className="text-white font-semibold text-rose-500">Outstanding</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {students.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                        No report records found
                      </TableCell>
                    </TableRow>
                  ) : (
                    students.map((s) => {
                      const originalFee = Number(s.school_fee || 0) + Number(s.academy_fee || 0) + Number(s.hostel_fee || 0)
                      const scholarshipAmt = Number(s.scholarship_amount || 0)
                      const payable = Number(s.fee || 0)
                      const paid = Number(s.paid_fee || 0)
                      const outstanding = Math.max(0, payable - paid)
                      return (
                        <TableRow key={s.id} className="hover:bg-muted/50">
                          <TableCell className="font-semibold">{s.name}</TableCell>
                          <TableCell>{s.standard}</TableCell>
                          <TableCell className="hidden md:table-cell">{s.branch}</TableCell>
                          <TableCell className="font-medium">₹{originalFee.toLocaleString()}</TableCell>
                          <TableCell className="text-amber-600 font-medium">
                            {scholarshipAmt > 0 ? (
                              `-₹${scholarshipAmt.toLocaleString()} (${s.scholarship_type === "Percent" ? `${s.scholarship_value}%` : "Flat"})`
                            ) : (
                              "—"
                            )}
                          </TableCell>
                          <TableCell className="font-semibold text-slate-800">₹{payable.toLocaleString()}</TableCell>
                          <TableCell className="text-emerald-600 font-semibold">₹{paid.toLocaleString()}</TableCell>
                          <TableCell className="text-rose-600 font-bold">₹{outstanding.toLocaleString()}</TableCell>
                        </TableRow>
                      )
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

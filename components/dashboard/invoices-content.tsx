"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Receipt, Plus, Eye, Printer, Trash2, CheckCircle, Clock, AlertCircle, Loader2, Search, X, Edit2, FileSpreadsheet, MessageCircle, Download } from "lucide-react"
import { invoicesApi, studentsApi } from "@/lib/api"
import logo from "../../public/logo.jpeg";

interface Invoice {
  id: number
  student_name: string
  amount: number
  paid_amount: number
  due_date?: string
  course?: string
  student_id?: string
  standard?: string
  install_date?: string
  description?: string
  transaction_type?: string
  student_phone?: string | number
  student_fee?: number
  student_paid_fee?: number
  student_school_fee?: number
  student_academy_fee?: number
  student_hostel_fee?: number
  student_scholarship_type?: string
  student_scholarship_value?: number
  student_scholarship_amount?: number
  student_standard?: string
  student_batch?: string
  student_branch?: string
}

interface Student {
  id: number
  name: string
  phone: string
  standard: string
  course: string
  location: string
  fee: number
  paid_fee: number
  father_name: string
  scholarship_type?: string
  scholarship_value?: number
  scholarship_amount?: number
  school_fee?: number
  academy_fee?: number
  hostel_fee?: number
}

interface Summary { total_invoiced: number; total_paid: number; total_pending: number }

type InvoiceStatus = "Paid" | "Partial" | "Pending" | "Overdue"

const getStatus = (inv: Invoice): InvoiceStatus => {
  const amount = Number(inv.amount)
  const paid   = Number(inv.paid_amount)
  if (paid >= amount) return "Paid"
  if (paid > 0)       return "Partial"
  if (inv.due_date && new Date(inv.due_date) < new Date()) return "Overdue"
  return "Pending"
}

const statusColor = (s: string) => ({
  Paid:    "bg-emerald-100 text-emerald-700",
  Partial: "bg-yellow-100 text-yellow-700",
  Pending: "bg-blue-100 text-blue-700",
  Overdue: "bg-red-100 text-red-700",
}[s] ?? "bg-gray-100 text-gray-700")

const statusIcon = (s: string) => ({
  Paid:    <CheckCircle className="h-4 w-4" />,
  Partial: <Clock className="h-4 w-4" />,
  Pending: <Clock className="h-4 w-4" />,
  Overdue: <AlertCircle className="h-4 w-4" />,
}[s] ?? null)

const fmtDate = (d?: string) => d ? new Date(d).toLocaleDateString() : "—"

const STANDARDS = [
  "1st Standard", "2nd Standard", "3rd Standard", "4th Standard", "5th Standard",
  "6th Standard", "7th Standard", "8th Standard", "9th Standard", "10th Standard",
  "11th Standard", "12th Standard"
]

const BRANCHES = ["Main Branch", "SOF Branch"]

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

export function InvoicesContent() {
  const [invoices,     setInvoices]     = useState<Invoice[]>([])
  const [summary,      setSummary]      = useState<Summary>({ total_invoiced: 0, total_paid: 0, total_pending: 0 })
  const [loading,      setLoading]      = useState(true)
  const [saving,       setSaving]       = useState(false)
  const [filterStatus, setFilterStatus] = useState("all")
  const [studentFilter, setStudentFilter] = useState("")
  const [filterStandard, setFilterStandard] = useState("all")
  const [filterBatch,    setFilterBatch]    = useState("all")
  const [filterBranch,   setFilterBranch]   = useState("all")
  const [modalOpen,    setModalOpen]    = useState(false)
  const [viewOpen,     setViewOpen]     = useState(false)
  const [selected,     setSelected]     = useState<Invoice | null>(null)
  const [editing,      setEditing]      = useState<Invoice | null>(null)

  const [students,        setStudents]        = useState<Student[]>([])
  const [studentSearch,   setStudentSearch]   = useState("")
  const [showDropdown,    setShowDropdown]    = useState(false)
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null)
  const [studentsLoading, setStudentsLoading] = useState(false)

  const [form, setForm] = useState({
    student_name:     "",
    amount:           "",
    paid_amount:      "",
    due_date:         "",
    install_date:     "",
    transaction_type: "Cash",
    description:      "",
    student_id:       "",
    scholarship_type: "None",
    scholarship_value: "0",
    scholarship_amount: "0",
  })

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [invRes, sumRes]: any[] = await Promise.all([
        invoicesApi.getAll({ status: filterStatus !== "all" ? filterStatus : undefined }),
        invoicesApi.summary(),
      ])
      setInvoices(invRes.data)
      setSummary(sumRes.data)
    } catch (err) { console.error(err) }
    finally { setLoading(false) }
  }, [filterStatus])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    if (!studentSearch.trim() || studentSearch.length < 1) {
      setStudents([])
      setShowDropdown(false)
      return
    }
    const timer = setTimeout(async () => {
      setStudentsLoading(true)
      try {
        const res: any = await studentsApi.getAll({ search: studentSearch })
        setStudents(res.data || [])
        setShowDropdown(true)
      } catch {
        setStudents([])
      } finally {
        setStudentsLoading(false)
      }
    }, 300)
    return () => clearTimeout(timer)
  }, [studentSearch])

 const pickStudent = (s: Student) => {
  setSelectedStudent(s)
  setStudentSearch(s.name)
  setShowDropdown(false)
  const remaining = Number(s.fee) - Number(s.paid_fee)
  setForm(prev => ({
    ...prev,
    student_name: s.name,
    student_id:   String(s.id),
    amount:       remaining > 0 ? String(remaining) : String(s.fee),
    paid_amount:  String(s.paid_fee),   // ← was "0", now uses student's paid_fee
    description:  `Tuition Fee – ${s.course || s.standard + "th Std"}`,
    scholarship_type: s.scholarship_type || "None",
    scholarship_value: String(s.scholarship_value || 0),
    scholarship_amount: String(s.scholarship_amount || 0),
  }))
}

  const clearStudent = () => {
    setSelectedStudent(null)
    setStudentSearch("")
    setStudents([])
    setShowDropdown(false)
    setForm(prev => ({
      ...prev,
      student_name: "", student_id: "", amount: "",
      paid_amount: "", description: "",
      scholarship_type: "None",
      scholarship_value: "0",
      scholarship_amount: "0",
    }))
  }

  const openModal = () => {
    setEditing(null)
    clearStudent()
    setForm({
      student_name: "", amount: "", paid_amount: "",
      due_date: "", install_date: "", transaction_type: "Cash",
      description: "", student_id: "",
      scholarship_type: "None",
      scholarship_value: "0",
      scholarship_amount: "0",
    })
    setModalOpen(true)
  }

  const handleScholarshipChange = (key: string, val: string) => {
    setForm(prev => {
      const next = { ...prev, [key]: val }
      if (!selectedStudent) return next

      const originalFee = (Number(selectedStudent.school_fee || 0) + Number(selectedStudent.academy_fee || 0) + Number(selectedStudent.hostel_fee || 0)) || (Number(selectedStudent.fee || 0) + Number(selectedStudent.scholarship_amount || 0))
      if (originalFee === 0) return next

      const sType = next.scholarship_type
      const sVal = Number(next.scholarship_value || 0)

      let calcAmt = 0
      if (sType === "Percent") {
        calcAmt = originalFee * (sVal / 100)
      } else if (sType === "Flat") {
        calcAmt = sVal
      }

      const finalPayable = Math.max(0, originalFee - calcAmt)
      const newRemaining = Math.max(0, finalPayable - Number(selectedStudent.paid_fee || 0))

      setSelectedStudent(curr => {
        if (!curr) return null
        return {
          ...curr,
          scholarship_type: sType,
          scholarship_value: sVal,
          scholarship_amount: calcAmt,
          fee: finalPayable,
        }
      })

      return {
        ...next,
        scholarship_amount: String(calcAmt),
        amount: String(newRemaining > 0 ? newRemaining : finalPayable),
      }
    })
  }

  const handleSave = async () => {
    if (!form.student_name || !form.amount || !form.due_date) {
      alert("Fill required fields"); return
    }
    setSaving(true)
    try {
      const payload = {
        student_name:     form.student_name,
        student_id:       form.student_id || undefined,
        amount:           parseFloat(form.amount),
        paid_amount:      parseFloat(form.paid_amount) || 0,
        due_date:         form.due_date,
        install_date:     form.install_date || undefined,
        transaction_type: form.transaction_type,
        description:      form.description,
      }

      if (editing) {
        await invoicesApi.update(editing.id, payload)

        if (form.student_id) {
          const oldPaid = Number(editing.paid_amount) || 0
          const newPaid = parseFloat(form.paid_amount) || 0
          const diff    = newPaid - oldPaid

          const stuRes: any = await studentsApi.getOne(form.student_id)
          const stu: Student = stuRes.data
          if (stu) {
            const updatedPaidFee = Math.max(0, Number(stu.paid_fee) + diff)
            
            // Calculate new fee and scholarship
            const sType = form.scholarship_type
            const sVal = Number(form.scholarship_value || 0)
            const originalFee = (Number(stu.school_fee || 0) + Number(stu.academy_fee || 0) + Number(stu.hostel_fee || 0)) || (Number(stu.fee || 0) + Number(stu.scholarship_amount || 0))
            
            let calcAmt = 0
            if (sType === "Percent") {
              calcAmt = originalFee * (sVal / 100)
            } else if (sType === "Flat") {
              calcAmt = sVal
            }
            const finalPayable = Math.max(0, originalFee - calcAmt)

            await studentsApi.update(Number(form.student_id), {
              ...stu,
              paid_fee: updatedPaidFee,
              fee: finalPayable,
              scholarship_type: sType,
              scholarship_value: sVal,
              scholarship_amount: calcAmt,
            })
          }
        }

      } else {
        await invoicesApi.create(payload)

        if (form.student_id) {
          const paidNow = parseFloat(form.paid_amount) || 0
          const stuRes: any = await studentsApi.getOne(form.student_id)
          const stu: Student = stuRes.data
          if (stu) {
            const updatedPaidFee = Number(stu.paid_fee) + paidNow
            
            // Calculate new fee and scholarship
            const sType = form.scholarship_type
            const sVal = Number(form.scholarship_value || 0)
            const originalFee = (Number(stu.school_fee || 0) + Number(stu.academy_fee || 0) + Number(stu.hostel_fee || 0)) || (Number(stu.fee || 0) + Number(stu.scholarship_amount || 0))
            
            let calcAmt = 0
            if (sType === "Percent") {
              calcAmt = originalFee * (sVal / 100)
            } else if (sType === "Flat") {
              calcAmt = sVal
            }
            const finalPayable = Math.max(0, originalFee - calcAmt)

            await studentsApi.update(Number(form.student_id), {
              ...stu,
              paid_fee: updatedPaidFee,
              fee: finalPayable,
              scholarship_type: sType,
              scholarship_value: sVal,
              scholarship_amount: calcAmt,
            })
          }
        }
      }

      setModalOpen(false)
      setEditing(null)
      load()
    } catch (err: any) { alert(err.message) }
    finally { setSaving(false) }
  }

  const openEdit = (inv: Invoice) => {
    setEditing(inv)
    setSelectedStudent({
      id: Number(inv.student_id || 0),
      name: inv.student_name || "",
      phone: String(inv.student_phone || ""),
      standard: inv.standard || "",
      course: inv.course || "",
      location: "",
      fee: inv.student_fee !== undefined ? Number(inv.student_fee) : Number(inv.amount || 0),
      paid_fee: inv.student_paid_fee !== undefined ? Number(inv.student_paid_fee) : Number(inv.paid_amount || 0),
      father_name: "",
      scholarship_type: inv.student_scholarship_type,
      scholarship_value: inv.student_scholarship_value !== undefined ? Number(inv.student_scholarship_value) : undefined,
      scholarship_amount: inv.student_scholarship_amount !== undefined ? Number(inv.student_scholarship_amount) : undefined,
      school_fee: inv.student_school_fee !== undefined ? Number(inv.student_school_fee) : undefined,
      academy_fee: inv.student_academy_fee !== undefined ? Number(inv.student_academy_fee) : undefined,
      hostel_fee: inv.student_hostel_fee !== undefined ? Number(inv.student_hostel_fee) : undefined,
    })
    setStudentSearch(inv.student_name || "")
    setShowDropdown(false)
    setForm({
      student_name: inv.student_name || "",
      student_id: inv.student_id || "",
      amount: String(inv.amount ?? ""),
      paid_amount: String(inv.paid_amount ?? 0),
      due_date: inv.due_date ? new Date(inv.due_date).toISOString().split("T")[0] : "",
      install_date: inv.install_date ? new Date(inv.install_date).toISOString().split("T")[0] : "",
      transaction_type: inv.transaction_type || "Cash",
      description: inv.description || "",
      scholarship_type: inv.student_scholarship_type || "None",
      scholarship_value: String(inv.student_scholarship_value || 0),
      scholarship_amount: String(inv.student_scholarship_amount || 0),
    })
    setModalOpen(true)
  }

  const handleExportExcel = () => {
    if (!filteredInvoices.length) {
      alert("No invoices to export")
      return
    }

    const headers = [
      "Invoice ID",
      "Student Name",
      "Student ID",
      "Standard",
      "Batch",
      "Branch",
      "Amount",
      "Paid Amount",
      "Balance",
      "Install Date",
      "Next Installment Date",
      "Transaction Type",
      "Status",
      "Description",
    ]

    const rows = filteredInvoices.map((inv) => {
      const amount = Number(inv.amount || 0)
      const paid = Number(inv.paid_amount || 0)
      const balance = amount - paid
      return [
        `INV${String(inv.id).padStart(3, "0")}`,
        inv.student_name || "",
        inv.student_id || "",
        inv.student_standard || inv.standard || "",
        inv.student_batch || inv.course || "",
        inv.student_branch || "",
        amount,
        paid,
        balance,
        inv.install_date ? new Date(inv.install_date).toLocaleDateString("en-CA") : "",
        inv.due_date ? new Date(inv.due_date).toLocaleDateString("en-CA") : "",
        inv.transaction_type || "",
        getStatus(inv),
        inv.description || "",
      ]
    })

    const esc = (value: string | number) => `"${String(value).replace(/"/g, "\"\"")}"`
    const csv = [headers, ...rows].map((row) => row.map(esc).join(",")).join("\n")
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `invoices_${new Date().toISOString().slice(0, 10)}.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const handleDelete = async (id: number) => {
    if (!confirm("Delete this invoice?")) return
    try { await invoicesApi.remove(id); load() } catch (err: any) { alert(err.message) }
  }

  const handlePrint = (inv: Invoice) => {
    const w = window.open("", "_blank")
    if (!w) return
    const balance = Number(inv.amount) - Number(inv.paid_amount)
    w.document.write(
      `
      <html>
<head>
<title>Receipt #${inv.id}</title>

<style>

@page{
  size:A4;
  margin:25mm;
}

body{
  font-family: Arial, Helvetica, sans-serif;
  color:#333;
  margin:0;
}

.container{
  width:100%;
}

.header{
  display:flex;
  justify-content:space-between;
  align-items:flex-start;
}

.institute{
  line-height:1.4;
}

.institute h2{
  margin:0;
  font-size:20px;
  letter-spacing:0.5px;
}

.institute p{
  margin:2px 0;
  font-size:13px;
}

.logo{
  width:70px;
}

.title{
  text-align:center;
  font-size:22px;
  color:#1f7fa6;
  font-weight:bold;
  margin-top:15px;
  padding-top:10px;
  border-top:2px solid #1f7fa6;
}

.content{
  display:flex;
  justify-content:space-between;
  margin-top:25px;
}

.left{
  width:48%;
}

.right{
  width:48%;
}

.label{
  font-weight:bold;
  margin-top:10px;
}

.text{
  margin-top:4px;
}

.receipt-details{
  text-align:right;
  font-size:14px;
  margin-bottom:15px;
}

.table{
  width:100%;
  border-collapse:collapse;
}

.table td{
  padding:6px 0;
  font-size:14px;
}

.table td:last-child{
  text-align:right;
  font-weight:bold;
}

.balance{
  border-top:1px solid #999;
  padding-top:6px;
}

.signature{
  margin-top:70px;
  text-align:right;
}

.signature img{
  height:40px;
}

.auth{
  font-weight:bold;
  margin-top:6px;
}

</style>

</head>

<body>

<div class="container">

<div class="header">

<div class="institute">
<h2>Vidyaaniketan Professional Academy</h2>
<p>Arun Galaxy, Shreeram Chouk, Indapur, Maharashtra 413106</p>
<p>Phone no : 8180802049</p>

<p>State: Maharashtra</p>
</div>

<img class="logo" src="${window.location.origin}/logo.jpeg"/>

</div>

<div class="title">Payment Receipt</div>

<div class="content">

<div class="left">

<div class="label">Received From</div>
<div class="text">${inv.student_name}</div>

<div class="text">Contact No : ${inv.student_phone || "-"}</div>
<div class="text">Standard : ${inv.student_standard || inv.standard || "-"}</div>
<div class="text">Batch : ${inv.student_batch || inv.course || "-"}</div>
<div class="text">Branch : ${inv.student_branch || "-"}</div>

<div class="label">Amount in words</div>
<div class="text">${Number(inv.paid_amount).toLocaleString()} Rupees only</div>

</div>

<div class="right">

<div class="receipt-details">
<div><b>Receipt Details</b></div>

<div>Receipt No : ${inv.id}</div>
<div><b>Date :</b> ${fmtDate(inv.install_date)}</div>
</div>

<table class="table">

${(Number(inv.student_school_fee || 0) + Number(inv.student_academy_fee || 0) + Number(inv.student_hostel_fee || 0)) > 0 ? `
<tr>
<td>Original Fee</td>
<td>₹ ${(Number(inv.student_school_fee || 0) + Number(inv.student_academy_fee || 0) + Number(inv.student_hostel_fee || 0)).toLocaleString()}</td>
</tr>
` : ''}

${Number(inv.student_scholarship_amount || 0) > 0 ? `
<tr>
<td>Scholarship / Concession</td>
<td>-₹ ${Number(inv.student_scholarship_amount).toLocaleString()}</td>
</tr>
` : ''}

<tr>
<td>Total Payable</td>
<td>₹ ${Number(inv.amount).toLocaleString()}</td>
</tr>

<tr>
<td>Received</td>
<td>₹ ${Number(inv.paid_amount).toLocaleString()}</td>
</tr>

<tr>
<td>Payment Mode</td>
<td>${inv.transaction_type || "Online"}</td>
</tr>

<tr class="balance">
<td>Outstanding Balance</td>
<td>₹ ${balance.toLocaleString()}</td>
</tr>

</table>

</div>

</div>

<div class="signature">

<div>For : Vidyaaniketan Professional Academy</div>

<img src="SIGNATURE_IMAGE_URL"/>

<div class="auth">Authorized Signatory</div>

</div>

</div>

</body>
</html>
`
    )
    w.document.close()
    w.print()
  }

  const handleDownloadInvoice = (inv: Invoice) => {
    const balance = Number(inv.amount) - Number(inv.paid_amount)
    const invoiceNo = `INV${String(inv.id).padStart(3, "0")}`
    const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Receipt - ${invoiceNo}</title>
  <style>
    @page {
      size: A4;
      margin: 20mm;
    }
    body {
      font-family: 'Segoe UI', system-ui, -apple-system, sans-serif;
      color: #1e293b;
      margin: 0;
      background: #f8fafc;
      padding: 40px 20px;
    }
    .no-print-bar {
      max-width: 800px;
      margin: 0 auto 20px auto;
      display: flex;
      justify-content: space-between;
      align-items: center;
      background: #ffffff;
      padding: 12px 24px;
      border-radius: 8px;
      box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px -1px rgba(0, 0, 0, 0.1);
      border: 1px solid #e2e8f0;
    }
    .btn-download {
      background: #0d9488;
      color: white;
      border: none;
      padding: 10px 20px;
      border-radius: 6px;
      font-weight: 600;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 8px;
      font-size: 14px;
      transition: background 0.2s;
    }
    .btn-download:hover {
      background: #0f766e;
    }
    .receipt-container {
      max-width: 800px;
      margin: 0 auto;
      background: white;
      padding: 40px;
      border-radius: 12px;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1);
      border: 1px solid #e2e8f0;
      position: relative;
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      border-bottom: 2px solid #e2e8f0;
      padding-bottom: 20px;
    }
    .institute h2 {
      margin: 0;
      font-size: 24px;
      color: #0f172a;
      font-weight: 800;
    }
    .institute p {
      margin: 4px 0;
      font-size: 14px;
      color: #475569;
    }
    .logo {
      width: 80px;
      height: 80px;
      object-fit: cover;
      border-radius: 8px;
    }
    .title {
      text-align: center;
      font-size: 22px;
      color: #0d9488;
      font-weight: 800;
      margin: 30px 0;
      text-transform: uppercase;
      letter-spacing: 1.5px;
    }
    .content {
      display: flex;
      justify-content: space-between;
      margin-top: 25px;
      gap: 40px;
    }
    .left, .right {
      width: 50%;
    }
    .label {
      font-weight: 700;
      font-size: 11px;
      text-transform: uppercase;
      color: #64748b;
      margin-top: 20px;
      letter-spacing: 0.5px;
    }
    .text {
      margin-top: 4px;
      font-size: 15px;
      color: #0f172a;
    }
    .receipt-details {
      text-align: right;
      font-size: 14px;
      margin-bottom: 20px;
      color: #334155;
      line-height: 1.6;
    }
    .table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 10px;
    }
    .table td {
      padding: 10px 0;
      font-size: 15px;
      border-bottom: 1px solid #f1f5f9;
      color: #334155;
    }
    .table tr:last-child td {
      border-bottom: none;
    }
    .table td:last-child {
      text-align: right;
      font-weight: 700;
      color: #0f172a;
    }
    .balance-row td {
      border-top: 2px solid #e2e8f0;
      padding-top: 12px;
      font-weight: 700;
    }
    .balance-row td:last-child {
      color: #0d9488;
      font-size: 18px;
    }
    .signature {
      margin-top: 80px;
      text-align: right;
      display: flex;
      flex-direction: column;
      align-items: flex-end;
    }
    .signature-title {
      font-size: 14px;
      color: #475569;
      margin-bottom: 40px;
    }
    .auth {
      font-weight: 700;
      font-size: 14px;
      color: #0f172a;
      border-top: 1px solid #cbd5e1;
      padding-top: 6px;
      width: 200px;
      text-align: center;
    }
    @media print {
      body {
        background: white;
        padding: 0;
      }
      .no-print-bar {
        display: none;
      }
      .receipt-container {
        border: none;
        box-shadow: none;
        padding: 0;
      }
    }
  </style>
</head>
<body>
  <div class="no-print-bar">
    <div style="font-size: 14px; color: #475569; font-weight: 500;">Invoice loaded successfully. Press the button to print or save as PDF.</div>
    <button class="btn-download" onclick="window.print()">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-printer"><polyline points="6 9 6 2 18 2 18 9"></polyline><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect></svg>
      Print / Save PDF
    </button>
  </div>
  <div class="receipt-container">
    <div class="header">
      <div class="institute">
        <h2>Vidyaaniketan Professional Academy</h2>
        <p>Arun Galaxy, Shreeram Chouk, Indapur, Maharashtra 413106</p>
        <p>Phone no : 8180802049</p>
        <p>State: Maharashtra</p>
      </div>
      <img class="logo" src="${window.location.origin}/logo.jpeg" alt="Logo"/>
    </div>
    <div class="title">Payment Receipt</div>
    <div class="content">
      <div class="left">
        <div class="label">Received From</div>
        <div class="text" style="font-weight: 600;">${inv.student_name}</div>
        <div class="text" style="font-size: 14px; color: #475569; margin-top: 2px;">Contact No : ${inv.student_phone || "-"}</div>
        <div class="text" style="font-size: 14px; color: #475569; margin-top: 2px;">Standard : ${inv.student_standard || inv.standard || "-"}</div>
        <div class="text" style="font-size: 14px; color: #475569; margin-top: 2px;">Batch : ${inv.student_batch || inv.course || "-"}</div>
        <div class="text" style="font-size: 14px; color: #475569; margin-top: 2px;">Branch : ${inv.student_branch || "-"}</div>
        
        <div class="label">Amount in words</div>
        <div class="text" style="font-style: italic; font-size: 14px; color: #475569;">${Number(inv.paid_amount).toLocaleString()} Rupees only</div>
      </div>
      <div class="right">
        <div class="receipt-details">
          <div><strong>Receipt Details</strong></div>
          <div>Receipt No : ${invoiceNo}</div>
          <div><strong>Date :</strong> ${fmtDate(inv.install_date)}</div>
        </div>
        <table class="table">
          ${(Number(inv.student_school_fee || 0) + Number(inv.student_academy_fee || 0) + Number(inv.student_hostel_fee || 0)) > 0 ? `
          <tr>
            <td>Original Fee</td>
            <td>₹ ${(Number(inv.student_school_fee || 0) + Number(inv.student_academy_fee || 0) + Number(inv.student_hostel_fee || 0)).toLocaleString()}</td>
          </tr>
          ` : ''}

          ${Number(inv.student_scholarship_amount || 0) > 0 ? `
          <tr>
            <td>Scholarship / Concession</td>
            <td>-₹ ${Number(inv.student_scholarship_amount).toLocaleString()}</td>
          </tr>
          ` : ''}

          <tr>
            <td>Total Payable</td>
            <td>₹ ${Number(inv.amount).toLocaleString()}</td>
          </tr>
          <tr>
            <td>Received</td>
            <td>₹ ${Number(inv.paid_amount).toLocaleString()}</td>
          </tr>
          <tr>
            <td>Payment Mode</td>
            <td>${inv.transaction_type || "Online"}</td>
          </tr>
          <tr class="balance-row">
            <td>Outstanding Balance</td>
            <td>₹ ${balance.toLocaleString()}</td>
          </tr>
        </table>
      </div>
    </div>
    <div class="signature">
      <div class="signature-title">For : Vidyaaniketan Professional Academy</div>
      <div class="auth">Authorized Signatory</div>
    </div>
  </div>
</body>
</html>
    `
    const blob = new Blob([htmlContent], { type: "text/html;charset=utf-8" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `Invoice_${invoiceNo}.html`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const handleWhatsAppShare = (inv: Invoice) => {
    const invoiceNo = `INV${String(inv.id).padStart(3, "0")}`
    const amount = Number(inv.amount || 0)
    const paid = Number(inv.paid_amount || 0)
    const balance = amount - paid
    const message = [
      "Hello,",
      "",
      `Invoice: ${invoiceNo}`,
      `Student: ${inv.student_name || "-"}`,
      `Standard: ${inv.student_standard || inv.standard || "-"}`,
      `Batch: ${inv.student_batch || inv.course || "-"}`,
      `Branch: ${inv.student_branch || "-"}`,
      `Next Installment Date: ${fmtDate(inv.due_date)}`,
      `Total Amount: Rs ${amount.toLocaleString()}`,
      `Paid Amount: Rs ${paid.toLocaleString()}`,
      `Balance: Rs ${balance.toLocaleString()}`,
      "",
      "Please find your invoice details above.",
    ].join("\n")

    const phone = ""
    const url = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`
    window.open(url, "_blank", "noopener,noreferrer")
  }

  const f = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }))
  const filteredInvoices = invoices.filter((inv) => {
    const matchesSearch = inv.student_name?.toLowerCase().includes(studentFilter.trim().toLowerCase())
    
    const std = inv.student_standard || inv.standard || ""
    const bch = inv.student_batch || inv.course || ""
    const brn = inv.student_branch || ""

    const matchesStandard = filterStandard === "all" || std === filterStandard
    const matchesBatch = filterBatch === "all" || bch === filterBatch
    const matchesBranch = filterBranch === "all" || brn === filterBranch

    return matchesSearch && matchesStandard && matchesBatch && matchesBranch
  })

  return (
    <div className="space-y-6 pt-12 lg:pt-0">

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: "Total Invoiced",  value: summary.total_invoiced, cls: "from-blue-500 to-blue-600" },
          { label: "Total Collected", value: summary.total_paid,     cls: "from-emerald-500 to-emerald-600" },
          { label: "Pending Amount",  value: summary.total_pending,  cls: "from-amber-500 to-amber-600" },
        ].map(({ label, value, cls }) => (
          <Card key={label} className={`bg-gradient-to-br ${cls} text-white border-0`}>
            <CardContent className="p-4">
              <p className="text-sm opacity-90">{label}</p>
              <p className="text-2xl font-bold">₹{Number(value || 0).toLocaleString()}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <CardTitle className="flex items-center gap-2 text-xl md:text-2xl">
            <Receipt className="h-6 w-6" /> Invoices
          </CardTitle>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative w-full sm:w-[240px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={studentFilter}
                onChange={(e) => setStudentFilter(e.target.value)}
                placeholder="Search student name..."
                className="pl-9"
              />
            </div>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-full sm:w-[150px]">
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                {["all", "Paid", "Partial", "Pending", "Overdue"].map(s => (
                  <SelectItem key={s} value={s}>{s === "all" ? "All Status" : s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button onClick={handleExportExcel} variant="outline">
              <FileSpreadsheet className="h-4 w-4 mr-2" /> Export Excel
            </Button>
            <Button onClick={openModal} className="bg-emerald-600 hover:bg-emerald-700">
              <Plus className="h-4 w-4 mr-2" /> New Invoice
            </Button>
          </div>
        </CardHeader>

        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            <div className="space-y-1.5">
              <Label htmlFor="standard-filter" className="text-xs font-semibold text-muted-foreground">Filter Standard</Label>
              <Select value={filterStandard} onValueChange={setFilterStandard}>
                <SelectTrigger id="standard-filter">
                  <SelectValue placeholder="All Standards" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Standards</SelectItem>
                  {STANDARDS.map((std) => (
                    <SelectItem key={std} value={std}>{std}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="batch-filter" className="text-xs font-semibold text-muted-foreground">Filter Batch</Label>
              <Select value={filterBatch} onValueChange={setFilterBatch}>
                <SelectTrigger id="batch-filter">
                  <SelectValue placeholder="All Batches" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Batches</SelectItem>
                  {ALL_BATCHES.map((b) => (
                    <SelectItem key={b} value={b}>{b}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="branch-filter" className="text-xs font-semibold text-muted-foreground">Filter Branch</Label>
              <Select value={filterBranch} onValueChange={setFilterBranch}>
                <SelectTrigger id="branch-filter">
                  <SelectValue placeholder="All Branches" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Branches</SelectItem>
                  {BRANCHES.map((br) => (
                    <SelectItem key={br} value={br}>{br}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <div className="rounded-lg border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-900">
                    <TableHead className="text-white font-semibold">ID</TableHead>
                    <TableHead className="text-white font-semibold">Student</TableHead>
                    <TableHead className="text-white font-semibold hidden sm:table-cell">Amount</TableHead>
                    <TableHead className="text-white font-semibold hidden md:table-cell">Paid</TableHead>
                    {/* ── NEW column ── */}
                    <TableHead className="text-white font-semibold hidden lg:table-cell">Install Date</TableHead>
                    <TableHead className="text-white font-semibold hidden lg:table-cell">Next Installment Date</TableHead>
                    <TableHead className="text-white font-semibold">Status</TableHead>
                    <TableHead className="text-white font-semibold text-center">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredInvoices.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                        No invoices found
                      </TableCell>
                    </TableRow>
                  ) : filteredInvoices.map(inv => {
                    const status = getStatus(inv)
                    return (
                      <TableRow key={inv.id} className="hover:bg-muted/50">
                        <TableCell className="font-medium">INV{String(inv.id).padStart(3, "0")}</TableCell>
                        <TableCell>
                          <div className="font-semibold text-slate-800">{inv.student_name}</div>
                          <div className="text-[11px] text-muted-foreground mt-0.5">
                            {[
                              inv.student_standard || inv.standard,
                              inv.student_batch || inv.course,
                              inv.student_branch
                            ].filter(Boolean).join(" · ")}
                          </div>
                        </TableCell>
                        <TableCell className="hidden sm:table-cell">₹{Number(inv.amount).toLocaleString()}</TableCell>
                        <TableCell className="hidden md:table-cell">₹{Number(inv.paid_amount).toLocaleString()}</TableCell>
                        {/* ── NEW cell ── */}
                        <TableCell className="hidden lg:table-cell text-muted-foreground">
                          {inv?.install_date ? fmtDate(inv.install_date) : "—"}
                        </TableCell>
                        <TableCell className="hidden lg:table-cell">{fmtDate(inv.due_date)}</TableCell>
                        <TableCell>
                          <Badge className={`${statusColor(status)} flex items-center gap-1 w-fit`}>
                            {statusIcon(status)}{status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center justify-center gap-1">
                            <Button size="sm" variant="outline" className="h-8 w-8 p-0"
                              onClick={() => { setSelected(inv); setViewOpen(true) }}>
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button size="sm" variant="outline" className="h-8 w-8 p-0"
                              onClick={() => openEdit(inv)}>
                              <Edit2 className="h-4 w-4" />
                            </Button>
                            <Button size="sm" variant="outline" className="h-8 w-8 p-0"
                              onClick={() => handlePrint(inv)}>
                              <Printer className="h-4 w-4" />
                            </Button>
                            <Button size="sm" variant="outline" className="h-8 w-8 p-0 text-teal-600 hover:text-teal-700 hover:border-teal-300"
                              title="Download Invoice"
                              onClick={() => handleDownloadInvoice(inv)}>
                              <Download className="h-4 w-4" />
                            </Button>
                            <Button size="sm" variant="outline" className="h-8 w-8 p-0 text-green-600 hover:text-green-700 hover:border-green-300"
                              onClick={() => handleWhatsAppShare(inv)}>
                              <MessageCircle className="h-4 w-4" />
                            </Button>
                            <Button size="sm" variant="destructive" className="h-8 w-8 p-0"
                              onClick={() => handleDelete(inv.id)}>
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

      {/* ── Create Invoice Modal ─────────────────────────────── */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Invoice" : "Create New Invoice"}</DialogTitle>
          </DialogHeader>

          <div className="grid gap-4 py-4">

            {/* Student Search */}
            <div className="space-y-2">
              <Label>Student <span className="text-destructive">*</span></Label>
              {selectedStudent ? (
                <div className="flex items-start justify-between p-3 rounded-lg bg-emerald-50 border border-emerald-200">
                  <div className="space-y-1 w-full">
                    <div className="flex items-center justify-between">
                      <p className="font-semibold text-sm text-emerald-800">{selectedStudent.name}</p>
                      <button onClick={clearStudent} className="text-emerald-500 hover:text-red-500 transition-colors ml-2 shrink-0" title="Change student">
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                    <p className="text-xs text-emerald-600">
                      {[
                        selectedStudent.standard && `Std ${selectedStudent.standard}`,
                        selectedStudent.course,
                        selectedStudent.location,
                        selectedStudent.phone && `📞 ${selectedStudent.phone}`
                      ].filter(Boolean).join(" · ")}
                    </p>
                    
                    <div className="mt-2 pt-2 border-t border-emerald-200/50 grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-emerald-700">
                      {selectedStudent.scholarship_amount !== undefined && Number(selectedStudent.scholarship_amount) > 0 ? (
                        <>
                          <div className="flex justify-between">
                            <span>Original Fee:</span>
                            <span className="font-medium">₹{((Number(selectedStudent.school_fee || 0) + Number(selectedStudent.academy_fee || 0) + Number(selectedStudent.hostel_fee || 0)) || (Number(selectedStudent.fee) + Number(selectedStudent.scholarship_amount || 0))).toLocaleString()}</span>
                          </div>
                          <div className="flex justify-between text-amber-700">
                            <span>Concession ({selectedStudent.scholarship_type === "Percent" ? `${selectedStudent.scholarship_value}%` : "Flat"}):</span>
                            <span className="font-medium">-₹{Number(selectedStudent.scholarship_amount).toLocaleString()}</span>
                          </div>
                          <div className="flex justify-between font-semibold text-emerald-800 border-t border-dashed border-emerald-200 pt-1 col-span-2">
                            <span>Net Payable:</span>
                            <span>₹{Number(selectedStudent.fee).toLocaleString()}</span>
                          </div>
                        </>
                      ) : (
                        <div className="flex justify-between col-span-2">
                          <span>Total Fee:</span>
                          <span className="font-semibold">₹{Number(selectedStudent.fee).toLocaleString()}</span>
                        </div>
                      )}
                      
                      <div className="flex justify-between col-span-2 mt-1 pt-1 border-t border-emerald-200/50">
                        <span>Paid so far:</span>
                        <span className="font-medium">₹{Number(selectedStudent.paid_fee).toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between col-span-2 font-semibold text-emerald-900">
                        <span>Remaining Balance:</span>
                        <span>₹{Math.max(0, Number(selectedStudent.fee) - Number(selectedStudent.paid_fee)).toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="relative">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search student by name or phone..."
                      value={studentSearch}
                      onChange={e => setStudentSearch(e.target.value)}
                      onFocus={() => { if (students.length > 0) setShowDropdown(true) }}
                      className="pl-9 pr-9"
                    />
                    {studentsLoading && (
                      <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
                    )}
                    {studentSearch && !studentsLoading && (
                      <button onClick={clearStudent} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                        <X className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                  {showDropdown && students.length > 0 && (
                    <div className="absolute z-50 w-full mt-1 bg-popover border border-border rounded-lg shadow-lg overflow-hidden max-h-48 overflow-y-auto">
                      {students.map(s => (
                        <button key={s.id} onClick={() => pickStudent(s)}
                          className="w-full flex items-start gap-3 px-4 py-3 hover:bg-muted text-left transition-colors border-b border-border/50 last:border-0">
                          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm shrink-0 mt-0.5">
                            {s.name.charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <p className="font-medium text-sm text-foreground truncate">{s.name}</p>
                            <p className="text-xs text-muted-foreground truncate">
                              {[s.standard && `Std ${s.standard}`, s.course, s.phone].filter(Boolean).join(" · ")}
                            </p>
                            {s.fee > 0 && (
                              <p className="text-xs text-amber-600 font-medium mt-0.5">
                                Balance: ₹{(Number(s.fee) - Number(s.paid_fee)).toLocaleString()}
                              </p>
                            )}
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                  {showDropdown && students.length === 0 && studentSearch.length > 0 && !studentsLoading && (
                    <div className="absolute z-50 w-full mt-1 bg-popover border border-border rounded-lg shadow-lg px-4 py-3 text-sm text-muted-foreground">
                      No students found for "{studentSearch}"
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Scholarship / Concession Type & Value */}
            {selectedStudent && (
              <div className="grid grid-cols-2 gap-4 border-t border-b py-3 my-1 bg-slate-50/50 p-3 rounded-lg border">
                <div className="space-y-1">
                  <Label>Concession Type</Label>
                  <Select value={form.scholarship_type} onValueChange={val => handleScholarshipChange("scholarship_type", val)}>
                    <SelectTrigger className="bg-white"><SelectValue placeholder="None" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="None">None</SelectItem>
                      <SelectItem value="Flat">Flat (₹)</SelectItem>
                      <SelectItem value="Percent">Percent (%)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label>Concession Value</Label>
                  <Input 
                    type="number" 
                    min="0"
                    value={form.scholarship_value} 
                    onChange={e => handleScholarshipChange("scholarship_value", e.target.value)} 
                    className="bg-white"
                    placeholder="0.00"
                    disabled={form.scholarship_type === "None"}
                  />
                </div>
              </div>
            )}

            {/* Amount fields */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Amount (₹) <span className="text-destructive">*</span></Label>
                <Input type="number" value={form.amount} onChange={e => f("amount", e.target.value)} placeholder="Total fee" />
              </div>
              <div className="space-y-2">
                <Label>Paid (₹)</Label>
                <Input type="number" value={form.paid_amount} onChange={e => f("paid_amount", e.target.value)} placeholder="Amount paid" />
              </div>
            </div>

            {/* Installment Date + Transaction Type */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Installment Date</Label>
                <Input type="date" value={form.install_date} onChange={e => f("install_date", e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Transaction Type <span className="text-destructive">*</span></Label>
                <Select value={form.transaction_type} onValueChange={v => f("transaction_type", v)}>
                  <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Cash"> Cash</SelectItem>
                    <SelectItem value="Online">Online</SelectItem>
                    <SelectItem value="Cheque"> Cheque</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Due Date */}
            <div className="space-y-2">
              <Label>Next Installment Date <span className="text-destructive">*</span></Label>
              <Input type="date" value={form.due_date} onChange={e => f("due_date", e.target.value)} />
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label>Description</Label>
              <Input value={form.description} onChange={e => f("description", e.target.value)} placeholder="e.g. Tuition Fee – January" />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving} className="bg-emerald-600 hover:bg-emerald-700">
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {editing ? "Update Invoice" : "Create Invoice"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── View Modal ───────────────────────────────────────── */}
      <Dialog open={viewOpen} onOpenChange={setViewOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Invoice Details</DialogTitle></DialogHeader>
          {selected && (() => {
            const status = getStatus(selected)
            return (
              <div className="space-y-3">
                <div className="text-center pb-4 border-b">
                  <h3 className="text-lg font-bold text-blue-600">Vidyaaniketan Professional Academy</h3>
                  <p className="text-muted-foreground">Invoice #INV{String(selected.id).padStart(3, "0")}</p>
                </div>
                {([
                  ["Student",          selected.student_name],
                  ["Standard",         selected.student_standard || selected.standard],
                  ["Batch",            selected.student_batch || selected.course],
                  ["Branch",           selected.student_branch],
                  ["Description",      selected.description],
                  ["Transaction Type", selected.transaction_type],
                  ["Install Date",     fmtDate(selected.install_date)],
                  ["Next Installment Date", fmtDate(selected.due_date)],
                  ...(Number(selected.student_school_fee || 0) + Number(selected.student_academy_fee || 0) + Number(selected.student_hostel_fee || 0) > 0 ? [
                    ["Original Fee", `₹${(Number(selected.student_school_fee || 0) + Number(selected.student_academy_fee || 0) + Number(selected.student_hostel_fee || 0)).toLocaleString()}`]
                  ] : []),
                  ...(Number(selected.student_scholarship_amount || 0) > 0 ? [
                    ["Scholarship / Concession", `-₹${Number(selected.student_scholarship_amount).toLocaleString()} (${selected.student_scholarship_type === "Percent" ? `${selected.student_scholarship_value}%` : "Flat"})`]
                  ] : []),
                  ["Total Payable",    `₹${Number(selected.amount).toLocaleString()}`],
                  ["Paid Amount",      `₹${Number(selected.paid_amount).toLocaleString()}`],
                  ["Outstanding Balance", `₹${(Number(selected.amount) - Number(selected.paid_amount)).toLocaleString()}`],
                ] as [string, string | undefined][]).map(([l, v]) => (
                  <div key={l} className="flex justify-between">
                    <span className="text-muted-foreground">{l}:</span>
                    <span className="font-medium">{v ?? "—"}</span>
                  </div>
                ))}
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Status:</span>
                  <Badge className={statusColor(status)}>{status}</Badge>
                </div>
                <div className="flex justify-end gap-2 pt-4 border-t">
                  <Button variant="outline" size="sm" onClick={() => handlePrint(selected)}>
                    <Printer className="h-4 w-4 mr-2" /> Print
                  </Button>
                  <Button className="bg-teal-600 hover:bg-teal-700 text-white" size="sm" onClick={() => handleDownloadInvoice(selected)}>
                    <Download className="h-4 w-4 mr-2" /> Download
                  </Button>
                </div>
              </div>
            )
          })()}
        </DialogContent>
      </Dialog>
    </div>
  )
}
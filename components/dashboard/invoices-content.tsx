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
import { Checkbox } from "@/components/ui/checkbox"
import { Progress } from "@/components/ui/progress"
import {
  Receipt,
  Plus,
  Eye,
  Printer,
  Trash2,
  CheckCircle,
  Clock,
  AlertCircle,
  Loader2,
  Search,
  X,
  Edit2,
  FileSpreadsheet,
  MessageCircle,
  Download,
  Send,
  Phone,
  Check,
  Copy,
  Users,
  Settings,
  ExternalLink,
  ChevronDown,
  ChevronUp,
} from "lucide-react"
import { invoicesApi, studentsApi, whatsappApi } from "@/lib/api"
import { printReceipt, downloadReceipt, type ReceiptData, type PrintLayout } from "./receipt-print"
import { useCourseBatches } from "@/hooks/useCourseBatches";

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
  // New receipt fields
  receipt_number?: string
  offline_receipt_number?: string
  transaction_ref?: string
  remarks?: string
  generated_by?: string
  scholarship_reason?: string
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





const PAYMENT_MODES = ["Cash", "UPI", "Card", "Bank Transfer", "Cheque"]

export function InvoicesContent() {

  const { juniorBatches: JUNIOR_BATCHES, seniorBatches: SENIOR_BATCHES, allBatches: ALL_BATCHES } = useCourseBatches();
  const getBatchOptions = (std: string) => {
    if (std === "11th Standard" || std === "12th Standard") {
      return SENIOR_BATCHES;
    }
    return JUNIOR_BATCHES;
  };
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

  // Print preview dialog state
  const [printDialogOpen, setPrintDialogOpen] = useState(false)
  const [printInvoice,    setPrintInvoice]    = useState<Invoice | null>(null)
  const [printLayout,     setPrintLayout]     = useState<PrintLayout>("full")

  // WhatsApp dialog state
  const [whatsappDialogOpen, setWhatsappDialogOpen] = useState(false)
  const [whatsappInvoice,    setWhatsappInvoice]    = useState<Invoice | null>(null)
  const [whatsappPhone,      setWhatsappPhone]      = useState("")
  const [whatsappSending,    setWhatsappSending]    = useState(false)
  const [whatsappStatus,     setWhatsappStatus]     = useState<{ type: "success" | "error"; message: string } | null>(null)

  // Fee Reminder Modal states (WABA)
  const [feeReminderModalOpen,     setFeeReminderModalOpen]     = useState(false)
  const [feeReminderFilterMode,    setFeeReminderFilterMode]    = useState<"pending" | "all">("pending")
  const [feeReminderSelectedIds,   setFeeReminderSelectedIds]   = useState<Set<number>>(new Set())
  const [feeReminderCustomData,    setFeeReminderCustomData]    = useState<Record<number, { phone: string; installmentNo: string; dueDate: string }>>({})
  const [feeReminderPreviewId,     setFeeReminderPreviewId]     = useState<number | null>(null)
  const [feeReminderBulkSending,   setFeeReminderBulkSending]   = useState(false)
  const [feeReminderProgress,      setFeeReminderProgress]      = useState({ current: 0, total: 0, success: 0, failed: 0 })
  const [feeReminderResults,       setFeeReminderResults]       = useState<Record<number, { status: "pending" | "sending" | "success" | "error"; message?: string }>>({})
  const [feeReminderSettingsOpen,  setFeeReminderSettingsOpen]  = useState(false)
  const [wabaConfig,               setWabaConfig]               = useState({ token: "", phoneNumberId: "" })
  const [feeReminderCopied,        setFeeReminderCopied]        = useState(false)
  const [manualStepIndex,          setManualStepIndex]          = useState(0)
  const [feeReminderSearch,        setFeeReminderSearch]        = useState("")

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
    // New fields
    offline_receipt_number: "",
    transaction_ref: "",
    remarks: "",
    generated_by: "",
    scholarship_reason: "",
  })

  // Auto-populate generated_by from logged-in user
  useEffect(() => {
    try {
      const storedUser = localStorage.getItem("userInfo")
      if (storedUser) {
        const user = JSON.parse(storedUser)
        if (user?.name) {
          setForm(prev => ({ ...prev, generated_by: prev.generated_by || user.name }))
        }
      }
    } catch { /* ignore */ }
  }, [])

  // Auto-populate WABA config from local storage
  useEffect(() => {
    try {
      const stored = localStorage.getItem("waba_config")
      if (stored) {
        setWabaConfig(JSON.parse(stored))
      }
    } catch { /* ignore */ }
  }, [])

  const saveWabaConfig = (newConfig: { token: string; phoneNumberId: string }) => {
    setWabaConfig(newConfig)
    try {
      localStorage.setItem("waba_config", JSON.stringify(newConfig))
    } catch { /* ignore */ }
  }

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
        const res: any = await studentsApi.getAll({ search: studentSearch.trim() })
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
    amount:       String(remaining > 0 ? remaining : 0),
    paid_amount:  "",
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
    // Get logged in user name for generated_by
    let userName = ""
    try {
      const storedUser = localStorage.getItem("userInfo")
      if (storedUser) { userName = JSON.parse(storedUser)?.name || "" }
    } catch { /* ignore */ }
    setForm({
      student_name: "", amount: "", paid_amount: "",
      due_date: "", install_date: "", transaction_type: "Cash",
      description: "", student_id: "",
      scholarship_type: "None",
      scholarship_value: "0",
      scholarship_amount: "0",
      offline_receipt_number: "",
      transaction_ref: "",
      remarks: "",
      generated_by: userName,
      scholarship_reason: "",
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
        // New fields
        offline_receipt_number: form.offline_receipt_number || undefined,
        transaction_ref:  form.transaction_ref || undefined,
        remarks:          form.remarks || undefined,
        generated_by:     form.generated_by || undefined,
        scholarship_reason: form.scholarship_reason || undefined,
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

    // Get logged in user name for generated_by fallback
    let userName = ""
    try {
      const storedUser = localStorage.getItem("userInfo")
      if (storedUser) { userName = JSON.parse(storedUser)?.name || "" }
    } catch { /* ignore */ }

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
      // New fields
      offline_receipt_number: inv.offline_receipt_number || "",
      transaction_ref: inv.transaction_ref || "",
      remarks: inv.remarks || "",
      generated_by: inv.generated_by || userName,
      scholarship_reason: inv.scholarship_reason || "",
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
      "Receipt No",
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
      "Transaction Ref",
      "Status",
      "Remarks",
      "Description",
    ]

    const rows = filteredInvoices.map((inv) => {
      const amount = Number(inv.amount || 0)
      const paid = Number(inv.paid_amount || 0)
      const balance = amount - paid
      return [
        `INV${String(inv.id).padStart(3, "0")}`,
        inv.receipt_number ? `RCP-${String(inv.receipt_number).padStart(4, "0")}` : (inv.offline_receipt_number || ""),
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
        inv.transaction_ref || "",
        getStatus(inv),
        inv.remarks || "",
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

  /* ── Print: open print preview dialog ──────────────────── */
  const openPrintDialog = (inv: Invoice) => {
    setPrintInvoice(inv)
    setPrintLayout("full")
    setPrintDialogOpen(true)
  }

  const executePrint = () => {
    if (!printInvoice) return
    const receiptData: ReceiptData = {
      ...printInvoice,
      amount: Number(printInvoice.amount),
      paid_amount: Number(printInvoice.paid_amount),
    }
    printReceipt(receiptData, printLayout)
    setPrintDialogOpen(false)
  }

  const openWhatsAppModal = (inv: Invoice) => {
    setWhatsappInvoice(inv)
    setWhatsappPhone(String(inv.student_phone || ""))
    setWhatsappStatus(null)
    setWhatsappDialogOpen(true)
  }

  const executeSendWhatsApp = async () => {
    if (!whatsappInvoice) return
    const cleanPhone = whatsappPhone.replace(/\D/g, "")
    if (!cleanPhone) {
      setWhatsappStatus({ type: "error", message: "Please enter a valid phone number." })
      return
    }
    setWhatsappSending(true)
    setWhatsappStatus(null)
    try {
      const res: any = await invoicesApi.sendWhatsApp(whatsappInvoice.id, { phone: cleanPhone })
      if (res.success) {
        setWhatsappStatus({
          type: "success",
          message: res.message || "WhatsApp message sent successfully via RHAI Tech API!",
        })
      } else {
        setWhatsappStatus({
          type: "error",
          message: res.message || "Failed to send WhatsApp message.",
        })
      }
    } catch (err: any) {
      setWhatsappStatus({
        type: "error",
        message: err.message || "Error connecting to WhatsApp API service.",
      })
    } finally {
      setWhatsappSending(false)
    }
  }

  const handleWhatsAppWebFallback = () => {
    if (!whatsappInvoice) return
    const inv = whatsappInvoice
    const invoiceNo = inv.receipt_number
      ? `RCP-${String(inv.receipt_number).padStart(4, "0")}`
      : inv.offline_receipt_number || `INV${String(inv.id).padStart(3, "0")}`
    const amount = Number(inv.amount || 0)
    const paid = Number(inv.paid_amount || 0)
    const balance = Math.max(0, (inv.student_fee ?? amount) - (inv.student_paid_fee ?? paid))
    const dateStr = inv.install_date ? fmtDate(inv.install_date) : fmtDate(new Date().toISOString())

    const message = [
      "विद्यानिकेतन प्रोफेशनल अकॅडमी, इंदापूर",
      "Fee Payment Confirmation",
      "",
      `विद्यार्थ्याचे नाव: ${inv.student_name || "-"}`,
      `पावती क्रमांक: ${invoiceNo}`,
      `पेमेंट तारीख: ${dateStr}`,
      `जमा झालेली रक्कम: ₹${paid.toLocaleString("en-IN")}`,
      `आतापर्यंत एकूण जमा: ₹${Number(inv.student_paid_fee ?? paid).toLocaleString("en-IN")}`,
      `फीची एकूण शिल्लक: ₹${balance.toLocaleString("en-IN")}`,
      "",
      "फी भरल्याबद्दल मनःपूर्वक धन्यवाद.",
      "आपल्या सहकार्याबद्दल आम्ही आपले आभारी आहोत.",
    ].join("\n")

    const cleanPhone = whatsappPhone.replace(/\D/g, "")
    const targetPhone = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone
    const url = `https://wa.me/${targetPhone}?text=${encodeURIComponent(message)}`
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

  // ─── Fee Installment Reminder (WABA) Helpers ─────────────────────────────
  const calculateInstallmentNo = useCallback((inv: Invoice, allInvs: Invoice[]): string => {
    if (inv.description) {
      const match = inv.description.match(/(?:installment|inst|हप्ता|हप्त्या)\s*#?:?\s*(\d+)/i)
      if (match && match[1]) return match[1]
    }
    const studentInvoices = allInvs
      .filter(i => {
        if (inv.student_id && i.student_id) return String(i.student_id) === String(inv.student_id)
        return i.student_name?.trim().toLowerCase() === inv.student_name?.trim().toLowerCase()
      })
      .sort((a, b) => {
        const dateA = new Date(a.install_date || a.due_date || 0).getTime()
        const dateB = new Date(b.install_date || b.due_date || 0).getTime()
        if (dateA !== dateB) return dateA - dateB
        return a.id - b.id
      })
    const index = studentInvoices.findIndex(i => i.id === inv.id)
    return index >= 0 ? String(index + 1) : "1"
  }, [])

  const buildFeeReminderParams = useCallback((
    inv: Invoice,
    custom?: { phone?: string; installmentNo?: string; dueDate?: string }
  ) => {
    const studentName = inv.student_name || "विद्यार्थी"
    const installmentNo = custom?.installmentNo || calculateInstallmentNo(inv, invoices)
    const dueDate = custom?.dueDate || (inv.due_date ? fmtDate(inv.due_date) : "देय तारीख लवकरच")
    const installmentAmount = Number(inv.amount || 0).toLocaleString("en-IN")
    const paidAmount = Number(inv.paid_amount || 0).toLocaleString("en-IN")
    const pendingAmount = Math.max(0, Number(inv.amount || 0) - Number(inv.paid_amount || 0)).toLocaleString("en-IN")
    const totalPaid = Number(inv.student_paid_fee ?? inv.paid_amount ?? 0).toLocaleString("en-IN")
    const totalPending = Math.max(
      0,
      Number(inv.student_fee ?? inv.amount ?? 0) - Number(inv.student_paid_fee ?? inv.paid_amount ?? 0)
    ).toLocaleString("en-IN")
    const rawPhone = custom?.phone !== undefined ? custom.phone : String(inv.student_phone || "")

    return {
      studentName,
      installmentNo,
      dueDate,
      installmentAmount,
      paidAmount,
      pendingAmount,
      totalPaid,
      totalPending,
      phone: rawPhone,
    }
  }, [calculateInstallmentNo, invoices])

  const generateFeeReminderMessage = useCallback((params: {
    studentName: string
    installmentNo: string | number
    dueDate: string
    installmentAmount: string | number
    paidAmount: string | number
    pendingAmount: string | number
    totalPaid: string | number
    totalPending: string | number
  }) => {
    return [
      "विद्यानिकेतन प्रोफेशनल अकॅडमी, इंदापूर",
      "",
      "आदरणीय पालक,",
      "",
      "आपल्या पाल्याच्या अकॅडमी फीच्या पुढील हप्त्याची देय तारीख जवळ आलेली आहे. कृपया खालील फी तपशीलाची नोंद घ्यावी.",
      "",
      `विद्यार्थ्याचे नाव: ${params.studentName}`,
      `हप्ता क्रमांक: ${params.installmentNo}`,
      `देय तारीख: ${params.dueDate}`,
      `हप्त्याची एकूण रक्कम: ₹${params.installmentAmount}`,
      `या हप्त्यात जमा: ₹${params.paidAmount}`,
      `या हप्त्याची शिल्लक: ₹${params.pendingAmount}`,
      `आतापर्यंत एकूण जमा: ₹${params.totalPaid}`,
      `आतापर्यंत एकूण शिल्लक: ₹${params.totalPending}`,
      "",
      "कृपया शिल्लक रक्कम देय तारखेपूर्वी किंवा देय तारखेस जमा करून आपल्या पाल्याची फी अद्ययावत ठेवावी.",
      "",
      "आपल्या सहकार्याबद्दल धन्यवाद.",
      "",
      "Administration Department",
      "विद्यानिकेतन प्रोफेशनल अकॅडमी, इंदापूर",
    ].join("\n")
  }, [])

  const cleanPhoneForWhatsApp = (rawPhone: string | number) => {
    const digits = String(rawPhone || "").replace(/\D/g, "")
    if (digits.length === 10) return `91${digits}`
    return digits
  }

  const getFeeReminderTargetInvoices = useCallback(() => {
    let list = filteredInvoices
    if (feeReminderFilterMode === "pending") {
      list = filteredInvoices.filter(inv => {
        const amount = Number(inv.amount || 0)
        const paid = Number(inv.paid_amount || 0)
        const status = getStatus(inv)
        return paid < amount || status === "Pending" || status === "Partial" || status === "Overdue"
      })
    }
    if (feeReminderSearch.trim()) {
      const q = feeReminderSearch.trim().toLowerCase()
      list = list.filter(inv =>
        inv.student_name?.toLowerCase().includes(q) ||
        String(inv.student_phone || "").includes(q)
      )
    }
    return list
  }, [filteredInvoices, feeReminderFilterMode, feeReminderSearch])

  const openFeeReminderModal = () => {
    setFeeReminderFilterMode("pending")
    setFeeReminderSearch("")
    const pendingInvs = filteredInvoices.filter(inv => {
      const amount = Number(inv.amount || 0)
      const paid = Number(inv.paid_amount || 0)
      const status = getStatus(inv)
      return paid < amount || status === "Pending" || status === "Partial" || status === "Overdue"
    })

    const targetList = pendingInvs.length > 0 ? pendingInvs : filteredInvoices
    setFeeReminderSelectedIds(new Set(targetList.map(i => i.id)))

    if (targetList.length > 0) {
      setFeeReminderPreviewId(targetList[0].id)
    }

    const dataMap: Record<number, { phone: string; installmentNo: string; dueDate: string }> = {}
    filteredInvoices.forEach(inv => {
      dataMap[inv.id] = {
        phone: String(inv.student_phone || ""),
        installmentNo: calculateInstallmentNo(inv, invoices),
        dueDate: inv.due_date ? fmtDate(inv.due_date) : "",
      }
    })
    setFeeReminderCustomData(dataMap)
    setFeeReminderResults({})
    setFeeReminderProgress({ current: 0, total: 0, success: 0, failed: 0 })
    setManualStepIndex(0)
    setFeeReminderCopied(false)
    setFeeReminderModalOpen(true)
  }

  const switchFeeReminderMode = (mode: "pending" | "all") => {
    setFeeReminderFilterMode(mode)
    let list: Invoice[] = []
    if (mode === "pending") {
      list = filteredInvoices.filter(inv => {
        const amount = Number(inv.amount || 0)
        const paid = Number(inv.paid_amount || 0)
        const status = getStatus(inv)
        return paid < amount || status === "Pending" || status === "Partial" || status === "Overdue"
      })
    } else {
      list = filteredInvoices
    }
    setFeeReminderSelectedIds(new Set(list.map(i => i.id)))
    if (list.length > 0 && (!feeReminderPreviewId || !list.some(i => i.id === feeReminderPreviewId))) {
      setFeeReminderPreviewId(list[0].id)
    }
  }

  const toggleSelectAllFeeReminders = () => {
    const currentTargets = getFeeReminderTargetInvoices()
    if (feeReminderSelectedIds.size === currentTargets.length && currentTargets.length > 0) {
      setFeeReminderSelectedIds(new Set())
    } else {
      setFeeReminderSelectedIds(new Set(currentTargets.map(i => i.id)))
    }
  }

  const toggleSelectFeeReminder = (id: number) => {
    setFeeReminderSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const updateFeeReminderCustomField = (id: number, field: "phone" | "installmentNo" | "dueDate", value: string) => {
    setFeeReminderCustomData(prev => ({
      ...prev,
      [id]: {
        ...(prev[id] || { phone: "", installmentNo: "1", dueDate: "" }),
        [field]: value,
      }
    }))
  }

  const handleSendIndividualReminderWeb = (inv: Invoice) => {
    const custom = feeReminderCustomData[inv.id]
    const params = buildFeeReminderParams(inv, custom)
    const phone = cleanPhoneForWhatsApp(params.phone)
    if (!phone) {
      alert(`Please enter a valid phone number for ${params.studentName}.`)
      return
    }
    const message = generateFeeReminderMessage(params)
    const url = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`
    window.open(url, "_blank", "noopener,noreferrer")

    setFeeReminderResults(prev => ({
      ...prev,
      [inv.id]: { status: "success", message: "Opened in WhatsApp Web" }
    }))
  }

  const sendFeeReminderAPI = async (inv: Invoice) => {
    const custom = feeReminderCustomData[inv.id]
    const params = buildFeeReminderParams(inv, custom)
    const phone = cleanPhoneForWhatsApp(params.phone)

    if (!phone) {
      return { success: false, message: "Missing or invalid phone number" }
    }

    try {
      // Send purely the input variables to the WABA template API (NO Marathi text body sent)
      const payload = {
        phone,
        template_name: "fee_installment_reminder",
        template_id: "fee_installment_reminder",
        language: "en",
        // The 8 input variables for the approved WABA template
        studentName: params.studentName,
        installmentNo: params.installmentNo,
        dueDate: params.dueDate,
        installmentAmount: params.installmentAmount,
        paidAmount: params.paidAmount,
        pendingAmount: params.pendingAmount,
        totalPaid: params.totalPaid,
        totalPending: params.totalPending,
        // Array of input variables corresponding to {{1}} through {{8}}
        parameters: [
          params.studentName,
          params.installmentNo,
          params.dueDate,
          params.installmentAmount,
          params.paidAmount,
          params.pendingAmount,
          params.totalPaid,
          params.totalPending,
        ],
        // Key-value variables for gateways supporting named keys
        variables: {
          "Student Name": params.studentName,
          "Installment No.": params.installmentNo,
          "Due Date": params.dueDate,
          "Installment Amount": params.installmentAmount,
          "Paid Amount": params.paidAmount,
          "Pending Amount": params.pendingAmount,
          "Total Paid": params.totalPaid,
          "Total Pending": params.totalPending,
        },
        invoiceId: inv.id,
        wabaConfig: wabaConfig.token && wabaConfig.phoneNumberId ? wabaConfig : undefined,
      }

      const res: any = await whatsappApi.sendFeeReminder(payload)
      return res
    } catch (err: any) {
      return { success: false, message: err.message || "Network request failed" }
    }
  }

  const handleSendIndividualReminderAPI = async (inv: Invoice) => {
    setFeeReminderResults(prev => ({
      ...prev,
      [inv.id]: { status: "sending" }
    }))
    const res = await sendFeeReminderAPI(inv)
    if (res.success) {
      setFeeReminderResults(prev => ({
        ...prev,
        [inv.id]: { status: "success", message: res.message || "Reminder sent successfully via WABA API!" }
      }))
    } else {
      setFeeReminderResults(prev => ({
        ...prev,
        [inv.id]: { status: "error", message: res.message || "Failed to send message" }
      }))
    }
  }

  const handleBulkSendFeeReminders = async () => {
    if (feeReminderBulkSending) return
    const targetList = getFeeReminderTargetInvoices().filter(i => feeReminderSelectedIds.has(i.id))

    if (targetList.length === 0) {
      alert("Please select at least one student to send fee reminders.")
      return
    }

    const confirm = window.confirm(
      `Send WhatsApp fee reminder to ${targetList.length} students using approved template "fee_installment_reminder"?`
    )
    if (!confirm) return

    setFeeReminderBulkSending(true)
    setFeeReminderProgress({
      current: 0,
      total: targetList.length,
      success: 0,
      failed: 0,
    })

    let succ = 0
    let fail = 0

    for (let i = 0; i < targetList.length; i++) {
      const inv = targetList[i]
      setFeeReminderResults(prev => ({
        ...prev,
        [inv.id]: { status: "sending" }
      }))

      const res = await sendFeeReminderAPI(inv)

      if (res.success) {
        succ++
        setFeeReminderResults(prev => ({
          ...prev,
          [inv.id]: { status: "success", message: res.message || "Reminder sent" }
        }))
      } else {
        fail++
        setFeeReminderResults(prev => ({
          ...prev,
          [inv.id]: { status: "error", message: res.message || "Sending failed" }
        }))
      }

      setFeeReminderProgress({
        current: i + 1,
        total: targetList.length,
        success: succ,
        failed: fail,
      })

      if (i < targetList.length - 1) {
        await new Promise(r => setTimeout(r, 600))
      }
    }

    setFeeReminderBulkSending(false)
  }

  const handleNextManualWebSend = () => {
    const targetList = getFeeReminderTargetInvoices().filter(i => feeReminderSelectedIds.has(i.id))
    if (targetList.length === 0) return
    const safeIndex = manualStepIndex % targetList.length
    const inv = targetList[safeIndex]
    handleSendIndividualReminderWeb(inv)
    setManualStepIndex((safeIndex + 1) % targetList.length)
  }

  return (
    <div className="space-y-6 pt-12 lg:pt-0">

      {/* Summary Cards */}
      <div className="hidden grid-cols-1 sm:grid-cols-3 gap-4">
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
            <Button
              onClick={openFeeReminderModal}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium shadow-sm transition-all flex items-center gap-2"
              title="Send WhatsApp Fee Installment Reminder to students"
            >
              <MessageCircle className="h-4 w-4 text-emerald-100" />
              <span>Send Fee Reminder</span>
              {filteredInvoices.length > 0 && (
                <Badge variant="secondary" className="bg-emerald-800 text-emerald-100 text-[11px] px-1.5 py-0 h-5">
                  {filteredInvoices.length}
                </Badge>
              )}
            </Button>
            <Button onClick={openModal} className="bg-slate-900 hover:bg-slate-800 text-white">
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
                    <TableHead className="text-white font-semibold w-[100px]">ID</TableHead>
                    <TableHead className="text-white font-semibold min-w-[200px] w-[25%]">Student</TableHead>
                    <TableHead className="text-white font-semibold hidden sm:table-cell w-[120px]">Total Fee</TableHead>
                    <TableHead className="text-white font-semibold hidden sm:table-cell w-[120px]">Amount</TableHead>
                    <TableHead className="text-white font-semibold hidden md:table-cell w-[120px]">Paid</TableHead>
                    {/* ── NEW column ── */}
                    <TableHead className="text-white font-semibold hidden lg:table-cell w-[120px]">Install Date</TableHead>
                    <TableHead className="text-white font-semibold hidden lg:table-cell w-[150px]">Next Installment Date</TableHead>
                    <TableHead className="text-white font-semibold w-[100px]">Status</TableHead>
                    <TableHead className="text-white font-semibold text-center w-auto">Actions</TableHead>
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
                    const rcpNo = inv.receipt_number
                      ? `RCP-${String(inv.receipt_number).padStart(4, "0")}`
                      : `INV${String(inv.id).padStart(3, "0")}`
                    return (
                      <TableRow key={inv.id} className="hover:bg-muted/50">
                        <TableCell className="font-medium">
                          <div>{rcpNo}</div>
                          {inv.offline_receipt_number && (
                            <div className="text-[10px] text-muted-foreground">Off: {inv.offline_receipt_number}</div>
                          )}
                        </TableCell>
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
                        <TableCell className="hidden sm:table-cell text-blue-600 font-medium">₹{Number(inv.student_fee || 0).toLocaleString()}</TableCell>
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
                              onClick={() => openPrintDialog(inv)}>
                              <Printer className="h-4 w-4" />
                            </Button>
                            <Button size="sm" variant="outline" className="h-8 w-8 p-0 text-teal-600 hover:text-teal-700 hover:border-teal-300"
                              title="Download Receipt"
                              onClick={() => {
                                const receiptData: ReceiptData = {
                                  ...inv,
                                  amount: Number(inv.amount),
                                  paid_amount: Number(inv.paid_amount),
                                };
                                downloadReceipt(receiptData, "full");
                              }}>
                              <Download className="h-4 w-4" />
                            </Button>
                            <Button size="sm" variant="outline" className="h-8 w-8 p-0 text-green-600 hover:text-green-700 hover:border-green-300"
                              title="Send WhatsApp Receipt"
                              onClick={() => openWhatsAppModal(inv)}>
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

      {/* ── Create / Edit Invoice Modal ────────────────────── */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
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
                      No students found for &quot;{studentSearch}&quot;
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
                {/* Scholarship Reason */}
                <div className="space-y-1 col-span-2">
                  <Label>Scholarship Reason/Category <span className="text-xs text-muted-foreground">(Optional)</span></Label>
                  <Input
                    value={form.scholarship_reason}
                    onChange={e => f("scholarship_reason", e.target.value)}
                    placeholder="e.g. Merit, Sports, Economically Weaker"
                    className="bg-white"
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
                <Label>Payment Date</Label>
                <Input type="date" value={form.install_date} onChange={e => f("install_date", e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Payment Mode <span className="text-destructive">*</span></Label>
                <Select value={form.transaction_type} onValueChange={v => f("transaction_type", v)}>
                  <SelectTrigger><SelectValue placeholder="Select mode" /></SelectTrigger>
                  <SelectContent>
                    {PAYMENT_MODES.map(mode => (
                      <SelectItem key={mode} value={mode}>{mode}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Transaction Reference */}
            <div className="space-y-2">
              <Label>Transaction Reference Number <span className="text-xs text-muted-foreground">(Optional)</span></Label>
              <Input value={form.transaction_ref} onChange={e => f("transaction_ref", e.target.value)} placeholder="e.g. UPI ID, Cheque No, Card last 4" />
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

            {/* Offline Receipt Number */}
            <div className="space-y-2">
              <Label>Offline Receipt Number <span className="text-xs text-muted-foreground">(Optional – for manual receipts)</span></Label>
              <Input value={form.offline_receipt_number} onChange={e => f("offline_receipt_number", e.target.value)} placeholder="e.g. Manual receipt book number" />
            </div>

            {/* Remarks */}
            <div className="space-y-2">
              <Label>Remarks <span className="text-xs text-muted-foreground">(Optional)</span></Label>
              <Input value={form.remarks} onChange={e => f("remarks", e.target.value)} placeholder="Any additional notes..." />
            </div>

            {/* Generated By */}
            <div className="space-y-2">
              <Label>Generated By</Label>
              <Input value={form.generated_by} onChange={e => f("generated_by", e.target.value)} placeholder="Auto-filled from login" />
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
        <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Invoice Details</DialogTitle></DialogHeader>
          {selected && (() => {
            const status = getStatus(selected)
            const rcpNo = selected.receipt_number
              ? `RCP-${String(selected.receipt_number).padStart(4, "0")}`
              : `INV${String(selected.id).padStart(3, "0")}`
            return (
              <div className="space-y-3">
                <div className="text-center pb-4 border-b">
                  <h3 className="text-lg font-bold text-blue-600">Vidyaaniketan Professional Academy</h3>
                  <p className="text-muted-foreground">Receipt #{rcpNo}</p>
                  {selected.offline_receipt_number && (
                    <p className="text-xs text-muted-foreground">Offline: {selected.offline_receipt_number}</p>
                  )}
                </div>
                {([
                  ["Student",          selected.student_name],
                  ["Standard",         selected.student_standard || selected.standard],
                  ["Batch",            selected.student_batch || selected.course],
                  ["Branch",           selected.student_branch],
                  ["Description",      selected.description],
                  ["Payment Mode",     selected.transaction_type],
                  ["Txn Reference",    selected.transaction_ref],
                  ["Payment Date",     fmtDate(selected.install_date)],
                  ["Next Installment Date", fmtDate(selected.due_date)],
                  ...(Number(selected.student_school_fee || 0) + Number(selected.student_academy_fee || 0) + Number(selected.student_hostel_fee || 0) > 0 ? [
                    ["Original Fee", `₹${(Number(selected.student_school_fee || 0) + Number(selected.student_academy_fee || 0) + Number(selected.student_hostel_fee || 0)).toLocaleString()}`]
                  ] : []),
                  ...(Number(selected.student_scholarship_amount || 0) > 0 ? [
                    ["Scholarship / Concession", `-₹${Number(selected.student_scholarship_amount).toLocaleString()} (${selected.student_scholarship_type === "Percent" ? `${selected.student_scholarship_value}%` : "Flat"})`]
                  ] : []),
                  ...(selected.scholarship_reason ? [["Scholarship Reason", selected.scholarship_reason]] : []),
                  ["Total Payable",    `₹${Number(selected.amount).toLocaleString()}`],
                  ["Paid Amount",      `₹${Number(selected.paid_amount).toLocaleString()}`],
                  ["Outstanding Balance", `₹${(Number(selected.amount) - Number(selected.paid_amount)).toLocaleString()}`],
                  ...(selected.remarks ? [["Remarks", selected.remarks]] : []),
                  ...(selected.generated_by ? [["Generated By", selected.generated_by]] : []),
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
                  <Button variant="outline" size="sm" onClick={() => { setViewOpen(false); openPrintDialog(selected) }}>
                    <Printer className="h-4 w-4 mr-2" /> Print Receipt
                  </Button>
                </div>
              </div>
            )
          })()}
        </DialogContent>
      </Dialog>

      {/* ── Print Preview Dialog ─────────────────────────────── */}
      <Dialog open={printDialogOpen} onOpenChange={setPrintDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Printer className="h-5 w-5" /> Print Receipt
            </DialogTitle>
          </DialogHeader>

          {printInvoice && (
            <div className="space-y-5 py-2">
              {/* Receipt Info */}
              <div className="rounded-lg bg-slate-50 p-4 space-y-1.5 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Student:</span>
                  <span className="font-semibold">{printInvoice.student_name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Amount:</span>
                  <span className="font-semibold">₹{Number(printInvoice.amount).toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Paid:</span>
                  <span className="font-semibold text-emerald-600">₹{Number(printInvoice.paid_amount).toLocaleString()}</span>
                </div>
              </div>

              {/* Layout Selection */}
              <div className="space-y-3">
                <Label className="text-sm font-semibold">Select Print Layout</Label>
                <div className="grid grid-cols-3 gap-3">
                  {/* Top Half */}
                  <button
                    onClick={() => setPrintLayout("top")}
                    className={`relative rounded-lg border-2 p-3 text-center transition-all hover:border-blue-400 ${printLayout === "top" ? "border-blue-500 bg-blue-50 ring-2 ring-blue-200" : "border-gray-200"}`}
                  >
                    <div className="mb-2 mx-auto w-12 h-16 border border-gray-300 rounded overflow-hidden">
                      <div className="h-1/2 bg-blue-500 flex items-center justify-center">
                        <span className="text-[6px] text-white font-bold">PRINT</span>
                      </div>
                      <div className="h-1/2 bg-gray-100"></div>
                    </div>
                    <p className="text-xs font-semibold">Top Half</p>
                  </button>

                  {/* Bottom Half */}
                  <button
                    onClick={() => setPrintLayout("bottom")}
                    className={`relative rounded-lg border-2 p-3 text-center transition-all hover:border-blue-400 ${printLayout === "bottom" ? "border-blue-500 bg-blue-50 ring-2 ring-blue-200" : "border-gray-200"}`}
                  >
                    <div className="mb-2 mx-auto w-12 h-16 border border-gray-300 rounded overflow-hidden">
                      <div className="h-1/2 bg-gray-100"></div>
                      <div className="h-1/2 bg-blue-500 flex items-center justify-center">
                        <span className="text-[6px] text-white font-bold">PRINT</span>
                      </div>
                    </div>
                    <p className="text-xs font-semibold">Bottom Half</p>
                  </button>

                  {/* Full A4 */}
                  <button
                    onClick={() => setPrintLayout("full")}
                    className={`relative rounded-lg border-2 p-3 text-center transition-all hover:border-blue-400 ${printLayout === "full" ? "border-blue-500 bg-blue-50 ring-2 ring-blue-200" : "border-gray-200"}`}
                  >
                    <div className="mb-2 mx-auto w-12 h-16 border border-gray-300 rounded overflow-hidden">
                      <div className="h-1/2 bg-blue-500 flex items-center justify-center">
                        <span className="text-[6px] text-white font-bold">PRINT</span>
                      </div>
                      <div className="h-1/2 bg-blue-500 flex items-center justify-center border-t border-blue-300">
                        <span className="text-[6px] text-white font-bold">PRINT</span>
                      </div>
                    </div>
                    <p className="text-xs font-semibold">Full A4</p>
                  </button>
                </div>

                {/* Layout description */}
                <div className="text-xs text-muted-foreground bg-amber-50 border border-amber-200 rounded-lg p-3">
                  {printLayout === "top" && (
                    <>⬆ <b>Top Half Printing:</b> Left side = ORIGINAL COPY, Right side = OFFICE COPY. Bottom half remains blank for reuse.</>
                  )}
                  {printLayout === "bottom" && (
                    <>⬇ <b>Bottom Half Printing:</b> Top half remains blank. Bottom: Left = ORIGINAL COPY, Right = OFFICE COPY.</>
                  )}
                  {printLayout === "full" && (
                    <>◼ <b>Full A4 Printing:</b> All 4 receipt sections printed. Top & Bottom both have ORIGINAL (left) and OFFICE (right) copies.</>
                  )}
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0 flex sm:flex-row flex-col">
            <Button variant="outline" onClick={() => setPrintDialogOpen(false)}>Cancel</Button>
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="text-teal-600 border-teal-200 hover:bg-teal-50"
                onClick={() => {
                  if (!printInvoice) return
                  const receiptData: ReceiptData = {
                    ...printInvoice,
                    amount: Number(printInvoice.amount),
                    paid_amount: Number(printInvoice.paid_amount),
                  }
                  downloadReceipt(receiptData, printLayout)
                  setPrintDialogOpen(false)
                }}
              >
                <Download className="h-4 w-4 mr-2" /> Download HTML
              </Button>
              <Button onClick={executePrint} className="bg-blue-600 hover:bg-blue-700 text-white">
                <Printer className="h-4 w-4 mr-2" /> Print Now
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── WhatsApp Send Dialog ─────────────────────────────── */}
      <Dialog open={whatsappDialogOpen} onOpenChange={setWhatsappDialogOpen}>
        <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-emerald-700">
              <MessageCircle className="h-5 w-5 text-emerald-600" /> Send WhatsApp Confirmation
            </DialogTitle>
          </DialogHeader>

          {whatsappInvoice && (() => {
            const inv = whatsappInvoice
            const rcpNo = inv.receipt_number
              ? `RCP-${String(inv.receipt_number).padStart(4, "0")}`
              : inv.offline_receipt_number || `INV${String(inv.id).padStart(3, "0")}`
            const dateStr = inv.install_date ? fmtDate(inv.install_date) : fmtDate(new Date().toISOString())
            const paid = Number(inv.paid_amount || 0).toLocaleString("en-IN")
            const totalPaid = Number(inv.student_paid_fee ?? inv.paid_amount ?? 0).toLocaleString("en-IN")
            const studentTotalFee = Number(inv.student_fee ?? inv.amount ?? 0)
            const studentTotalPaid = Number(inv.student_paid_fee ?? inv.paid_amount ?? 0)
            const totalPending = Number(Math.max(0, studentTotalFee - studentTotalPaid)).toLocaleString("en-IN")

            return (
              <div className="space-y-4 py-2">
                {/* Recipient Details & Phone Input */}
                <div className="space-y-2 rounded-lg bg-emerald-50/70 p-3.5 border border-emerald-200/80">
                  <div className="flex justify-between items-center text-sm font-semibold text-emerald-900">
                    <span>Student: {inv.student_name}</span>
                    <Badge variant="outline" className="border-emerald-300 text-emerald-800 bg-white">{rcpNo}</Badge>
                  </div>

                  <div className="pt-2">
                    <Label htmlFor="whatsapp-phone" className="text-xs text-emerald-800 font-medium flex items-center gap-1 mb-1">
                      <Phone className="h-3.5 w-3.5" /> Receiver Phone Number <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="whatsapp-phone"
                      value={whatsappPhone}
                      onChange={(e) => setWhatsappPhone(e.target.value)}
                      placeholder="e.g. 9876543210 or 919876543210"
                      className="bg-white border-emerald-300 focus-visible:ring-emerald-500 font-mono text-sm"
                    />
                    <p className="text-[11px] text-emerald-700 mt-1">
                      10-digit mobile numbers will automatically use country code +91.
                    </p>
                  </div>
                </div>

                {/* Template Variables Preview Card */}
                <div className="space-y-2 rounded-lg border bg-slate-50 p-3.5 text-xs">
                  <div className="flex justify-between items-center border-b pb-1.5 font-semibold text-slate-700">
                    <span>RHAI Tech Template Variables</span>
                    <span className="text-[10px] text-muted-foreground font-normal">Template: administration_department</span>
                  </div>

                  <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 pt-1 text-slate-600">
                    <div>
                      <span className="text-muted-foreground">Student Name:</span>
                      <p className="font-semibold text-slate-800 truncate">{inv.student_name || "-"}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Receipt No.:</span>
                      <p className="font-semibold text-slate-800">{rcpNo}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Payment Date:</span>
                      <p className="font-semibold text-slate-800">{dateStr}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Paid Amount:</span>
                      <p className="font-semibold text-emerald-700">₹{paid}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Total Paid:</span>
                      <p className="font-semibold text-slate-800">₹{totalPaid}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Total Pending:</span>
                      <p className="font-semibold text-amber-700">₹{totalPending}</p>
                    </div>
                  </div>
                </div>

                {/* Status Feedback Banner */}
                {whatsappStatus && (
                  <div className={`p-3 rounded-lg border text-xs flex items-start gap-2 ${
                    whatsappStatus.type === "success"
                      ? "bg-emerald-50 border-emerald-300 text-emerald-900"
                      : "bg-red-50 border-red-300 text-red-900"
                  }`}>
                    {whatsappStatus.type === "success" ? (
                      <CheckCircle className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                    ) : (
                      <AlertCircle className="h-4 w-4 text-red-600 shrink-0 mt-0.5" />
                    )}
                    <div>
                      <p className="font-medium">{whatsappStatus.message}</p>
                    </div>
                  </div>
                )}
              </div>
            )
          })()}

          <DialogFooter className="gap-2 sm:gap-0 flex sm:flex-row flex-col">
            <Button variant="outline" onClick={() => setWhatsappDialogOpen(false)}>Cancel</Button>
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="text-emerald-700 border-emerald-300 hover:bg-emerald-50 text-xs"
                onClick={handleWhatsAppWebFallback}
                title="Open via WhatsApp Web browser link"
              >
                <MessageCircle className="h-3.5 w-3.5 mr-1.5 text-emerald-600" /> WhatsApp Web
              </Button>
              <Button
                onClick={executeSendWhatsApp}
                disabled={whatsappSending}
                className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold"
              >
                {whatsappSending ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> Sending...
                  </>
                ) : (
                  <>
                    <Send className="h-3.5 w-3.5 mr-1.5" /> Send WhatsApp API
                  </>
                )}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Fee Installment Reminder (WABA) Dialog ────────────── */}
      <Dialog open={feeReminderModalOpen} onOpenChange={setFeeReminderModalOpen}>
        <DialogContent className="sm:max-w-4xl max-h-[92vh] overflow-y-auto p-4 sm:p-6 space-y-4">
          <DialogHeader className="space-y-1 border-b pb-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <DialogTitle className="flex items-center gap-2 text-emerald-700 text-lg sm:text-xl font-bold">
                  <MessageCircle className="h-5 w-5 text-emerald-600" /> WhatsApp Fee Installment Reminder
                </DialogTitle>
                <div className="flex flex-wrap items-center gap-2 mt-1.5">
                  <Badge variant="outline" className="border-emerald-300 bg-emerald-50 text-emerald-800 text-[11px] font-mono font-medium">
                    Template: fee_installment_reminder
                  </Badge>
                  <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100 border-0 text-[10px] font-semibold">
                    APPROVED
                  </Badge>
                  <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100 border-0 text-[10px] font-semibold">
                    UTILITY
                  </Badge>
                  <Badge className="bg-slate-100 text-slate-700 hover:bg-slate-100 border-0 text-[10px] font-semibold">
                    Language: en
                  </Badge>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setFeeReminderSettingsOpen(prev => !prev)}
                className="text-xs flex items-center gap-1.5 text-slate-700 border-slate-300 hover:bg-slate-100 self-start sm:self-auto"
              >
                <Settings className="h-3.5 w-3.5 text-slate-600" />
                <span>WABA API Settings</span>
                {feeReminderSettingsOpen ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
              </Button>
            </div>
          </DialogHeader>

          {/* ── Meta Cloud API Settings Drawer ── */}
          {feeReminderSettingsOpen && (
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3.5 text-xs space-y-3 animate-in fade-in">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-800 flex items-center gap-1.5">
                  <Settings className="h-3.5 w-3.5 text-emerald-600" /> Meta WhatsApp Business Cloud API Configuration
                </span>
                <Badge variant="outline" className="text-[10px] bg-white">
                  {wabaConfig.token && wabaConfig.phoneNumberId ? "Configured" : "Not Configured (Optional)"}
                </Badge>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <Label className="text-[11px] font-medium text-slate-700 mb-1 block">Meta Phone Number ID</Label>
                  <Input
                    value={wabaConfig.phoneNumberId}
                    onChange={e => saveWabaConfig({ ...wabaConfig, phoneNumberId: e.target.value })}
                    placeholder="e.g. 104598239012345"
                    className="h-8 text-xs bg-white font-mono"
                  />
                </div>
                <div>
                  <Label className="text-[11px] font-medium text-slate-700 mb-1 block">Meta System User / Permanent Token</Label>
                  <Input
                    type="password"
                    value={wabaConfig.token}
                    onChange={e => saveWabaConfig({ ...wabaConfig, token: e.target.value })}
                    placeholder="EAAG... (Meta Cloud API Token)"
                    className="h-8 text-xs bg-white font-mono"
                  />
                </div>
              </div>
              <p className="text-[11px] text-muted-foreground leading-normal">
                Credentials entered here are saved in your browser localStorage. When configured, clicking <strong>Send WABA API</strong> triggers automated delivery through Meta. You can always use <strong>WhatsApp Web</strong> to send messages instantly without API credentials.
              </p>
            </div>
          )}

          {/* ── Audience Selector & Stats Bar ── */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-emerald-50/60 p-3 rounded-lg border border-emerald-200/80">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-semibold text-emerald-950 flex items-center gap-1">
                <Users className="h-3.5 w-3.5 text-emerald-700" /> Filter:
              </span>
              <Button
                type="button"
                size="sm"
                variant={feeReminderFilterMode === "pending" ? "default" : "outline"}
                onClick={() => switchFeeReminderMode("pending")}
                className={`h-7 text-xs ${
                  feeReminderFilterMode === "pending"
                    ? "bg-emerald-700 hover:bg-emerald-800 text-white"
                    : "bg-white text-slate-700 hover:bg-emerald-100/50 border-emerald-200"
                }`}
              >
                Pending Dues Only ({
                  filteredInvoices.filter(inv => {
                    const amount = Number(inv.amount || 0)
                    const paid = Number(inv.paid_amount || 0)
                    const status = getStatus(inv)
                    return paid < amount || status === "Pending" || status === "Partial" || status === "Overdue"
                  }).length
                })
              </Button>
              <Button
                type="button"
                size="sm"
                variant={feeReminderFilterMode === "all" ? "default" : "outline"}
                onClick={() => switchFeeReminderMode("all")}
                className={`h-7 text-xs ${
                  feeReminderFilterMode === "all"
                    ? "bg-emerald-700 hover:bg-emerald-800 text-white"
                    : "bg-white text-slate-700 hover:bg-emerald-100/50 border-emerald-200"
                }`}
              >
                All Filtered Invoices ({filteredInvoices.length})
              </Button>
            </div>

            <div className="flex items-center gap-2 text-xs">
              <span className="text-slate-600">
                Selected: <strong className="text-emerald-800">{feeReminderSelectedIds.size}</strong> of {getFeeReminderTargetInvoices().length}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={toggleSelectAllFeeReminders}
                className="h-7 text-xs bg-white text-emerald-700 border-emerald-300 hover:bg-emerald-50 px-2.5"
              >
                {feeReminderSelectedIds.size === getFeeReminderTargetInvoices().length && getFeeReminderTargetInvoices().length > 0
                  ? "Deselect All"
                  : "Select All"}
              </Button>
            </div>
          </div>

          {/* ── Approved Template Live Preview ── */}
          {(() => {
            const currentTargets = getFeeReminderTargetInvoices()
            const previewInvoice = invoices.find(i => i.id === feeReminderPreviewId) || currentTargets[0] || null
            const previewParams = previewInvoice ? buildFeeReminderParams(previewInvoice, feeReminderCustomData[previewInvoice.id]) : null
            const previewTextMessage = previewParams ? generateFeeReminderMessage(previewParams) : ""

            return (
              <div className="rounded-lg border border-emerald-200 bg-emerald-50/20 overflow-hidden text-xs">
                <div className="bg-emerald-100/70 px-3.5 py-2 flex items-center justify-between border-b border-emerald-200">
                  <div className="flex items-center gap-1.5 font-semibold text-emerald-950">
                    <Eye className="h-3.5 w-3.5 text-emerald-700" />
                    <span>Template Live Preview</span>
                    {previewInvoice && (
                      <Badge variant="outline" className="bg-white text-emerald-800 border-emerald-300 font-normal text-[11px] ml-1">
                        Student: {previewInvoice.student_name}
                      </Badge>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      if (previewTextMessage) {
                        navigator.clipboard.writeText(previewTextMessage)
                        setFeeReminderCopied(true)
                        setTimeout(() => setFeeReminderCopied(false), 2000)
                      }
                    }}
                    className="h-6 text-[11px] text-emerald-800 hover:bg-emerald-200/50 flex items-center gap-1 px-2"
                  >
                    {feeReminderCopied ? <Check className="h-3 w-3 text-emerald-700" /> : <Copy className="h-3 w-3" />}
                    <span>{feeReminderCopied ? "Copied!" : "Copy Text"}</span>
                  </Button>
                </div>
                <div className="p-3.5 bg-white font-sans text-slate-800 leading-relaxed whitespace-pre-line border-l-4 border-l-emerald-600 max-h-48 overflow-y-auto font-mono text-[11.5px]">
                  {previewTextMessage || "No student selected for preview"}
                </div>
              </div>
            )
          })()}

          {/* ── Student Recipients List Table ── */}
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-3">
              <span className="text-xs font-semibold text-slate-700">
                Recipients Queue ({getFeeReminderTargetInvoices().length} students):
              </span>
              <div className="relative w-48 sm:w-64">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  value={feeReminderSearch}
                  onChange={e => setFeeReminderSearch(e.target.value)}
                  placeholder="Search student or phone..."
                  className="h-7 text-xs pl-8"
                />
              </div>
            </div>

            <div className="rounded-md border border-slate-200 overflow-x-auto max-h-64 overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-100/80 text-[11px] h-8">
                    <TableHead className="w-10 text-center p-1">
                      <Checkbox
                        checked={
                          getFeeReminderTargetInvoices().length > 0 &&
                          getFeeReminderTargetInvoices().every(i => feeReminderSelectedIds.has(i.id))
                        }
                        onCheckedChange={toggleSelectAllFeeReminders}
                        aria-label="Select all"
                      />
                    </TableHead>
                    <TableHead className="min-w-[150px] font-semibold text-slate-700">Student</TableHead>
                    <TableHead className="min-w-[130px] font-semibold text-slate-700">Phone</TableHead>
                    <TableHead className="w-[80px] font-semibold text-slate-700">Inst. #</TableHead>
                    <TableHead className="w-[100px] font-semibold text-slate-700">Due Date</TableHead>
                    <TableHead className="w-[90px] font-semibold text-slate-700 text-right">Pending (₹)</TableHead>
                    <TableHead className="w-[110px] font-semibold text-slate-700 text-center">Status</TableHead>
                    <TableHead className="w-[110px] font-semibold text-slate-700 text-center">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {getFeeReminderTargetInvoices().length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-6 text-xs text-muted-foreground">
                        No students matching the current filter.
                      </TableCell>
                    </TableRow>
                  ) : (
                    getFeeReminderTargetInvoices().map(inv => {
                      const isSelected = feeReminderSelectedIds.has(inv.id)
                      const isPreview = feeReminderPreviewId === inv.id
                      const custom = feeReminderCustomData[inv.id] || {
                        phone: String(inv.student_phone || ""),
                        installmentNo: calculateInstallmentNo(inv, invoices),
                        dueDate: inv.due_date ? fmtDate(inv.due_date) : "",
                      }
                      const result = feeReminderResults[inv.id]
                      const pendingAmount = Math.max(0, Number(inv.amount || 0) - Number(inv.paid_amount || 0))

                      return (
                        <TableRow
                          key={inv.id}
                          className={`text-xs hover:bg-slate-50 transition-colors ${
                            isPreview ? "bg-emerald-50/40" : ""
                          }`}
                        >
                          <TableCell className="p-1 text-center">
                            <Checkbox
                              checked={isSelected}
                              onCheckedChange={() => toggleSelectFeeReminder(inv.id)}
                            />
                          </TableCell>
                          <TableCell
                            className="cursor-pointer"
                            onClick={() => setFeeReminderPreviewId(inv.id)}
                            title="Click to preview message"
                          >
                            <div className="font-semibold text-slate-800 flex items-center gap-1.5">
                              <span>{inv.student_name}</span>
                              {isPreview && (
                                <Badge className="bg-emerald-600 text-white text-[9px] px-1 py-0 h-4">
                                  Previewing
                                </Badge>
                              )}
                            </div>
                            <div className="text-[10px] text-muted-foreground">
                              {[inv.student_standard || inv.standard, inv.student_batch || inv.course].filter(Boolean).join(" · ")}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Input
                              value={custom.phone}
                              onChange={e => updateFeeReminderCustomField(inv.id, "phone", e.target.value)}
                              placeholder="Phone"
                              className="h-7 text-xs font-mono w-28 bg-white border-slate-200"
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              value={custom.installmentNo}
                              onChange={e => updateFeeReminderCustomField(inv.id, "installmentNo", e.target.value)}
                              placeholder="1"
                              className="h-7 text-xs w-14 text-center bg-white border-slate-200"
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              value={custom.dueDate}
                              onChange={e => updateFeeReminderCustomField(inv.id, "dueDate", e.target.value)}
                              placeholder="DD/MM/YYYY"
                              className="h-7 text-xs font-mono w-24 bg-white border-slate-200"
                            />
                          </TableCell>
                          <TableCell className="text-right font-medium text-amber-700">
                            ₹{pendingAmount.toLocaleString("en-IN")}
                          </TableCell>
                          <TableCell className="text-center">
                            {result?.status === "sending" && (
                              <Badge className="bg-blue-100 text-blue-800 border-0 flex items-center justify-center gap-1 text-[10px] py-0.5">
                                <Loader2 className="h-2.5 w-2.5 animate-spin" /> Sending
                              </Badge>
                            )}
                            {result?.status === "success" && (
                              <Badge className="bg-emerald-100 text-emerald-800 border-0 flex items-center justify-center gap-1 text-[10px] py-0.5" title={result.message}>
                                <CheckCircle className="h-2.5 w-2.5" /> Sent
                              </Badge>
                            )}
                            {result?.status === "error" && (
                              <Badge className="bg-red-100 text-red-800 border-0 flex items-center justify-center gap-1 text-[10px] py-0.5" title={result.message}>
                                <AlertCircle className="h-2.5 w-2.5" /> Failed
                              </Badge>
                            )}
                            {(!result || result.status === "pending") && (
                              <span className="text-[10px] text-muted-foreground">Ready</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center justify-center gap-1">
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 px-2 text-emerald-700 border-emerald-300 hover:bg-emerald-50 text-[11px]"
                                title="Open WhatsApp Web with Marathi reminder"
                                onClick={() => handleSendIndividualReminderWeb(inv)}
                              >
                                <MessageCircle className="h-3 w-3 mr-1 text-emerald-600" /> Web
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 px-2 text-blue-700 border-blue-300 hover:bg-blue-50 text-[11px]"
                                title="Send via WABA API"
                                disabled={result?.status === "sending"}
                                onClick={() => handleSendIndividualReminderAPI(inv)}
                              >
                                <Send className="h-3 w-3" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      )
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          </div>

          {/* ── Bulk Sending Progress Bar ── */}
          {feeReminderBulkSending && (
            <div className="space-y-1.5 bg-slate-50 p-3 rounded-lg border border-slate-200">
              <div className="flex items-center justify-between text-xs font-medium text-slate-700">
                <span className="flex items-center gap-1.5">
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-emerald-600" />
                  Sending Reminders: {feeReminderProgress.current} / {feeReminderProgress.total}
                </span>
                <span className="text-emerald-700 font-semibold">
                  {Math.round((feeReminderProgress.current / (feeReminderProgress.total || 1)) * 100)}%
                </span>
              </div>
              <Progress
                value={(feeReminderProgress.current / (feeReminderProgress.total || 1)) * 100}
                className="h-2"
              />
              <div className="flex justify-between text-[11px] text-muted-foreground pt-1">
                <span className="text-emerald-700 font-medium">✓ {feeReminderProgress.success} Successful</span>
                <span className="text-red-700 font-medium">✕ {feeReminderProgress.failed} Failed</span>
              </div>
            </div>
          )}

          {/* ── Dialog Footer with Bulk Actions ── */}
          <DialogFooter className="gap-2 sm:gap-0 flex flex-col sm:flex-row sm:justify-between items-center border-t pt-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setFeeReminderModalOpen(false)}
              disabled={feeReminderBulkSending}
              className="text-xs w-full sm:w-auto"
            >
              Close
            </Button>

            <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto justify-end">
              <Button
                variant="outline"
                size="sm"
                onClick={handleNextManualWebSend}
                disabled={feeReminderBulkSending || feeReminderSelectedIds.size === 0}
                className="text-xs border-emerald-300 text-emerald-800 hover:bg-emerald-50"
                title="Send via WhatsApp Web for each selected student step-by-step"
              >
                <ExternalLink className="h-3.5 w-3.5 mr-1 text-emerald-600" />
                Step-by-Step Web Send
              </Button>

              <Button
                size="sm"
                onClick={handleBulkSendFeeReminders}
                disabled={feeReminderBulkSending || feeReminderSelectedIds.size === 0}
                className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-sm"
              >
                {feeReminderBulkSending ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> Sending ({feeReminderProgress.current}/{feeReminderProgress.total})...
                  </>
                ) : (
                  <>
                    <Send className="h-3.5 w-3.5 mr-1.5" />
                    <span>Send WABA Reminders ({feeReminderSelectedIds.size})</span>
                  </>
                )}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
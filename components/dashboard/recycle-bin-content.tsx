"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import {
  Trash2, RotateCcw, Loader2, GraduationCap, Users,
  ClipboardList, Calendar, Receipt, Wallet, BookOpen, AlertTriangle
} from "lucide-react"
import { recycleBinApi } from "@/lib/api"

type TabType = "students" | "teachers" | "inquiries" | "appointments" | "invoices" | "finance" | "updates"

interface DeletedData {
  students: any[]
  teachers: any[]
  inquiries: any[]
  appointments: any[]
  invoices: any[]
  finance: any[]
  updates: any[]
}

export function RecycleBinContent() {
  const [data, setData] = useState<DeletedData>({
    students: [],
    teachers: [],
    inquiries: [],
    appointments: [],
    invoices: [],
    finance: [],
    updates: [],
  })
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<TabType>("students")
  const [actioningId, setActioningId] = useState<number | null>(null)

  const fetchDeleted = async () => {
    setLoading(true)
    try {
      const res = await recycleBinApi.getAll()
      if (res.success && res.data) {
        setData(res.data)
      }
    } catch (err) {
      console.error("Failed to load recycle bin data:", err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchDeleted()
  }, [])

  const handleRestore = async (type: string, id: number) => {
    if (!confirm(`Are you sure you want to restore this ${type}?`)) return
    setActioningId(id)
    try {
      const apiType = type === "class update" ? "update" : type
      const res = await recycleBinApi.restore(apiType, id)
      if (res.success) {
        alert(`${type.charAt(0).toUpperCase() + type.slice(1)} restored successfully!`)
        fetchDeleted()
      }
    } catch (err: any) {
      alert(err.message || "Failed to restore item")
    } finally {
      setActioningId(null)
    }
  }

  const handleDeletePermanently = async (type: string, id: number) => {
    if (!confirm(`⚠️ WARNING: This will permanently delete this ${type} and cannot be undone. Are you absolutely sure?`)) return
    setActioningId(id)
    try {
      const apiType = type === "class update" ? "update" : type
      const res = await recycleBinApi.deletePermanently(apiType, id)
      if (res.success) {
        alert(`${type.charAt(0).toUpperCase() + type.slice(1)} permanently deleted!`)
        fetchDeleted()
      }
    } catch (err: any) {
      alert(err.message || "Failed to permanently delete item")
    } finally {
      setActioningId(null)
    }
  }

  const tabs: { id: TabType; label: string; icon: React.ReactNode; count: number }[] = [
    { id: "students", label: "Students", icon: <GraduationCap className="h-4 w-4" />, count: data.students.length },
    { id: "teachers", label: "Teachers", icon: <Users className="h-4 w-4" />, count: data.teachers.length },
    { id: "inquiries", label: "Inquiries", icon: <ClipboardList className="h-4 w-4" />, count: data.inquiries.length },
    { id: "appointments", label: "Appointments", icon: <Calendar className="h-4 w-4" />, count: data.appointments.length },
    { id: "invoices", label: "Invoices", icon: <Receipt className="h-4 w-4" />, count: data.invoices.length },
    { id: "finance", label: "Finance", icon: <Wallet className="h-4 w-4" />, count: data.finance.length },
    { id: "updates", label: "Class Updates", icon: <BookOpen className="h-4 w-4" />, count: data.updates.length },
  ]

  const formatDateTime = (dateStr: string) => {
    if (!dateStr) return "N/A"
    try {
      return new Date(dateStr).toLocaleString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    } catch {
      return dateStr
    }
  }

  const renderTableContent = () => {
    const list = data[activeTab] || []

    if (list.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Trash2 className="h-12 w-12 text-slate-600 mb-3 animate-pulse" />
          <h3 className="text-lg font-semibold text-slate-300">Recycle Bin Empty</h3>
          <p className="text-sm text-slate-500 max-w-sm mt-1">
            There are no deleted {activeTab === "updates" ? "class updates" : activeTab} in this section.
          </p>
        </div>
      )
    }

    switch (activeTab) {
      case "students":
        return (
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-900/60">
                <TableHead className="text-white font-semibold">Name</TableHead>
                <TableHead className="text-white font-semibold">Standard</TableHead>
                <TableHead className="text-white font-semibold">Course</TableHead>
                <TableHead className="text-white font-semibold">Branch</TableHead>
                <TableHead className="text-white font-semibold">Deleted At</TableHead>
                <TableHead className="text-white font-semibold text-center">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {list.map((item: any) => (
                <TableRow key={item.id} className="hover:bg-slate-800/40">
                  <TableCell className="font-medium text-slate-300">{item.name}</TableCell>
                  <TableCell className="text-slate-400">{item.standard || "N/A"}</TableCell>
                  <TableCell className="text-slate-400">{item.course || "N/A"}</TableCell>
                  <TableCell className="text-slate-400">{item.branch || "N/A"}</TableCell>
                  <TableCell className="text-slate-400">{formatDateTime(item.deleted_at)}</TableCell>
                  <TableCell>{renderActions("student", item.id)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )

      case "teachers":
        return (
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-900/60">
                <TableHead className="text-white font-semibold">Name</TableHead>
                <TableHead className="text-white font-semibold">Email</TableHead>
                <TableHead className="text-white font-semibold">Phone</TableHead>
                <TableHead className="text-white font-semibold">Location</TableHead>
                <TableHead className="text-white font-semibold">Deleted At</TableHead>
                <TableHead className="text-white font-semibold text-center">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {list.map((item: any) => (
                <TableRow key={item.id} className="hover:bg-slate-800/40">
                  <TableCell className="font-medium text-slate-300">{item.name}</TableCell>
                  <TableCell className="text-slate-400">{item.email || "N/A"}</TableCell>
                  <TableCell className="text-slate-400">{item.phone || "N/A"}</TableCell>
                  <TableCell className="text-slate-400">{item.location || "N/A"}</TableCell>
                  <TableCell className="text-slate-400">{formatDateTime(item.deleted_at)}</TableCell>
                  <TableCell>{renderActions("teacher", item.id)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )

      case "inquiries":
        return (
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-900/60">
                <TableHead className="text-white font-semibold">Name</TableHead>
                <TableHead className="text-white font-semibold">Phone</TableHead>
                <TableHead className="text-white font-semibold">Course</TableHead>
                <TableHead className="text-white font-semibold">Standard</TableHead>
                <TableHead className="text-white font-semibold">Deleted At</TableHead>
                <TableHead className="text-white font-semibold text-center">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {list.map((item: any) => (
                <TableRow key={item.id} className="hover:bg-slate-800/40">
                  <TableCell className="font-medium text-slate-300">{item.name}</TableCell>
                  <TableCell className="text-slate-400">{item.phone || "N/A"}</TableCell>
                  <TableCell className="text-slate-400">{item.course || "N/A"}</TableCell>
                  <TableCell className="text-slate-400">{item.standard || "N/A"}</TableCell>
                  <TableCell className="text-slate-400">{formatDateTime(item.deleted_at)}</TableCell>
                  <TableCell>{renderActions("inquiry", item.id)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )

      case "appointments":
        return (
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-900/60">
                <TableHead className="text-white font-semibold">Name</TableHead>
                <TableHead className="text-white font-semibold">Course</TableHead>
                <TableHead className="text-white font-semibold">Date / Time</TableHead>
                <TableHead className="text-white font-semibold">Status</TableHead>
                <TableHead className="text-white font-semibold">Deleted At</TableHead>
                <TableHead className="text-white font-semibold text-center">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {list.map((item: any) => (
                <TableRow key={item.id} className="hover:bg-slate-800/40">
                  <TableCell className="font-medium text-slate-300">{item.name}</TableCell>
                  <TableCell className="text-slate-400">{item.course || "N/A"}</TableCell>
                  <TableCell className="text-slate-400">{item.appointment_date ? `${item.appointment_date.split("T")[0]} at ${item.appointment_time || "N/A"}` : "N/A"}</TableCell>
                  <TableCell><Badge variant="outline" className="border-slate-600 text-slate-400">{item.status}</Badge></TableCell>
                  <TableCell className="text-slate-400">{formatDateTime(item.deleted_at)}</TableCell>
                  <TableCell>{renderActions("appointment", item.id)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )

      case "invoices":
        return (
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-900/60">
                <TableHead className="text-white font-semibold">Student Name</TableHead>
                <TableHead className="text-white font-semibold">Amount</TableHead>
                <TableHead className="text-white font-semibold">Paid Amount</TableHead>
                <TableHead className="text-white font-semibold">Status</TableHead>
                <TableHead className="text-white font-semibold">Deleted At</TableHead>
                <TableHead className="text-white font-semibold text-center">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {list.map((item: any) => (
                <TableRow key={item.id} className="hover:bg-slate-800/40">
                  <TableCell className="font-medium text-slate-300">{item.student_name}</TableCell>
                  <TableCell className="text-slate-400">₹{item.amount}</TableCell>
                  <TableCell className="text-slate-400">₹{item.paid_amount}</TableCell>
                  <TableCell>
                    <Badge variant={item.status === "Paid" ? "secondary" : "destructive"}>
                      {item.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-slate-400">{formatDateTime(item.deleted_at)}</TableCell>
                  <TableCell>{renderActions("invoice", item.id)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )

      case "finance":
        return (
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-900/60">
                <TableHead className="text-white font-semibold">Name</TableHead>
                <TableHead className="text-white font-semibold">Type</TableHead>
                <TableHead className="text-white font-semibold">Amount</TableHead>
                <TableHead className="text-white font-semibold">Category</TableHead>
                <TableHead className="text-white font-semibold">Deleted At</TableHead>
                <TableHead className="text-white font-semibold text-center">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {list.map((item: any) => (
                <TableRow key={item.id} className="hover:bg-slate-800/40">
                  <TableCell className="font-medium text-slate-300">{item.name}</TableCell>
                  <TableCell>
                    <Badge variant={item.type === "Payroll" ? "outline" : "default"} className="border-slate-600 text-slate-300">
                      {item.type}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-slate-400">₹{item.amount}</TableCell>
                  <TableCell className="text-slate-400">{item.category || "N/A"}</TableCell>
                  <TableCell className="text-slate-400">{formatDateTime(item.deleted_at)}</TableCell>
                  <TableCell>{renderActions("finance", item.id)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )

      case "updates":
        return (
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-900/60">
                <TableHead className="text-white font-semibold">Teacher</TableHead>
                <TableHead className="text-white font-semibold">Batch</TableHead>
                <TableHead className="text-white font-semibold">Subject / Chapter</TableHead>
                <TableHead className="text-white font-semibold">Topic</TableHead>
                <TableHead className="text-white font-semibold">Deleted At</TableHead>
                <TableHead className="text-white font-semibold text-center">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {list.map((item: any) => (
                <TableRow key={item.id} className="hover:bg-slate-800/40">
                  <TableCell className="font-medium text-slate-300">{item.teacher_name}</TableCell>
                  <TableCell className="text-slate-400">{item.batch}</TableCell>
                  <TableCell className="text-slate-400">{item.subject} - {item.chapter}</TableCell>
                  <TableCell className="text-slate-400">{item.topic}</TableCell>
                  <TableCell className="text-slate-400">{formatDateTime(item.deleted_at)}</TableCell>
                  <TableCell>{renderActions("class update", item.id)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )
      default:
        return null
    }
  }

  const renderActions = (type: string, id: number) => {
    const isRunning = actioningId === id
    return (
      <div className="flex items-center justify-center gap-2">
        <Button
          size="sm"
          variant="outline"
          className="h-8 flex items-center gap-1.5 border-emerald-600/40 hover:bg-emerald-950/20 text-emerald-400 hover:text-emerald-300"
          onClick={() => handleRestore(type, id)}
          disabled={isRunning}
        >
          {isRunning ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RotateCcw className="h-3.5 w-3.5" />}
          Restore
        </Button>
        <Button
          size="sm"
          variant="destructive"
          className="h-8 flex items-center gap-1.5 bg-red-950/40 border border-red-500/30 hover:bg-red-900/60 text-red-400 hover:text-red-300"
          onClick={() => handleDeletePermanently(type, id)}
          disabled={isRunning}
        >
          <Trash2 className="h-3.5 w-3.5" />
          Delete
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6 pt-12 lg:pt-0">
      <Card className="bg-slate-900/40 border-slate-800 shadow-xl backdrop-blur-md">
        <CardHeader className="border-b border-slate-800/80 pb-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-2.5 text-2xl text-amber-400 font-bold tracking-tight">
                <Trash2 className="h-6 w-6 text-amber-400" /> Recycle Bin
              </CardTitle>
              <CardDescription className="text-slate-400 mt-1">
                View, restore, or permanently erase soft-deleted data.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          {/* Tab Navigation */}
          <div className="flex flex-wrap gap-1.5 p-1 bg-slate-950/60 rounded-lg border border-slate-800/80 mb-6">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-md transition-all duration-200 ${
                  activeTab === tab.id
                    ? "bg-slate-800 text-amber-400 border border-slate-700/80 shadow-md"
                    : "text-slate-400 hover:text-slate-200 hover:bg-slate-900/40"
                }`}
              >
                {tab.icon}
                <span>{tab.label}</span>
                <Badge variant="secondary" className="bg-slate-900/90 text-slate-300 border-none text-[10px] py-0 px-1.5 rounded-full">
                  {tab.count}
                </Badge>
              </button>
            ))}
          </div>

          {/* List/Table */}
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20">
              <Loader2 className="h-10 w-10 animate-spin text-amber-400 mb-3" />
              <p className="text-sm text-slate-500">Loading deleted records...</p>
            </div>
          ) : (
            <div className="rounded-lg border border-slate-800/80 bg-slate-950/20 overflow-x-auto">
              {renderTableContent()}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

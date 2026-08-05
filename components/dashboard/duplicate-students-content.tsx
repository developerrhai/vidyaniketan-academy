"use client"

import { useEffect, useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { AlertCircle, Trash2, Users } from "lucide-react"
import { studentsApi } from "@/lib/api"
import { Student } from "@/lib/student-types"

export function DuplicateStudentsContent() {
  const [duplicates, setDuplicates] = useState<Student[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  const fetchDuplicates = async () => {
    try {
      setLoading(true)
      const res = await fetch(process.env.NEXT_PUBLIC_API_URL + "/students/duplicates", {
        headers: { "Authorization": `Bearer ${localStorage.getItem("token")}` }
      })
      const data = await res.json()
      if (data.success) {
        setDuplicates(data.data)
      } else {
        setError(data.message)
      }
    } catch (err: any) {
      setError(err.message || "Failed to fetch duplicates")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchDuplicates()
  }, [])

  const handleDelete = async (id: number) => {
    if (!confirm("Are you sure you want to delete this duplicate record?")) return
    try {
      await studentsApi.remove(id.toString())
      setDuplicates(prev => prev.filter(s => s.id !== id))
    } catch (err: any) {
      alert(err.message || "Failed to delete student")
    }
  }

  // Group by aadhar
  const grouped = duplicates.reduce((acc, student) => {
    const key = student.aadhar || "unknown";
    if (!acc[key]) acc[key] = [];
    acc[key].push(student);
    return acc;
  }, {} as Record<string, Student[]>);

  if (loading) return <div className="p-8 text-center text-gray-500">Loading duplicates...</div>

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
            <Users className="w-8 h-8 text-rose-500" />
            Duplicate Students
          </h1>
          <p className="text-gray-500 mt-1">Identify and manage students with identical Aadhaar numbers.</p>
        </div>
        <Button onClick={fetchDuplicates} variant="outline">Refresh</Button>
      </div>

      {error && (
        <div className="p-4 bg-red-50 text-red-600 rounded-lg flex items-center gap-2">
          <AlertCircle className="w-5 h-5" />
          {error}
        </div>
      )}

      {Object.keys(grouped).length === 0 ? (
        <Card className="text-center py-12 border-dashed shadow-sm">
          <CardContent className="flex flex-col items-center justify-center text-gray-400">
            <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4">
              <svg className="w-8 h-8 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <p className="text-lg font-medium text-gray-700">All clear!</p>
            <p className="text-sm">No duplicate Aadhaar records found.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-8">
          {Object.entries(grouped).map(([aadhar, group]) => (
            <Card key={aadhar} className="overflow-hidden border-rose-100 shadow-sm">
              <div className="bg-rose-50/50 px-4 py-3 border-b border-rose-100 flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-rose-500" />
                <h3 className="font-semibold text-rose-900">Aadhaar: {aadhar}</h3>
                <span className="bg-rose-100 text-rose-700 text-xs font-bold px-2 py-0.5 rounded-full">
                  {(group as any[]).length} Records
                </span>
              </div>
              <Table>
                <TableHeader className="bg-gray-50/50">
                  <TableRow>
                    <TableHead className="w-20">ID</TableHead>
                    <TableHead>Student Name</TableHead>
                    <TableHead>Standard</TableHead>
                    <TableHead>Batch</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(group as any[]).map((student: any) => (
                    <TableRow key={student.id}>
                      <TableCell className="font-mono text-gray-500">#{student.id}</TableCell>
                      <TableCell className="font-medium text-gray-900">{student.name}</TableCell>
                      <TableCell>{student.standard}</TableCell>
                      <TableCell>{student.batch}</TableCell>
                      <TableCell>{student.phone}</TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm" onClick={() => handleDelete(student.id)} className="text-rose-500 hover:text-rose-600 hover:bg-rose-50">
                          <Trash2 className="w-4 h-4 mr-2" /> Delete
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

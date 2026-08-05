import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Eye, SquarePen, Pencil, IndianRupee, Trash2 } from "lucide-react"
import { Student, feeStatus, formatDob } from "@/lib/student-types"

interface StudentsTableProps {
  students: Student[];
  onView: (s: Student) => void;
  onEdit: (s: Student) => void;
  onUpdateFee: (s: Student) => void;
  onPayFee: (s: Student) => void;
  onDelete: (id: number) => void;
}

export function StudentsTable({ students, onView, onEdit, onUpdateFee, onPayFee, onDelete }: StudentsTableProps) {
  if (students.length === 0) {
    return (
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
            <TableRow>
              <TableCell colSpan={13} className="text-center py-8 text-muted-foreground">
                No students found
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>
    );
  }

  return (
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
          {students.map(s => {
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
                      onClick={() => onView(s)}>
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button size="sm" variant="outline" className="h-8 w-8 p-0 text-violet-600 hover:text-violet-700 hover:border-violet-300"
                      title="Edit student"
                      onClick={() => onEdit(s)}>
                      <SquarePen className="h-4 w-4" />
                    </Button>
                    <Button size="sm" variant="outline" className="h-8 w-8 p-0 text-blue-600 hover:text-blue-700 hover:border-blue-300"
                      title="Update total fee"
                      onClick={() => onUpdateFee(s)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button size="sm" variant="outline" className="h-8 w-8 p-0 text-emerald-600 hover:text-emerald-700 hover:border-emerald-300"
                      title="Record payment"
                      onClick={() => onPayFee(s)}>
                      <IndianRupee className="h-4 w-4" />
                    </Button>
                    <Button size="sm" variant="destructive" className="h-8 w-8 p-0"
                      onClick={() => onDelete(s.id)}>
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
  )
}

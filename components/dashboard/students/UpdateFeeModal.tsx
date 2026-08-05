import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Pencil, Loader2 } from "lucide-react"
import { Student } from "@/lib/student-types"
import { studentsApi } from "@/lib/api"

interface UpdateFeeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  student: Student | null;
  onSuccess: (updatedStudent: Student) => void;
}

export function UpdateFeeModal({ open, onOpenChange, student, onSuccess }: UpdateFeeModalProps) {
  const [newFee, setNewFee] = useState({
    academy_fee: 0,
    hostel_fee: 0,
    school_fee: 0,
    total_fee: 0,
    scholarship_type: "None",
    scholarship_value: 0,
    scholarship_amount: 0
  })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (student && open) {
      setNewFee({
        academy_fee: Number(student?.academy_fee) || 0,
        hostel_fee:  Number(student?.hostel_fee)  || 0,
        school_fee:  Number(student?.school_fee)  || 0,
        total_fee:   Number(student?.fee)         || 0,
        scholarship_type: student?.scholarship_type || "None",
        scholarship_value: Number(student?.scholarship_value) || 0,
        scholarship_amount: Number(student?.scholarship_amount) || 0
      })
    }
  }, [student, open])

  const handleUpdate = async () => {
    if (!student) return
    const originalFee = Number(newFee.school_fee) + Number(newFee.academy_fee) + Number(newFee.hostel_fee);
    let calculatedAmount = 0;
    const val = Number(newFee.scholarship_value || 0);
    if (newFee.scholarship_type === "Percent") {
      calculatedAmount = originalFee * (val / 100);
    } else if (newFee.scholarship_type === "Flat") {
      calculatedAmount = val;
    }
    const finalPayable = Math.max(0, originalFee - calculatedAmount);

    setSaving(true)
    try {
      const payload = {
        ...student,
        school_fee:  newFee.school_fee,
        academy_fee: newFee.academy_fee,
        hostel_fee:  newFee.hostel_fee,
        fee:         finalPayable,
        scholarship_type: newFee.scholarship_type,
        scholarship_value: val,
        scholarship_amount: calculatedAmount
      };
      await studentsApi.update(student.id, payload)
      onSuccess(payload as Student)
      onOpenChange(false)
    } catch (err: any) { alert(err.message) }
    finally { setSaving(false) }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="md:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Pencil className="h-5 w-5 text-blue-600" /> Update Total Fee
          </DialogTitle>
        </DialogHeader>

        {student && (
          <div className="space-y-4 py-2">
            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted">
              <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold shrink-0">
                {student.name.charAt(0)}
              </div>
              <div>
                <p className="font-semibold text-sm">{student.name}</p>
                <p className="text-xs text-muted-foreground">
                  {student.standard && `${student.standard}`}
                  {student.course && ` · ${student.course}`}
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
                        <span>Paid: ₹{Number(student.paid_fee).toLocaleString()}</span>
                        <span>Remaining Balance: ₹{Math.max(0, finalPayable - Number(student.paid_fee)).toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleUpdate} disabled={saving} className="bg-blue-600 hover:bg-blue-700">
            {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Update Fee
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

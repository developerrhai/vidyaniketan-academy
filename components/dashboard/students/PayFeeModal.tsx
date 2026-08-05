import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { IndianRupee, Loader2 } from "lucide-react"
import { Student } from "@/lib/student-types"
import { studentsApi } from "@/lib/api"

interface PayFeeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  student: Student | null;
  onSuccess: (updatedStudent: Student) => void;
}

export function PayFeeModal({ open, onOpenChange, student, onSuccess }: PayFeeModalProps) {
  const [payAmount, setPayAmount] = useState("")
  const [payMode, setPayMode] = useState<"add" | "set">("add")
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (open) {
      setPayAmount("")
      setPayMode("add")
    }
  }, [open])

  const handlePay = async () => {
    if (!student) return
    const val = parseFloat(payAmount)
    if (isNaN(val) || val < 0) { alert("Enter a valid amount"); return }

    const newPaid = payMode === "add" ? Number(student.paid_fee) + val : val
    const totalFee = Number(student.fee)

    if (totalFee > 0 && newPaid > totalFee) {
      alert(`Paid amount (₹${newPaid.toLocaleString()}) cannot exceed total fee (₹${totalFee.toLocaleString()})`)
      return
    }

    setSaving(true)
    try {
      await studentsApi.update(student.id, { ...student, paid_fee: newPaid })
      onSuccess({ ...student, paid_fee: newPaid })
      onOpenChange(false)
    } catch (err: any) { alert(err.message) }
    finally { setSaving(false) }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <IndianRupee className="h-5 w-5 text-emerald-600" /> Record Payment
          </DialogTitle>
        </DialogHeader>

        {student && (
          <div className="space-y-4 py-2">
            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted">
              <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 font-bold shrink-0">
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

            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="rounded-lg border p-2">
                <p className="text-xs text-muted-foreground">Total Fee</p>
                <p className="font-bold text-sm">₹{Number(student.fee).toLocaleString()}</p>
              </div>
              <div className="rounded-lg border p-2">
                <p className="text-xs text-muted-foreground">Paid</p>
                <p className="font-bold text-sm text-emerald-600">₹{Number(student.paid_fee).toLocaleString()}</p>
              </div>
              <div className="rounded-lg border p-2">
                <p className="text-xs text-muted-foreground">Balance</p>
                <p className="font-bold text-sm text-red-500">
                  ₹{(Number(student.fee) - Number(student.paid_fee)).toLocaleString()}
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
                        ? Number(student.paid_fee) + parseFloat(payAmount)
                        : parseFloat(payAmount)
                      ).toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Balance will be</span>
                    <span className="font-bold text-red-500">
                      ₹{Math.max(0,
                        Number(student.fee) - (payMode === "add"
                          ? Number(student.paid_fee) + parseFloat(payAmount)
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
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handlePay} disabled={saving} className="bg-emerald-600 hover:bg-emerald-700">
            {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Record Payment
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

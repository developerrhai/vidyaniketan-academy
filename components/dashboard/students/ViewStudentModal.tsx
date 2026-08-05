import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { GraduationCap, Phone, User, MapPin, BookOpen, Mail, Building } from "lucide-react"
import { Student, formatDob } from "@/lib/student-types"

interface ViewStudentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selected: Student | null;
}

export function ViewStudentModal({ open, onOpenChange, selected }: ViewStudentModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <GraduationCap className="h-5 w-5" /> Student Details
          </DialogTitle>
        </DialogHeader>
        {selected && (
          <div className="max-h-[70vh] overflow-y-auto overflow-x-hidden pr-1 space-y-3">

            {selected.photo && (
              <div className="flex items-start gap-3 p-3 bg-muted rounded-lg">
                <User className="h-5 w-5 text-muted-foreground shrink-0 mt-1" />
                <div>
                  <p className="text-sm text-muted-foreground mb-2">Passport Photo</p>
                  <img
                    src={selected.photo}
                    alt="Passport photo"
                    className="w-20 h-24 object-cover rounded-lg border border-border"
                  />
                </div>
              </div>
            )}

            {[
              { icon: User,     label: "Name",             value: selected.name },
              { icon: Phone,    label: "Contact no.1",     value: selected.phone },
              { icon: Phone,    label: "Contact no.2",     value: selected.father_phone },
              { icon: User,     label: "Father Name",      value: selected.father_name },
              { icon: User,     label: "Mother Name",      value: selected.mother_name },
              { icon: Mail,     label: "Email",            value: selected.email },
              { icon: MapPin,   label: "Aadhar",           value: selected.aadhar },
              { icon: MapPin,   label: "DOB",              value: formatDob(selected.dob) },
              { icon: MapPin,   label: "Address",          value: selected.address },
              { icon: MapPin,   label: "Branch",           value: selected.branch },
              { icon: MapPin,   label: "Hostel",           value: selected.hostel },
              { icon: BookOpen, label: "Standard",         value: selected.standard },
              { icon: BookOpen, label: "Batch",            value: selected.batch },
              { icon: Building, label: "School/College Name", value: selected.school_name },
              { icon: BookOpen, label: "Academic Year",    value: selected.academic_year },
              { icon: BookOpen, label: "Admission In",     value: selected.admission_type },
              { icon: BookOpen, label: "Date of Admission", value: selected.admission_date ? formatDob(selected.admission_date) : "" },
              { icon: BookOpen, label: "Caste / Religion", value: selected.caste_religion },
            ].map(({ icon: Icon, label, value }) =>
              value ? (
                <div key={label} className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                  <Icon className="h-5 w-5 text-muted-foreground shrink-0" />
                  <div>
                    <p className="text-sm text-muted-foreground">{label}</p>
                    <p className="font-medium">{value}</p>
                  </div>
                </div>
              ) : null
            )}

            <div className="p-3 bg-muted rounded-lg space-y-2">
              <p className="text-sm text-muted-foreground font-medium">Fee Summary</p>
              {(() => {
                const originalFee = Number(selected.school_fee || 0) + Number(selected.academy_fee || 0) + Number(selected.hostel_fee || 0);
                const scholarshipAmt = Number(selected.scholarship_amount || 0);
                const payable = Number(selected.fee || 0);
                return (
                  <div className="space-y-2">
                    <div className="grid grid-cols-2 gap-2 text-xs bg-background rounded-lg p-3">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">School Fee:</span>
                        <span className="font-medium">₹{Number(selected.school_fee || 0).toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Academy Fee:</span>
                        <span className="font-medium">₹{Number(selected.academy_fee || 0).toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Hostel Fee:</span>
                        <span className="font-medium">₹{Number(selected.hostel_fee || 0).toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between border-t pt-1 mt-1 col-span-2">
                        <span className="text-muted-foreground font-semibold">Original Fee:</span>
                        <span className="font-bold">₹{originalFee.toLocaleString()}</span>
                      </div>
                      {scholarshipAmt > 0 && (
                        <div className="flex justify-between text-amber-600 col-span-2">
                          <span>Scholarship / Concession ({selected.scholarship_type === "Percent" ? `${selected.scholarship_value}%` : "Flat"}):</span>
                          <span>-₹{scholarshipAmt.toLocaleString()}</span>
                        </div>
                      )}
                    </div>

                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div className="bg-background rounded-lg p-2">
                        <p className="text-xs text-muted-foreground">Net Payable</p>
                        <p className="font-bold text-sm">₹{payable.toLocaleString()}</p>
                      </div>
                      <div className="bg-background rounded-lg p-2">
                        <p className="text-xs text-muted-foreground">Paid</p>
                        <p className="font-bold text-sm text-emerald-600">₹{Number(selected.paid_fee).toLocaleString()}</p>
                      </div>
                      <div className="bg-background rounded-lg p-2">
                        <p className="text-xs text-muted-foreground">Balance</p>
                        <p className="font-bold text-sm text-red-500">
                          ₹{Math.max(0, payable - Number(selected.paid_fee)).toLocaleString()}
                        </p>
                      </div>
                    </div>

                    <div className="w-full bg-muted-foreground/20 rounded-full h-2 mt-1">
                      <div
                        className="bg-emerald-500 h-2 rounded-full transition-all"
                        style={{ width: `${Math.min((Number(selected.paid_fee) / (payable || 1)) * 100, 100)}%` }}
                      />
                    </div>
                    <p className="text-xs text-right text-muted-foreground">
                      {payable > 0
                        ? `${Math.round((Number(selected.paid_fee) / payable) * 100)}% paid`
                        : "No fee set"}
                    </p>
                  </div>
                );
              })()}
            </div>

          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

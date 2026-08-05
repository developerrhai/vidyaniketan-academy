import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { SquarePen, Loader2 } from "lucide-react"
import { Student, STANDARDS, getBatchOptions, formatDateForInput } from "@/lib/student-types"
import { studentsApi } from "@/lib/api"

interface EditStudentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  student: Student | null;
  onSuccess: (updatedStudent: Student) => void;
}

export function EditStudentModal({ open, onOpenChange, student, onSuccess }: EditStudentModalProps) {
  const [editForm, setEditForm] = useState<Partial<Student>>({})
  const [editAppliedTo, setEditAppliedTo] = useState<string[]>([])
  const [editAdmissionType, setEditAdmissionType] = useState<string[]>([])
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (student && open) {
      const applied = student.scholarship_applied_to ? student.scholarship_applied_to.split(",") : [];
      setEditAppliedTo(applied);

      let admType: string[] = [];
      if (student.admission_type) {
        admType = student.admission_type.split(",");
      }
      setEditAdmissionType(admType);

      setEditForm({
        ...student,
        dob: formatDateForInput(student.dob),
        admission_date: formatDateForInput(student.admission_date),
      });
    }
  }, [student, open])

  const handleEditChange = (field: keyof Student, value: string) => {
    setEditForm(prev => ({ ...prev, [field]: value }))
  }

  const handleSave = async () => {
    if (!student) return
    if (!editForm.name?.trim()) { alert("Name is required"); return }
    if (!editForm.aadhar?.trim()) { alert("Aadhar Number is mandatory"); return }

    const schoolFee = Number(editForm.school_fee || 0);
    const academyFee = Number(editForm.academy_fee || 0);
    const hostelFee = Number(editForm.hostel_fee || 0);
    const originalFee = schoolFee + academyFee + hostelFee;

    let baseFeeForConcession = 0;
    if (editAppliedTo.includes("school_fee")) baseFeeForConcession += schoolFee;
    if (editAppliedTo.includes("academy_fee")) baseFeeForConcession += academyFee;
    if (editAppliedTo.includes("hostel_fee")) baseFeeForConcession += hostelFee;

    let calculatedAmount = 0;
    const val = Number(editForm.scholarship_value || 0);
    if (editForm.scholarship_type === "Percent") {
      calculatedAmount = baseFeeForConcession * (val / 100);
    } else if (editForm.scholarship_type === "Flat") {
      calculatedAmount = val;
    }
    const finalPayable = Math.max(0, originalFee - calculatedAmount);

    const payload = {
      ...editForm,
      school_fee: schoolFee,
      academy_fee: academyFee,
      hostel_fee: hostelFee,
      fee: finalPayable,
      scholarship_value: val,
      scholarship_amount: calculatedAmount,
      scholarship_applied_to: editAppliedTo.join(","),
      admission_type: editAdmissionType.join(",")
    };

    setSaving(true)
    try {
      await studentsApi.update(student.id, payload)
      onSuccess({ ...student, ...payload } as Student)
      onOpenChange(false)
    } catch (err: any) { alert(err.message) }
    finally { setSaving(false) }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <SquarePen className="h-5 w-5 text-violet-600" /> Edit Student
          </DialogTitle>
        </DialogHeader>

        {student && (
          <div className="max-h-[70vh] overflow-y-auto pr-1 space-y-4 py-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Personal Information</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label htmlFor="edit-name">Name <span className="text-destructive">*</span></Label>
                <Input id="edit-name" value={editForm.name ?? ""} onChange={e => handleEditChange("name", e.target.value)} placeholder="Full name" />
              </div>
              <div className="space-y-1">
                <Label htmlFor="edit-email">Email</Label>
                <Input id="edit-email" type="email" value={editForm.email ?? ""} onChange={e => handleEditChange("email", e.target.value)} placeholder="Email address" />
              </div>
              <div className="space-y-1">
                <Label htmlFor="edit-phone">Contact no.1</Label>
                <Input id="edit-phone" value={editForm.phone ?? ""} onChange={e => handleEditChange("phone", e.target.value)} placeholder="Student phone" />
              </div>
              <div className="space-y-1">
                <Label htmlFor="edit-father-phone">Contact no.2</Label>
                <Input id="edit-father-phone" value={editForm.father_phone ?? ""} onChange={e => handleEditChange("father_phone", e.target.value)} placeholder="Parent / guardian phone" />
              </div>
              <div className="space-y-1">
                <Label htmlFor="edit-father-name">Father Name</Label>
                <Input id="edit-father-name" value={editForm.father_name ?? ""} onChange={e => handleEditChange("father_name", e.target.value)} placeholder="Father's name" />
              </div>
              <div className="space-y-1">
                <Label htmlFor="edit-mother-name">Mother Name</Label>
                <Input id="edit-mother-name" value={editForm.mother_name ?? ""} onChange={e => handleEditChange("mother_name", e.target.value)} placeholder="Mother's name" />
              </div>
              <div className="space-y-1">
                <Label htmlFor="edit-school-name">School/College Name</Label>
                <Input id="edit-school-name" value={editForm.school_name ?? ""} onChange={e => handleEditChange("school_name", e.target.value)} placeholder="School or college name" />
              </div>
              <div className="space-y-1">
                <Label htmlFor="edit-dob">Date of Birth</Label>
                <Input id="edit-dob" type="date" value={editForm.dob ?? ""} onChange={e => handleEditChange("dob", e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="edit-aadhar">Aadhar Number <span className="text-destructive">*</span></Label>
                <Input id="edit-aadhar" value={editForm.aadhar ?? ""} onChange={e => handleEditChange("aadhar", e.target.value)} placeholder="12-digit Aadhar number" maxLength={12} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="edit-caste">Caste / Religion</Label>
                <Input id="edit-caste" value={editForm.caste_religion ?? ""} onChange={e => handleEditChange("caste_religion", e.target.value)} placeholder="Caste or religion" />
              </div>
              <div className="space-y-1 sm:col-span-2">
                <Label htmlFor="edit-address">Address</Label>
                <Input id="edit-address" value={editForm.address ?? ""} onChange={e => handleEditChange("address", e.target.value)} placeholder="Full address" />
              </div>
              <div className="space-y-1 sm:col-span-2">
                <Label>Student Photo</Label>
                <div className="flex items-center gap-4 p-2 border border-dashed border-gray-300 rounded-lg bg-gray-50/50">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={e => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const reader = new FileReader();
                        reader.onload = () => handleEditChange("photo", reader.result as string);
                        reader.readAsDataURL(file);
                      }
                    }}
                    className="text-sm"
                  />
                  {editForm.photo && (
                    <div className="flex items-center gap-2">
                      <img src={editForm.photo} alt="Preview" className="w-10 h-12 object-cover rounded border border-gray-200" />
                      <Button type="button" variant="destructive" size="sm" onClick={() => handleEditChange("photo", "")}>Remove</Button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Academic Info */}
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground pt-2">Academic Information</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>Standard</Label>
                <Select value={editForm.standard ?? ""} onValueChange={val => {
                  handleEditChange("standard", val);
                  const allowed = getBatchOptions(val);
                  if (!allowed.includes(editForm.batch ?? "")) {
                    handleEditChange("batch", "");
                    handleEditChange("course", "");
                  }
                }}>
                  <SelectTrigger><SelectValue placeholder="Select Standard" /></SelectTrigger>
                  <SelectContent>
                    {STANDARDS.map(std => (
                      <SelectItem key={std} value={std}>{std}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Batch</Label>
                <Select value={editForm.batch ?? ""} onValueChange={val => {
                  handleEditChange("batch", val);
                  handleEditChange("course", val); // Compatibility
                }}>
                  <SelectTrigger><SelectValue placeholder="Select Batch" /></SelectTrigger>
                  <SelectContent>
                    {getBatchOptions(editForm.standard ?? "").map(b => (
                      <SelectItem key={b} value={b}>{b}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Branch</Label>
                <Select value={editForm.branch ?? ""} onValueChange={val => handleEditChange("branch", val)}>
                  <SelectTrigger><SelectValue placeholder="Select Branch" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Main Branch">Main Branch</SelectItem>
                    <SelectItem value="SOF Branch">SOF Branch</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Hostel</Label>
                <Select value={editForm.hostel ?? ""} onValueChange={val => handleEditChange("hostel", val)}>
                  <SelectTrigger><SelectValue placeholder="Select Hostel" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Yes">Yes</SelectItem>
                    <SelectItem value="No">No</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label htmlFor="edit-academic-year">Academic Year</Label>
                <Input id="edit-academic-year" value={editForm.academic_year ?? ""} onChange={e => handleEditChange("academic_year", e.target.value)} placeholder="E.g. 2023-2024" />
              </div>
              <div className="space-y-1">
                <Label htmlFor="edit-admission-date">Date of Admission</Label>
                <Input id="edit-admission-date" type="date" value={editForm.admission_date ?? ""} onChange={e => handleEditChange("admission_date", e.target.value)} />
              </div>
            </div>

            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground pt-2">Fees & Concession Details</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label htmlFor="edit-school-fee">School/College Fee (₹)</Label>
                <Input id="edit-school-fee" type="number" min="0" value={editForm.school_fee ?? "0"} onChange={e => handleEditChange("school_fee", e.target.value)} placeholder="0.00" />
              </div>
              <div className="space-y-1">
                <Label htmlFor="edit-academy-fee">Academy Fee (₹)</Label>
                <Input id="edit-academy-fee" type="number" min="0" value={editForm.academy_fee ?? "0"} onChange={e => handleEditChange("academy_fee", e.target.value)} placeholder="0.00" />
              </div>
              <div className="space-y-1">
                <Label htmlFor="edit-hostel-fee">Hostel Fee (₹)</Label>
                <Input id="edit-hostel-fee" type="number" min="0" value={editForm.hostel_fee ?? "0"} onChange={e => handleEditChange("hostel_fee", e.target.value)} placeholder="0.00" />
              </div>
              <div className="space-y-1">
                <Label>Scholarship / Concession Type</Label>
                <Select value={editForm.scholarship_type ?? "None"} onValueChange={val => handleEditChange("scholarship_type", val)}>
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
                <Input type="number" min="0" value={editForm.scholarship_value ?? "0"} onChange={e => handleEditChange("scholarship_value", e.target.value)} placeholder="0.00" />
              </div>
              <div className="space-y-1 sm:col-span-2">
                <Label>Concession Applied To</Label>
                <div className="flex flex-wrap gap-4 mt-1">
                  {[
                    { key: "school_fee", label: "School/College Fee" },
                    { key: "academy_fee", label: "Academy Fee" },
                    { key: "hostel_fee", label: "Hostel Fee" }
                  ].map(opt => {
                    return (
                      <label key={opt.key} className="flex items-center gap-2 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={editAppliedTo.includes(opt.key)}
                          onChange={() => {
                            const nextApplied = editAppliedTo.includes(opt.key)
                              ? editAppliedTo.filter(v => v !== opt.key)
                              : [...editAppliedTo, opt.key];
                            setEditAppliedTo(nextApplied);
                          }}
                          className="h-4 w-4 rounded border-gray-300 text-violet-600 focus:ring-violet-500"
                        />
                        <span className="text-sm text-gray-700">{opt.label}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
              
              {(() => {
                const sFee = Number(editForm.school_fee || 0);
                const aFee = Number(editForm.academy_fee || 0);
                const hFee = Number(editForm.hostel_fee || 0);
                const originalFee = sFee + aFee + hFee;

                let baseFeeForConcession = 0;
                if (editAppliedTo.includes("school_fee")) baseFeeForConcession += sFee;
                if (editAppliedTo.includes("academy_fee")) baseFeeForConcession += aFee;
                if (editAppliedTo.includes("hostel_fee")) baseFeeForConcession += hFee;

                let calculatedAmount = 0;
                const val = Number(editForm.scholarship_value || 0);
                if (editForm.scholarship_type === "Percent") {
                  calculatedAmount = baseFeeForConcession * (val / 100);
                } else if (editForm.scholarship_type === "Flat") {
                  calculatedAmount = val;
                }
                const finalPayable = Math.max(0, originalFee - calculatedAmount);

                return (
                  <div className="p-3 rounded-lg bg-slate-100 border border-slate-200 sm:col-span-2 space-y-2">
                    <p className="font-semibold text-xs text-slate-700 uppercase tracking-wider">Recalculated Fee Preview</p>
                    <div className="grid grid-cols-3 gap-2 text-center text-xs">
                      <div className="bg-white rounded p-2 border">
                        <p className="text-muted-foreground">Original Fee</p>
                        <p className="font-bold text-slate-800">₹{originalFee.toLocaleString()}</p>
                      </div>
                      <div className="bg-white rounded p-2 border">
                        <p className="text-muted-foreground">Concession Amt</p>
                        <p className="font-bold text-amber-600">₹{calculatedAmount.toLocaleString()}</p>
                      </div>
                      <div className="bg-white rounded p-2 border">
                        <p className="text-muted-foreground">Net Payable</p>
                        <p className="font-bold text-emerald-600">₹{finalPayable.toLocaleString()}</p>
                      </div>
                    </div>
                  </div>
                );
              })()}

              <div className="space-y-1 sm:col-span-2">
                <Label>Admission In (Admission Type)</Label>
                <div className="flex gap-4 mt-1">
                  {["School/College", "Academy", "Hostel"].map(opt => {
                    return (
                      <label key={opt} className="flex items-center gap-2 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={editAdmissionType.includes(opt)}
                          onChange={() => {
                            const nextAdmissionType = editAdmissionType.includes(opt)
                              ? editAdmissionType.filter(v => v !== opt)
                              : [...editAdmissionType, opt];
                            setEditAdmissionType(nextAdmissionType);
                          }}
                          className="h-4 w-4 rounded border-gray-300 text-violet-600 focus:ring-violet-500"
                        />
                        <span className="text-sm text-gray-700">{opt}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            </div>

          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving} className="bg-violet-600 hover:bg-violet-700">
            {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { UserPlus, User, Mail, Phone, Building, MapPin, GraduationCap, BookOpen, Loader2 } from "lucide-react"
import { studentsApi, teachersApi, staffApi } from "@/lib/api"

export function RegisterUserContent() {
  const [formData, setFormData] = useState({
    name:"", email:"", phone:"", role:"",
    standard:"", gender:"", institute:"", branch:"",
    father_name:"", father_phone:"", course:"", subjects:"",
    department:"", designation:"",
    fees: "10000", hostel: "", academic_year: "",
    dob: "", address: "", aadhar: "", caste_religion: "", photo: "",
    admission_type: [] as string[], admission_date: "",
    school_fee: "0", academy_fee: "0", hostel_fee: "0",
    scholarship_type: "None", scholarship_value: "0", scholarship_amount: "0"
  })
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null)
  const [loading, setLoading] = useState(false)
  const [sizeError, setSizeError] = useState("")

  const set = (key: string, val: any) => setFormData(prev => ({ ...prev, [key]: val }))

  const toggleAdmissionType = (opt: string) => {
    setFormData(prev => {
      const current = prev.admission_type;
      const next = current.includes(opt)
        ? current.filter(v => v !== opt)
        : [...current, opt];
      return { ...prev, admission_type: next };
    });
  }

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith("image/")) return
    if (file.size > 1 * 1024 * 1024) {
      setSizeError("Photo must be under 1 MB.")
      e.target.value = ""
      return
    }
    setSizeError("")
    const reader = new FileReader()
    reader.onload = () => {
      set("photo", reader.result as string)
    }
    reader.readAsDataURL(file)
  }

  // ✅ Generate student ID
  const generateStudentId = (standard: string) => {
    const random = Math.floor(10 + Math.random() * 90) // 2-digit random
    return `MEPL6992${standard.replace(/\D/g, "") || "0"}${random}` // Example: MEPL69921234
  }

  const handleSubmit = async () => {
    if (!formData.name || !formData.role) {
      setMsg({ text: "Name and role are required", ok: false })
      return
    }
    setLoading(true); setMsg(null)
    const admin_id = localStorage.getItem("userInfo") ? JSON.parse(localStorage.getItem("userInfo") as string)?.id : null

    try {
      if (formData.role === "student") {
        const studentId = generateStudentId(formData.standard) // generate ID

        const originalFee = Number(formData.school_fee || 0) + Number(formData.academy_fee || 0) + Number(formData.hostel_fee || 0);
        let calculatedAmount = 0;
        const val = Number(formData.scholarship_value || 0);
        if (formData.scholarship_type === "Percent") {
          calculatedAmount = originalFee * (val / 100);
        } else if (formData.scholarship_type === "Flat") {
          calculatedAmount = val;
        }
        const finalPayable = Math.max(0, originalFee - calculatedAmount);

        await studentsApi.create({
          admin_id: admin_id,
          name: formData.name,
          email: formData.email,
          phone: formData.phone,
          father_name: formData.father_name,
          academic_year: formData.academic_year,
          father_phone: formData.father_phone,
          gender: formData.gender,
          standard: formData.standard,
          course: formData.course,
          branch: formData.branch,
          institute: formData.institute,
          hostel: formData.hostel,
          fee: finalPayable,
          student_id: studentId,
          dob: formData.dob || null,
          address: formData.address || "",
          aadhar: formData.aadhar || "",
          caste_religion: formData.caste_religion || "",
          photo: formData.photo || null,
          admission_type: formData.admission_type.join(","),
          admission_date: formData.admission_date || null,
          school_fee: Number(formData.school_fee) || 0,
          academy_fee: Number(formData.academy_fee) || 0,
          hostel_fee: Number(formData.hostel_fee) || 0,
          scholarship_type: formData.scholarship_type,
          scholarship_value: val,
          scholarship_amount: calculatedAmount
        })

        setMsg({
          text: `Student registered successfully! ID: ${studentId}`,
          ok: true
        })
      } else if (formData.role === "teacher") {
        await teachersApi.create({
          name: formData.name,
          email: formData.email,
          phone: formData.phone,
          institute: formData.institute,
          branch: formData.branch,
          subjects: formData.subjects
            ? formData.subjects.split(",").map(s => s.trim())
            : [],
        })
        setMsg({ text: "Teacher registered successfully!", ok: true })
      } else if (formData.role === "staff") {
        await staffApi.create({
          name: formData.name,
          email: formData.email,
          phone: formData.phone,
          institute: formData.institute,
          branch: formData.branch,
          department: formData.department,
          designation: formData.designation,
        })
        setMsg({ text: "Staff registered successfully!", ok: true })
      }

      // Reset form
      setFormData({
        name:"", email:"", phone:"", role:"",
        standard:"", gender:"", institute:"", branch:"",
        father_name:"", father_phone:"", course:"", subjects:"",
        department:"", designation:"",
        fees: "10000", hostel: "", academic_year: "",
        dob: "", address: "", aadhar: "", caste_religion: "", photo: "",
        admission_type: [], admission_date: "",
        school_fee: "0", academy_fee: "0", hostel_fee: "0",
        scholarship_type: "None", scholarship_value: "0", scholarship_amount: "0"
      })

    } catch (err: any) {
      setMsg({ text: err.message || "Registration failed", ok: false })
    } finally {
      setLoading(false)
      setTimeout(() => setMsg(null), 4000)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-emerald-100 p-4">
      <Card className="w-full max-w-3xl shadow-2xl border-0 rounded-2xl backdrop-blur-lg bg-white/80">
        <CardHeader className="sticky top-0 z-10 bg-white/70 backdrop-blur-md rounded-t-2xl border-b">
          <CardTitle className="flex items-center gap-3 text-2xl font-semibold text-gray-800">
            <UserPlus className="h-7 w-7 text-emerald-600" /> Register New User
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5 p-6">
          {msg && (
            <div className={`p-3 rounded-lg text-sm ${msg.ok ? "bg-emerald-100 text-emerald-700 border border-emerald-200" : "bg-red-100 text-red-700 border border-red-200"}`}>
              {msg.text}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Name */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2"><User className="h-4 w-4 text-emerald-500" /> Full Name *</Label>
              <Input value={formData.name} onChange={e => set("name", e.target.value)} placeholder="Full name" />
            </div>
            {/* Email */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2"><Mail className="h-4 w-4 text-emerald-500" /> Email</Label>
              <Input type="email" value={formData.email} onChange={e => set("email", e.target.value)} placeholder="Email address" />
            </div>
            {/* Phone */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2"><Phone className="h-4 w-4 text-emerald-500" /> Phone</Label>
              <Input value={formData.phone} onChange={e => set("phone", e.target.value)} placeholder="Phone number" />
            </div>
            {/* Role */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2"><User className="h-4 w-4 text-emerald-500" /> Role *</Label>
              <Select value={formData.role} onValueChange={v => set("role", v)}>
                <SelectTrigger><SelectValue placeholder="Select Role" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="student">Student</SelectItem>
                  <SelectItem value="staff">Staff</SelectItem> 
                </SelectContent>
              </Select>
            </div>

            {/* Staff-specific fields */}
            {formData.role === "staff" && (
              <>
                <div className="space-y-2">
                  <Label>Department</Label>
                  <Input value={formData.department || ""} onChange={e => set("department", e.target.value)} placeholder="e.g. Administration" />
                </div>
                <div className="space-y-2">
                  <Label>Designation</Label>
                  <Input value={formData.designation || ""} onChange={e => set("designation", e.target.value)} placeholder="e.g. Clerk, Manager" />
                </div>
              </>
            )}

            {/* Student-specific fields */}
            {formData.role === "student" && (
              <>
                <div className="space-y-2">
                  <Label className="flex items-center gap-2"><User className="h-4 w-4 text-emerald-500" /> Academic Year</Label>
                  <Input value={formData.academic_year} onChange={e => set("academic_year", e.target.value)} placeholder="E.g. 2023-2024" />
                </div>
                <div className="space-y-2">
                  <Label className="flex items-center gap-2"><User className="h-4 w-4 text-emerald-500" /> Father Name</Label>
                  <Input value={formData.father_name} onChange={e => set("father_name", e.target.value)} placeholder="Father's name" />
                </div>
                <div className="space-y-2">
                  <Label className="flex items-center gap-2"><Phone className="h-4 w-4 text-emerald-500" /> Father Phone</Label>
                  <Input value={formData.father_phone} onChange={e => set("father_phone", e.target.value)} placeholder="Father's phone" />
                </div>
                <div className="space-y-2">
                  <Label className="flex items-center gap-2"><User className="h-4 w-4 text-emerald-500" /> Date of Birth</Label>
                  <Input type="date" value={formData.dob} onChange={e => set("dob", e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label className="flex items-center gap-2"><MapPin className="h-4 w-4 text-emerald-500" /> Address</Label>
                  <Input value={formData.address} onChange={e => set("address", e.target.value)} placeholder="Full address" />
                </div>
                <div className="space-y-2">
                  <Label className="flex items-center gap-2"><User className="h-4 w-4 text-emerald-500" /> Aadhar Number</Label>
                  <Input value={formData.aadhar} onChange={e => set("aadhar", e.target.value)} placeholder="Aadhar number" />
                </div>
                <div className="space-y-2">
                  <Label className="flex items-center gap-2"><User className="h-4 w-4 text-emerald-500" /> Caste / Religion</Label>
                  <Input value={formData.caste_religion} onChange={e => set("caste_religion", e.target.value)} placeholder="Caste or religion" />
                </div>
                <div className="space-y-2">
                  <Label className="flex items-center gap-2"><GraduationCap className="h-4 w-4 text-emerald-500" /> Standard</Label>
                  <Select value={formData.standard} onValueChange={v => set("standard", v)}>
                    <SelectTrigger><SelectValue placeholder="Select Standard" /></SelectTrigger>
                    <SelectContent>
                      {[
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
                      ].map(std => (
                        <SelectItem key={std} value={std}>{std}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="flex items-center gap-2"><BookOpen className="h-4 w-4 text-emerald-500" /> Gender</Label>
                  <Select value={formData.gender} onValueChange={v => set("gender", v)}>
                    <SelectTrigger><SelectValue placeholder="Select gender" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Female">Female</SelectItem>
                      <SelectItem value="Male">Male</SelectItem>
                      <SelectItem value="Other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="flex items-center gap-2"><BookOpen className="h-4 w-4 text-emerald-500" /> Course</Label>
                  <Select value={formData.course} onValueChange={v => set("course", v)}>
                    <SelectTrigger><SelectValue placeholder="Select course" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="JEE">JEE</SelectItem>
                      <SelectItem value="NEET">NEET</SelectItem>
                      <SelectItem value="Foundation">Foundation</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2 w-full">
                  <Label className="flex items-center gap-2"><BookOpen className="h-4 w-4 text-emerald-500" /> Hostel</Label>
                  <Select value={formData.hostel} onValueChange={v => set("hostel", v)} >
                    <SelectTrigger><SelectValue placeholder="Select" className="w-full" /></SelectTrigger>
                    <SelectContent className="w-full">
                      <SelectItem value="Yes">Yes</SelectItem>
                      <SelectItem value="No">No</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="flex items-center gap-2"><User className="h-4 w-4 text-emerald-500" /> Date of Admission</Label>
                  <Input type="date" value={formData.admission_date} onChange={e => set("admission_date", e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">School/College Fee</Label>
                  <Input type="number" value={formData.school_fee} onChange={e => set("school_fee", e.target.value)} placeholder="0.00" />
                </div>
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">Academy Fee</Label>
                  <Input type="number" value={formData.academy_fee} onChange={e => set("academy_fee", e.target.value)} placeholder="0.00" />
                </div>
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">Hostel Fee</Label>
                  <Input type="number" value={formData.hostel_fee} onChange={e => set("hostel_fee", e.target.value)} placeholder="0.00" />
                </div>
                <div className="space-y-2">
                  <Label>Scholarship / Concession Type</Label>
                  <Select value={formData.scholarship_type} onValueChange={v => set("scholarship_type", v)}>
                    <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="None">None</SelectItem>
                      <SelectItem value="Flat">Flat (₹)</SelectItem>
                      <SelectItem value="Percent">Percent (%)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Scholarship / Concession Value</Label>
                  <Input type="number" value={formData.scholarship_value} onChange={e => set("scholarship_value", e.target.value)} placeholder="0.00" />
                </div>
                {(() => {
                  const originalFee = Number(formData.school_fee || 0) + Number(formData.academy_fee || 0) + Number(formData.hostel_fee || 0);
                  let calculatedAmount = 0;
                  const val = Number(formData.scholarship_value || 0);
                  if (formData.scholarship_type === "Percent") {
                    calculatedAmount = originalFee * (val / 100);
                  } else if (formData.scholarship_type === "Flat") {
                    calculatedAmount = val;
                  }
                  const finalPayable = Math.max(0, originalFee - calculatedAmount);
                  return (
                    <div className="p-4 rounded-xl bg-slate-100 border border-slate-200 col-span-1 md:col-span-2 space-y-2">
                      <p className="font-semibold text-sm text-slate-700">Fee Calculation Details</p>
                      <div className="grid grid-cols-3 gap-4 text-center">
                        <div className="bg-white rounded-lg p-2 border">
                          <p className="text-xs text-muted-foreground">Original Fee</p>
                          <p className="font-bold text-sm">₹{originalFee.toLocaleString()}</p>
                        </div>
                        <div className="bg-white rounded-lg p-2 border">
                          <p className="text-xs text-muted-foreground">Scholarship Given</p>
                          <p className="font-bold text-sm text-amber-600">₹{calculatedAmount.toLocaleString()}</p>
                        </div>
                        <div className="bg-white rounded-lg p-2 border">
                          <p className="text-xs text-muted-foreground">Final Payable Fee</p>
                          <p className="font-bold text-sm text-emerald-600">₹{finalPayable.toLocaleString()}</p>
                        </div>
                      </div>
                    </div>
                  );
                })()}
                <div className="space-y-2 col-span-1 md:col-span-2">
                  <Label className="flex items-center gap-2">I Confirm My Admission In</Label>
                  <div className="flex gap-4 mt-2">
                    {["School/College", "Academy", "Hostel"].map(opt => (
                      <label key={opt} className="flex items-center gap-2 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={formData.admission_type.includes(opt)}
                          onChange={() => toggleAdmissionType(opt)}
                          className="h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                        />
                        <span className="text-sm text-gray-700">{opt}</span>
                      </label>
                    ))}
                  </div>
                </div>
                <div className="space-y-2 col-span-1 md:col-span-2">
                  <Label className="flex items-center gap-2">Passport Size Photo</Label>
                  <div className="flex items-center gap-4 p-3 border border-dashed border-gray-300 rounded-lg bg-gray-50/50">
                    <input type="file" accept="image/*" onChange={handlePhotoUpload} className="text-sm" />
                    {formData.photo && (
                      <div className="flex items-center gap-2">
                        <img src={formData.photo} alt="Preview" className="w-12 h-14 object-cover rounded border border-gray-200" />
                        <Button type="button" variant="destructive" size="sm" onClick={() => set("photo", "")}>Remove</Button>
                      </div>
                    )}
                  </div>
                  {sizeError && <p className="text-red-500 text-xs mt-1">{sizeError}</p>}
                </div>
                {/* <div className="space-y-2">
                  <Label className="flex items-center gap-2"><BookOpen className="h-4 w-4 text-emerald-500" /> Course</Label>
                  <Input value={formData.course} onChange={e => set("course", e.target.value)} placeholder="e.g. Science Tuition" />
                </div> */}
                {/* Hidden Fees */}
                <Input type="hidden" value={formData.fees} />
              </>
            )}

            {/* Teacher-specific */}
            {formData.role === "teacher" && (
              <div className="space-y-2">
                <Label className="flex items-center gap-2"><BookOpen className="h-4 w-4 text-emerald-500" /> Subjects (comma-separated)</Label>
                <Input value={formData.subjects} onChange={e => set("subjects", e.target.value)} placeholder="e.g. Math, Physics" />
              </div>
            )}

            {/* Common fields */}
            {/* <div className="space-y-2">
              <Label className="flex items-center gap-2"><Building className="h-4 w-4 text-emerald-500" /> Institute Name</Label>
              <Input value={formData.institute} onChange={e => set("institute", e.target.value)} placeholder="Institute name" />
            </div> */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2"><MapPin className="h-4 w-4 text-emerald-500" /> Branch</Label>
              <Select value={formData.branch} onValueChange={v => set("branch", v)}>
                <SelectTrigger><SelectValue placeholder="Select Branch" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Main Branch">Main Branch</SelectItem>
                  <SelectItem value="SOF (School of Foundation)">SOF (School of Foundation)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <Button onClick={handleSubmit} disabled={loading}
            className="w-full mt-6 py-3 text-lg bg-gradient-to-r from-emerald-500 to-emerald-700 hover:scale-[1.02] transition-all shadow-lg">
            {loading ? <Loader2 className="h-5 w-5 mr-2 animate-spin" /> : <UserPlus className="h-5 w-5 mr-2" />}
            {loading ? "Registering…" : "Register User"}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
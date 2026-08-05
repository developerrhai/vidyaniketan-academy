export interface Student {
  id: number; name: string; phone: string; father_name: string; father_phone: string;
  aadhar: string; dob: string; address: string; email: string;
  standard: string; batch?: string; course: string; branch: string; fee: number; paid_fee: number;
  hostel: string; school_fee: number; academy_fee: number; hostel_fee: number;
  caste_religion: string; photo: string;
  scholarship_type?: string; scholarship_value?: number; scholarship_amount?: number;
  mother_name?: string; school_name?: string; scholarship_applied_to?: string;
  admission_type?: string; admission_date?: string; academic_year?: string;
}

export const STANDARDS = [
  "1st Standard", "2nd Standard", "3rd Standard", "4th Standard", "5th Standard",
  "6th Standard", "7th Standard", "8th Standard", "9th Standard", "10th Standard",
  "11th Standard", "12th Standard"
]

export const BRANCHES = [
  "Main Branch",
  "SOF Branch"
]

const JUNIOR_BATCHES = [
  "1st Standard", "2nd Standard", "3rd Standard",
  "4th Standard", "4th Scholarship", "5th Standard", "5th Scholarship(नवोदय / सैनिक)",
  "6th Standard", "6th Foundation", "7th Standard", "7th Scholarship", "7th Foundation",
  "6th–7th Foundation", "8th Standard", "8th Foundation", "8th Regular",
  "9th Standard", "9th Photon", "9th Foundation", "10th Standard",
  "Basic Foundation 1 (4th to 6th)", "Basic Foundation 2 (7th to 9th)"
]
const SENIOR_BATCHES = ["JEE", "NEET", "Foundation", "CET"]

export const ALL_BATCHES = Array.from(new Set([...JUNIOR_BATCHES, ...SENIOR_BATCHES]))

export const getBatchOptions = (std: string) => {
  if (std === "11th Standard" || std === "12th Standard") {
    return SENIOR_BATCHES;
  }
  return JUNIOR_BATCHES;
}

export const feeStatus = (s: Student) => {
  const fee = Number(s.fee)
  const paid = Number(s.paid_fee)
  if (fee === 0) return { label: "No Fee", cls: "bg-gray-100 text-gray-500" }
  if (paid >= fee) return { label: "Paid", cls: "bg-emerald-100 text-emerald-700" }
  if (paid > 0) return { label: "Partial", cls: "bg-yellow-100 text-yellow-700" }
  return { label: "Pending", cls: "bg-red-100 text-red-700" }
}

export const formatDob = (dob: string) => {
  if (!dob) return ""
  try {
    return new Date(dob).toLocaleDateString("en-IN", {
      day: "2-digit", month: "2-digit", year: "numeric"
    })
  } catch {
    return dob
  }
}

export const formatDateForInput = (dateStr?: string) => {
  if (!dateStr) return ""
  try {
    const d = new Date(dateStr)
    if (isNaN(d.getTime())) return ""
    const y = d.getFullYear()
    const m = String(d.getMonth() + 1).padStart(2, "0")
    const r = String(d.getDate()).padStart(2, "0")
    return `${y}-${m}-${r}`
  } catch {
    return ""
  }
}

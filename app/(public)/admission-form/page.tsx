"use client"

import { Header } from "@/components/ui/header"
import { useState } from "react"

const STANDARDS = [
  "1st Standard", "2nd Standard", "3rd Standard",
  "4th Standard", "5th Standard", "6th Standard",
  "7th Standard", "8th Standard", "9th Standard",
  "10th Standard", "11th Standard", "12th Standard"
]

const BRANCHES = ["Main branch", "SOF branch"]
const COURSES  = ["IIT-JEE", "MHT-CET", "NEET"]

const RULES = [
  "माझ्या पाल्याची अकॅडमीमधील उपस्थिती किमान 85% ठेवणे बंधनकारक राहील.",
  "अकॅडमीमध्ये दिलेला प्रवेश व आकारण्यात आलेली फी ही फक्त चालू शैक्षणिक वर्षासाठीच वैध राहील.",
  "फीचे सर्व हप्ते संस्थेने ठरवून दिलेल्या वेळेनुसार भरणे मला मान्य आहे.",
  "माझ्या पाल्याकडून संस्थेच्या मालमत्तेचे नुकसान झाल्यास त्याचा खर्च भरण्याची जबाबदारी माझी राहील.",
  "अकॅडमी परिसराच्या बाहेरील कोणत्याही घटनेसाठी संस्था जबाबदार राहणार नाही, हे मला मान्य आहे.",
  "हॉस्टेलमधील सर्व नियम व शिस्तीचे पालन करणे मला मान्य आहे.",
  "हॉस्टेल प्रशासनाची परवानगी घेतल्याशिवाय हॉस्टेल सोडता येणार नाही व बाहेर जाताना/परत येताना नोंद करणे बंधनकारक राहील.",
  "संध्याकाळी 8:00 नंतर परवानगीशिवाय प्रवेश दिला जाणार नाही, हे मला मान्य आहे.",
  "अकॅडमी व हॉस्टेलमधील सर्व नियम व अटी मी वाचल्या असून त्यांचे पालन करणे मला मान्य आहे.",
]

const NUMBERED_RULES = RULES.slice(0, 8)   // rules 1–8 (display only)
const FINAL_RULE     = RULES[8]            // rule 9 (checkbox)
const FINAL_RULE_KEY = "9"

interface FormData {
  firstName: string
  middleName: string
  lastName: string
  studentPhone: string
  fatherName: string
  fatherPhone: string
  email: string
  standard: string
  branch: string
  course: string
  studentDOB: string
  aadharNumber: string
  address: string
  gender: string
  casteReligion: string
  photo: string
  admissionType: string[]
  admissionDate: string
}

const initial: FormData = {
  firstName: "", middleName: "", lastName: "",
  studentPhone: "", fatherName: "", fatherPhone: "",
  studentDOB: "", aadharNumber: "", address: "",
  email: "", standard: "", branch: "", course: "",
  casteReligion: "", photo: "",
  admissionType: [], admissionDate: "", gender: "",
}

type Step = "form" | "consent" | "done"

export default function AdmissionFormPage() {
  const [form, setForm]             = useState<FormData>(initial)
  const [step, setStep]             = useState<Step>("form")
  const [submitting, setSubmitting] = useState(false)
  const [error, setError]           = useState("")
  const [touched, setTouched]       = useState<Partial<Record<keyof FormData, boolean>>>({})
  const [showRefreshConfirm, setShowRefreshConfirm] = useState(false)
  const [finalRuleAccepted, setFinalRuleAccepted]   = useState(false)
  const [consentError, setConsentError]             = useState("")

  const isSenior = form.standard === "11th Standard" || form.standard === "12th Standard"
  const fullName = [form.firstName, form.middleName, form.lastName].filter(Boolean).join(" ")

  const set = (key: keyof FormData, val: string) => {
    setForm(prev => ({ ...prev, [key]: val }))
    setTouched(prev => ({ ...prev, [key]: true }))
    setError("")
  }

  // All fields are optional — no validation errors shown
  const fieldError = (_key: keyof FormData) => ""

  // No required fields — always passes
  const validate = (): string | undefined => undefined

  // Step 1 → go to consent screen
  const handleNext = (e: React.FormEvent) => {
    e.preventDefault()
    const err = validate()
    if (err) { setError(err); return }
    setError("")
    setFinalRuleAccepted(false)
    setConsentError("")
    setStep("consent")
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  // Step 2 → final submit
  const handleFinalSubmit = async () => {
    if (!finalRuleAccepted) {
      setConsentError("कृपया शेवटची अट स्वीकारा. (Please accept the final rule & regulation.)")
      return
    }
    setConsentError("")
    setSubmitting(true)
    // All numbered rules are auto-included; final rule is the checkbox gate
    const rulesAccepted = [...NUMBERED_RULES.map((_, i) => String(i + 1)), FINAL_RULE_KEY]
    try {
      const res = await fetch(process.env.NEXT_PUBLIC_API_URL + "/admissions/public", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          aadhar:         form.aadharNumber,
          address:        form.address,
          dob:            form.studentDOB,
          name:           fullName,
          phone:          form.studentPhone,
          father_name:    form.fatherName,
          email:          form.email,
          father_phone:   form.fatherPhone,
          gender:         form.gender,
          standard:       form.standard,
          branch:         form.branch,
          course:         isSenior ? form.course : "",
          caste_religion: form.casteReligion,
          photo:          form.photo,
          admission_type: form.admissionType.join(","),
          admission_date: form.admissionDate,
          rules_accepted: rulesAccepted.join(","),
        }),
      })
      const data = await res.json()
      if (data.success) setStep("done")
      else setConsentError(data.message || "Submission failed. Please try again.")
    } catch {
      setConsentError("Network error. Please check your connection.")
    } finally {
      setSubmitting(false)
    }
  }

  /* ── SUCCESS ─────────────────────────────────────── */
  if (step === "done") {
    return (
      <div className="min-h-screen bg-[#e8f4f8] flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden">
          <div className="h-2 w-full bg-gradient-to-r from-[#0d6efd] to-[#0dcaf0]" />
          <div className="p-8 text-center">
            <div className="w-20 h-20 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-5">
              <svg className="w-10 h-10 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">Admission Submitted!</h2>
            <p className="text-gray-500 mb-1">
              Thank you, <span className="font-semibold text-[#0d6efd]">{fullName}</span>
            </p>
            <p className="text-gray-400 text-sm mb-6">
              Our team will call you at <span className="text-gray-600 font-medium">{form.studentPhone}</span> shortly.
            </p>
            <div className="bg-blue-50 rounded-2xl p-4 text-sm text-blue-700 font-medium">
              Vidyaaniketan Professional Academy · {form.branch} Branch
            </div>
            <button
              onClick={() => { setForm(initial); setTouched({}); setStep("form"); setFinalRuleAccepted(false) }}
              className="mt-6 text-sm text-gray-400 hover:text-gray-600 underline transition-colors"
            >
              Submit another form
            </button>
          </div>
        </div>
      </div>
    )
  }

  /* ── CONSENT SCREEN ──────────────────────────────── */
  if (step === "consent") {
    return (
      <div className="min-h-screen bg-[#e8f4f8] flex items-center justify-center p-4 py-10">
        <div className="w-full max-w-[42rem]">
          <div className="bg-white rounded-3xl shadow-2xl overflow-hidden">
            <Header />

            {/* Title */}
            <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50 flex items-center gap-3">
              <button
                onClick={() => setStep("form")}
                className="flex items-center justify-center w-8 h-8 rounded-lg border border-gray-200 bg-white hover:border-blue-300 hover:text-[#0d6efd] text-gray-400 transition-all shrink-0"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <h2 className="text-[#0d6efd] font-bold text-lg tracking-wide flex-1 text-center pr-8">
                Review & Consent
              </h2>
            </div>

            <div className="px-6 py-6 space-y-5">

              {/* ── Summary Card ── */}
              <div className="rounded-2xl border border-blue-100 bg-blue-50/40 overflow-hidden">
                <div className="px-4 py-3 bg-[#0d6efd]/8 border-b border-blue-100 flex items-center gap-2">
                  {form.photo && (
                    <img src={form.photo} alt="Student"
                      className="w-10 h-12 object-cover rounded-lg border-2 border-white shadow-sm shrink-0" />
                  )}
                  <div>
                    <p className="font-bold text-gray-800 text-base leading-tight">{fullName}</p>
                    <p className="text-xs text-gray-500">{form.standard}{isSenior && form.course ? ` · ${form.course}` : ""} · {form.branch}</p>
                  </div>
                </div>

                <div className="px-4 py-3 grid grid-cols-2 gap-x-6 gap-y-2.5 text-sm">
                  <ReviewRow label="Phone" value={form.studentPhone} />
                  {form.fatherPhone   && <ReviewRow label="Contact 2" value={form.fatherPhone} />}
                  {form.fatherName    && <ReviewRow label="Father" value={form.fatherName} />}
                  {form.email         && <ReviewRow label="Email" value={form.email} />}
                  {form.studentDOB    && <ReviewRow label="Date of Birth" value={form.studentDOB} />}
                  {form.admissionDate && <ReviewRow label="Admission Date" value={form.admissionDate} />}
                  {form.gender        && <ReviewRow label="Gender" value={form.gender} />}
                  {form.aadharNumber  && <ReviewRow label="Aadhar" value={form.aadharNumber} />}
                  {form.casteReligion && <ReviewRow label="Caste/Religion" value={form.casteReligion} />}
                  {form.admissionType.length > 0 && (
                    <ReviewRow label="Admission In" value={form.admissionType.join(", ")} />
                  )}
                  {form.address && (
                    <div className="col-span-2">
                      <ReviewRow label="Address" value={form.address} />
                    </div>
                  )}
                </div>
              </div>

              {/* ── Rules Section ── */}
              <div className="space-y-3">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-lg border text-xs font-bold tracking-wider uppercase text-rose-600 border-rose-200 bg-rose-50/50">
                  Rules &amp; Regulations
                </div>

                {/* Rules 1–8: numbered, read-only */}
                <div className="rounded-xl border border-gray-200 bg-white overflow-hidden divide-y divide-gray-100">
                  {NUMBERED_RULES.map((rule, index) => (
                    <div key={index} className="flex items-start gap-3 px-4 py-3">
                      <span className="text-xs font-bold text-[#0d6efd] shrink-0 mt-0.5 w-5 text-right">
                        {index + 1}.
                      </span>
                      <span
                        className="text-sm text-gray-700 leading-relaxed"
                        style={{ fontFamily: "'Noto Sans Devanagari', sans-serif" }}
                      >
                        {rule}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Rule 9: checkbox — must tick to submit */}
                <div className="space-y-1.5">
                  <p className="text-xs font-semibold text-rose-600 uppercase tracking-wider px-1">
                    Acceptance Required
                  </p>
                  <label
                    onClick={() => { setFinalRuleAccepted(prev => !prev); setConsentError("") }}
                    className={`flex items-start gap-3 px-4 py-3 rounded-xl border bg-white cursor-pointer transition-all duration-200 select-none ${
                      finalRuleAccepted
                        ? "border-rose-300 bg-rose-50/40"
                        : "border-gray-300 hover:border-rose-300"
                    }`}
                  >
                    <div className={`w-5 h-5 mt-0.5 rounded-md border-2 flex items-center justify-center shrink-0 transition-all duration-200 ${
                      finalRuleAccepted ? "bg-rose-500 border-rose-500" : "border-gray-300 bg-white"
                    }`}>
                      {finalRuleAccepted && (
                        <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </div>
                    <span
                      className="text-sm text-gray-700 leading-relaxed font-medium"
                      style={{ fontFamily: "'Noto Sans Devanagari', sans-serif" }}
                    >
                      {FINAL_RULE}
                    </span>
                  </label>

                  {finalRuleAccepted && (
                    <p className="text-xs text-emerald-600 flex items-center gap-1.5 px-1">
                      <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                      </svg>
                      All rules accepted
                    </p>
                  )}
                </div>
              </div>

              {/* Consent error */}
              {consentError && (
                <div className="flex items-center gap-2 p-3 rounded-xl bg-red-50 border border-red-200 text-red-600 text-sm">
                  <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {consentError}
                </div>
              )}

              {/* Confirm button */}
              <button
                type="button"
                onClick={handleFinalSubmit}
                disabled={submitting}
                className="w-full py-4 rounded-2xl bg-gradient-to-r from-[#0d6efd] to-[#0dcaf0] text-white font-bold text-base tracking-wide shadow-lg shadow-blue-200 hover:shadow-blue-300 hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center gap-2"
              >
                {submitting ? (
                  <>
                    <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Submitting...
                  </>
                ) : (
                  <>
                    Confirm &amp; Submit Admission
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                    </svg>
                  </>
                )}
              </button>

              <p className="text-center text-xs text-gray-400">
                By confirming, you accept all rules &amp; regulations above
              </p>
            </div>
          </div>

          <p className="text-center text-xs text-gray-400 mt-4">
            © Vidyaaniketan Professional Academy · All rights reserved
          </p>
        </div>
      </div>
    )
  }

  /* ── MAIN FORM (step === "form") ─────────────────── */
  return (
    <div className="min-h-screen bg-[#e8f4f8] flex items-center justify-center p-4 py-10">
      <div className="w-full max-w-[42rem]">
        <div className="bg-white rounded-3xl shadow-2xl overflow-hidden">
          <Header />

          <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50 flex items-center justify-between">
            <h2 className="text-[#0d6efd] font-bold text-lg tracking-wide flex-1 text-center">
              Student Admission Form
            </h2>
            <button
              type="button"
              onClick={() => setShowRefreshConfirm(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-gray-500 border border-gray-200 bg-white hover:border-red-300 hover:text-red-500 hover:bg-red-50 transition-all duration-200 shrink-0"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Reset
            </button>
          </div>

          {showRefreshConfirm && (
            <div className="mx-6 mt-4 flex items-center gap-3 p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-700 text-sm">
              <svg className="w-4 h-4 shrink-0 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
              </svg>
              <span className="flex-1 font-medium">Clear all fields?</span>
              <button onClick={() => { setForm(initial); setTouched({}); setError(""); setShowRefreshConfirm(false) }}
                className="px-3 py-1 rounded-lg bg-red-500 text-white text-xs font-bold hover:bg-red-600 transition-colors">
                Yes, Clear
              </button>
              <button onClick={() => setShowRefreshConfirm(false)}
                className="px-3 py-1 rounded-lg bg-white border border-gray-200 text-gray-600 text-xs font-semibold hover:bg-gray-50 transition-colors">
                Cancel
              </button>
            </div>
          )}

          <form onSubmit={handleNext} className="px-6 py-6 space-y-5" noValidate>

            {/* Student Details */}
            <Section label="Student Details" color="blue">
              <div className="grid grid-cols-3 gap-2">
                <InputField placeholder="First Name" value={form.firstName}
                  onChange={v => set("firstName", v)} error={fieldError("firstName")}
                  icon={
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  }
                />
                <InputField placeholder="Middle Name" value={form.middleName}
                  onChange={v => set("middleName", v)} error={fieldError("middleName")} />
                <InputField placeholder="Last Name" value={form.lastName}
                  onChange={v => set("lastName", v)} error={fieldError("lastName")} />
              </div>

              <InputField placeholder="Contact no.1 (Whatsapp)" type="tel"
                value={form.studentPhone} onChange={v => set("studentPhone", v)}
                error={fieldError("studentPhone")}
                icon={
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                  </svg>
                }
              />
              <InputField placeholder="Contact no.2" type="tel"
                value={form.fatherPhone} onChange={v => set("fatherPhone", v)}
                error={fieldError("fatherPhone")}
                icon={
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                  </svg>
                }
              />
              <DOBField label="Date of Birth" value={form.studentDOB}
                onChange={v => set("studentDOB", v)} error={fieldError("studentDOB")} />
              <InputField placeholder="Email Address" type="email"
                value={form.email} onChange={v => set("email", v)} error={fieldError("email")}
                icon={
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                }
              />
              <InputField placeholder="Aadhar Number" value={form.aadharNumber}
                onChange={v => set("aadharNumber", v)} error={fieldError("aadharNumber")}
                icon={
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0" />
                  </svg>
                }
              />
              <InputField placeholder="Address" value={form.address}
                onChange={v => set("address", v)} error={fieldError("address")}
                icon={
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                }
              />
            </Section>

            {/* Personal Details */}
            <Section label="Personal Details" color="indigo">
              <InputField placeholder="Father's Name" value={form.fatherName}
                onChange={v => set("fatherName", v)} error={fieldError("fatherName")}
                icon={
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                }
              />
              <InputField placeholder="Caste / Religion" value={form.casteReligion}
                onChange={v => set("casteReligion", v)} error={fieldError("casteReligion")}
                icon={
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                }
              />
              <GenderField value={form.gender} onChange={v => set("gender", v)} />
              <PhotoUploadField value={form.photo} onChange={v => set("photo", v)} error={fieldError("photo")} />
            </Section>

            {/* Academic Details */}
            <Section label="Academic Details" color="cyan">
              <SelectField placeholder="Select Standard" value={form.standard}
                onChange={v => { set("standard", v); set("course", "") }}
                options={STANDARDS} error={fieldError("standard")}
                icon={
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                  </svg>
                }
              />
              {isSenior && (
                <SelectField placeholder="Select Course" value={form.course}
                  onChange={v => set("course", v)} options={COURSES} error={fieldError("course")}
                  icon={
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  }
                />
              )}
              <DOBField label="Date of Admission" value={form.admissionDate}
                onChange={v => set("admissionDate", v)} error={fieldError("admissionDate")} />
            </Section>

            {/* Branch */}
            <Section label="Branch" color="sky">
              <SelectField placeholder="Select Branch" value={form.branch}
                onChange={v => set("branch", v)} options={BRANCHES} error={fieldError("branch")}
                icon={
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                }
              />
            </Section>

            {/* Admission Type */}
            <Section label="I Confirm My Admission In" color="indigo">
              <CheckboxGroupField
                options={["School/College", "Academy", "Hostel"]}
                value={form.admissionType}
                onChange={v => { setForm(prev => ({ ...prev, admissionType: v })); setError("") }}
              />
            </Section>

            {error && (
              <div className="flex items-center gap-2 p-3 rounded-xl bg-red-50 border border-red-200 text-red-600 text-sm">
                <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {error}
              </div>
            )}

            <button type="submit"
              className="w-full py-4 rounded-2xl bg-gradient-to-r from-[#0d6efd] to-[#0dcaf0] text-white font-bold text-base tracking-wide shadow-lg shadow-blue-200 hover:shadow-blue-300 hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200 flex items-center justify-center gap-2"
            >
              Next: Review &amp; Consent
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </button>

            <p className="text-center text-xs text-gray-400">
              You'll review your details &amp; accept rules on the next screen
            </p>
          </form>
        </div>

        <p className="text-center text-xs text-gray-400 mt-4">
          © Vidyaaniketan Professional Academy · All rights reserved
        </p>
      </div>
    </div>
  )
}

/* ── Review Row ─────────────────────────────────────── */
function ReviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider truncate">{label}</p>
      <p className="text-sm text-gray-700 font-medium truncate">{value}</p>
    </div>
  )
}

/* ── Gender Field ───────────────────────────────────── */
function GenderField({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const options = [
    { label: "Male", icon: "♂" },
    { label: "Female", icon: "♀" },
    { label: "Other", icon: "⚧" },
  ]
  return (
    <div className="flex gap-2">
      {options.map(opt => (
        <button key={opt.label} type="button" onClick={() => onChange(opt.label)}
          className={`flex-1 flex items-center justify-center gap-1.5 py-3 rounded-xl border text-sm font-semibold transition-all duration-200 ${
            value === opt.label
              ? "bg-[#0d6efd] border-[#0d6efd] text-white shadow-md shadow-blue-200"
              : "bg-white border-gray-200 text-gray-500 hover:border-blue-300 hover:text-[#0d6efd]"
          }`}
        >
          <span className="text-base leading-none">{opt.icon}</span>
          {opt.label}
        </button>
      ))}
    </div>
  )
}

/* ── Checkbox Group ─────────────────────────────────── */
function CheckboxGroupField({ options, value, onChange }: {
  options: string[]; value: string[]; onChange: (v: string[]) => void
}) {
  const toggle = (opt: string) =>
    onChange(value.includes(opt) ? value.filter(v => v !== opt) : [...value, opt])
  return (
    <div className="space-y-2">
      {options.map(opt => (
        <label key={opt} onClick={() => toggle(opt)}
          className="flex items-center gap-3 px-4 py-3 rounded-xl border bg-white cursor-pointer transition-all duration-200 hover:border-blue-300 select-none">
          <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-all duration-200 ${
            value.includes(opt) ? "bg-[#0d6efd] border-[#0d6efd]" : "border-gray-300 bg-white"
          }`}>
            {value.includes(opt) && (
              <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
              </svg>
            )}
          </div>
          <span className="text-sm text-gray-700 font-medium">{opt}</span>
        </label>
      ))}
    </div>
  )
}

/* ── Photo Upload ───────────────────────────────────── */
function PhotoUploadField({ value, onChange, error }: {
  value: string; onChange: (v: string) => void; error?: string
}) {
  const [sizeError, setSizeError] = useState("")
  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith("image/")) return
    if (file.size > 1 * 1024 * 1024) {
      setSizeError("Photo must be under 1 MB."); e.target.value = ""; return
    }
    setSizeError("")
    const reader = new FileReader()
    reader.onload = () => { onChange(reader.result as string) }
    reader.readAsDataURL(file)
  }
  const handleRemove = (e: React.MouseEvent) => { e.stopPropagation(); onChange(""); setSizeError("") }
  return (
    <div>
      <label className={`flex items-center gap-3 px-4 py-3 rounded-xl border bg-white cursor-pointer transition-all duration-200 ${
        error || sizeError ? "border-red-300 bg-red-50/30" : "border-gray-200 hover:border-blue-300"
      }`}>
        <span className="text-gray-400 shrink-0">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </span>
        {value ? (
          <div className="flex items-center gap-3 flex-1">
            <img src={value} alt="preview" className="w-12 h-14 object-cover rounded-lg border border-gray-200" />
            <div className="flex-1">
              <p className="text-sm text-gray-700 font-medium">Photo uploaded</p>
              <p className="text-xs text-gray-400">Tap to change · max 1 MB</p>
            </div>
            <button type="button" onClick={handleRemove}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-red-50 border border-red-200 text-red-500 hover:bg-red-100 transition-all shrink-0">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5}
                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              <span className="text-xs font-semibold">Remove</span>
            </button>
          </div>
        ) : (
          <span className="text-gray-400 text-sm flex-1">Upload Passport size photo · max 1 MB</span>
        )}
        <input type="file" accept="image/*" onChange={handleFile} className="hidden" />
      </label>
      {sizeError && <p className="text-red-500 text-xs mt-1 ml-1">{sizeError}</p>}
      {!sizeError && error && <p className="text-red-500 text-xs mt-1 ml-1">{error}</p>}
    </div>
  )
}

/* ── DOB Field ──────────────────────────────────────── */
function DOBField({ value, onChange, error, label = "Date of Birth" }: {
  value: string; onChange: (v: string) => void; error?: string; label?: string
}) {
  const parts = value ? value.split("-") : ["", "", ""]
  const [dd, mm, yyyy] = [parts[0] ?? "", parts[1] ?? "", parts[2] ?? ""]
  const update = (d: string, m: string, y: string) => onChange(`${d}-${m}-${y}`)
  return (
    <div>
      <div className={`flex items-center gap-3 px-4 py-3 rounded-xl border bg-white transition-all duration-200 ${
        error ? "border-red-300 bg-red-50/30" : "border-gray-200 hover:border-blue-300 focus-within:border-[#0d6efd] focus-within:ring-3 focus-within:ring-[#0d6efd]/10"
      }`}>
        <span className="text-gray-400 shrink-0">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        </span>
        <span className="text-gray-400 text-sm shrink-0">{label}</span>
        <div className="flex items-center gap-1 ml-auto">
          <input type="number" placeholder="DD" min={1} max={31} value={dd}
            onChange={e => update(e.target.value, mm, yyyy)}
            className="w-10 bg-transparent text-gray-700 text-sm text-center outline-none placeholder-gray-300 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" />
          <span className="text-gray-300">/</span>
          <input type="number" placeholder="MM" min={1} max={12} value={mm}
            onChange={e => update(dd, e.target.value, yyyy)}
            className="w-10 bg-transparent text-gray-700 text-sm text-center outline-none placeholder-gray-300 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" />
          <span className="text-gray-300">/</span>
          <input type="number" placeholder="YYYY" min={1900} max={2099} value={yyyy}
            onChange={e => update(dd, mm, e.target.value)}
            className="w-16 bg-transparent text-gray-700 text-sm text-center outline-none placeholder-gray-300 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" />
        </div>
      </div>
      {error && <p className="text-red-500 text-xs mt-1 ml-1">{error}</p>}
    </div>
  )
}

/* ── Section ────────────────────────────────────────── */
function Section({ label, color, children }: { label: string; color: string; children: React.ReactNode }) {
  const colors: Record<string, string> = {
    blue:   "text-[#0d6efd] border-[#0d6efd]/20 bg-[#0d6efd]/5",
    indigo: "text-indigo-600 border-indigo-200 bg-indigo-50/50",
    cyan:   "text-cyan-600 border-cyan-200 bg-cyan-50/50",
    sky:    "text-sky-600 border-sky-200 bg-sky-50/50",
    rose:   "text-rose-600 border-rose-200 bg-rose-50/50",
  }
  return (
    <div className="space-y-3">
      <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-lg border text-xs font-bold tracking-wider uppercase ${colors[color]}`}>
        {label}
      </div>
      <div className="space-y-3">{children}</div>
    </div>
  )
}

/* ── Input Field ────────────────────────────────────── */
function InputField({ placeholder, type = "text", value, onChange, error, icon }: {
  placeholder: string; type?: string; value: string
  onChange: (v: string) => void; error?: string; icon?: React.ReactNode
}) {
  return (
    <div>
      <div className={`flex items-center gap-3 px-4 py-3 rounded-xl border bg-white transition-all duration-200 ${
        error ? "border-red-300 bg-red-50/30" : "border-gray-200 hover:border-blue-300 focus-within:border-[#0d6efd] focus-within:ring-3 focus-within:ring-[#0d6efd]/10"
      }`}>
        {icon && <span className="text-gray-400 shrink-0">{icon}</span>}
        <input type={type} placeholder={placeholder} value={value}
          onChange={e => onChange(e.target.value)}
          className="flex-1 bg-transparent text-gray-700 text-sm placeholder-gray-400 outline-none" />
      </div>
      {error && <p className="text-red-500 text-xs mt-1 ml-1">{error}</p>}
    </div>
  )
}

/* ── Select Field ───────────────────────────────────── */
function SelectField({ placeholder, value, onChange, options, error, icon }: {
  placeholder: string; value: string
  onChange: (v: string) => void; options: string[]; error?: string; icon?: React.ReactNode
}) {
  return (
    <div>
      <div className={`flex items-center gap-3 px-4 py-3 rounded-xl border bg-white transition-all duration-200 ${
        error ? "border-red-300 bg-red-50/30" : "border-gray-200 hover:border-blue-300 focus-within:border-[#0d6efd] focus-within:ring-3 focus-within:ring-[#0d6efd]/10"
      }`}>
        {icon && <span className="text-gray-400 shrink-0">{icon}</span>}
        <select value={value} onChange={e => onChange(e.target.value)}
          className="flex-1 bg-transparent text-sm outline-none cursor-pointer appearance-none"
          style={{ color: value ? "#374151" : "#9ca3af" }}>
          <option value="" disabled>{placeholder}</option>
          {options.map(o => <option key={o} value={o}>{o}</option>)}
        </select>
        <svg className="w-4 h-4 text-gray-400 shrink-0 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </div>
      {error && <p className="text-red-500 text-xs mt-1 ml-1">{error}</p>}
    </div>
  )
}
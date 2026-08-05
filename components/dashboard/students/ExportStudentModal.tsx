import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { FileSpreadsheet } from "lucide-react"
import { Student } from "@/lib/student-types"
import { handleExportExcel } from "@/lib/excel-utils"

interface ExportStudentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  students: Student[];
}

export type ExportField = {
  key: keyof Student | "balance" | "fee_status";
  label: string;
}

export const EXPORTABLE_FIELDS: ExportField[] = [
  { key: "id", label: "Student ID" },
  { key: "name", label: "Student Name" },
  { key: "mother_name", label: "Mother Name" },
  { key: "father_name", label: "Father Name" },
  { key: "school_name", label: "School/College Name" },
  { key: "aadhar", label: "Aadhar Number" },
  { key: "dob", label: "Date of Birth" },
  { key: "phone", label: "Contact no.1 (Phone)" },
  { key: "father_phone", label: "Contact no.2 (Father Phone)" },
  { key: "email", label: "Email" },
  { key: "address", label: "Address" },
  { key: "caste_religion", label: "Caste / Religion" },
  { key: "standard", label: "Standard" },
  { key: "batch", label: "Batch" },
  { key: "course", label: "Course" },
  { key: "branch", label: "Branch" },
  { key: "hostel", label: "Hostel Status" },
  { key: "academic_year", label: "Academic Year" },
  { key: "admission_type", label: "Admission Type" },
  { key: "admission_date", label: "Admission Date" },
  { key: "school_fee", label: "School Fee" },
  { key: "academy_fee", label: "Academy Fee" },
  { key: "hostel_fee", label: "Hostel Fee" },
  { key: "scholarship_type", label: "Scholarship Type" },
  { key: "scholarship_value", label: "Scholarship Value" },
  { key: "scholarship_amount", label: "Scholarship Amount" },
  { key: "scholarship_applied_to", label: "Scholarship Applied To" },
  { key: "fee", label: "Total Fee (Net Payable)" },
  { key: "paid_fee", label: "Paid Fee" },
  { key: "balance", label: "Balance Due" },
  { key: "fee_status", label: "Fee Status" },
];

export function ExportStudentModal({ open, onOpenChange, students }: ExportStudentModalProps) {
  // By default, select all fields that were previously hardcoded to maintain some familiarity
  const DEFAULT_SELECTED_KEYS = [
    "id", "name", "mother_name", "school_name", "aadhar", "dob",
    "phone", "father_phone", "email", "address", "caste_religion",
    "standard", "course", "branch", "hostel",
    "fee", "paid_fee", "balance", "fee_status"
  ];

  const [selectedFields, setSelectedFields] = useState<string[]>(DEFAULT_SELECTED_KEYS);

  // Reset selection when modal opens just in case
  useEffect(() => {
    if (open) {
      // Keep user's last selection instead of resetting, it's better UX
      if (selectedFields.length === 0) {
        setSelectedFields(DEFAULT_SELECTED_KEYS);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const toggleField = (key: string) => {
    setSelectedFields(prev =>
      prev.includes(key)
        ? prev.filter(f => f !== key)
        : [...prev, key]
    );
  };

  const handleSelectAll = () => {
    setSelectedFields(EXPORTABLE_FIELDS.map(f => f.key as string));
  };

  const handleDeselectAll = () => {
    setSelectedFields([]);
  };

  const handleExport = () => {
    if (selectedFields.length === 0) {
      alert("Please select at least one field to export.");
      return;
    }
    
    // Sort selected fields based on their original order in EXPORTABLE_FIELDS
    const orderedFields = EXPORTABLE_FIELDS.filter(f => selectedFields.includes(f.key as string));
    
    handleExportExcel(students, orderedFields);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5 text-emerald-600" /> Export Student Data
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto pr-1 py-2 space-y-4">
          <p className="text-sm text-muted-foreground">
            Select the columns you want to include in the exported Excel file. ({students.length} students selected)
          </p>

          <div className="flex gap-2 mb-2">
            <Button type="button" variant="outline" size="sm" onClick={handleSelectAll}>Select All</Button>
            <Button type="button" variant="outline" size="sm" onClick={handleDeselectAll}>Deselect All</Button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 border rounded-md p-4 bg-muted/30">
            {EXPORTABLE_FIELDS.map((field) => (
              <label key={field.key} className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={selectedFields.includes(field.key as string)}
                  onChange={() => toggleField(field.key as string)}
                  className="h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                />
                <span className="text-sm text-slate-700">{field.label}</span>
              </label>
            ))}
          </div>
        </div>

        <DialogFooter className="mt-4 pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleExport} disabled={selectedFields.length === 0} className="bg-emerald-600 hover:bg-emerald-700">
            <FileSpreadsheet className="h-4 w-4 mr-2" />
            Export to Excel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

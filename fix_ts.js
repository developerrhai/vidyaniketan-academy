const fs = require('fs');
const path = require('path');

const filesToUpdate = [
  'components/dashboard/appointments-content.tsx',
  'components/dashboard/duplicate-students-content.tsx',
  'components/dashboard/fee-reports-content.tsx',
  'components/dashboard/hostel-students-content.tsx',
  'components/dashboard/inquiry-content.tsx',
  'components/dashboard/sidebar.tsx',
  'components/dashboard/StudentManagementContent.tsx',
  'components/teacher/StudentManagementContent.tsx'
];

for (const file of filesToUpdate) {
  const filePath = path.join(__dirname, file);
  if (!fs.existsSync(filePath)) continue;
  
  let content = fs.readFileSync(filePath, 'utf8');

  // Fix useCourseBatches missing import
  if (content.includes('useCourseBatches') && !content.includes('import { useCourseBatches }')) {
    content = content.replace(/(import .*?\n)/, "$1import { useCourseBatches } from \"@/hooks/useCourseBatches\";\n");
  }

  // Fix implicit any
  content = content.replace(/\(b\)/g, "(b: any)");
  content = content.replace(/\(it\)/g, "(it: any)");
  content = content.replace(/\(student\)/g, "(student: any)");
  
  // sidebar duplicate-students
  content = content.replace(/activeTab === "duplicateStudents"/g, 'activeTab === "duplicate-students"');

  // duplicate students delete
  content = content.replace(/studentsApi\.delete\(/g, 'studentsApi.remove(');
  
  // duplicate students types
  content = content.replace(/import { Student } from "@\/lib\/types"/g, 'import { Student } from "@/lib/student-types"');

  // Any group unknown issues
  content = content.replace(/group\.map/g, '(group as any[]).map');
  content = content.replace(/group\.length/g, '(group as any[]).length');

  fs.writeFileSync(filePath, content, 'utf8');
}
console.log("Fixes applied");


import React from 'react';
import { Student, ExamCommittee, GradeLevel, GRADE_LABELS, SchoolInfo } from '../examControl.types';

interface CommitteeDirectoryProps {
  students: Student[];
  committees: ExamCommittee[];
  selectedGrade: GradeLevel;
  schoolInfo: SchoolInfo;
  onUpdateCommittee: (updatedComm: ExamCommittee) => void;
  selectedTerm: 'term1' | 'term2';
}

const CommitteeDirectory: React.FC<CommitteeDirectoryProps> = ({ 
  students, committees, selectedGrade, schoolInfo, onUpdateCommittee, selectedTerm 
}) => {
  
  const gradeCommittees = committees
    .filter(c => c.gradeLevel === selectedGrade)
    .sort((a, b) => a.name.localeCompare(b.name, 'ar'));

  const directoryData = gradeCommittees.map(comm => {
      const commStudents = students.filter(s => 
          s.gradeLevel === selectedGrade && 
          s.committeeId === comm.id && 
          s.seatingNumber !== null
      ).sort((a, b) => (a.seatingNumber || 0) - (b.seatingNumber || 0));

      if (commStudents.length === 0) {
          return {
              ...comm,
              startSeat: '-',
              endSeat: '-',
              count: 0
          };
      }

      return {
          ...comm,
          startSeat: commStudents[0].seatingNumber,
          endSeat: commStudents[commStudents.length - 1].seatingNumber,
          count: commStudents.length
      };
  });

  const termLabel = selectedTerm === 'term1' ? 'الفصل الدراسي الأول' : 'الفصل الدراسي الثاني';

  return (
    <div id="directory-print-area" className="bg-white p-6 md:p-10 mx-auto max-w-5xl print:p-0 print:max-w-none h-full" dir="rtl">
        {/* Header Section */}
        <div className="flex items-center justify-between mb-8 border-b-2 border-black pb-4">
            <div className="w-1/4 text-center">
                {schoolInfo.logo && <img src={schoolInfo.logo} alt="Logo" className="h-16 mx-auto object-contain" />}
                <p className="font-bold mt-1 text-[10px]">{schoolInfo.educationalAdministration}</p>
            </div>
            <div className="w-2/4 text-center">
                <h2 className="text-2xl font-black mb-1">{schoolInfo.schoolName}</h2>
                <h3 className="text-xl font-black underline underline-offset-4 decoration-2">دليل لجان سير الامتحانات</h3>
                <p className="text-sm font-bold mt-2 text-blue-700 print:text-black">
                   امتحان <span className="underline underline-offset-2">{termLabel}</span>
                </p>
                <p className="text-sm font-bold mt-1">العام الدراسي {schoolInfo.academicYear}</p>
            </div>
            <div className="w-1/4 text-right text-sm font-bold border-r-2 border-black pr-4">
                <p className="mb-1">الصف: <span className="font-black text-blue-700 print:text-black">{GRADE_LABELS[selectedGrade]}</span></p>
                <p>إجمالي اللجان: <span className="font-normal">{gradeCommittees.length}</span></p>
            </div>
        </div>

        {/* Directory Table */}
        <table className="w-full text-center border-collapse border-2 border-black font-sans">
            <thead>
                <tr className="bg-gray-100 print:bg-gray-200 font-black text-sm">
                    <th className="border-2 border-black p-3 w-12">م</th>
                    <th className="border-2 border-black p-3">رقم اللجنة</th>
                    <th className="border-2 border-black p-3">مقر اللجنة</th>
                    <th className="border-2 border-black p-3 bg-blue-50/50 print:bg-transparent">من رقم جلوس</th>
                    <th className="border-2 border-black p-3 bg-blue-50/50 print:bg-transparent">إلى رقم جلوس</th>
                    <th className="border-2 border-black p-3 w-20">العدد</th>
                    <th className="border-2 border-black p-3">الفترة</th>
                    <th className="border-2 border-black p-3">ملاحظات</th>
                </tr>
            </thead>
            <tbody>
                {directoryData.map((item, idx) => (
                    <tr key={item.id} className="font-bold text-sm h-12 hover:bg-gray-50 transition-colors">
                        <td className="border border-black bg-gray-50 print:bg-transparent">{idx + 1}</td>
                        <td className="border border-black font-black">{item.name}</td>
                        <td className="border border-black">{item.location}</td>
                        <td className="border border-black font-mono text-lg text-blue-700 print:text-black">{item.startSeat}</td>
                        <td className="border border-black font-mono text-lg text-blue-700 print:text-black">{item.endSeat}</td>
                        <td className="border border-black bg-gray-50 print:bg-transparent">{item.count}</td>
                        <td className="border border-black p-0">
                            <select 
                                value={item.shift || 'morning'} 
                                onChange={(e) => onUpdateCommittee({ ...item, shift: e.target.value as any })}
                                className="w-full h-10 text-center border-0 bg-transparent focus:ring-0 cursor-pointer print:appearance-none font-bold outline-none"
                            >
                                <option value="morning">صباحي</option>
                                <option value="evening">مسائي</option>
                            </select>
                        </td>
                        <td className="border border-black p-0">
                            <input 
                                type="text" 
                                value={item.notes || ''} 
                                onChange={(e) => onUpdateCommittee({ ...item, notes: e.target.value })}
                                placeholder="أضف ملاحظة..."
                                className="w-full h-10 px-2 text-center border-0 bg-transparent focus:ring-0 placeholder:text-gray-300 print:placeholder:text-transparent outline-none"
                            />
                        </td>
                    </tr>
                ))}
                {directoryData.length === 0 && (
                    <tr>
                        <td colSpan={8} className="p-10 text-center text-gray-400 border border-black italic">
                            لم يتم إعداد لجان لهذا الصف بعد.
                        </td>
                    </tr>
                )}
            </tbody>
            {directoryData.length > 0 && (
                <tfoot>
                    <tr className="bg-gray-100 print:bg-gray-200 font-black text-sm">
                        <td colSpan={5} className="border-2 border-black p-3 text-left pl-10">إجمالي طلاب الصف:</td>
                        <td className="border-2 border-black p-3" colSpan={3}>{directoryData.reduce((acc, curr) => acc + curr.count, 0)} طالب</td>
                    </tr>
                </tfoot>
            )}
        </table>

        {/* Signatures Section */}
        <div className="mt-20 grid grid-cols-2 text-center font-black text-lg gap-20">
            <div className="space-y-12">
                <p className="underline underline-offset-8 decoration-2">رئيس الكنترول</p>
                <p className="text-gray-300 font-normal text-sm">........................................</p>
                <p className="text-slate-800">{schoolInfo.controlHead || ''}</p>
            </div>
            <div className="space-y-12">
                <p className="underline underline-offset-8 decoration-2">مدير المدرسة</p>
                <p className="text-gray-300 font-normal text-sm">........................................</p>
                <p className="text-slate-800">{schoolInfo.managerName || ''}</p>
            </div>
        </div>

        {/* Page Footer for Official look */}
        <div className="mt-auto pt-10 text-[8px] text-gray-300 font-mono text-left opacity-50">
             - COMMITTEE DIRECTORY MODULE
        </div>
    </div>
  );
};

export default CommitteeDirectory;

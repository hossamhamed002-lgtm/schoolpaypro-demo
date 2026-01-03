
import React, { useState } from 'react';
import { Search, Printer, X, FileText } from 'lucide-react';
import { Student, Subject, GradeLevel, GRADE_LABELS, SchoolInfo, GradeDescriptor } from '../examControl.types';

interface StudentStatementProps {
  students: Student[];
  subjects: Subject[];
  grades: any;
  results: any;
  filterGrade: GradeLevel | 'all';
  schoolInfo: SchoolInfo;
  descriptors: GradeDescriptor[];
}

const StudentStatement: React.FC<StudentStatementProps> = ({ 
  students, subjects, grades, results, filterGrade, schoolInfo, descriptors 
}) => {
  const [statementSearch, setStatementSearch] = useState('');
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);

  const filteredStudents = students
    .filter(s => {
      const matchesGrade = filterGrade === 'all' || s.gradeLevel === filterGrade;
      const matchesSearch = s.name.includes(statementSearch) || (s.seatingNumber?.toString().includes(statementSearch) || false);
      return matchesGrade && matchesSearch;
    })
    .sort((a, b) => (a.seatingNumber || 0) - (b.seatingNumber || 0));

  const getDescriptor = (percent: number) => {
    const sorted = [...descriptors].sort((a,b) => b.minPercent - a.minPercent);
    return sorted.find(d => percent >= d.minPercent) || { label: 'دون المستوى', color: '#000000' };
  };

  const safeVal = (v: number | undefined) => (v === undefined || v === -1) ? 0 : v;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen" dir="rtl">
      {/* Search Header */}
      <div className="flex flex-col md:flex-row gap-4 mb-8 no-print bg-white p-4 rounded-xl shadow-sm border">
        <div className="relative flex-1">
          <input 
            type="text" 
            placeholder="ابحث باسم الطالب أو رقم الجلوس لفتح بيان الدرجات..." 
            value={statementSearch} 
            onChange={(e) => setStatementSearch(e.target.value)} 
            className="w-full pr-10 pl-4 py-2.5 border-2 border-gray-100 rounded-xl focus:border-blue-400 outline-none transition-all font-bold" 
          />
          <Search className="absolute right-3 top-3 text-gray-400" size={20} />
        </div>
      </div>

      {/* Selection Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 no-print mb-10">
        {filteredStudents.slice(0, 12).map(student => {
          const res = results[student.id];
          return (
            <div 
              key={student.id} 
              className={`bg-white border-2 rounded-xl p-4 hover:shadow-md cursor-pointer transition-all ${selectedStudent?.id === student.id ? 'border-blue-500 ring-2 ring-blue-100 shadow-md' : 'border-gray-50'}`} 
              onClick={() => setSelectedStudent(student)}
            >
              <h5 className="font-bold text-gray-900 text-sm line-clamp-1">{student.name}</h5>
              <div className="flex justify-between items-center text-[10px] font-bold mt-3 text-gray-500">
                  <span>رقم الجلوس: {student.seatingNumber}</span>
                  <span className={res?.status === 'Pass' ? 'text-green-600' : 'text-red-600'}>{res?.status === 'Pass' ? 'ناجح' : 'دور ثان'}</span>
              </div>
            </div>
          );
        })}
      </div>

      {selectedStudent ? (
        <div className="flex justify-center relative">
          <div id="student-statement-print-area" className="student-statement-card bg-white border-[1px] border-gray-300 shadow-2xl w-[210mm] min-h-[296mm] p-[15mm] flex flex-col relative print:shadow-none animate-in fade-in zoom-in-95 font-sans text-black">
            
            {/* Header Section */}
            <div className="flex justify-between items-start mb-2 relative z-10 pt-4">
                <div className="w-1/4">
                   <div className={`inline-block px-3 py-1 border rounded text-[12px] font-black ${results[selectedStudent.id]?.status === 'Pass' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-gray-100 text-gray-800 border-gray-300'}`}>
                      {results[selectedStudent.id]?.status === 'Pass' ? 'ناجح' : 'راسب / له دور ثان'}
                   </div>
                </div>
                <div className="text-center flex-1">
                    <h1 className="text-2xl font-black mb-1">{schoolInfo.schoolName}</h1>
                    <h2 className="text-xl font-bold border-b-2 border-black inline-block px-4">بيان درجات العام الدراسي</h2>
                    <p className="text-sm font-bold text-gray-600 mt-1">{schoolInfo.academicYear}</p>
                </div>
                <div className="w-1/4 text-left no-print">
                   <button onClick={() => setSelectedStudent(null)} className="p-1 hover:text-red-500 transition" title="إغلاق"><X size={24}/></button>
                </div>
            </div>

            <div className="border-b-2 border-black w-full mb-6"></div>

            {/* Student Info Box */}
            <div className="border-2 border-black p-6 mb-8 text-lg font-bold space-y-4">
                <div className="flex justify-between items-center">
                   <div className="flex gap-2"><span>الاسم:</span> <span className="border-b border-black min-w-[200px] text-center">{selectedStudent.name}</span></div>
                   <div className="flex gap-2"><span>الصف:</span> <span className="border-b border-black min-w-[150px] text-center">{GRADE_LABELS[selectedStudent.gradeLevel]}</span></div>
                </div>
                <div className="flex justify-between items-center">
                   <div className="flex gap-2"><span>رقم الجلوس:</span> <span className="border-b border-black min-w-[100px] text-center font-mono">{selectedStudent.seatingNumber}</span></div>
                   <div className="flex gap-2"><span>الفصل:</span> <span className="border-b border-black min-w-[100px] text-center">{selectedStudent.classroom}</span></div>
                </div>
            </div>

            {/* Basic Subjects Table */}
            <div className="mb-8">
                <h4 className="font-black text-lg mb-2 underline underline-offset-4">المواد الأساسية</h4>
                <table className="w-full border-collapse border-2 border-black text-center font-bold text-[14px]">
                    <thead className="bg-gray-50">
                        <tr className="h-10">
                            <th className="border-2 border-black p-1 w-[40%]">المادة</th>
                            <th className="border-2 border-black p-1">العظمى</th>
                            <th className="border-2 border-black p-1">الصغرى</th>
                            <th className="border-2 border-black p-1">الدرجة</th>
                            <th className="border-2 border-black p-1">التقدير</th>
                        </tr>
                    </thead>
                    <tbody>
                        {subjects.filter(s => s.gradeLevels?.includes(selectedStudent.gradeLevel) && s.isAddedToTotal).map(sub => {
                            const rec = grades[selectedStudent.id]?.[sub.id];
                            const t1 = safeVal(rec?.term1?.work) + safeVal(rec?.term1?.practical) + safeVal(rec?.term1?.exam);
                            const t2 = safeVal(rec?.term2?.work) + safeVal(rec?.term2?.practical) + safeVal(rec?.term2?.exam);
                            const avg = (t1 + t2) / 2;
                            const percent = (avg / sub.maxScore) * 100;
                            const desc = getDescriptor(percent);
                            
                            return (
                                <tr key={sub.id} className="h-10">
                                    <td className="border-2 border-black pr-4 text-right font-black">{sub.name}</td>
                                    <td className="border-2 border-black font-mono">{sub.maxScore}</td>
                                    <td className="border-2 border-black font-mono">{sub.minScore}</td>
                                    <td className={`border-2 border-black font-mono font-black ${percent < 50 ? 'bg-gray-100' : ''}`}>{avg.toFixed(1)}</td>
                                    <td className="border-2 border-black">{desc.label}</td>
                                </tr>
                            );
                        })}
                        {/* Total Row */}
                        <tr className="bg-gray-50 h-12 font-black">
                            <td className="border-2 border-black pr-4 text-right">المجموع الكلي</td>
                            <td className="border-2 border-black font-mono">{results[selectedStudent.id]?.maxTotal}</td>
                            <td className="border-2 border-black font-mono">{Math.round(results[selectedStudent.id]?.maxTotal * 0.5)}</td>
                            <td className="border-2 border-black font-mono text-xl">{results[selectedStudent.id]?.totalScore}</td>
                            <td className="border-2 border-black">{getDescriptor(results[selectedStudent.id]?.percent || 0).label}</td>
                        </tr>
                    </tbody>
                </table>
            </div>

            {/* Activities Table */}
            <div className="mb-10">
                <h4 className="font-black text-lg mb-2 underline underline-offset-4">المواد الغير مضافة والأنشطة</h4>
                <table className="w-full border-collapse border-2 border-black text-center font-bold text-[14px]">
                    <thead className="bg-gray-50">
                        <tr className="h-10">
                            <th className="border-2 border-black p-1 w-[70%]">المادة</th>
                            <th className="border-2 border-black p-1">التقييم</th>
                        </tr>
                    </thead>
                    <tbody>
                        {subjects.filter(s => s.gradeLevels?.includes(selectedStudent.gradeLevel) && !s.isAddedToTotal).map(sub => {
                            const rec = grades[selectedStudent.id]?.[sub.id];
                            const t1 = safeVal(rec?.term1?.work) + safeVal(rec?.term1?.practical) + safeVal(rec?.term1?.exam);
                            const t2 = safeVal(rec?.term2?.work) + safeVal(rec?.term2?.practical) + safeVal(rec?.term2?.exam);
                            const avg = (t1 + t2) / 2;
                            const percent = (avg / sub.maxScore) * 100;
                            const desc = getDescriptor(percent);
                            
                            return (
                                <tr key={sub.id} className="h-10">
                                    <td className="border-2 border-black pr-4 text-right font-black">{sub.name}</td>
                                    <td className="border-2 border-black">{desc.label}</td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            {/* Signatures Section */}
            <div className="mt-auto pt-16 flex justify-between items-end font-black text-lg px-10 mb-6">
                <div className="text-center">
                    <p className="underline mb-12">شئون الطلبة</p>
                    <p className="text-gray-300 font-normal">........................</p>
                </div>
                <div className="text-center">
                    <p className="underline mb-12">مدير المدرسة</p>
                    <p className="text-gray-300 font-normal">........................</p>
                </div>
            </div>

            {/* Print Button Overlay */}
            <button 
                onClick={handlePrint} 
                className="absolute bottom-10 left-10 p-5 bg-blue-600 text-white rounded-full no-print shadow-2xl hover:bg-blue-700 transition-all hover:scale-110 active:scale-95 flex items-center gap-2 group z-20"
            >
                <Printer size={28}/>
                <span className="font-black text-lg">طباعة هذا البيان الآن</span>
            </button>
          </div>

          {/* Local Print Styles */}
          <style dangerouslySetInnerHTML={{ __html: `
            @media print {
              body * { visibility: hidden; }
              #student-statement-print-area, #student-statement-print-area * { visibility: visible; }
              #student-statement-print-area { 
                position: absolute; 
                left: 0; 
                top: 0; 
                width: 210mm; 
                height: 296mm; 
                margin: 0; 
                padding: 15mm;
                border: none !important;
                box-shadow: none !important;
              }
              .no-print { display: none !important; }
              @page { size: A4; margin: 0; }
              aside, header, nav, .sticky { display: none !important; }
              main { margin: 0 !important; padding: 0 !important; }
            }
          `}} />
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-20 text-gray-400 no-print">
           <FileText size={80} className="opacity-10 mb-4" />
           <p className="text-xl font-bold">يرجى اختيار طالب من القائمة أعلاه لعرض وطباعة بيان الدرجات</p>
        </div>
      )}
    </div>
  );
};

export default StudentStatement;


import React, { useMemo } from 'react';
import { SchoolInfo, GRADE_LABELS, GradeLevel, ExamScheduleItem } from '../../examControl.types';
import { db } from '../../services/db';

interface Props {
  schoolInfo: SchoolInfo;
  selectedTerm: 'term1' | 'term2';
}

interface EnhancedScheduleItem extends ExamScheduleItem {
  gradeLabel: string;
  shift: 'صباحي' | 'مسائي';
}

const CombinedExamSchedule: React.FC<Props> = ({ schoolInfo, selectedTerm }) => {
  const combinedData = useMemo(() => {
    const allGrades = Object.keys(GRADE_LABELS) as GradeLevel[];
    const items: EnhancedScheduleItem[] = [];

    allGrades.forEach(grade => {
      const gradeSchedule = db.getExamSchedule(grade, selectedTerm);
      gradeSchedule.forEach(item => {
        const [hours] = item.timeFrom.split(':').map(Number);
        const shift: 'صباحي' | 'مسائي' = hours < 12 ? 'صباحي' : 'مسائي';
        
        items.push({
          ...item,
          gradeLabel: GRADE_LABELS[grade].replace('الصف ', ''),
          shift
        });
      });
    });

    return items.sort((a, b) => {
      const dateCompare = a.date.localeCompare(b.date);
      if (dateCompare !== 0) return dateCompare;
      if (a.shift !== b.shift) return a.shift === 'صباحي' ? -1 : 1;
      return a.timeFrom.localeCompare(b.timeFrom);
    });
  }, [selectedTerm]);

  const groupedRows = useMemo(() => {
    const groups: { key: string; items: EnhancedScheduleItem[] }[] = [];
    combinedData.forEach(item => {
      const key = `${item.date}_${item.shift}`;
      const existing = groups.find(g => g.key === key);
      if (existing) {
        existing.items.push(item);
      } else {
        groups.push({ key, items: [item] });
      }
    });
    return groups;
  }, [combinedData]);

  const termLabel = selectedTerm === 'term1' ? 'نصف العام' : 'آخر العام';

  return (
    <div id="exam-print-root" data-exam-print-preview className="p-8 bg-white text-black font-sans flex flex-col h-full overflow-visible" dir="rtl">
      
      {/* الترويسة الرسمية */}
      <div className="flex justify-between items-start mb-6 border-b-2 border-black pb-4">
          <div className="w-1/3 text-right font-black text-xs space-y-1">
              <p>محافظة: {schoolInfo.governorate || '........'}</p>
              <p>إدارة: {schoolInfo.educationalAdministration || '........'}</p>
              <p>مدرسة: {schoolInfo.schoolName || '........'}</p>
          </div>
          <div className="w-1/3 flex justify-center">
             {schoolInfo.logo && <img src={schoolInfo.logo} className="h-20 object-contain" alt="logo" />}
          </div>
          <div className="w-1/3 text-left font-bold text-xs">
              <p>العام الدراسي: {schoolInfo.academicYear}</p>
              <p>نسخة مجمعة لكافة الصفوف</p>
          </div>
      </div>

      {/* العنوان العلوي */}
      <div className="text-center mb-6">
        <h1 className="text-2xl font-black underline decoration-2 underline-offset-4">جدول مجمع امتحانات {termLabel} {schoolInfo.academicYear} م</h1>
      </div>

      {/* الجدول المجمع */}
      <table className="w-full border-collapse border-[2.5px] border-black text-center font-bold text-[12px]">
        <thead>
          <tr className="bg-gray-100 h-10">
            <th className="border-2 border-black w-[15%]">اليوم والتاريخ</th>
            <th className="border-2 border-black w-[35%]">المادة والصف</th>
            <th className="border-2 border-black w-[8%]">تم</th>
            <th colSpan={2} className="border-2 border-black w-[22%] text-center">الوقت</th>
            <th className="border-2 border-black w-[20%]">الزمن</th>
          </tr>
          <tr className="bg-gray-50 h-6">
            <th className="border-2 border-black"></th>
            <th className="border-2 border-black"></th>
            <th className="border-2 border-black"></th>
            <th className="border-2 border-black bg-gray-100 text-[10px]">من</th>
            <th className="border-2 border-black bg-gray-100 text-[10px]">إلى</th>
            <th className="border-2 border-black"></th>
          </tr>
        </thead>
        <tbody>
          {groupedRows.map((group) => (
            <React.Fragment key={group.key}>
              {group.items.map((item, idx) => (
                <tr key={`${item.id}_${idx}`} className="h-9 hover:bg-gray-50">
                  {idx === 0 && (
                    <td 
                      rowSpan={group.items.length} 
                      className="border-2 border-black bg-gray-50/30 text-[12px] leading-tight p-1"
                    >
                      <p>{item.day}</p>
                      <p className="text-[11px] font-mono mt-1">{item.date}</p>
                      <p className="text-[10px] mt-1 text-blue-600 font-black">({item.shift})</p>
                    </td>
                  )}
                  <td className="border-2 border-black text-right pr-4 font-black text-[13px]">
                    {item.subjectName} <span className="text-[10px] text-gray-500 font-bold mr-1">/ {item.gradeLabel}</span>
                  </td>
                  <td className="border-2 border-black"></td>
                  <td className="border-2 border-black font-mono text-[12px]">{item.timeFrom}</td>
                  <td className="border-2 border-black font-mono text-[12px]">{item.timeTo}</td>
                  <td className="border-2 border-black text-[11px]">{item.duration}</td>
                </tr>
              ))}
            </React.Fragment>
          ))}
          {groupedRows.length === 0 && (
            <tr>
              <td colSpan={6} className="p-16 text-center text-gray-400 font-black text-xl italic border-2 border-black">
                لا توجد بيانات جداول مسجلة حالياً
              </td>
            </tr>
          )}
        </tbody>
      </table>

      {/* التذييل */}
      <div className="mt-auto pt-10 flex justify-between px-16 text-md font-black">
        <div className="text-center w-56 space-y-12">
          <p className="underline underline-offset-4">رئيس الكنترول</p>
          <p className="text-gray-400 font-normal text-sm">................................</p>
        </div>
        <div className="text-center w-56 space-y-12">
          <p className="underline underline-offset-4">مدير المدرسة</p>
          <p className="text-gray-400 font-normal text-sm">................................</p>
        </div>
      </div>
      
      <div className="mt-4 pt-2 border-t border-dashed border-gray-200 text-[8px] text-gray-400 font-mono tracking-[0.3em] text-left opacity-30 select-none uppercase">
        - COMBINED EXAM SCHEDULE - OFFICIAL DOCUMENT
      </div>
    </div>
  );
};

export default CombinedExamSchedule;


import React, { useMemo, useState, useEffect } from 'react';
import { Users, GraduationCap, ShieldCheck, TrendingUp, StickyNote, Database, CalendarDays, BarChart3 } from 'lucide-react';
import { Student, GradesDatabase, Subject, GRADE_LABELS, Note, User, GradeLevel } from '../examControl.types';
import { db } from '../services/db';

interface DashboardProps {
  students: Student[];
  subjects: Subject[];
  grades: GradesDatabase;
  currentUser: User;
}

const StatCard: React.FC<{ title: string; value: string | number; percentage?: number; icon: React.ElementType; color: string; subtext?: string }> = ({ title, value, percentage, icon: Icon, color, subtext }) => (
  <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-between relative overflow-hidden group hover:shadow-md transition-shadow">
    <div className="flex items-center space-x-4 space-x-reverse z-10">
      <div className={`p-4 rounded-xl ${color} text-white shadow-lg shadow-inner group-hover:scale-110 transition-transform`}>
        <Icon size={24} />
      </div>
      <div>
        <p className="text-gray-500 text-xs font-bold mb-0.5">{title}</p>
        <h3 className="text-2xl font-black text-gray-800">{value}</h3>
      </div>
    </div>
    
    {percentage !== undefined && (
      <div className="mt-4 z-10">
        <div className="flex justify-between items-center mb-1">
          <span className="text-[10px] text-gray-400 font-bold">{subtext || 'نسبة الإنجاز'}</span>
          <span className="text-[10px] font-black text-gray-700">{percentage}%</span>
        </div>
        <div className="w-full bg-gray-100 rounded-full h-1.5">
          <div 
            className={`h-1.5 rounded-full transition-all duration-1000 ${percentage === 100 ? 'bg-emerald-500' : percentage > 70 ? 'bg-blue-500' : percentage > 30 ? 'bg-orange-500' : 'bg-rose-500'}`} 
            style={{ width: `${percentage}%` }}
          ></div>
        </div>
      </div>
    )}
    
    <div className="absolute -bottom-2 -left-2 opacity-[0.03] group-hover:opacity-[0.07] transition-opacity">
        <Icon size={80} />
    </div>
  </div>
);

const ALL_GRADES: GradeLevel[] = ['p1', 'p2', 'p3', 'p4', 'p5', 'p6', 'm1', 'm2', 'm3'];

const Dashboard: React.FC<DashboardProps> = ({ students, subjects, grades }) => {
  const schoolInfo = db.getSchoolInfo();
  const [notes, setNotes] = useState<Note[]>([]);
  const [now, setNow] = useState(() => new Date());
  const [selectedExam, setSelectedExam] = useState<null | {
    term: 'term1' | 'term2';
    grade: GradeLevel;
    subject: string;
    date: string;
    day: string;
    timeFrom: string;
    timeTo: string;
    duration: string;
  }>(null);
  
  useEffect(() => {
      setNotes(db.getNotes());
  }, []);

  useEffect(() => {
    let timer: number | null = null;
    const start = () => {
      if (document.visibilityState === 'visible' && timer === null) {
        timer = window.setInterval(() => setNow(new Date()), 60000);
      }
    };
    const stop = () => {
      if (timer !== null) {
        window.clearInterval(timer);
        timer = null;
      }
    };
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        start();
      } else {
        stop();
      }
    };
    start();
    document.addEventListener('visibilitychange', handleVisibility);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      stop();
    };
  }, []);

  const importantNotes = notes.filter(n => n.isImportant);

  const stats = useMemo(() => {
    const totalStudents = students.length;
    
    if (totalStudents === 0) {
        return { 
            totalStudents: 0, 
            studentInfoProgress: 0, 
            gradingProgress: 0, 
            controlProgress: 0, 
            gradeStats: {},
            totalPercent: 0 
        };
    }

    let completedInfoCount = 0;
    students.forEach(s => {
        if (s.name && s.nationalId && s.classroom) completedInfoCount++;
    });
    const studentInfoProgress = Math.round((completedInfoCount / totalStudents) * 100);

    let totalExpectedEntries = 0;
    let actualEntriesCount = 0;

    students.forEach(student => {
        const relevantSubjects = subjects.filter(sub => sub.gradeLevels?.includes(student.gradeLevel) && sub.isBasic);
        const stGrades = grades[student.id] || {};

        relevantSubjects.forEach(sub => {
            const record = stGrades[sub.id];
            const requiredFieldsPerTerm = 1 + (sub.practicalScore > 0 ? 1 : 0) + (sub.examScore > 0 ? 1 : 0);
            totalExpectedEntries += (requiredFieldsPerTerm * 2); 

            if (record) {
                if (record.term1) {
                    if (record.term1.work !== 0) actualEntriesCount++;
                    if (sub.practicalScore > 0 && record.term1.practical !== 0) actualEntriesCount++;
                    if (sub.examScore > 0 && record.term1.exam !== 0) actualEntriesCount++;
                }
                if (record.term2) {
                    if (record.term2.work !== 0) actualEntriesCount++;
                    if (sub.practicalScore > 0 && record.term2.practical !== 0) actualEntriesCount++;
                    if (sub.examScore > 0 && record.term2.exam !== 0) actualEntriesCount++;
                }
            }
        });
    });
    const gradingProgress = totalExpectedEntries > 0 ? Math.round((actualEntriesCount / totalExpectedEntries) * 100) : 0;

    let seatingCount = 0;
    let secretT1Count = 0;
    let secretT2Count = 0;

    students.forEach(s => {
        if (s.seatingNumber) seatingCount++;
        if (s.secretNumberTerm1) secretT1Count++;
        if (s.secretNumberTerm2) secretT2Count++;
    });

    const seatingPercent = (seatingCount / totalStudents) * 100;
    const secretT1Percent = (secretT1Count / totalStudents) * 100;
    const secretT2Percent = (secretT2Count / totalStudents) * 100;
    const controlProgress = Math.round((seatingPercent + secretT1Percent + secretT2Percent) / 3);

    const gradeStats: Record<string, { total: number, passed: number }> = {};
    students.forEach(student => {
       const stGrades = grades[student.id] || {};
       const relevantSubjects = subjects.filter(sub => sub.gradeLevels?.includes(student.gradeLevel));
       
       let isFail = false;
       relevantSubjects.forEach(sub => {
           const record = stGrades[sub.id];
           const total = (record?.term1?.work || 0) + (record?.term1?.exam || 0) + (record?.term2?.work || 0) + (record?.term2?.exam || 0);
           if (sub.isBasic && total < (sub.minScore * 2)) isFail = true;
       });

       const gLabel = GRADE_LABELS[student.gradeLevel];
       if (!gradeStats[gLabel]) gradeStats[gLabel] = { total: 0, passed: 0 };
       gradeStats[gLabel].total++;
       if (!isFail && Object.keys(stGrades).length > 0) gradeStats[gLabel].passed++;
    });

    return { totalStudents, studentInfoProgress, gradingProgress, controlProgress, gradeStats, totalPercent: 100 };
  }, [students, subjects, grades]);

  const liveStats = useMemo(() => {
    const total = students.length || 0;
    const boys = students.filter((student) => (student.gender || '').includes('ذكر')).length;
    const girls = students.filter((student) => (student.gender || '').includes('أنثى')).length;
    const totalPassed = Object.values(stats.gradeStats).reduce((sum, item) => sum + item.passed, 0);
    const totalCount = Object.values(stats.gradeStats).reduce((sum, item) => sum + item.total, 0);
    const successRate = totalCount > 0 ? Math.round((totalPassed / totalCount) * 100) : 0;
    const boysRate = total > 0 ? Math.round((boys / total) * 100) : 0;
    const girlsRate = total > 0 ? Math.round((girls / total) * 100) : 0;
    return { successRate, boysRate, girlsRate };
  }, [students, stats.gradeStats]);

  const timeLabel = useMemo(() => {
    try {
      return new Intl.DateTimeFormat('ar-EG', { hour: '2-digit', minute: '2-digit', hour12: true }).format(now);
    } catch {
      return now.toLocaleTimeString();
    }
  }, [now]);

  const dateLabel = useMemo(() => {
    try {
      return new Intl.DateTimeFormat('ar-EG', { weekday: 'long', day: '2-digit', month: 'long' }).format(now);
    } catch {
      return now.toLocaleDateString();
    }
  }, [now]);

  const todaySchedule = useMemo(() => {
    const todayKey = now.toISOString().slice(0, 10);
    const items: Array<{
      note: string;
      time: string;
      grade: GradeLevel;
      term: 'term1' | 'term2';
      date: string;
      day: string;
      timeFrom: string;
      timeTo: string;
      duration: string;
    }> = [];
    (['term1', 'term2'] as const).forEach((term) => {
      ALL_GRADES.forEach((grade) => {
        const schedule = db.getExamSchedule(grade, term);
        schedule
          .filter((item) => item.date === todayKey)
          .forEach((item) => {
            items.push({
              note: item.subjectName || '—',
              time: item.timeFrom && item.timeTo ? `${item.timeFrom} - ${item.timeTo}` : item.timeFrom || item.timeTo || '',
              grade,
              term,
              date: item.date,
              day: item.day,
              timeFrom: item.timeFrom,
              timeTo: item.timeTo,
              duration: item.duration
            });
          });
      });
    });
    return items;
  }, [now]);

  return (
    <div className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="rounded-[28px] border border-gray-100 bg-white p-6 shadow-sm lg:col-span-1">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-black text-gray-800">مرآة امتحانات اليوم</h3>
            <CalendarDays size={22} className="text-blue-600" />
          </div>
          <div className="mt-6 rounded-2xl border border-gray-200 bg-gray-50/60 p-4 text-center">
            <p className="text-xs font-bold text-gray-500">ساعة الكنترول</p>
            <p className="text-2xl font-black text-blue-600 mt-2">{timeLabel}</p>
            <p className="text-sm font-bold text-gray-500 mt-1">{dateLabel}</p>
          </div>
          {todaySchedule.length === 0 ? (
            <div className="mt-8 flex flex-col items-center justify-center gap-3 rounded-2xl bg-gray-50/60 py-10 text-gray-400">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white shadow-inner">
                <span className="text-2xl font-black">i</span>
              </div>
              <p className="text-sm font-bold">لا توجد امتحانات</p>
            </div>
          ) : (
            <div className="mt-6 space-y-3">
              {todaySchedule.slice(0, 4).map((item, index) => (
                <button
                  type="button"
                  key={`${item.grade}-${index}`}
                  onClick={() =>
                    setSelectedExam({
                      term: item.term,
                      grade: item.grade,
                      subject: item.note,
                      date: item.date,
                      day: item.day,
                      timeFrom: item.timeFrom,
                      timeTo: item.timeTo,
                      duration: item.duration
                    })
                  }
                  className="w-full rounded-2xl border border-gray-100 bg-gray-50/60 p-3 text-right transition hover:border-blue-200 hover:bg-blue-50/40"
                >
                  <p className="text-xs font-bold text-gray-500">{GRADE_LABELS[item.grade]}</p>
                  <p className="text-sm font-black text-gray-800">{item.note}</p>
                  <p className="text-[11px] font-bold text-gray-400">
                    {item.term === 'term1' ? 'نصف العام' : 'نهاية العام'}
                  </p>
                  {item.time && <p className="text-xs font-bold text-blue-600">{item.time}</p>}
                </button>
              ))}
              {todaySchedule.length > 4 && (
                <p className="text-xs font-bold text-gray-400">+ {todaySchedule.length - 4} امتحانات أخرى اليوم</p>
              )}
            </div>
          )}
        </div>

        <div className="rounded-[28px] border border-gray-100 bg-white p-6 shadow-sm lg:col-span-2">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="rounded-full border border-blue-200 bg-blue-50 px-4 py-1 text-xs font-bold text-blue-600">
                بيانات حية
              </span>
              <h3 className="text-xl font-black text-gray-800">مركز التحليل الذكي</h3>
            </div>
            <BarChart3 size={22} className="text-blue-600" />
          </div>
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-4 text-center">
              <p className="text-xs font-bold text-emerald-700">النجاح العام</p>
              <p className="mt-2 text-2xl font-black text-emerald-700">{liveStats.successRate}%</p>
            </div>
            <div className="rounded-2xl border border-blue-200 bg-blue-50/60 p-4 text-center">
              <p className="text-xs font-bold text-blue-700">نسبة البنين</p>
              <p className="mt-2 text-2xl font-black text-blue-700">{liveStats.boysRate}%</p>
            </div>
            <div className="rounded-2xl border border-pink-200 bg-pink-50/60 p-4 text-center">
              <p className="text-xs font-bold text-pink-700">نسبة البنات</p>
              <p className="mt-2 text-2xl font-black text-pink-700">{liveStats.girlsRate}%</p>
            </div>
          </div>
          <div className="mt-6 flex items-center justify-between border-t border-gray-100 pt-4 text-xs font-bold text-gray-500">
            <span>تقارير كاملة</span>
            <span>تحليل أداء العام الدراسي</span>
          </div>
        </div>
      </div>

      {selectedExam && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <button
            type="button"
            onClick={() => setSelectedExam(null)}
            className="absolute inset-0 bg-slate-900/30 backdrop-blur-[2px]"
          />
          <div className="relative w-full max-w-lg rounded-3xl border border-slate-200 bg-white p-6 shadow-[0_24px_60px_rgba(15,23,42,0.2)]">
            <div className="flex items-center justify-between">
              <h4 className="text-lg font-black text-slate-800">تفاصيل الامتحان</h4>
              <button
                type="button"
                onClick={() => setSelectedExam(null)}
                className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-1 text-sm font-bold text-slate-500"
              >
                إغلاق
              </button>
            </div>
            <div className="mt-4 space-y-3 text-sm font-semibold text-slate-600">
              <div className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-2">
                <span>الصف</span>
                <span className="font-black text-slate-800">{GRADE_LABELS[selectedExam.grade]}</span>
              </div>
              <div className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-2">
                <span>المادة</span>
                <span className="font-black text-slate-800">{selectedExam.subject}</span>
              </div>
              <div className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-2">
                <span>الترم</span>
                <span className="font-black text-slate-800">
                  {selectedExam.term === 'term1' ? 'نصف العام' : 'نهاية العام'}
                </span>
              </div>
              <div className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-2">
                <span>التاريخ</span>
                <span className="font-black text-slate-800">{selectedExam.day || '—'} {selectedExam.date}</span>
              </div>
              <div className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-2">
                <span>الوقت</span>
                <span className="font-black text-slate-800">
                  {selectedExam.timeFrom || '—'} {selectedExam.timeTo ? `- ${selectedExam.timeTo}` : ''}
                </span>
              </div>
              <div className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-2">
                <span>المدة</span>
                <span className="font-black text-slate-800">{selectedExam.duration || '—'}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard title="إجمالي الطلاب" value={stats.totalStudents} percentage={stats.totalPercent} subtext="حالة قاعدة البيانات" icon={Users} color="bg-blue-600" />
        <StatCard title="بيانات الطلاب" value={`${stats.studentInfoProgress}%`} percentage={stats.studentInfoProgress} subtext="اكتمال الملفات" icon={Database} color="bg-emerald-600" />
        <StatCard title="رصد الدرجات" value={`${stats.gradingProgress}%`} percentage={stats.gradingProgress} subtext="المواد الأساسية" icon={GraduationCap} color="bg-orange-600" />
        <StatCard title="جاهزية الكنترول" value={`${stats.controlProgress}%`} percentage={stats.controlProgress} subtext="جلوس وسري" icon={ShieldCheck} color="bg-indigo-600" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
         <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 lg:col-span-2">
            <h3 className="font-black text-lg mb-4 text-gray-800 flex items-center gap-2">
                <TrendingUp size={20} className="text-blue-600" /> نسب النجاح التقديرية
            </h3>
            <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                {Object.entries(stats.gradeStats).map(([label, val]) => {
                    const data = val as { total: number; passed: number };
                    const percent = data.total > 0 ? Math.round((data.passed / data.total) * 100) : 0;
                    return (
                        <div key={label} className="bg-gray-50/50 p-3 rounded-xl border border-gray-100">
                            <div className="flex justify-between text-sm mb-1.5">
                                <span className="font-black text-gray-700">{label}</span>
                                <span className="font-black text-blue-600">{percent}%</span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2">
                                <div className={`h-2 rounded-full transition-all duration-700 ${percent >= 50 ? 'bg-emerald-500' : 'bg-rose-500'}`} style={{ width: `${percent}%` }}></div>
                            </div>
                        </div>
                    );
                })}
            </div>
         </div>

         <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col">
            <h3 className="font-black text-lg mb-4 text-gray-800 flex items-center gap-2">
                <StickyNote size={20} className="text-yellow-500" /> ملاحظات هامة
            </h3>
            <div className="flex-1 overflow-y-auto max-h-[300px] custom-scrollbar space-y-3">
                {importantNotes.map(note => (
                    <div key={note.id} className={`p-4 rounded-xl border-2 transition-transform hover:scale-[1.02] shadow-sm ${note.color}`}>
                        <span className="font-black text-gray-800 block mb-1">{note.title}</span>
                        <p className="text-gray-700 text-xs font-bold line-clamp-3 leading-relaxed">{note.content}</p>
                    </div>
                ))}
            </div>
         </div>
      </div>
    </div>
  );
};

export default Dashboard;

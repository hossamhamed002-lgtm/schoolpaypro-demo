import React, { useMemo, useState, useCallback, useEffect } from 'react';
import { ChevronLeft, ChevronRight, CalendarDays } from 'lucide-react';

type StudentAttendanceStatus = 'present' | 'late' | 'absent' | 'excused' | 'leave';

interface StudentAttendanceRecord {
  id: string;
  studentId: string;
  academicYearId?: string;
  date: string; // YYYY-MM-DD
  status: StudentAttendanceStatus;
  notes?: string;
  createdBy?: string;
}

interface StudentAttendanceScreenProps {
  store: any;
}

const STORAGE_KEY = 'STUDENT_ATTENDANCE_RECORDS_V1';

const loadAttendanceRecords = (): Record<string, StudentAttendanceRecord> => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, StudentAttendanceRecord>;
    return parsed || {};
  } catch {
    return {};
  }
};

const saveAttendanceRecords = (records: Record<string, StudentAttendanceRecord>) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
};

const padNumber = (value: number) => String(value).padStart(2, '0');

const StudentAttendanceScreen: React.FC<StudentAttendanceScreenProps> = ({ store }) => {
  const { lang, t, stages, grades, classes, students, allStudents, activeYear, currentUser, studentLeaveRequests } = store;
  const isRtl = lang === 'ar';

  const [records, setRecords] = useState<Record<string, StudentAttendanceRecord>>(() => loadAttendanceRecords());
  const [selectedStageId, setSelectedStageId] = useState('');
  const [selectedGradeId, setSelectedGradeId] = useState('');
  const [selectedClassId, setSelectedClassId] = useState('');
  const [currentMonth, setCurrentMonth] = useState(() => new Date());

  useEffect(() => {
    saveAttendanceRecords(records);
  }, [records]);

  const normalized = (value?: string | number) => String(value ?? '').trim().toLowerCase();

  const classById = useMemo(() => new Map((classes || []).map((klass: any) => [String(klass.Class_ID), klass])), [classes]);
  const gradeById = useMemo(() => new Map((grades || []).map((grade: any) => [String(grade.Grade_ID), grade])), [grades]);

  const monthDays = useMemo(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    return Array.from({ length: daysInMonth }, (_, index) => index + 1);
  }, [currentMonth]);

  const monthLabel = useMemo(() => {
    return new Intl.DateTimeFormat(isRtl ? 'ar-EG' : 'en-US', { month: 'long', year: 'numeric' }).format(currentMonth);
  }, [currentMonth, isRtl]);

  const getStudentId = (student: any) =>
    String(
      student.Student_Global_ID ||
        student.Student_ID ||
        student.studentId ||
        student.StudentId ||
        student.id ||
        ''
    );

  const getStudentName = (student: any) =>
    student.Name_Ar ||
    student.Name ||
    student.Arabic_Name ||
    student.Name_En ||
    student.Student_Name ||
    student.StudentName ||
    '';

  const getStudentClassId = (student: any) =>
    String(student.Class_ID || student.ClassId || student.classId || student.Class || student.Class_Name || '');

  const getStudentGradeId = (student: any) =>
    String(student.Grade_ID || student.GradeId || student.gradeId || student.Grade_Name || student.Level || '');

  const getStudentStageId = (student: any) =>
    String(student.Stage_ID || student.StageId || student.stageId || student.Stage_Name || '');

  const resolvedStudents = useMemo(() => {
    const sourceStudents = Array.isArray(allStudents) && allStudents.length > 0 ? allStudents : (students || []);
    const filteredByYear = activeYear?.Year_ID
      ? sourceStudents.filter((student: any) => String(student.Academic_Year_ID || student.academicYearId) === String(activeYear.Year_ID))
      : sourceStudents;

    return filteredByYear.map((student: any) => {
      const studentClassId = getStudentClassId(student);
      const classRecord = studentClassId ? classById.get(String(studentClassId)) : null;
      const gradeId = getStudentGradeId(student) || (classRecord ? String(classRecord.Grade_ID) : '');
      const gradeRecord = gradeId ? gradeById.get(String(gradeId)) : null;
      const stageId = getStudentStageId(student) || (gradeRecord ? String(gradeRecord.Stage_ID) : '');
      return {
        raw: student,
        studentId: getStudentId(student),
        name: getStudentName(student),
        classId: classRecord ? String(classRecord.Class_ID) : String(studentClassId || ''),
        gradeId: gradeRecord ? String(gradeRecord.Grade_ID) : String(gradeId || ''),
        stageId: String(stageId || '')
      };
    });
  }, [allStudents, students, activeYear, classById, gradeById]);

  const filteredStudents = useMemo(() => {
    return resolvedStudents.filter((student) => {
      if (!student.studentId) return false;
      if (selectedStageId && normalized(student.stageId) !== normalized(selectedStageId)) return false;
      if (selectedGradeId && normalized(student.gradeId) !== normalized(selectedGradeId)) return false;
      if (selectedClassId && normalized(student.classId) !== normalized(selectedClassId)) return false;
      return true;
    });
  }, [resolvedStudents, selectedStageId, selectedGradeId, selectedClassId]);

  const leaveRequests = Array.isArray(studentLeaveRequests) ? studentLeaveRequests : [];

  const isOnLeave = useCallback((studentId: string, date: string) => {
    if (!leaveRequests.length) return false;
    const target = new Date(date);
    return leaveRequests.some((request: any) => {
      const requestStudentId = String(
        request.studentId ||
          request.Student_ID ||
          request.StudentId ||
          request.student_id ||
          ''
      );
      if (!requestStudentId || requestStudentId !== studentId) return false;
      const status = normalized(request.status || request.Status);
      if (status && !['approved', 'مقبول', 'approved'].includes(status)) return false;
      const startDate = request.startDate || request.Start_Date || request.start;
      const endDate = request.endDate || request.End_Date || request.end;
      if (!startDate || !endDate) return false;
      const start = new Date(startDate);
      const end = new Date(endDate);
      return target >= start && target <= end;
    });
  }, [leaveRequests]);

  const buildDate = (day: number) => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth() + 1;
    return `${year}-${padNumber(month)}-${padNumber(day)}`;
  };

  const buildRecordKey = (studentId: string, date: string) => {
    const yearId = activeYear?.Year_ID ? String(activeYear.Year_ID) : 'ALL';
    return `${yearId}::${studentId}::${date}`;
  };

  const statusOrder: StudentAttendanceStatus[] = ['absent', 'excused', 'late'];

  const statusLabels: Record<StudentAttendanceStatus, string> = {
    present: isRtl ? 'حاضر' : 'Present',
    late: isRtl ? 'تأخير' : 'Late',
    excused: isRtl ? 'غياب بعذر' : 'Excused',
    absent: isRtl ? 'غياب' : 'Absent',
    leave: isRtl ? 'إجازة' : 'Leave'
  };

  const statusStyles: Record<StudentAttendanceStatus, string> = {
    present: 'bg-emerald-500/10 text-emerald-700 border-emerald-200',
    late: 'bg-amber-500/10 text-amber-700 border-amber-200',
    excused: 'bg-sky-500/10 text-sky-700 border-sky-200',
    absent: 'bg-rose-500/10 text-rose-700 border-rose-200',
    leave: 'bg-indigo-500/10 text-indigo-700 border-indigo-200'
  };

  const updateRecord = useCallback((studentId: string, date: string) => {
    if (!studentId || !date) return;
    if (isOnLeave(studentId, date)) return;

    const key = buildRecordKey(studentId, date);
    const current = records[key];
    const currentStatus = current?.status;
    const currentIndex = currentStatus ? statusOrder.indexOf(currentStatus) : -1;
    if (currentIndex === -1) {
      const nextRecord: StudentAttendanceRecord = {
        id: current?.id || `STU-ATT-${studentId}-${date}`,
        studentId,
        academicYearId: activeYear?.Year_ID ? String(activeYear.Year_ID) : undefined,
        date,
        status: 'absent',
        notes: current?.notes,
        createdBy: current?.createdBy || currentUser?.User_ID || currentUser?.Name
      };
      setRecords((prev) => ({ ...prev, [key]: nextRecord }));
      return;
    }

    if (currentIndex === statusOrder.length - 1) {
      setRecords((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
      return;
    }

    const nextStatus = statusOrder[currentIndex + 1];
    const nextRecord: StudentAttendanceRecord = {
      id: current?.id || `STU-ATT-${studentId}-${date}`,
      studentId,
      academicYearId: activeYear?.Year_ID ? String(activeYear.Year_ID) : undefined,
      date,
      status: nextStatus,
      notes: current?.notes,
      createdBy: current?.createdBy || currentUser?.User_ID || currentUser?.Name
    };

    setRecords((prev) => ({ ...prev, [key]: nextRecord }));
  }, [records, activeYear, currentUser, isOnLeave, statusOrder]);

  const getStatusForCell = useCallback((studentId: string, date: string): StudentAttendanceStatus | null => {
    if (isOnLeave(studentId, date)) return 'leave';
    const key = buildRecordKey(studentId, date);
    const status = records[key]?.status || null;
    return status === 'present' ? null : status;
  }, [records, isOnLeave]);

  const getSummaryForStudent = useCallback((studentId: string) => {
    let absent = 0;
    let excused = 0;
    let late = 0;
    monthDays.forEach((day) => {
      const date = buildDate(day);
      const status = getStatusForCell(studentId, date);
      if (status === 'absent') absent += 1;
      if (status === 'excused') excused += 1;
      if (status === 'late') late += 1;
    });
    return { absent, excused, late };
  }, [monthDays, getStatusForCell, buildDate]);

  const handlePrevMonth = () => {
    setCurrentMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  const availableGrades = useMemo(() => {
    if (!selectedStageId) return grades || [];
    return (grades || []).filter((grade: any) => String(grade.Stage_ID) === String(selectedStageId));
  }, [grades, selectedStageId]);

  const availableClasses = useMemo(() => {
    if (!selectedGradeId) return classes || [];
    return (classes || []).filter((klass: any) => String(klass.Grade_ID) === String(selectedGradeId));
  }, [classes, selectedGradeId]);

  return (
    <div className="space-y-6 animate-in fade-in duration-500 text-start">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h3 className="text-2xl font-black text-slate-900">{isRtl ? 'الحضور والانصراف للطلاب' : 'Student Attendance'}</h3>
          <p className="text-sm font-medium text-slate-500">{monthLabel}</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handlePrevMonth}
            className="p-2 rounded-xl bg-white border border-slate-200 text-slate-500 hover:bg-slate-50"
          >
            <ChevronLeft size={18} className={isRtl ? 'rotate-180' : ''} />
          </button>
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white border border-slate-200 text-slate-600 font-semibold">
            <CalendarDays size={16} />
            <span>{monthLabel}</span>
          </div>
          <button
            onClick={handleNextMonth}
            className="p-2 rounded-xl bg-white border border-slate-200 text-slate-500 hover:bg-slate-50"
          >
            <ChevronRight size={18} className={isRtl ? 'rotate-180' : ''} />
          </button>
        </div>
      </div>

      <div className="sticky top-0 z-30 bg-slate-50/95 backdrop-blur border-b border-slate-200 pb-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <select
            className="px-4 py-3 rounded-2xl border border-slate-200 bg-white text-slate-700 font-semibold"
            value={selectedStageId}
            onChange={(e) => {
              setSelectedStageId(e.target.value);
              setSelectedGradeId('');
              setSelectedClassId('');
            }}
          >
            <option value="">{isRtl ? 'كل المراحل' : 'All stages'}</option>
            {(stages || []).map((stage: any) => (
              <option key={stage.Stage_ID} value={stage.Stage_ID}>{stage.Stage_Name}</option>
            ))}
          </select>
          <select
            className="px-4 py-3 rounded-2xl border border-slate-200 bg-white text-slate-700 font-semibold"
            value={selectedGradeId}
            onChange={(e) => {
              setSelectedGradeId(e.target.value);
              setSelectedClassId('');
            }}
          >
            <option value="">{isRtl ? 'كل الصفوف' : 'All grades'}</option>
            {availableGrades.map((grade: any) => (
              <option key={grade.Grade_ID} value={grade.Grade_ID}>{grade.Grade_Name}</option>
            ))}
          </select>
          <select
            className="px-4 py-3 rounded-2xl border border-slate-200 bg-white text-slate-700 font-semibold"
            value={selectedClassId}
            onChange={(e) => setSelectedClassId(e.target.value)}
          >
            <option value="">{isRtl ? 'كل الفصول' : 'All classes'}</option>
            {availableClasses.map((klass: any) => (
              <option key={klass.Class_ID} value={klass.Class_ID}>{klass.Class_Name}</option>
            ))}
          </select>
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
            <span className="w-3 h-3 rounded-full bg-emerald-500/40 border border-emerald-300"></span>
            {isRtl ? 'حضور تلقائي' : 'Auto-present'}
            <span className="w-3 h-3 rounded-full bg-amber-500/40 border border-amber-300"></span>
            {isRtl ? 'تأخير' : 'Late'}
            <span className="w-3 h-3 rounded-full bg-sky-500/40 border border-sky-300"></span>
            {isRtl ? 'غياب بعذر' : 'Excused'}
            <span className="w-3 h-3 rounded-full bg-rose-500/40 border border-rose-300"></span>
            {isRtl ? 'غياب' : 'Absent'}
            <span className="w-3 h-3 rounded-full bg-indigo-500/40 border border-indigo-300"></span>
            {isRtl ? 'إجازة' : 'Leave'}
          </div>
        </div>
      </div>

      <div className="attendance-scroll relative max-h-[calc(100vh-240px)] overflow-auto border border-slate-200 rounded-3xl bg-white shadow-sm">
        <table className="min-w-full border-separate border-spacing-0 text-sm">
          <thead className="bg-slate-900 text-white">
            <tr>
              <th
                className="student-column px-4 py-3 text-start sticky top-0 right-0 z-30 bg-slate-900 min-w-[260px] max-w-[260px] shadow-[2px_0_0_0_rgba(15,23,42,0.25)]"
              >
                {isRtl ? 'الطالب' : 'Student'}
              </th>
              {monthDays.map((day) => (
                <th key={day} className="px-3 py-3 text-center whitespace-nowrap sticky top-0 z-20 bg-slate-900 min-w-[48px] max-w-[48px]">
                  {day}
                </th>
              ))}
              <th className="px-3 py-3 text-center whitespace-nowrap sticky top-0 z-20 bg-slate-900 min-w-[48px] max-w-[48px]">{isRtl ? 'غياب' : 'Absent'}</th>
              <th className="px-3 py-3 text-center whitespace-nowrap sticky top-0 z-20 bg-slate-900 min-w-[48px] max-w-[48px]">{isRtl ? 'بعذر' : 'Excused'}</th>
              <th className="px-3 py-3 text-center whitespace-nowrap sticky top-0 z-20 bg-slate-900 min-w-[48px] max-w-[48px]">{isRtl ? 'تأخير' : 'Late'}</th>
            </tr>
          </thead>
          <tbody>
            {filteredStudents.map((student) => {
              const summary = getSummaryForStudent(student.studentId);
              return (
                <tr key={student.studentId} className="border-b border-slate-100">
                  <td
                    className="student-column px-4 py-3 sticky right-0 z-15 bg-white font-bold text-slate-700 whitespace-nowrap min-w-[260px] max-w-[260px] shadow-[2px_0_0_0_rgba(15,23,42,0.08)]"
                  >
                    {student.name || student.studentId}
                  </td>
                  {monthDays.map((day) => {
                    const date = buildDate(day);
                    const status = getStatusForCell(student.studentId, date);
                    return (
                      <td key={date} className="px-2 py-2 text-center min-w-[48px] max-w-[48px]">
                        <button
                          type="button"
                          onClick={() => updateRecord(student.studentId, date)}
                          className={`w-8 h-8 rounded-lg border text-xs font-bold transition-colors ${
                            status ? statusStyles[status] : 'border-slate-200 text-slate-400 hover:bg-slate-50'
                          }`}
                          disabled={status === 'leave'}
                        >
                          {status ? statusLabels[status].charAt(0) : ''}
                        </button>
                      </td>
                    );
                  })}
                  <td className="px-3 py-2 text-center font-mono min-w-[48px] max-w-[48px]">{summary.absent}</td>
                  <td className="px-3 py-2 text-center font-mono min-w-[48px] max-w-[48px]">{summary.excused}</td>
                  <td className="px-3 py-2 text-center font-mono min-w-[48px] max-w-[48px]">{summary.late}</td>
                </tr>
              );
            })}
            {filteredStudents.length === 0 && (
              <tr>
                <td colSpan={monthDays.length + 4} className="px-6 py-10 text-center text-slate-400 font-semibold">
                  {isRtl ? 'لا توجد بيانات للطلاب في هذا النطاق' : 'No students available for this selection.'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default StudentAttendanceScreen;

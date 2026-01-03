import React, { useEffect, useMemo } from 'react';
import ExamControlApp from '../../modules/exam-control/ExamControlApp';
import type { Student as ControlStudent, GradeLevel, Stage, Teacher } from '../../modules/exam-control/examControl.types';

const ExamControlView: React.FC<{ store: any }> = ({ store }) => {
  useEffect(() => {
    sessionStorage.setItem('MODULE_ACTIVE__examControl', 'true');
    return () => {
      sessionStorage.removeItem('MODULE_ACTIVE__examControl');
    };
  }, []);
  const normalizeText = (value?: string | number) => String(value || '').trim().toLowerCase();
  const normalizeId = (value?: string | number) => String(value || '').trim();

  const gradeLabelToLevel: Array<{ match: string; level: GradeLevel }> = [
    { match: 'الأول الابتدائي', level: 'p1' },
    { match: 'الثاني الابتدائي', level: 'p2' },
    { match: 'الثالث الابتدائي', level: 'p3' },
    { match: 'الرابع الابتدائي', level: 'p4' },
    { match: 'الخامس الابتدائي', level: 'p5' },
    { match: 'السادس الابتدائي', level: 'p6' },
    { match: 'الأول الإعدادي', level: 'm1' },
    { match: 'الثاني الإعدادي', level: 'm2' },
    { match: 'الثالث الإعدادي', level: 'm3' }
  ];

  const resolveGradeLevel = (gradeName?: string, className?: string): GradeLevel => {
    const source = normalizeText(gradeName || className);
    const matched = gradeLabelToLevel.find((entry) => source.includes(normalizeText(entry.match)));
    return matched?.level || 'p1';
  };

  const resolveStage = (stageName?: string, gradeName?: string): Stage => {
    const source = normalizeText(stageName || gradeName);
    if (source.includes('إعدادي')) return 'preparatory';
    return 'primary';
  };

  const isKindergarten = (value?: string | number) => {
    const source = normalizeText(value);
    return source.includes('رياض') || source.includes('روضة') || source.includes('kg');
  };

  const mappedStudents = useMemo<ControlStudent[]>(() => {
    const yearId = store.workingYearId || store.activeYear?.Year_ID || store.activeYear?.Year_Name || '';
    const yearName = store.activeYear?.Year_Name || '';
    const yearKeys = new Set([normalizeId(yearId), normalizeId(store.activeYear?.Year_ID), normalizeId(yearName)].filter(Boolean));
    const allStudents = store.allStudents && store.allStudents.length ? store.allStudents : (store.students || []);
    const baseStudents = (store.students && store.students.length) ? store.students : allStudents;
    const stageSource: any[] = store.stages || store.allStages || [];
    const gradeSource: any[] = store.grades || store.allGrades || [];
    const classSource: any[] = store.classes || store.allClasses || [];

    const stageById = new Map(stageSource.map((stage: any) => [normalizeId(stage.Stage_ID), stage.Stage_Name]));
    const gradeById = new Map(gradeSource.map((grade: any) => [normalizeId(grade.Grade_ID), grade]));
    const classById = new Map(classSource.map((klass: any) => [normalizeId(klass.Class_ID), klass]));

    const isEnrolled = (student: any) => {
      const status = normalizeText(student.Status || student.Student_Status || student.status);
      return status === 'مقيد' || status === 'enrolled' || status === 'active' || status === 'منتظم' || !status;
    };

    const yearFiltered = (baseStudents || []).filter((student: any) => {
      if (baseStudents === store.students && store.students?.length) return true;
      if (!yearId) return true;
      const studentYear = normalizeId(student.Academic_Year_ID || student.Year_ID);
      if (!studentYear) return true;
      return yearKeys.has(studentYear);
    });

    const statusFiltered = yearFiltered.filter(isEnrolled);
    const effectiveStudents = statusFiltered.length > 0 ? statusFiltered : yearFiltered;

    return effectiveStudents.map((student: any, index: number) => {
        const classId = normalizeId(student.Class_ID || student.ClassId || student.classId || '');
        const gradeId = normalizeId(
          student.Grade_ID ||
          student.GradeId ||
          student.gradeId ||
          classById.get(classId)?.Grade_ID ||
          ''
        );
        const grade = gradeById.get(gradeId);
        const gradeName = student.Grade_Name || grade?.Grade_Name || '';
        const className = student.Class_Name || classById.get(classId)?.Class_Name || '';
        const stageName = student.Stage_Name || stageById.get(normalizeId(grade?.Stage_ID)) || '';
        const kindergartenSource = [
          stageName,
          gradeName,
          className,
          student.Level,
          student.Grade_Name,
          student.Class_Name
        ].join(' ');
        if (isKindergarten(kindergartenSource)) {
          return null;
        }
        const gender = normalizeText(student.Gender || student.gender || '');

        return {
          id: normalizeId(student.Student_Global_ID || student.Student_ID || student.Enroll_ID || student.id || `student-${index}`),
          name: student.Name_Ar || student.Name_En || student.Student_Name || student.name || '—',
          nationalId: student.National_ID || student.NationalId || student.nationalId || '',
          classroom: className || gradeName || '—',
          stage: resolveStage(stageName, gradeName),
          gradeLevel: resolveGradeLevel(gradeName, className),
          seatingNumber: null,
          secretNumberTerm1: null,
          secretNumberTerm2: null,
          secretNumberSecondRole: null,
          gender: gender.includes('أنثى') || gender.includes('female') ? 'أنثى' : gender.includes('ذكر') || gender.includes('male') ? 'ذكر' : undefined,
          birthDate: student.Birth_Date || student.BirthDate || student.birthDate,
          enrollmentStatus: student.Enrollment_Status || student.enrollmentStatus,
          isIntegration: false
        };
      }).filter(Boolean) as ControlStudent[];
  }, [
    store.activeYear?.Year_ID,
    store.activeYear?.Year_Name,
    store.workingYearId,
    store.allStudents,
    store.students,
    store.stages,
    store.allStages,
    store.grades,
    store.allGrades,
    store.classes,
    store.allClasses
  ]);

  const mappedTeachers = useMemo<Teacher[]>(() => {
    const employees = store.employees || [];
    const unique = new Map<string, Teacher>();
    employees.forEach((emp: any, index: number) => {
      const id = normalizeId(emp.Emp_ID || emp.empId || emp.id || `emp-${index}`);
      if (!id) return;
      if (unique.has(id)) return;
      const name = emp.Name_Ar || emp.Name_En || emp.Name || emp.Full_Name || emp.Username || emp.Email || '—';
      const subject = emp.Level || emp.Job_Title || emp.JobTitle || emp.Title_Ar || emp.Title_En || '';
      unique.set(id, {
        id,
        name,
        subject,
        conflicts: []
      });
    });
    return Array.from(unique.values());
  }, [store.employees]);

  const currentYearName = store.activeYear?.Year_Name || '';
  const examControlConfig = (store.reportConfigs || []).find((cfg: any) => cfg.Category_ID === 'examControl');
  const currentRole = store.currentUser?.Role;
  const allowedReportIds = examControlConfig?.Available_Reports
    ? examControlConfig.Available_Reports
        .filter((report: any) => !currentRole || report.Allowed_Roles?.includes(currentRole))
        .map((report: any) => report.Report_ID)
    : [];
  const signatureChain = examControlConfig?.Signature_Chain || [];
  const externalSchoolInfo = {
    schoolName: store.activeSchool?.Name || '',
    educationalAdministration: store.activeSchool?.Administration || store.activeSchool?.Address || '',
    governorate: store.activeSchool?.Directorate || '',
    academicYear: currentYearName,
    logo: store.activeSchool?.Logo || null
  };

  return (
    <div className="bg-slate-100 rounded-[2rem] border border-slate-200 shadow-sm overflow-hidden">
      <ExamControlApp
        externalMode
        externalStudents={mappedStudents}
        externalTeachers={mappedTeachers}
        externalYear={currentYearName}
        externalUser={store.currentUser}
        externalSchoolInfo={externalSchoolInfo}
        externalReportIds={allowedReportIds}
        externalSignatureChain={signatureChain}
      />
    </div>
  );
};

export default ExamControlView;

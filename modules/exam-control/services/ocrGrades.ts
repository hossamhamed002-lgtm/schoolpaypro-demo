import { GradeLevel, Student, Subject } from '../examControl.types';

export type AssessmentType =
  | 'year_work'
  | 'written_exam'
  | 'oral'
  | 'activity';

export type TermType = 'term1' | 'term2';

export type OcrAssessmentSetup = {
  academicYearId: string;
  gradeId: string;
  classId?: string;
  term: TermType;
  assessmentType: AssessmentType;
  subjectId: string;
};

export type OcrGradeInputRow = {
  secretNumber: string;
  gradeRaw: string;
};

export type OcrGradePreviewRow = {
  secretNumber: string;
  studentId?: string;
  studentName?: string;
  gradeId?: string;
  classId?: string;
  normalizedGrade?: number;
  maxGrade?: number;
  status: 'valid' | 'invalid';
  reasons: string[];
  isAbsent?: boolean;
};

export type AssessmentGradeRecord = {
  studentId: string;
  academicYearId: string;
  gradeId: string;
  classId?: string;
  subjectId: string;
  term: TermType;
  assessmentType: AssessmentType;
  gradeValue: number;
  maxGrade: number;
};

export type ResolveStudentResult =
  | { ok: true; student: Student & { academicYearId?: string; classId?: string; gradeId?: string } }
  | { ok: false; errorCode: 'NOT_FOUND' | 'YEAR_MISMATCH' | 'DUPLICATE_IN_FILE' | 'AMBIGUOUS'; reason: string };

type SecretStudent = Student & {
  academicYearId?: string;
  classId?: string;
  gradeId?: string;
};

const normalizeSecret = (value: string | number) => String(value || '').trim();

export const resolveStudentBySecretNumber = ({
  secretNumber,
  academicYearId,
  term,
  students,
  seenSecretsInFile
}: {
  secretNumber: string | number;
  academicYearId: string;
  term: TermType;
  students: SecretStudent[];
  seenSecretsInFile: Set<string>;
}): ResolveStudentResult => {
  const normalizedSecret = normalizeSecret(secretNumber);
  if (!normalizedSecret) {
    return { ok: false, errorCode: 'NOT_FOUND', reason: 'الرقم السري غير موجود' };
  }
  if (seenSecretsInFile.has(normalizedSecret)) {
    return { ok: false, errorCode: 'DUPLICATE_IN_FILE', reason: 'الرقم السري مكرر داخل الملف' };
  }

  const termKey = term === 'term1' ? 'secretNumberTerm1' : 'secretNumberTerm2';
  const candidates = students.filter((s: any) => normalizeSecret((s as any)[termKey]) === normalizedSecret);

  if (candidates.length === 0) {
    return { ok: false, errorCode: 'NOT_FOUND', reason: 'الرقم السري غير مرتبط بطالب' };
  }

  const byYear = candidates.filter((s) => !s.academicYearId || normalizeSecret(s.academicYearId) === normalizeSecret(academicYearId));
  if (byYear.length === 0) {
    return { ok: false, errorCode: 'YEAR_MISMATCH', reason: 'الرقم السري يخص عام دراسي آخر' };
  }

  if (byYear.length > 1) {
    return { ok: false, errorCode: 'AMBIGUOUS', reason: 'الرقم السري مرتبط بأكثر من طالب' };
  }

  seenSecretsInFile.add(normalizedSecret);
  return { ok: true, student: byYear[0] };
};

const arabicToEnglishDigits = (value: string) =>
  value.replace(/[٠-٩]/g, (d) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)));

const parseGradeValue = (raw: string, maxGrade: number) => {
  const trimmed = (raw || '').trim();
  const lowered = trimmed.toLowerCase();
  const isAbsent =
    lowered === 'غ' ||
    lowered === 'غياب' ||
    lowered === 'absent';

  if (isAbsent) {
    return { isAbsent: true, value: 0 };
  }

  const withEnglishDigits = arabicToEnglishDigits(trimmed);
  const digitsOnly = withEnglishDigits.replace(/[^\d]/g, '');
  if (!digitsOnly) {
    return { error: 'INVALID_GRADE' };
  }
  const numeric = Number(digitsOnly);
  if (!Number.isFinite(numeric)) {
    return { error: 'INVALID_GRADE' };
  }
  if (numeric < 0) {
    return { error: 'INVALID_GRADE' };
  }
  if (numeric > maxGrade) {
    return { error: 'OUT_OF_RANGE', value: numeric };
  }
  return { value: numeric };
};

export const validateGradeEntry = ({
  previewRow,
  setup,
  student,
  subject,
  seenStudentSubjectKeys,
  maxGrade
}: {
  previewRow: OcrGradePreviewRow;
  setup: OcrAssessmentSetup;
  student: SecretStudent | null;
  subject: Subject | null;
  seenStudentSubjectKeys: Set<string>;
  maxGrade: number;
}): OcrGradePreviewRow => {
  const errors: string[] = [];
  const parsed = parseGradeValue(String(previewRow.normalizedGrade ?? ''), maxGrade);
  const normalizedGrade = parsed.value;

  if (!student) {
    errors.push('الطالب غير معروف أو رقم سري غير صالح');
  } else {
    if (setup.academicYearId && normalizeSecret(student.academicYearId) && normalizeSecret(student.academicYearId) !== normalizeSecret(setup.academicYearId)) {
      errors.push('الطالب ليس في العام الدراسي المحدد');
    }
    if (setup.gradeId && normalizeSecret(student.gradeId) && normalizeSecret(student.gradeId) !== normalizeSecret(setup.gradeId)) {
      errors.push('الطالب ليس في هذا الصف');
    }
    if (setup.classId && normalizeSecret(student.classId) && normalizeSecret(student.classId) !== normalizeSecret(setup.classId)) {
      errors.push('الطالب ليس في هذا الفصل');
    }
  }

  if (!subject) {
    errors.push('المادة غير مفعلة لهذا الصف');
  } else if (subject.gradeLevels && subject.gradeLevels.length > 0) {
    const allowed = subject.gradeLevels.some((g: GradeLevel) => g === (student as any)?.gradeLevel);
    if (!allowed) errors.push('المادة غير مفعلة لهذا الطالب');
  }

  const uniquenessKey = student ? `${student.id || student.Student_ID || ''}__${setup.subjectId}__${setup.term}__${setup.assessmentType}` : '';
  if (uniquenessKey && seenStudentSubjectKeys.has(uniquenessKey)) {
    errors.push('درجة مسجلة لنفس المادة/الترم/النوع لنفس الطالب في الملف');
  } else if (uniquenessKey) {
    seenStudentSubjectKeys.add(uniquenessKey);
  }

  if (parsed.error === 'INVALID_GRADE') {
    errors.push('الدرجة غير رقمية أو غير صالحة');
  } else if (parsed.error === 'OUT_OF_RANGE') {
    errors.push('الدرجة تتجاوز الدرجة العظمى للمادة');
  }

  return {
    ...previewRow,
    normalizedGrade: parsed.error ? undefined : normalizedGrade,
    maxGrade,
    status: errors.length ? 'invalid' : 'valid',
    reasons: errors,
    isAbsent: parsed.isAbsent || false
  };
};

export const persistAssessmentGrade = ({
  entries,
  setup,
  existingGrades,
  overrideExisting
}: {
  entries: OcrGradePreviewRow[];
  setup: OcrAssessmentSetup;
  existingGrades: AssessmentGradeRecord[];
  overrideExisting: boolean;
}): { saved: AssessmentGradeRecord[]; skipped: AssessmentGradeRecord[]; updatedStore: AssessmentGradeRecord[] } => {
  const updatedStore = [...existingGrades];
  const saved: AssessmentGradeRecord[] = [];
  const skipped: AssessmentGradeRecord[] = [];

  const index = new Map<string, number>();
  updatedStore.forEach((rec, idx) => {
    const key = `${rec.studentId}__${rec.subjectId}__${rec.term}__${rec.assessmentType}`;
    index.set(key, idx);
  });

  entries.forEach((row) => {
    if (row.status === 'invalid' || row.normalizedGrade === undefined || !row.studentId) return;
    const record: AssessmentGradeRecord = {
      studentId: row.studentId,
      academicYearId: setup.academicYearId,
      gradeId: row.gradeId || setup.gradeId,
      classId: row.classId || setup.classId,
      subjectId: setup.subjectId,
      term: setup.term,
      assessmentType: setup.assessmentType,
      gradeValue: row.normalizedGrade,
      maxGrade: row.maxGrade ?? 0
    };

    const key = `${record.studentId}__${record.subjectId}__${record.term}__${record.assessmentType}`;
    if (index.has(key)) {
      if (overrideExisting) {
        const existingIdx = index.get(key)!;
        updatedStore[existingIdx] = record;
        saved.push(record);
      } else {
        skipped.push(record);
      }
    } else {
      updatedStore.push(record);
      index.set(key, updatedStore.length - 1);
      saved.push(record);
    }
  });

  return { saved, skipped, updatedStore };
};

export const buildPreviewRows = ({
  rawRows,
  setup,
  students,
  subjects
}: {
  rawRows: OcrGradeInputRow[];
  setup: OcrAssessmentSetup;
  students: SecretStudent[];
  subjects: Subject[];
}): OcrGradePreviewRow[] => {
  const seenSecrets = new Set<string>();
  const seenStudentSubjectKeys = new Set<string>();
  const subject = subjects.find((s) => normalizeSecret((s as any).id || (s as any).Subject_ID) === normalizeSecret(setup.subjectId)) || null;
  const maxGrade = subject?.maxScore ?? subject?.examScore ?? 100;

  return rawRows.map((row) => {
    const parsed = parseGradeValue(row.gradeRaw, maxGrade);
    const resolved = resolveStudentBySecretNumber({
      secretNumber: row.secretNumber,
      academicYearId: setup.academicYearId,
      term: setup.term,
      students,
      seenSecretsInFile: seenSecrets
    });

    const base: OcrGradePreviewRow = {
      secretNumber: row.secretNumber,
      studentId: resolved.ok ? (resolved.student.id || (resolved.student as any).Student_ID) : undefined,
      studentName: resolved.ok ? resolved.student.name || (resolved.student as any).Name_Ar || (resolved.student as any).Full_Name : undefined,
      gradeId: resolved.ok ? (resolved.student.gradeId as any) || (resolved.student as any).Grade_ID : undefined,
      classId: resolved.ok ? (resolved.student.classId as any) || (resolved.student as any).Class_ID : undefined,
      normalizedGrade: parsed.error ? undefined : parsed.value,
      status: 'valid',
      reasons: parsed.error === 'INVALID_GRADE' ? ['الدرجة غير رقمية أو غير صالحة'] : parsed.error === 'OUT_OF_RANGE' ? ['الدرجة تتجاوز الدرجة العظمى للمادة'] : [],
      isAbsent: parsed.isAbsent || false,
      maxGrade
    };

    return validateGradeEntry({
      previewRow: base,
      setup,
      student: resolved.ok ? resolved.student : null,
      subject,
      seenStudentSubjectKeys,
      maxGrade
    });
  });
};

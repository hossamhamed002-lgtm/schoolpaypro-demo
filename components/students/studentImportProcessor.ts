import { AcademicYear, Class, Grade, ParentData, Stage, StudentMaster, StudentStatus } from '../../types';
import {
  calculateAgeOnDate,
  formatAge,
  formatDateInput,
  getAcademicYearReferenceDate,
  parseNationalId
} from './nationalIdUtils';

export interface SystemContext {
  stages: Stage[];
  grades: Grade[];
  classes: Class[];
  activeYear?: AcademicYear | null;
  schoolId: string;
}

export interface ImportResult {
  validRecords: StudentMaster[];
  errors: string[];
}

const NATIONAL_ID_PATTERN = /^([2-3]{1})([0-9]{13})$/;

const normalizeArabic = (value: string) =>
  value
    .toLowerCase()
    .replace(/ـ/g, '')
    .replace(/أ|إ|آ/g, 'ا')
    .replace(/ؤ|ئ/g, 'ي')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي')
    .replace(/(^|\s)ال/g, '$1')
    .replace(/\s+/g, ' ')
    .trim();

const normalizeAcademicLabel = (value: string) =>
  normalizeArabic(value).replace(/[^\p{L}\p{N}\s]/gu, '');

const normalizeAcademicToken = (value: string) =>
  toAsciiDigits(
    normalizeAcademicLabel(value)
      .replace(/\bالمرحله\b|\bالمرحلة\b|\bمرحلة\b|\bمرحله\b/gi, '')
      .replace(/\bالصف\b|\bصف\b/gi, '')
      .replace(/\bالفصل\b|\bفصل\b/gi, '')
      .replace(/\bروضة\b|\bرياض\b|\bالاطفال\b|\bالأطفال\b|\bkg\b/gi, '')
      .replace(/\s+/g, ' ')
      .trim()
  );

const extractGradeNumber = (value: string) => {
  const normalized = normalizeAcademicLabel(value);
  const digits = toAsciiDigits(normalized).match(/\d+/g);
  if (digits && digits.length > 0) return digits.join('');
  const ordinals: Record<string, string> = {
    الاول: '1',
    الاولى: '1',
    الثاني: '2',
    الثانيه: '2',
    الثانيهً: '2',
    الثانيهّ: '2',
    الثالث: '3',
    الثالثه: '3',
    الرابع: '4',
    الرابعه: '4',
    الخامس: '5',
    الخامسه: '5',
    السادس: '6',
    السادسه: '6',
    السابع: '7',
    السابعه: '7',
    الثامن: '8',
    الثامنه: '8',
    التاسع: '9',
    التاسعه: '9',
    العاشر: '10',
    الحاديعشر: '11',
    الحاديعشرة: '11',
    الحاديعشره: '11',
    الثانيعشر: '12',
    الثانيعشرة: '12',
    الثانيعشره: '12'
  };
  const compact = normalized.replace(/\s+/g, '');
  return ordinals[compact] || '';
};

const stripLeadingGradeNumber = (token: string, gradeNumber: string) => {
  if (!gradeNumber) return token;
  return token.startsWith(gradeNumber) ? token.slice(gradeNumber.length) : token;
};

const classSignature = (value: string) => {
  const token = normalizeAcademicToken(value);
  const digits = token.replace(/\D/g, '').split('').sort().join('');
  const letters = token.replace(/\d/g, '').split('').sort().join('');
  return `${digits}|${letters}`;
};

const extractClassParts = (value: string) => {
  const token = normalizeAcademicToken(value);
  const digits = token.match(/\d+/g) || [];
  const section = digits.length > 0 ? digits[digits.length - 1] : '';
  const letters = token.replace(/\d/g, '').replace(/\s+/g, '');
  return { section, letters };
};

const normalizeHeaderKey = (value: string) => value.toLowerCase().replace(/\s+/g, ' ').trim();

const toAsciiDigits = (value: string) =>
  value.replace(/[٠-٩]/g, (digit) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(digit)));

const expandScientificNotationString = (value: string): string | null => {
  const match = /^([+-]?)(\d+(?:\.\d+)?)[eE]([+-]?\d+)$/.exec(value);
  if (!match) return null;
  const mantissa = match[2];
  const exponent = Number(match[3]);
  if (Number.isNaN(exponent) || exponent < 0) return null;
  const decimalIndex = mantissa.indexOf('.');
  const decimals = decimalIndex === -1 ? 0 : mantissa.length - decimalIndex - 1;
  const digits = mantissa.replace('.', '');
  const zeros = exponent - decimals;
  if (zeros < 0) return null;
  return digits + '0'.repeat(zeros);
};

export const normalizeNationalId = (value: unknown): string | null => {
  if (value === null || value === undefined) return null;

  try {
    if (typeof value === 'bigint') return value.toString();
    if (typeof value === 'number') {
      if (!Number.isFinite(value)) return null;
      const rawNumber = value.toString();
      if (/[eE]/.test(rawNumber)) {
        const expanded = expandScientificNotationString(rawNumber);
        if (expanded) return expanded;
      }
      const intValue = Math.trunc(value);
      return BigInt(intValue).toString();
    }
  } catch (e) {
    // Fall back to string normalization.
  }

  let str = toAsciiDigits(String(value)).trim();
  if (!str) return null;
  str = str.replace(/[\u200B-\u200D\uFEFF]/g, '');

  if (/[eE]/.test(str)) {
    const expanded = expandScientificNotationString(str);
    if (expanded) {
      str = expanded;
    }
  }

  str = str.replace(/[^0-9]/g, '');
  if (!str) return null;
  if (str.length === 13) return `0${str}`;
  return str;
};

export const resolveAcademicEntity = <T extends { [key: string]: string }>(
  rawValue: string,
  entities: T[],
  getName: (entity: T) => string,
  getId: (entity: T) => string,
  label: string,
  rowIndex: number
): string => {
  const normalizedRaw = normalizeAcademicLabel(rawValue);
  const tokenRaw = normalizeAcademicToken(rawValue);
  if (!normalizedRaw) {
    throw new Error(`Row ${rowIndex}: ${label} is required`);
  }
  const match = entities.find(
    (entity) =>
      normalizeAcademicLabel(getName(entity)) === normalizedRaw ||
      normalizeAcademicToken(getName(entity)) === tokenRaw
  );
  if (!match) {
    throw new Error(`Row ${rowIndex}: ${label} '${rawValue}' not found`);
  }
  return getId(match);
};

const deriveFatherNameFromStudent = (studentName: string) => {
  const parts = studentName.trim().split(/\s+/).filter(Boolean);
  if (parts.length <= 1) return '';
  const start = Math.max(parts.length - 3, 1);
  return parts.slice(start).join(' ');
};

const getRowValue = (row: Record<string, unknown>, keys: string[]) => {
  const normalized = new Map<string, string>();
  Object.keys(row).forEach((key) => normalized.set(normalizeHeaderKey(key), key));
  for (const key of keys) {
    const actual = normalized.get(normalizeHeaderKey(key));
    if (actual) {
      const value = row[actual];
      if (value !== undefined && value !== null) {
        return String(value).trim();
      }
    }
  }
  return '';
};

const normalizePhone = (value: string) => {
  const digits = toAsciiDigits(String(value || '')).replace(/[^0-9]/g, '');
  if (!digits) return '';
  if (digits.length === 10 && !digits.startsWith('0')) return `0${digits}`;
  return digits;
};

const normalizeGender = (value: string) => {
  const normalized = normalizeArabic(value);
  if (!normalized) return '';
  if (normalized.includes('ذكر') || normalized.includes('male')) return 'Male';
  if (normalized.includes('انثى') || normalized.includes('أنثى') || normalized.includes('female')) return 'Female';
  return '';
};

export const processStudentImport = (
  fileData: Record<string, unknown>[],
  contextData: SystemContext
): ImportResult => {
  const errors: string[] = [];
  const validRecords: StudentMaster[] = [];

  const { stages, grades, classes, activeYear, schoolId } = contextData;
  if (!activeYear) {
    return {
      validRecords: [],
      errors: ['Active academic year is required to calculate age.']
    };
  }

  const requiredHeaders = ['national id', 'الرقم القومي'];
  if (fileData.length > 0) {
    const sampleKeys = Object.keys(fileData[0]).map((key) => normalizeHeaderKey(key));
    const hasNationalIdHeader = requiredHeaders.some((header) => sampleKeys.includes(header));
    if (!hasNationalIdHeader) {
      return {
        validRecords: [],
        errors: ['Missing required header: National ID / الرقم القومي']
      };
    }
  }

  const referenceDate = getAcademicYearReferenceDate(activeYear);
  const gradesByStage = new Map<string, Grade[]>();
  grades.forEach((grade) => {
    if (!gradesByStage.has(grade.Stage_ID)) gradesByStage.set(grade.Stage_ID, []);
    gradesByStage.get(grade.Stage_ID)?.push(grade);
  });

  fileData.forEach((row, index) => {
    const rowNumber = index + 2;
    try {
      const studentName = getRowValue(row, ['Name Ar', 'Student Name', 'اسم الطالب بالعربية', 'اسم الطالب']);
      const studentNameEn = getRowValue(row, ['Name En', 'Student Name En', 'اسم الطالب بالانجليزية']);
      const studentNationalIdRaw = getRowValue(row, ['National ID', 'Student National ID', 'الرقم القومي']);
      const birthDateRaw = getRowValue(row, ['Birth Date', 'تاريخ الميلاد']);
      const genderRaw = getRowValue(row, ['Gender', 'النوع']);
      const stageRaw = getRowValue(row, ['Stage', 'المرحلة']);
      const gradeRaw = getRowValue(row, ['Grade', 'الصف']);
      const classRaw = getRowValue(row, ['Class', 'الفصل']);

      const studentNationalId = normalizeNationalId(studentNationalIdRaw);
      if (!studentNationalId || !NATIONAL_ID_PATTERN.test(studentNationalId)) {
        errors.push(
          `Row ${rowNumber}: Invalid National ID. Received: '${studentNationalIdRaw}' -> Parsed: '${studentNationalId ?? ''}'`
        );
        return;
      }

      const studentParsed = parseNationalId(studentNationalId);
      if (!studentParsed) {
        const yyyy = studentNationalId.slice(1, 3);
        const mm = studentNationalId.slice(3, 5);
        const dd = studentNationalId.slice(5, 7);
        errors.push(
          `Row ${rowNumber}: Invalid National ID (date). Received: '${studentNationalIdRaw}' -> Parsed: '${studentNationalId}', YY='${yyyy}', MM='${mm}', DD='${dd}'`
        );
        return;
      }

      let stageId = '';
      if (stageRaw) {
        stageId = resolveAcademicEntity(
          stageRaw,
          stages,
          (stage) => stage.Stage_Name,
          (stage) => stage.Stage_ID,
          'Stage',
          rowNumber
        );
      }

      const normalizedGrade = normalizeAcademicToken(gradeRaw);
      if (!normalizedGrade) {
        errors.push(`Row ${rowNumber}: Grade is required`);
        return;
      }

      let gradeCandidates = (stageId ? gradesByStage.get(stageId) || [] : grades).filter(
        (grade) => normalizeAcademicToken(grade.Grade_Name) === normalizedGrade
      );
      if (stageId && gradeCandidates.length === 0) {
        gradeCandidates = grades.filter(
          (grade) => normalizeAcademicToken(grade.Grade_Name) === normalizedGrade
        );
      }
      if (gradeCandidates.length === 0) {
        errors.push(`Row ${rowNumber}: Grade '${gradeRaw}' not found`);
        return;
      }
      if (!stageId && gradeCandidates.length > 1) {
        errors.push(`Row ${rowNumber}: Grade '${gradeRaw}' is ambiguous. Provide Stage.`);
        return;
      }
      const targetGrade = gradeCandidates[0];
      if (!stageId) stageId = targetGrade.Stage_ID;

      const normalizedClass = normalizeAcademicToken(classRaw);
      if (!normalizedClass) {
        errors.push(`Row ${rowNumber}: Class is required`);
        return;
      }
      const gradeNumber = extractGradeNumber(gradeRaw);
      const normalizedClassStripped = stripLeadingGradeNumber(normalizedClass, gradeNumber);
      const normalizedClassSignature = classSignature(classRaw);

      const gradeClasses = classes.filter((klass) => klass.Grade_ID === targetGrade.Grade_ID);
      const targetClassParts = extractClassParts(classRaw);
      let classCandidates = gradeClasses.filter((klass) => {
        const classToken = normalizeAcademicToken(klass.Class_Name);
        if (classToken === normalizedClass) return true;
        if (normalizedClassStripped && classToken === normalizedClassStripped) return true;
        if (normalizedClassSignature && classSignature(klass.Class_Name) === normalizedClassSignature) return true;
        if (targetClassParts.section || targetClassParts.letters) {
          const klassParts = extractClassParts(klass.Class_Name);
          const sectionMatch = targetClassParts.section
            ? klassParts.section === targetClassParts.section
            : true;
          const letterMatch = targetClassParts.letters
            ? klassParts.letters === targetClassParts.letters
            : true;
          if (sectionMatch && letterMatch && (targetClassParts.section || targetClassParts.letters)) return true;
        }
        return false;
      });
      if (classCandidates.length === 0) {
        classCandidates = classes.filter((klass) => {
          const classToken = normalizeAcademicToken(klass.Class_Name);
          if (classToken === normalizedClass) return true;
          if (normalizedClassStripped && classToken === normalizedClassStripped) return true;
          if (normalizedClassSignature && classSignature(klass.Class_Name) === normalizedClassSignature) return true;
          if (targetClassParts.section || targetClassParts.letters) {
            const klassParts = extractClassParts(klass.Class_Name);
            const sectionMatch = targetClassParts.section
              ? klassParts.section === targetClassParts.section
              : true;
            const letterMatch = targetClassParts.letters
              ? klassParts.letters === targetClassParts.letters
              : true;
            if (sectionMatch && letterMatch && (targetClassParts.section || targetClassParts.letters)) return true;
          }
          return false;
        });
      }
      if (classCandidates.length === 0) {
        errors.push(`Row ${rowNumber}: Class '${classRaw}' not found`);
        return;
      }
      const targetClass = classCandidates[0];

      const grade = targetGrade;
      const klass = targetClass;
      if (!grade || !klass) {
        errors.push(`Row ${rowNumber}: Academic structure mismatch`);
        return;
      }

      const studentBirthDate = birthDateRaw ? formatDateInput(birthDateRaw) : '';
      const age = studentBirthDate ? calculateAgeOnDate(studentBirthDate, referenceDate) : null;

      const fatherNationalIdRaw = getRowValue(row, ['Father National ID', 'رقم الأب القومي']);
      const motherNationalIdRaw = getRowValue(row, ['Mother National ID', 'رقم الأم القومي']);

      const fatherNationalId = normalizeNationalId(fatherNationalIdRaw);
      const motherNationalId = normalizeNationalId(motherNationalIdRaw);

      const fatherParsed =
        fatherNationalId && NATIONAL_ID_PATTERN.test(fatherNationalId)
          ? parseNationalId(fatherNationalId)
          : null;
      const fatherNationalIdSafe =
        fatherNationalId && NATIONAL_ID_PATTERN.test(fatherNationalId) && fatherParsed
          ? fatherNationalId
          : '';

      const motherParsed =
        motherNationalId && NATIONAL_ID_PATTERN.test(motherNationalId)
          ? parseNationalId(motherNationalId)
          : null;
      const motherNationalIdSafe =
        motherNationalId && NATIONAL_ID_PATTERN.test(motherNationalId) && motherParsed
          ? motherNationalId
          : '';

      const fatherNameRaw = getRowValue(row, ['Father Name', 'اسم الأب']);
      const derivedFatherName = fatherNameRaw || deriveFatherNameFromStudent(studentName);

      const father: ParentData = {
        Parent_ID: `FTH-${Date.now()}-${index}`,
        Name: derivedFatherName,
        National_ID: fatherNationalIdSafe,
        DOB: fatherParsed ? formatDateInput(fatherParsed.birthDate) : '',
        Mobile: normalizePhone(getRowValue(row, ['Father Mobile', 'Father Phone', 'هاتف الأب'])),
        WhatsApp: normalizePhone(getRowValue(row, ['Father WhatsApp', 'واتساب الأب'])),
        Address: getRowValue(row, ['Father Address', 'عنوان الأب']),
        Job: getRowValue(row, ['Father Job', 'وظيفة الأب']),
        Email: '',
        ID_Type: '',
        Nationality: ''
      };

      const mother: ParentData = {
        Parent_ID: `MTH-${Date.now()}-${index}`,
        Name: getRowValue(row, ['Mother Name', 'اسم الأم']),
        National_ID: motherNationalIdSafe,
        DOB: motherParsed ? formatDateInput(motherParsed.birthDate) : '',
        Mobile: normalizePhone(getRowValue(row, ['Mother Mobile', 'Mother Phone', 'هاتف الأم'])),
        WhatsApp: normalizePhone(getRowValue(row, ['Mother WhatsApp', 'واتساب الأم'])),
        Address: '',
        Job: getRowValue(row, ['Mother Job', 'وظيفة الأم']),
        Email: '',
        ID_Type: '',
        Nationality: ''
      };

      const genderValue = normalizeGender(genderRaw) || (studentParsed ? studentParsed.gender : '');

      const studentRecord: StudentMaster = {
        Student_Global_ID: `STU-${Date.now()}-${index}`,
        School_ID: schoolId,
        Academic_Year_ID: activeYear.Year_ID,
        Name_Ar: studentName,
        Name_En: studentNameEn,
        National_ID: studentNationalId,
        DOB: studentBirthDate,
        Age_In_Oct: age ? formatAge(age) : '',
        Gender: genderValue || '',
        Status: StudentStatus.NEW,
        Gov_Code: '',
        Guardian_Phone: father.Mobile || mother.Mobile || '',
        Stage_ID: stageId,
        Grade_ID: grade.Grade_ID,
        Class_ID: klass.Class_ID,
        Section: 'Arabic',
        Level: `${grade.Grade_Name} - ${klass.Class_Name}`,
        Father: father,
        Mother: mother,
        Emergency_Phone: '',
        Is_Integration: false,
        Bus_Number: '',
        Email: '',
        Attachments: []
      };

      validRecords.push(studentRecord);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      errors.push(message);
    }
  });

  return { validRecords, errors };
};

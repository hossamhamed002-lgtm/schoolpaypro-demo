export type FinancialCloseState = {
  isClosed: boolean;
  closeDate?: string;
  summary?: Record<string, any>;
};

const SCHOOL_KEY = 'EDULOGIC_ACTIVE_SCHOOL_CODE_V1';
const YEAR_KEY = 'EDULOGIC_WORKING_YEAR_V2';

const normalize = (value?: string | number | null) => {
  if (value === undefined || value === null) return '';
  return String(value).trim();
};

export const financialCloseStorageKey = (schoolId?: string | number, academicYearId?: string | number) => {
  const school = normalize(schoolId) || 'SCHOOL';
  const year = normalize(academicYearId) || 'YEAR';
  return `FINANCIAL_YEAR_CLOSE__${school}__${year}`;
};

export const isFinancialYearClosed = (schoolId?: string | number, academicYearId?: string | number): boolean => {
  if (typeof window === 'undefined') return false;
  const fallbackSchool = window.localStorage.getItem(SCHOOL_KEY) || undefined;
  const fallbackYear = window.localStorage.getItem(YEAR_KEY) || undefined;
  const school = normalize(schoolId) || normalize(fallbackSchool) || 'SCHOOL';
  const year = normalize(academicYearId) || normalize(fallbackYear) || 'YEAR';

  try {
    const raw = window.localStorage.getItem(financialCloseStorageKey(school, year));
    if (raw) {
      const parsed = JSON.parse(raw) as FinancialCloseState;
      if (parsed && parsed.isClosed) return true;
    }
  } catch {
    // ignore parse errors
  }

  const lockFlag = window.localStorage.getItem(`FINANCIAL_YEAR_LOCKED__${school}__${year}`);
  return lockFlag === 'true';
};

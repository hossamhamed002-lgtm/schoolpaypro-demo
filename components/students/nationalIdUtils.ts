export interface AcademicYear {
  Year_ID: string;
  Year_Name: string;
  Start_Date: string;
  End_Date: string;
  Is_Active: boolean;
}

export const NATIONAL_ID_REGEX = /^([2-3])(\d{2})(\d{2})(\d{2})\d{7}$/;

export const isValidNationalId = (nationalId: string): boolean =>
  NATIONAL_ID_REGEX.test(nationalId.trim());

export const formatDateInput = (date: Date): string => {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const parseNationalId = (
  nationalId: string
): { birthDate: Date; gender: 'Male' | 'Female' } | null => {
  const trimmed = nationalId.trim();
  const match = NATIONAL_ID_REGEX.exec(trimmed);
  if (!match) return null;

  const centuryCode = Number(match[1]);
  const year = Number(match[2]);
  const month = Number(match[3]);
  const day = Number(match[4]);

  const baseYear = centuryCode === 2 ? 1900 : 2000;
  const fullYear = baseYear + year;
  const date = new Date(fullYear, month - 1, day);

  if (
    date.getFullYear() !== fullYear ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null;
  }

  const genderDigit = Number(trimmed.charAt(12));
  const gender = genderDigit % 2 === 0 ? 'Female' : 'Male';

  return { birthDate: date, gender };
};

export const getAcademicYearReferenceDate = (academicYear?: AcademicYear | null): Date => {
  if (!academicYear) {
    return new Date(new Date().getFullYear(), 9, 1);
  }

  const yearFromStart = Number(academicYear.Start_Date?.slice(0, 4));
  if (!Number.isNaN(yearFromStart)) {
    return new Date(yearFromStart, 9, 1);
  }

  const yearMatch = academicYear.Year_Name?.match(/\d{4}/);
  const yearFromName = yearMatch ? Number(yearMatch[0]) : new Date().getFullYear();
  return new Date(yearFromName, 9, 1);
};

export const calculateAgeOnDate = (
  birthDate: Date,
  referenceDate: Date
): { years: number; months: number; days: number } => {
  if (referenceDate < birthDate) {
    return { years: 0, months: 0, days: 0 };
  }

  let years = referenceDate.getFullYear() - birthDate.getFullYear();
  let months = referenceDate.getMonth() - birthDate.getMonth();
  let days = referenceDate.getDate() - birthDate.getDate();

  if (days < 0) {
    months -= 1;
    const prevMonthDays = new Date(referenceDate.getFullYear(), referenceDate.getMonth(), 0).getDate();
    days += prevMonthDays;
  }

  if (months < 0) {
    years -= 1;
    months += 12;
  }

  return { years, months, days };
};

export const formatAge = (age: { years: number; months: number; days: number }): string =>
  `${age.years} Years, ${age.months} Months, ${age.days} Days`;

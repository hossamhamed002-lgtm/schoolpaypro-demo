const ones: Record<string, number> = {
  'صفر': 0,
  '0': 0,
  'واحد': 1,
  'واحدة': 1,
  'إحدى': 1,
  'احدى': 1,
  'احد': 1,
  'اثنين': 2,
  'اتنين': 2,
  'اثنان': 2,
  'ثلاثة': 3,
  'ثلاثه': 3,
  'تلاتة': 3,
  'اربعة': 4,
  'أربعة': 4,
  'اربعه': 4,
  'أربعه': 4,
  'خمسة': 5,
  'خمسه': 5,
  'ستة': 6,
  'ست': 6,
  'سبعة': 7,
  'سبعه': 7,
  'ثمانية': 8,
  'ثمانيه': 8,
  'تمانية': 8,
  'تسعة': 9,
  'تسعه': 9,
  'عشرة': 10,
  'عشره': 10
};

const tens: Record<string, number> = {
  'عشرين': 20,
  'عشرون': 20,
  'تلاتين': 30,
  'ثلاثين': 30,
  'ثلاثون': 30,
  'اربعين': 40,
  'أربعين': 40,
  'اربعون': 40,
  'أربعون': 40,
  'خمسين': 50,
  'خمسون': 50,
  'ستين': 60,
  'ستون': 60,
  'سبعين': 70,
  'سبعون': 70,
  'ثمانين': 80,
  'تمانين': 80,
  'ثمانون': 80,
  'تسعون': 90,
  'تسعين': 90
};

const specialFractions: Record<string, number> = {
  'ربع': 0.25,
  'تلات تربع': 0.75,
  'تلات ترباع': 0.75,
  'ثلاثة ارباع': 0.75,
  'ثلاث ارباع': 0.75,
  'تلت تربع': 0.75,
  'تلت ترباع': 0.75,
  'نصف': 0.5,
  'نص': 0.5,
  'النص': 0.5
};

const arabicDigits = '٠١٢٣٤٥٦٧٨٩';
const arabicToEnglishDigits = (value: string) =>
  value.replace(/[٠-٩]/g, (d) => String(arabicDigits.indexOf(d)));

const normalizeText = (text: string) =>
  text
    // Treat explicit digit+و+digit as decimal separator
    .replace(/([0-9٠-٩]+)\s*و\s*([0-9٠-٩]+)/g, '$1 فاصلة $2')
    .replace(/(فاصلة|نقطة|دوت)/g, ' $1 ')
    .replace(/[.,،٫]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const parseIntegerWords = (segment: string): number | null => {
  if (!segment) return null;
  const tokens = segment.split(/\s+و?\s*/).map((t) => t.replace(/^و/, '').trim()).filter(Boolean);
  let total = 0;
  tokens.forEach((t) => {
    if (ones[t] !== undefined) total += ones[t];
    else if (tens[t] !== undefined) total += tens[t];
    else {
      const numeric = Number(arabicToEnglishDigits(t));
      if (Number.isFinite(numeric)) total += numeric;
    }
  });
  return Number.isFinite(total) ? total : null;
};

const parseFractionWords = (segment: string): number | null => {
  if (!segment) return null;
  const segNorm = segment.trim();
  if (specialFractions[segNorm] !== undefined) return specialFractions[segNorm];
  const intVal = parseIntegerWords(segNorm);
  if (intVal === null) return null;
  const digits = String(intVal).replace(/\D/g, '');
  if (!digits) return null;
  return Number(`0.${digits}`);
};

export const parseSpokenArabicNumber = (text: string): number | 'غ' | null => {
  if (!text) return null;
  const lowered = text.trim().toLowerCase();
  if (lowered === 'غ' || lowered === 'غياب') return 'غ';
  const normalized = normalizeText(lowered);
  const parts = normalized.split(/(?:\s+)?(?:فاصلة|نقطة|دوت)(?:\s+)?/);
  const intPart = parseIntegerWords(parts[0]);
  if (intPart === null) return null;
  if (parts.length === 1) return intPart;
  const fracPart = parseFractionWords(parts.slice(1).join(' '));
  if (fracPart === null) return null;
  const value = intPart + fracPart;
  return Number.isFinite(value) ? value : null;
};

export default { parseSpokenArabicNumber };

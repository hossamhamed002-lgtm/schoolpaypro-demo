export const normalizeEgyPhone = (input: string | null | undefined): string | null => {
  if (!input) return null;
  const sanitized = input.replace(/[^0-9]/g, '').trim();
  if (!sanitized) return null;

  if (sanitized.length === 11 && sanitized.startsWith('0')) {
    return `20${sanitized.slice(1)}`;
  }

  if (sanitized.length === 10 && sanitized.startsWith('1')) {
    return `20${sanitized}`;
  }

  if (sanitized.length === 12 && sanitized.startsWith('20')) {
    return sanitized;
  }

  return null;
};

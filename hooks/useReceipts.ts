import { useMemo } from 'react';
import { StudentReceipt } from '../types';
import { useAcademicYear } from '../contexts/AcademicYearContext';

export const useReceipts = (receipts: StudentReceipt[]) => {
  const { selectedYearId } = useAcademicYear();

  return useMemo(
    () => receipts.filter((receipt) => receipt.Academic_Year_ID === selectedYearId),
    [receipts, selectedYearId]
  );
};

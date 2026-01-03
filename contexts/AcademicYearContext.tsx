import React, { createContext, useContext, useMemo } from 'react';
import { AcademicYear } from '../types';

interface AcademicYearContextValue {
  years: AcademicYear[];
  selectedYearId: string;
  setSelectedYearId: (id: string) => void;
}

const AcademicYearContext = createContext<AcademicYearContextValue | null>(null);

export const AcademicYearProvider: React.FC<{
  years: AcademicYear[];
  selectedYearId: string;
  setSelectedYearId: (id: string) => void;
  children: React.ReactNode;
}> = ({ years, selectedYearId, setSelectedYearId, children }) => {
  const value = useMemo(
    () => ({ years, selectedYearId, setSelectedYearId }),
    [years, selectedYearId, setSelectedYearId]
  );

  return <AcademicYearContext.Provider value={value}>{children}</AcademicYearContext.Provider>;
};

export const useAcademicYear = () => {
  const ctx = useContext(AcademicYearContext);
  if (!ctx) {
    throw new Error('useAcademicYear must be used within AcademicYearProvider');
  }
  return ctx;
};
